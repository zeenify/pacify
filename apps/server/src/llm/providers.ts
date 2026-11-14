export type LLMProviderType = "cloudflare" | "azure" | "azure-responses" | "gemini-interactions" | "openai";

export interface LLMConfig {
  provider: LLMProviderType;
  geminiInteractions?: {
    apiKey: string | undefined;
    model: string | undefined;
    baseUrl?: string | undefined;
    // thinking_level — gemma-4 models only accept "minimal" (no thinking) | "high";
    // omitting it = dynamic default (heavy thinking on complex prompts).
    effort?: string | undefined;
  };
  cloudflare?: {
    accountId: string | undefined;
    apiToken: string | undefined;
    model: string | undefined;
    reasoningEffort?: string;
  };
  azure?: {
    endpoint: string | undefined;
    apiKey: string | undefined;
    model: string | undefined;
    maxCompletionTokens?: number;
    temperature?: number;
    topP?: number;
  };
  azureResponses?: {
    endpoint: string | undefined;
    apiKey: string | undefined;
    deployment: string | undefined;
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    reasoningEffort?: "low" | "medium" | "high";
  };
  // Any OpenAI-compatible /chat/completions endpoint (e.g. River, DeepSeek, GLM).
  openai?: {
    baseUrl: string | undefined;
    apiKey: string | undefined;
    model: string | undefined;
    temperature?: number;
    maxTokens?: number;
    reasoningEffort?: string;
    timeoutMs?: number;
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" };
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  // Per-call reasoning effort. `null` explicitly disables it for this call
  // (e.g. non-reasoning models that reject the parameter); undefined uses the provider default.
  reasoningEffort?: string | null;
  // Per-call abort budget; overrides the provider default timeout.
  timeoutMs?: number;
  // Stateful providers (gemini-interactions): server-side conversation chain head.
  // When set, only the latest user message is sent — history lives on the server.
  previousInteractionId?: string;
}

export interface ChatCompletionResult {
  text: string;
  reasoningContent?: string;
  neurons?: number;
  cachedTokens?: number;
  latencyMs: number;
  // Set by stateful providers — the new chain head to pass back on the next call.
  interactionId?: string;
}

export interface LLMProvider {
  complete(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
}

function createCloudflareProvider(config: LLMConfig["cloudflare"]): LLMProvider {
  if (!config?.accountId || !config?.apiToken) {
    throw new Error("Cloudflare AI not configured (accountId and apiToken required)");
  }
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run`;
  const model = config.model ?? "@cf/openai/gpt-oss-20b";
  const reasoningEffort = config.reasoningEffort ?? "medium";

  return {
    async complete(options) {
      const url = `${baseUrl}/${model}`;
      const t0 = Date.now();
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: options.messages,
          response_format: options.responseFormat,
          max_tokens: options.maxTokens ?? 2048,
          reasoning_effort: options.reasoningEffort ?? reasoningEffort,
        }),
      });
      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Cloudflare AI HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as any;
      if (!data?.success) throw new Error(`Cloudflare AI error: ${JSON.stringify(data).slice(0, 300)}`);
      const msg = data?.result?.choices?.[0]?.message;
      const candidates = [
        data?.result?.response,
        msg?.content,
        msg?.reasoning_content,
        msg?.reasoning,
      ];
      const out = candidates.find((c) => typeof c === "string" && c.trim().length > 0);
      if (typeof out !== "string") throw new Error("Cloudflare AI returned no text");
      const native =
        (typeof msg?.reasoning_content === "string" && msg.reasoning_content.trim()) ||
        (typeof msg?.reasoning === "string" && msg.reasoning.trim()) ||
        undefined;
      const usage = data?.result?.usage;
      const neurons =
        typeof usage?.total_tokens === "number" ? usage.total_tokens
        : typeof usage?.completion_tokens === "number" ? usage.completion_tokens
        : undefined;
      return { text: out, reasoningContent: native, neurons, latencyMs };
    },
  };
}

function createAzureProvider(config: LLMConfig["azure"]): LLMProvider {
  const endpoint = config?.endpoint;
  const apiKey = config?.apiKey;
  const model = config?.model ?? "grok-4-1-fast-reasoning";
  const maxCompletionTokens = config?.maxCompletionTokens ?? 16000;
  const temperature = config?.temperature ?? 1;
  const topP = config?.topP ?? 1;
  if (!endpoint || !apiKey) {
    throw new Error("Azure AI Foundry not configured (endpoint and apiKey required)");
  }

  return {
    async complete(options) {
      const url = `${endpoint.replace(/\/+$/, "")}/openai/v1/chat/completions`;
      const t0 = Date.now();
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          response_format: options.responseFormat,
          max_completion_tokens: options.maxTokens ?? maxCompletionTokens,
          temperature: options.temperature ?? temperature,
          top_p: options.topP ?? topP,
        }),
      });
      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Azure AI HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as any;
      const msg = data?.choices?.[0]?.message;
      const out = msg?.content ?? "";
      if (!out || typeof out !== "string") throw new Error("Azure AI returned no text");
      const reasoningContent =
        (typeof msg?.reasoning_content === "string" && msg.reasoning_content.trim()) ||
        (typeof msg?.reasoning === "string" && msg.reasoning.trim()) ||
        undefined;
      const usage = data?.usage;
      const neurons =
        typeof usage?.total_tokens === "number" ? usage.total_tokens
        : typeof usage?.completion_tokens === "number" ? usage.completion_tokens
        : undefined;
      return { text: out, reasoningContent, neurons, latencyMs };
    },
  };
}

function createAzureResponsesProvider(config: LLMConfig["azureResponses"]): LLMProvider {
  const endpoint = config?.endpoint;
  const apiKey = config?.apiKey;
  const deployment = config?.deployment ?? "gpt-5-mini";
  const maxOutputTokens = config?.maxOutputTokens ?? 16000;
  const temperature = config?.temperature ?? 1;
  const topP = config?.topP ?? 1;
  const reasoningEffort = config?.reasoningEffort ?? "medium";
  if (!endpoint || !apiKey) {
    throw new Error("Azure OpenAI Responses API not configured (endpoint and apiKey required)");
  }

  return {
    async complete(options) {
      const url = `${endpoint.replace(/\/+$/, "")}/v1/responses`;
      const t0 = Date.now();
      
      const input = options.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: deployment,
          input,
          reasoning: { effort: reasoningEffort },
          max_output_tokens: options.maxTokens ?? maxOutputTokens,
          temperature: options.temperature ?? temperature,
          top_p: options.topP ?? topP,
          text: options.responseFormat ? { format: { type: "json_object" } } : undefined,
        }),
      });
      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Azure Responses API HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as any;
      
      const outputText = data?.output?.[0]?.content?.[0]?.text ?? "";
      if (!outputText || typeof outputText !== "string") throw new Error("Azure Responses API returned no text");
      
      const reasoningContent = data?.output?.[0]?.reasoning?.content ?? undefined;
      
      const usage = data?.usage;
      const neurons =
        typeof usage?.total_tokens === "number" ? usage.total_tokens
        : typeof usage?.output_tokens === "number" ? usage.output_tokens
        : undefined;
      return { text: outputText, reasoningContent, neurons, latencyMs };
    },
  };
}

// Pulls the model's answer out of an Interactions API response. The SDK exposes
// `output_text` as a convenience; raw REST returns `steps[]` where the answer lives in
// the `model_output` step's content blocks.
function extractInteractionText(data: any): string | undefined {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text;
  const steps: any[] = Array.isArray(data?.steps) ? data.steps : [];
  for (const step of steps) {
    if (step?.type && step.type !== "model_output") continue;
    const blocks = Array.isArray(step?.content) ? step.content : [];
    const text = blocks
      .map((b: any) => (typeof b?.text === "string" ? b.text : ""))
      .join("");
    if (text.trim()) return text;
  }
  return undefined;
}

function createGeminiInteractionsProvider(config: LLMConfig["geminiInteractions"]): LLMProvider {
  const model = config?.model ?? "gemini-3.5-flash-lite";
  const baseUrl = (config?.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  // Gemma models reject the system_instruction field ("Developer instruction is not
  // enabled"), so the system text is folded into the FIRST input turn instead. With
  // server-side state (previous_interaction_id) those instructions persist in history,
  // so they are only ever sent once per duel either way. Gemini models take the
  // system_instruction field directly.
  const supportsSystemInstruction = !/^gemma/i.test(model);

  return {
    async complete(options) {
      const apiKey = config?.apiKey;
      if (!apiKey) throw new Error("Gemini API not configured (GEMINI_API_KEY required)");
      const system = options.messages.find((m) => m.role === "system")?.content;
      const lastUser = [...options.messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const prev = options.previousInteractionId;

      let input = lastUser;
      if (system && !supportsSystemInstruction && !prev) {
        input = `${system}\n\n=== GAME ===\n${lastUser}`;
      }
      const body: Record<string, unknown> = { model, input };
      if (system && supportsSystemInstruction) body.system_instruction = system;
      if (prev) body.previous_interaction_id = prev;
      const effort = options.reasoningEffort ?? config?.effort;
      if (effort) body.generation_config = { thinking_level: effort };

      const t0 = Date.now();
      const res = await fetch(`${baseUrl}/interactions`, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Gemini Interactions HTTP ${res.status}: ${errBody.slice(0, 300)}`);
      }
      const data = (await res.json()) as any;
      const text = extractInteractionText(data);
      if (!text) throw new Error("Gemini Interactions returned no text");
      const usage = data?.usage;
      return {
        text,
        interactionId: typeof data?.id === "string" ? data.id : undefined,
        neurons: typeof usage?.total_tokens === "number" ? usage.total_tokens : undefined,
        cachedTokens: typeof usage?.total_cached_tokens === "number" ? usage.total_cached_tokens : undefined,
        latencyMs,
      };
    },
  };
}

function createOpenAIProvider(config: LLMConfig["openai"]): LLMProvider {
  const baseUrl = config?.baseUrl?.replace(/\/+$/, "");
  const apiKey = config?.apiKey;
  const model = config?.model;
  const temperature = config?.temperature ?? 0.9;
  const maxTokens = config?.maxTokens ?? 4096;
  const reasoningEffort = config?.reasoningEffort;
  const timeoutMs = config?.timeoutMs;
  if (!baseUrl || !apiKey || !model) {
    throw new Error("OpenAI-compatible provider not configured (baseUrl, apiKey and model required)");
  }
  return {
    async complete(options) {
      const t0 = Date.now();
      const effort = options.reasoningEffort !== undefined ? options.reasoningEffort : reasoningEffort;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(options.timeoutMs ?? timeoutMs ?? 45_000),
        body: JSON.stringify({
          model,
          messages: options.messages,
          ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
          ...(effort ? { reasoning_effort: effort } : {}),
          max_tokens: options.maxTokens ?? maxTokens,
          temperature: options.temperature ?? temperature,
        }),
      }).catch((error) => {
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new Error(`OpenAI-compatible provider timed out after ${options.timeoutMs ?? timeoutMs ?? 45_000}ms`);
        }
        throw error;
      });
      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`OpenAI-compatible HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as any;
      const msg = data?.choices?.[0]?.message;
      const out = msg?.content ?? "";
      if (!out || typeof out !== "string") throw new Error("OpenAI-compatible provider returned no text");
      const reasoningContent =
        (typeof msg?.reasoning_content === "string" && msg.reasoning_content.trim()) || undefined;
      const usage = data?.usage;
      const neurons = typeof usage?.total_tokens === "number" ? usage.total_tokens : undefined;
      return { text: out, reasoningContent, neurons, latencyMs };
    },
  };
}

export function createProvider(config: LLMConfig): LLMProvider {
  const inner = createProviderInner(config);
  // Wire log — proof of exactly which endpoint/model each call dials.
  // Enabled with LLM_WIRE_LOG=1; never logs message content, only routing + usage.
  if (process.env.LLM_WIRE_LOG !== "1") return inner;
  const model = config.openai?.model ?? config.geminiInteractions?.model
    ?? config.cloudflare?.model ?? config.azure?.model ?? config.azureResponses?.deployment ?? "unknown";
  const base = config.openai?.baseUrl ?? "(provider-native endpoint)";
  return {
    complete: async (options) => {
      const t0 = Date.now();
      try {
        const res = await inner.complete(options);
        console.error(`[llm-wire] provider=${config.provider} model=${model} base=${base} latencyMs=${res.latencyMs} tokens=${res.neurons ?? "?"} turns=${options.messages.length}`);
        return res;
      } catch (e) {
        console.error(`[llm-wire] provider=${config.provider} model=${model} base=${base} FAILED after ${Date.now() - t0}ms: ${String(e).slice(0, 120)}`);
        throw e;
      }
    },
  };
}

function createProviderInner(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "cloudflare":
      return createCloudflareProvider(config.cloudflare);
    case "azure":
      return createAzureProvider(config.azure);
    case "azure-responses":
      return createAzureResponsesProvider(config.azureResponses);
    case "gemini-interactions":
      return createGeminiInteractionsProvider(config.geminiInteractions);
    case "openai":
      return createOpenAIProvider(config.openai);
    default:
      throw new Error(`Unknown LLM provider: ${(config as any).provider}`);
  }
}

/** Roles tune the same provider per job: "story" work (scenes, epilogues, memories)
 *  gets the strongest model and deepest reasoning; "dialogue" work (live duel lines,
 *  reactions) gets a fast model with light reasoning so play never stalls. */
export type ProviderRole = "story" | "dialogue";

export function createProviderFromEnv(role?: ProviderRole): LLMProvider {
  const provider = (process.env.LLM_PROVIDER as LLMProviderType) ?? "cloudflare";
  const config: LLMConfig = {
    provider,
    geminiInteractions: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
      baseUrl: process.env.GEMINI_BASE_URL,
      effort: role === "story" ? (process.env.GEMINI_STORY_EFFORT ?? process.env.GEMINI_EFFORT)
        : role === "dialogue" ? (process.env.GEMINI_DIALOGUE_EFFORT ?? process.env.GEMINI_EFFORT)
        : process.env.GEMINI_EFFORT,
    },
    cloudflare: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      model: process.env.PERSONALITY_MODEL,
      reasoningEffort: process.env.PERSONALITY_EFFORT,
    },
    azure: {
      endpoint: process.env.AZURE_AI_ENDPOINT,
      apiKey: process.env.AZURE_API_KEY,
      model: process.env.AZURE_MODEL,
      maxCompletionTokens: process.env.AZURE_MAX_TOKENS ? Number(process.env.AZURE_MAX_TOKENS) : undefined,
      temperature: process.env.AZURE_TEMPERATURE ? Number(process.env.AZURE_TEMPERATURE) : undefined,
      topP: process.env.AZURE_TOP_P ? Number(process.env.AZURE_TOP_P) : undefined,
    },
    azureResponses: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      maxOutputTokens: process.env.AZURE_OPENAI_MAX_TOKENS ? Number(process.env.AZURE_OPENAI_MAX_TOKENS) : undefined,
      temperature: process.env.AZURE_OPENAI_TEMPERATURE ? Number(process.env.AZURE_OPENAI_TEMPERATURE) : undefined,
      topP: process.env.AZURE_OPENAI_TOP_P ? Number(process.env.AZURE_OPENAI_TOP_P) : undefined,
      reasoningEffort: (process.env.AZURE_OPENAI_REASONING_EFFORT as "low" | "medium" | "high") ?? "medium",
    },
    openai: {
      baseUrl: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
      model: role === "story" ? (process.env.OPENAI_STORY_MODEL ?? process.env.OPENAI_MODEL)
        : role === "dialogue" ? (process.env.OPENAI_DIALOGUE_MODEL ?? process.env.OPENAI_MODEL)
        : process.env.OPENAI_MODEL,
      temperature: process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : undefined,
      maxTokens: process.env.OPENAI_MAX_TOKENS ? Number(process.env.OPENAI_MAX_TOKENS) : undefined,
      reasoningEffort: role === "story" ? (process.env.OPENAI_STORY_EFFORT ?? process.env.OPENAI_REASONING_EFFORT ?? "high")
        : role === "dialogue" ? (process.env.OPENAI_DIALOGUE_EFFORT ?? process.env.OPENAI_REASONING_EFFORT ?? "medium")
        : process.env.OPENAI_REASONING_EFFORT,
      timeoutMs: process.env.OPENAI_REQUEST_TIMEOUT_MS ? Number(process.env.OPENAI_REQUEST_TIMEOUT_MS) : undefined,
    },
  };
  return createProvider(config);
}