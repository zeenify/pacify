import { cardById, type BrainView, type Card, type CardId } from "@pacify/engine";

export function buildAiView(
  view: Omit<BrainView, "burned" | "peeked"> & { oppHand: Card[] },
  transcript: { p1: CardId; p2: CardId }[],
): BrainView {
  return {
    ...view,
    myHand: [...view.myHand],
    oppHand: [...view.oppHand],
    peeked: [...view.oppHand],
    oppPeeked: (view.oppPeeked ?? []).filter((c) => view.myHand.some((k) => k.id === c.id)),
    burned: transcript.flatMap((r) => [cardById(r.p1), cardById(r.p2)]),
  };
}

export type AiPickResponse = {
  picked: Card | null;
  message: string;
  voiceTicket?: string;
  interactionId: string | null;
  attempt: number;
  waitMs: number;
};

export type AiRound = {
  start: () => Promise<void>;
  lock: (card: CardId) => void;
  retry: () => Promise<void>;
  cancel: () => void;
};

type AiRoundOptions = {
  request: (attempt: number, locked: CardId | null, signal: AbortSignal) => Promise<AiPickResponse>;
  onBeat: (data: AiPickResponse) => void;
  onCommit: (data: AiPickResponse & { picked: Card }) => void;
  onError: (error: Error) => void;
};

export function createAiRound(options: AiRoundOptions): AiRound {
  const controller = new AbortController();
  let attempt = 0;
  let locked: CardId | null = null;
  let busy = false;
  let finished = false;
  let autoRetries = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearWait = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const send = async (): Promise<void> => {
    if (controller.signal.aborted || finished || busy) return;
    clearWait();
    busy = true;
    try {
      while (!controller.signal.aborted && !finished) {
        const sentLock = locked;
        const data = await options.request(attempt, sentLock, controller.signal);
        if (controller.signal.aborted) return;
        autoRetries = 0;
        attempt = data.attempt;
        options.onBeat(data);
        if (data.picked) {
          finished = true;
          options.onCommit({ ...data, picked: data.picked });
          return;
        }
        if (locked !== null && locked !== sentLock) continue;
        timer = setTimeout(() => {
          timer = null;
          attempt = data.attempt + 1;
          void send();
        }, data.waitMs);
        return;
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      options.onError(error instanceof Error ? error : new Error(String(error)));
      // A dropped request must never dead-end the round: back off and retry
      // automatically. attempt resets to 0 — the server answers a stale lower
      // attempt with the current decision's echo, and a restarted server (lost
      // round cache) accepts a fresh attempt 0 and re-derives the pick.
      attempt = 0;
      if (autoRetries < 2) {
        autoRetries += 1;
        timer = setTimeout(() => {
          timer = null;
          void send();
        }, 1200 * autoRetries);
      }
    } finally {
      busy = false;
    }
  };

  return {
    start: send,
    lock: (card) => {
      if (locked !== null || finished || controller.signal.aborted) return;
      locked = card;
      void send();
    },
    retry: send,
    cancel: () => {
      clearWait();
      controller.abort();
    },
  };
}
