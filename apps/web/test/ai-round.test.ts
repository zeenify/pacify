import { afterEach, describe, expect, it, vi } from "vitest";
import { cardById, type CardId } from "@pacify/engine";
import { buildAiView, createAiRound, type AiPickResponse } from "../src/lib/ai-round";

const wait = (attempt = 0, waitMs = 6000): AiPickResponse => ({
  picked: null, message: "Take your time.", interactionId: "beat", attempt, waitMs,
});
const commit = (attempt = 0): AiPickResponse => ({
  picked: cardById("ward"), message: "Your move.", interactionId: "commit", attempt, waitMs: 0,
});
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

afterEach(() => { vi.useRealTimers(); });

describe("AI view snapshots", () => {
  const played: { p1: CardId; p2: CardId }[] = [
    { p1: "bandit", p2: "oracle" }, { p1: "knight", p2: "witch" },
    { p1: "seraph", p2: "leviathan" }, { p1: "vampire", p2: "ogre" },
    { p1: "wizard", p2: "void" },
  ];

  it("includes both burned cards and removes consumed Oracle markers in the next round", () => {
    const mine = [cardById("angel"), cardById("ward")];
    const theirs = [cardById("demon"), cardById("paladin")];
    const snapshot = buildAiView({
      studentId: 2, phase: "commit", round: 6, myHand: mine, oppHand: theirs,
      myScore: 7, oppScore: 4, echoNext: false, shieldOff: 0, rngState: 123,
      oppPeeked: [cardById("oracle"), cardById("ward")],
    }, played);
    expect(snapshot.burned.map((c) => c.id)).toEqual([
      "bandit", "oracle", "knight", "witch", "seraph", "leviathan", "vampire", "ogre", "wizard", "void",
    ]);
    expect(snapshot.oppPeeked!.map((c) => c.id)).toEqual(["ward"]);
    expect(snapshot.peeked!.map((c) => c.id)).toEqual(["demon", "paladin"]);
  });

  it("keeps the original full human hand when the visible hand later loses the locked card", () => {
    const mine = [cardById("angel"), cardById("ward")];
    const theirs = [cardById("demon"), cardById("paladin")];
    const snapshot = buildAiView({
      studentId: 2, phase: "commit", round: 6, myHand: mine, oppHand: theirs,
      myScore: 7, oppScore: 4, echoNext: false, shieldOff: 0, rngState: 123,
      oppPeeked: [],
    }, played);
    theirs.splice(0, 1);
    mine.splice(0, 1);
    expect(snapshot.oppHand!.map((c) => c.id)).toEqual(["demon", "paladin"]);
    expect(snapshot.myHand.map((c) => c.id)).toEqual(["angel", "ward"]);
  });
});

describe("AI round request lifecycle", () => {
  it("commits once and ignores subsequent locks and retries", async () => {
    const committed: CardId[] = [];
    const round = createAiRound({
      request: async () => commit(), onBeat: () => {},
      onCommit: (data) => committed.push(data.picked!.id), onError: () => {},
    });
    await round.start();
    round.lock("angel");
    await round.retry();
    expect(committed).toEqual(["ward"]);
  });

  it("sends a player lock immediately during a chat window without advancing its attempt", async () => {
    vi.useFakeTimers();
    const requests: { attempt: number; locked: CardId | null }[] = [];
    const beats: string[] = [];
    const round = createAiRound({
      request: async (attempt, locked) => {
        requests.push({ attempt, locked });
        return locked ? commit(attempt) : wait(attempt);
      },
      onBeat: (data) => beats.push(data.message), onCommit: () => {}, onError: () => {},
    });
    await round.start();
    round.lock("angel");
    await tick();
    await vi.advanceTimersByTimeAsync(10000);
    expect(requests).toEqual([{ attempt: 0, locked: null }, { attempt: 0, locked: "angel" }]);
    expect(beats).toEqual(["Take your time.", "Your move."]);
  });

  it("advances to the server's next attempt only when its wait expires", async () => {
    vi.useFakeTimers();
    const requests: number[] = [];
    let commits = 0;
    const round = createAiRound({
      request: async (attempt) => {
        requests.push(attempt);
        return attempt === 0 ? wait(0, 5000) : commit(attempt);
      },
      onBeat: () => {}, onCommit: () => { commits++; }, onError: () => {},
    });
    await round.start();
    await vi.advanceTimersByTimeAsync(4999);
    expect(requests).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toEqual([0, 1]);
    expect(commits).toBe(1);
  });

  it("queues an early player lock behind an in-flight chat request", async () => {
    const requests: (CardId | null)[] = [];
    let resolve!: (data: AiPickResponse) => void;
    const round = createAiRound({
      request: async (_attempt, locked) => {
        requests.push(locked);
        return requests.length === 1 ? new Promise<AiPickResponse>((r) => { resolve = r; }) : commit();
      },
      onBeat: () => {}, onCommit: () => {}, onError: () => {},
    });
    const pending = round.start();
    round.lock("angel");
    expect(requests).toEqual([null]);
    resolve(wait());
    await pending;
    expect(requests).toEqual([null, "angel"]);
  });

  it("keeps a blind commit when the player locks while its response is in flight", async () => {
    let resolve!: (data: AiPickResponse) => void;
    const committed: CardId[] = [];
    const round = createAiRound({
      request: async () => new Promise<AiPickResponse>((r) => { resolve = r; }),
      onBeat: () => {}, onCommit: (data) => committed.push(data.picked!.id), onError: () => {},
    });
    const pending = round.start();
    round.lock("angel");
    resolve(commit());
    await pending;
    expect(committed).toEqual(["ward"]);
  });

  it("retries a failed follow-up with the same attempt and locked card", async () => {
    vi.useFakeTimers();
    const requests: { attempt: number; locked: CardId | null }[] = [];
    const errors: string[] = [];
    let commits = 0;
    const round = createAiRound({
      request: async (attempt, locked) => {
        requests.push({ attempt, locked });
        if (requests.length === 1) return wait(0, 5000);
        if (requests.length === 2) throw new Error("offline");
        return commit(attempt);
      },
      onBeat: () => {}, onCommit: () => { commits++; }, onError: (error) => errors.push(error.message),
    });
    await round.start();
    round.lock("angel");
    await tick();
    expect(errors).toEqual(["offline"]);
    await round.retry();
    expect(requests).toEqual([
      { attempt: 0, locked: null }, { attempt: 0, locked: "angel" }, { attempt: 0, locked: "angel" },
    ]);
    expect(commits).toBe(1);
    await vi.advanceTimersByTimeAsync(10000);
    expect(requests).toHaveLength(3);
  });

  it("cancels outstanding work without updating the abandoned round", async () => {
    let resolve!: (data: AiPickResponse) => void;
    let requestSignal!: AbortSignal;
    let updates = 0;
    const round = createAiRound({
      request: async (_attempt, _locked, signal) => {
        requestSignal = signal;
        return new Promise<AiPickResponse>((r) => { resolve = r; });
      },
      onBeat: () => { updates++; }, onCommit: () => { updates++; }, onError: () => { updates++; },
    });
    const pending = round.start();
    round.cancel();
    resolve(commit());
    await pending;
    expect(requestSignal.aborted).toBe(true);
    expect(updates).toBe(0);
  });

  it("cancels the wait timer when the round is abandoned", async () => {
    vi.useFakeTimers();
    let requests = 0;
    const round = createAiRound({
      request: async () => { requests++; return wait(); },
      onBeat: () => {}, onCommit: () => {}, onError: () => {},
    });
    await round.start();
    round.cancel();
    await vi.advanceTimersByTimeAsync(10000);
    expect(requests).toBe(1);
  });
});
