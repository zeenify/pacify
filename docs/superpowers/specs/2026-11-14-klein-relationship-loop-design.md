# Klein relationship loop — design

Date: 2026-11-14
Status: approved (scope chosen: full relationship loop; player replies as structured choices, not freeform chat)

## Intent

The story system keeps Klein from lying; it does not make him feel alive. This change
makes Klein feel human: he speaks like a person, reacts to what actually happens,
remembers specific moments, knows your name, notices time passing, lets you answer
back, and has an ending to every match. All memory stays server-verified — Klein can
never claim history the replay does not support.

## Goals

1. Every spoken line can vary; canned fallbacks are rare, varied, and never stored as memory.
2. In-duel dialogue structurally cannot leak the hidden card (speech model never sees hands or the pick).
3. Reactions after each reveal, post-duel epilogue scene, episodic memories, player reply choices.
4. River (OpenAI-compatible) provider with role-based strong models and reasoning effort; request timeouts.
5. Scene provenance + fallback metrics recorded for measurement.

## Non-goals

- Freeform player chat (injection surface; structured choices instead).
- Multi-character generalization beyond keeping types character-agnostic.
- Changing duel rules, solver, or the server-verified transcript model.

## Approaches considered

- Dialogue-only polish: rejected — no memory growth, no player agency.
- Full loop + freeform chat: rejected for now — moderation/injection cost.
- **Full loop with structured reply choices (chosen)** — one generated exchange per
  prelude, server-resolved, memory-visible.

## Design

### Provider (apps/server/src/llm/providers.ts)

- `createProviderFromEnv(role?: "story" | "dialogue")`. Role envs:
  `OPENAI_STORY_MODEL` / `OPENAI_DIALOGUE_MODEL` (default `OPENAI_MODEL`),
  `OPENAI_STORY_EFFORT` (default `high`) / `OPENAI_DIALOGUE_EFFORT` (default `medium`),
  `OPENAI_REQUEST_TIMEOUT_MS` (default 45000) applied via `AbortSignal.timeout`.
- openai provider honors per-call `options.reasoningEffort` and `options.timeoutMs`.
- story role = scenes, epilogues, memories (deep reasoning). dialogue role = live lines
  and reactions (fast reasoning). `.env.example` documents River.

### Speech pipeline (apps/server/src/personality.ts)

- Split one LLM call into two concurrent calls:
  - **Strategy call** (stateless): persona tactics + rules + status (with hands) + pool → `{picked}`.
  - **Speech call** (chains interactionId): voice + public status (scores/effects/rounds,
    NO hands, NO pool, NO pick) + prose account memory → `{message}`.
- Commit-beat leak risk becomes structural impossibility; commit fake-signaling needs no filter.
- Thinking beat keeps the knowledge-neutral filter (pinned tests); fallback bank grows to
  ~12 varied lines chosen pseudo-randomly (rngState^round^attempt), not `round % 5`.
- Transport failure → per-part fallback (pool argmax / varied canned line), `fallback: true`
  on the Response so encounter persistence skips storing canned lines as memory.
- `Character` (ai-brain) gains optional `voice`; speech system prompt uses `voice ?? personality`.

### Scenes + epilogue + memory (apps/server/src/klein-context.ts)

- `generateKleinScene`: one generation call + structural validation; the independent
  audit runs **only when a heuristic detects factual claims** (digits, win/loss words,
  "last time", "remember"). Auditor receives the SAME prose memory + compact facts.
  Failure → expanded authored fallback bank. Provenance recorded.
- Scene schema gains optional `exchange: { choices: [{ id, text, response: { text, pose } }] }`
  (2–3 player-voiced replies with Klein's scripted response each), validated structurally.
- `generateKleinEpilogue(history, match)`: result-flavored voice, 2–4 lines; guardrail
  strings updated to allow post-duel content for THIS match only. Deterministic fallback per result.
- `generateKleinMemory(history, match)`: JSON `{summary, moments:[{round,text}] ≤3}`;
  moments validated against the verified transcript; fail-closed to a deterministic
  factual summary. Memories are canon: audit (high effort) always runs here.
- `kleinMemoryBrief` becomes the lived-experience brief everywhere (scenes, in-duel
  speech, reactions, epilogue): name, time since last match, verified record in first
  person, episodes, what the player said, this duel so far.

### Persistence (packages/db, apps/server/src/encounter-*)

- Migration 0004: `character_memories` (id uuid PK, user_id FK, student_id, encounter_id
  unique FK cascade, result, summary, moments jsonb, player_label, occurred_at, status,
  created_at). `pending` rows are invisible to history and retried by the epilogue route.
- Completion transaction claims the memory row (ON CONFLICT DO NOTHING). After commit,
  the result route fire-and-forgets `finalizeStory(encounterId)`: memory + epilogue
  generate concurrently (outside any DB transaction; pool `max: 1` makes in-tx LLM calls fatal).
- `EncounterData` gains `epilogue`, `epilogueSource`, `replies`, `generation` (metrics).
  `EncounterSpeech.beat` gains `"reveal"`.
- `history()` adds `playerName` (displayName ?? username), `lastPlayedAt`, `occurredAt`
  on recentMatches, `playerReplies`, and ready `memories` (≤5, newest first).

### Routes (apps/server/src/encounters.ts)

- In-duel context switches to `kleinMemoryBrief(history, current)` (same verified inputs).
- `POST :id/reactions {transcript}`: replay-verified; reaction for the latest resolved
  round; speech key `${round}:reveal`; idempotent; never sees the hidden lock.
- `GET :id/epilogue` (completed only): awaits/creates finalize; returns epilogue; retries pending memory.
- `POST :id/reply {choiceId}`: validates against the stored scene's exchange; stores reply
  server-resolved (never trusts client text); one reply per encounter.
- Fallback (canned) speech is not persisted into `speech`/memory.
- POST /campaign/encounters still creates + generates the prelude; result route triggers finalize.

### Web (apps/web)

- `lib/encounter.ts`: epilogue types; module-level `warmEncounter()` stashes a pre-created
  encounter id; `kleinChallengePath()` consumes the stash.
- `story.tsx`: `?after=1` epilogue mode (fetch epilogue, reuse renderer, continue → /campaign);
  reply-choice UI at scene end (buttons → player line + Klein response bubbles → start duel).
- `duel.tsx`: after each transcript POST, request the reaction and show it in the existing
  bubble when it lands during reveal; on match end prewarm next encounter; result overlay
  gains CONTINUE → `/story?encounter=…&after=1`.

### Config/docs

- `.env.example`: River openai provider block with role models/efforts/timeouts.
- `render.yaml`: OPENAI_* env vars.
- AGENTS.md note: keep role model config on the strongest River GLM/DeepSeek deployment.

## Verification

- Server: `npx tsx --test test/*.test.ts` (new tests for provider roles/timeout, split
  pipeline, filters, scene/epilogue/memory generation fail-closed, routes, store claim-once).
- Web: `npm run test` (vitest) for encounter lib additions.
- `npm run build` at root (typecheck all workspaces).
- Manual: `npm run dev`, play a duel vs Klein with River configured; verify reactions,
  epilogue, replies, and memory on rematch.
