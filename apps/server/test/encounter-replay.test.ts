import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDuel, dispatch, cardById,
  type CardId, type DuelState, type DuelEvent,
} from "@pacify/engine";
import {
  replayEncounter, type EncounterRound, type EncounterCommit,
} from "../src/encounter-replay.js";

type Selection = (state: DuelState) => readonly [CardId, CardId];
type Reveal = Extract<DuelEvent, { t: "round_resolved" }> & { state: DuelState };

// Independent engine actions are the reference, never the replay wrapper itself.
function engineRun(seed: number, select?: Selection, limit = 7) {
  let state = createDuel({ seed, studentId: 2 });
  const states = [state];
  const transcript: EncounterRound[] = [];
  const commits: EncounterCommit[] = [];
  const reveals: Reveal[] = [];
  while (state.phase !== "over" && transcript.length < limit) {
    const [p1, p2] = select?.(state) ?? [
      state.p1Hand[(Math.abs(seed) + state.round) % state.p1Hand.length].id,
      state.p2Hand[(Math.abs(seed) + 2 * state.round) % state.p2Hand.length].id,
    ];
    const round = state.round;
    transcript.push({ round, p1, p2 });
    commits.push({ round, cardId: p2, p1Locked: round % 2 ? null : p1 });
    state = dispatch(state, { t: "lock_ai", cardId: p2 }).state;
    const resolution = dispatch(state, { t: "lock_player", cardId: p1 });
    const event = resolution.events.find((e) => e.t === "round_resolved");
    assert.ok(event, "fixture must select legal cards");
    state = resolution.state;
    reveals.push({ ...event, state });
    if (state.phase === "reveal") state = dispatch(state, { t: "next_round" }).state;
    states.push(state);
  }
  return { seed, states, transcript, commits, reveals, state };
}

type Run = ReturnType<typeof engineRun>;

function findRun(predicate: (run: Run) => boolean): Run {
  for (let seed = 1; seed <= 500; seed++) {
    const run = engineRun(seed);
    if (predicate(run)) return run;
  }
  assert.fail("no matching engine fixture in 500 deterministic seeds");
}

function firstRound(p1: CardId, p2: CardId): Run {
  for (let seed = 1; seed <= 2000; seed++) {
    const state = createDuel({ seed, studentId: 2 });
    if (state.p1Hand.some((c) => c.id === p1) && state.p2Hand.some((c) => c.id === p2)) {
      return engineRun(seed, () => [p1, p2], 1);
    }
  }
  assert.fail(`no seeded deal with ${p1} vs ${p2}`);
}

function replay(run: Run) {
  return replayEncounter(run.seed, run.transcript, run.commits);
}

test("an empty transcript returns the untouched round-one commit state", () => {
  assert.deepEqual(replayEncounter(123, [], []), {
    state: createDuel({ seed: 123, studentId: 2 }),
    transcript: [], results: [], outcomes: [], playerPeeked: [],
  });
});

test("full seeded matches and every prefix match engine state, points and totals", () => {
  for (const seed of [0, 1, 2, 3, 17, 51, 99, -1, 2147483647, 4294967295]) {
    const run = engineRun(seed);
    for (let n = 0; n <= run.transcript.length; n++) {
      const prefix = run.transcript.slice(0, n);
      const actual = replayEncounter(seed, prefix, run.commits);
      assert.deepEqual(actual.state, run.states[n], `seed ${seed}, prefix ${n}`);
      assert.deepEqual(actual.transcript, prefix);
      assert.deepEqual(actual.outcomes, run.reveals.slice(0, n).map((r) => r.outcome));
      assert.deepEqual(actual.results.map((r) => [r.round, r.youPts, r.kleinPts, r.youScore, r.kleinScore]),
        run.reveals.slice(0, n).map((r) => [r.state.round, r.outcome.p1Points,
          r.outcome.p2Points, r.state.p1Score, r.state.p2Score]));
      if (actual.state.phase !== "over") {
        assert.equal(actual.state.phase, "commit");
        assert.equal(actual.state.round, n + 1);
        assert.equal(actual.state.p1Locked, null);
        assert.equal(actual.state.p2Locked, null);
        assert.equal(actual.state.lastOutcome, null);
      }
    }
  }
});

test("seven resolved rounds finish even when neither side reaches twenty", () => {
  const run = findRun((r) => r.transcript.length === 7 && r.state.p1Score < 20 && r.state.p2Score < 20);
  const actual = replay(run);
  assert.deepEqual(actual.state, run.state);
  assert.equal(actual.state.phase, "over");
  assert.equal(actual.state.round, 7);
  assert.equal(actual.transcript.length, 7);
  assert.equal(actual.state.burned.length, 14);
});

test("first to twenty finishes before round seven without advancing", () => {
  const run = findRun((r) => r.transcript.length < 7);
  const actual = replay(run);
  assert.deepEqual(actual.state, run.state);
  assert.equal(actual.state.phase, "over");
  assert.ok(actual.state.round < 7);
  assert.ok(Math.max(actual.state.p1Score, actual.state.p2Score) >= 20);
  assert.equal(actual.results.length, actual.state.round);
  assert.ok(actual.state.p1Hand.length > 0);
});

test("each supplied round requires its recorded AI commit", () => {
  const run = engineRun(17, undefined, 2);
  assert.throws(() => replayEncounter(run.seed, run.transcript, []), Error);
  assert.throws(() => replayEncounter(run.seed, run.transcript, run.commits.slice(0, 1)), Error);
  assert.throws(() => replayEncounter(run.seed, run.transcript, run.commits.slice(1)), Error);
});

test("a different legal AI card cannot replace the recorded choice", () => {
  const run = engineRun(17, undefined, 1);
  const other = run.states[0].p2Hand.find((c) => c.id !== run.transcript[0].p2)!;
  const changed = [{ ...run.transcript[0], p2: other.id }];
  assert.throws(() => replayEncounter(run.seed, changed, run.commits), Error);
  assert.throws(() => replayEncounter(run.seed, run.transcript,
    [{ ...run.commits[0], cardId: other.id }]), Error);
});

test("a read-lock must match but a blind commit allows either legal human card", () => {
  const run = engineRun(17, undefined, 1);
  const original = run.transcript[0];
  const other = run.states[0].p1Hand.find((c) => c.id !== original.p1)!;
  const locked = [{ ...run.commits[0], p1Locked: original.p1 }];
  assert.deepEqual(replayEncounter(run.seed, run.transcript, locked).state, run.state);
  assert.throws(() => replayEncounter(run.seed, [{ ...original, p1: other.id }], locked), Error);
  assert.doesNotThrow(() => replayEncounter(run.seed, [{ ...original, p1: other.id }], run.commits));
});

test("contradictory duplicate commits reject regardless of record order", () => {
  const run = engineRun(17, undefined, 1);
  const original = run.commits[0];
  const other = run.states[0].p2Hand.find((c) => c.id !== original.cardId)!;
  for (const conflict of [
    { ...original, cardId: other.id },
    { ...original, p1Locked: run.transcript[0].p1 },
  ]) {
    for (const commits of [[original, conflict], [conflict, original]]) {
      assert.throws(() => replayEncounter(run.seed, run.transcript, commits), Error);
    }
  }
});

test("identical duplicate commits and records outside the requested prefix are harmless", () => {
  const run = engineRun(17, undefined, 1);
  const first = run.commits[0];
  const commits = [
    { ...first, round: 2, p1Locked: run.transcript[0].p1 }, first,
    { ...first }, { ...first, round: 2 },
  ];
  const actual = replayEncounter(run.seed, run.transcript, commits);
  assert.deepEqual(actual.state, run.state);
  assert.deepEqual(actual, replay(run));
  assert.deepEqual(replayEncounter(run.seed, [], commits).state, run.states[0]);
});

test("external transcripts must be arrays of at most seven rows", () => {
  for (const input of [null, undefined, {}, "[]", 1, true, new Array(8).fill({ round: 1 })]) {
    assert.throws(() => replayEncounter(17, input, []), Error);
  }
});

test("rows must be objects with numeric contiguous rounds and canonical card IDs", () => {
  const run = engineRun(17, undefined, 1);
  const row = run.transcript[0];
  const invalid: unknown[] = [null, undefined, false, 7, "row", [], {},
    { ...row, round: "1" }, { ...row, round: 0 }, { ...row, round: 2 },
    { ...row, round: 1.5 }, { ...row, round: NaN }];
  for (const side of ["p1", "p2"] as const) {
    for (const id of [undefined, null, 1, {}, cardById(row[side]), "archon", "missing",
      row[side].toUpperCase(), ` ${row[side]}`]) {
      invalid.push({ ...row, [side]: id });
    }
  }
  for (const value of invalid) {
    assert.throws(() => replayEncounter(run.seed, [value], run.commits), Error);
  }
  assert.throws(() => replayEncounter(run.seed, new Array(1), run.commits), Error);
});

test("cards from the wrong side's original hand are rejected", () => {
  const run = engineRun(17, undefined, 1);
  const row = run.transcript[0];
  assert.throws(() => replayEncounter(run.seed, [{ ...row, p1: row.p2 }], run.commits), Error);
  assert.throws(() => replayEncounter(run.seed, [{ ...row, p2: row.p1 }],
    [{ ...run.commits[0], cardId: row.p1 }]), Error);
});

test("burned cards cannot be reused by either side even with a matching commit", () => {
  const run = engineRun(17, undefined, 2);
  for (const side of ["p1", "p2"] as const) {
    const rows = [run.transcript[0], { ...run.transcript[1], [side]: run.transcript[0][side] }];
    const commits = rows.map((r) => ({ round: r.round, cardId: r.p2, p1Locked: null }));
    assert.throws(() => replayEncounter(run.seed, rows, commits), Error);
  }
});

test("rounds cannot be duplicated, skipped or reordered", () => {
  const run = engineRun(17, undefined, 2);
  for (const rows of [
    [run.transcript[0], { ...run.transcript[1], round: 1 }],
    [run.transcript[0], { ...run.transcript[1], round: 3 }],
    [...run.transcript].reverse(),
  ]) {
    const commits = rows.map((r) => ({ round: r.round, cardId: r.p2, p1Locked: null }));
    assert.throws(() => replayEncounter(run.seed, rows, commits), Error);
  }
});

test("a legal remaining pair and recorded commit cannot extend a terminal match", () => {
  const run = findRun((r) => r.transcript.length < 7);
  const extra = { round: run.state.round + 1, p1: run.state.p1Hand[0].id, p2: run.state.p2Hand[0].id };
  assert.throws(() => replayEncounter(run.seed, [...run.transcript, extra],
    [...run.commits, { round: extra.round, cardId: extra.p2, p1Locked: null }]), Error);
});

test("client scores, attempts and labels are ignored and stripped without mutating inputs", () => {
  const run = engineRun(17, undefined, 3);
  const rows = Object.freeze(run.transcript.map((r) => Object.freeze({
    ...r, p1Score: 999999, p2Score: -800, aiAttempt: "forged", note: "EXECUTED", klein: "Fake",
  })));
  const commits = Object.freeze(run.commits.map((c) => Object.freeze({ ...c })));
  const actual = replayEncounter(run.seed, rows, commits);
  assert.deepEqual(actual.state, run.state);
  assert.deepEqual(actual.transcript, run.transcript);
  assert.deepEqual(actual, replay(run));
  assert.equal(rows[0].p1Score, 999999);
  assert.notEqual(actual.transcript[0], rows[0]);
});

test("results label canonical cards and report points separately from swapped or wiped totals", () => {
  const cases = [
    { p1: "paladin", p2: "bandit", you: "Paladin [2 GOOD]", klein: "Bandit [1 BAD]",
      youPts: 1, kleinPts: 0, youScore: 1, kleinScore: 0, note: undefined },
    { p1: "reversal", p2: "bandit", you: "Reversal [trick]", klein: "Bandit [1 BAD]",
      youPts: 5, kleinPts: 0, youScore: 0, kleinScore: 5, note: "SWAP!" },
    { p1: "seraph", p2: "executioner", you: "Seraph [10 GOOD]", klein: "Executioner [trick]",
      youPts: 10, kleinPts: 0, youScore: 0, kleinScore: 0, note: "EXECUTED" },
  ] as const;
  for (const { p1, p2, ...expected } of cases) {
    const actual = replay(firstRound(p1, p2));
    assert.deepEqual(actual.results, [{ round: 1, ...expected }]);
  }
});

test("active effects are described from resolved flags including coexisting soft-void effects", () => {
  for (const [p1, p2, note] of [
    ["echo", "bandit", "VOID, NEXT ×2"],
    ["eclipse", "bandit", "VOID, ECLIPSE"],
    ["echo", "eclipse", "VOID, NEXT ×2, ECLIPSE"],
    ["oracle", "echo", "VOID, NEXT ×2, ORACLE"],
    ["oracle", "eclipse", "VOID, ECLIPSE, ORACLE"],
  ] as const) {
    const run = firstRound(p1, p2);
    const actual = replay(run);
    assert.equal(actual.results.length, 1);
    assert.equal(actual.results[0].note, note);
    assert.deepEqual(actual.outcomes[0], run.reveals[0].outcome);
    if (p1 === "oracle") assert.equal(actual.playerPeeked.length, 2);
  }
});

for (const blocker of ["ward", "void"] as const) {
  for (const effect of ["oracle", "echo", "eclipse", "reversal", "executioner"] as const) {
    test(`${blocker} blocks ${effect} without reporting the cancelled effect`, () => {
      for (const [p1, p2] of [[effect, blocker], [blocker, effect]] as const) {
        const actual = replay(firstRound(p1, p2));
        assert.equal(actual.outcomes.length, 1);
        assert.equal(actual.results[0].note, blocker === "ward" ? "WARD" : "VOID");
        const outcome = actual.outcomes[0];
        assert.equal(outcome.voided, blocker === "void");
        assert.equal(outcome.wardBlocked, blocker === "ward");
        assert.equal(outcome.echoNext, false);
        assert.equal(outcome.eclipseFired, false);
        assert.equal(outcome.reversalSwapped, false);
        assert.equal(outcome.scoreWiped, null);
        assert.equal(outcome.peek, null);
        assert.deepEqual(actual.playerPeeked, []);
      }
    });
  }
}

test("Void also suppresses Ward's block and award", () => {
  const actual = replay(firstRound("ward", "void"));
  assert.equal(actual.results.length, 1);
  assert.equal(actual.results[0].note, "VOID");
  assert.equal(actual.results[0].youPts, 0);
  assert.equal(actual.results[0].kleinPts, 0);
  assert.equal(actual.outcomes[0].wardBlocked, false);
});

test("player Oracle knowledge uses seeded events and expires only as exposed cards burn", () => {
  const first = firstRound("oracle", "paladin");
  const peek = first.reveals[0].peekedCards;
  assert.ok(peek && peek.side === "p1");
  assert.equal(peek.cards.length, 2);
  const run = engineRun(first.seed, (state) => state.round === 1 ? ["oracle", "paladin"] : [
    state.p1Hand.find((c) => c.kind === "number")!.id, peek.cards[state.round - 2].id,
  ], 3);
  const one = replayEncounter(run.seed, run.transcript.slice(0, 1), run.commits);
  assert.deepEqual(one.playerPeeked, peek.cards);
  assert.deepEqual(one.state.peeked, []);
  assert.equal(one.state.rngState, first.state.rngState);
  assert.notEqual(one.state.rngState, first.states[0].rngState);
  const two = replayEncounter(run.seed, run.transcript.slice(0, 2), run.commits);
  assert.deepEqual(two.playerPeeked, [peek.cards[1]]);
  assert.ok(two.state.p2Hand.some((c) => c.id === peek.cards[1].id));
  assert.deepEqual(replay(run).playerPeeked, []);
  assert.deepEqual(replayEncounter(run.seed, run.transcript.slice(0, 1), run.commits), one);
});

test("Klein's Oracle remains engine knowledge and does not leak into playerPeeked", () => {
  const run = firstRound("paladin", "oracle");
  const peek = run.reveals[0].peekedCards;
  assert.ok(peek && peek.side === "p2");
  const actual = replay(run);
  assert.equal(actual.outcomes.length, 1);
  assert.equal(actual.outcomes[0].peek?.side, "p2");
  assert.deepEqual(actual.state.peeked, peek.cards);
  assert.deepEqual(actual.playerPeeked, []);
});
