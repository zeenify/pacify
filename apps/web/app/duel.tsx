/* DUEL — THE TABLE. P5-collage layout: student portrait looms across the top,
   a perspective card table takes the middle, your hand fans at the bottom edge.
   Mechanics unchanged: engine-dealt hands + stateful /ai-pick chain. */
import { View, Text, Pressable, StyleSheet, Platform, Image, useWindowDimensions } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { NUMBERS, TRICKS, dealHands, resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, cardById, type Card, type CardId, type ResolveOutput } from "@pacify/engine";
import { api } from "../lib/api";
import { playHover, playClick, playCardPop } from "../lib/sfx";

const web = Platform.OS === "web";

type Phase = "commit" | "reveal" | "over";

/* The reveal is a choreographed step sequence so new players can watch the game
   teach itself: showdown hold → flip → power countdown → award → trick cinematics. */
type SeqStep =
  | { kind: "showdown"; ms: number }
  | { kind: "flip"; ms: number }
  | { kind: "shieldbreak"; ms: number }
  | { kind: "clash"; ms: number; mode: "power" | "shield" | "tie"; you?: number; klein?: number; ticks?: number; align?: "good" | "bad" }  | { kind: "award"; ms: number; p1After: number; p2After: number; p1Pts?: number; p2Pts?: number }
  | { kind: "trick"; ms: number; trick: string; p1After?: number; p2After?: number; peekCards?: Card[]; preP1?: number; preP2?: number; wipedSide?: "p1" | "p2"; targetCard?: Card; youCard?: Card; kleinCard?: Card }
  | { kind: "multmash"; ms: number; mult: number; r7: boolean; echo: boolean; base: number; final: number; side: "p1" | "p2" }
  | { kind: "drain"; ms: number; side: "p1" | "p2"; from: number; tickMs: number }
  | { kind: "idle"; ms: number };

const TRICK_SEQ: Record<string, { title: string; sub: string }> = {
  void: { title: "VOID", sub: "The round is nullified — no points scored, both cards burn." },
  eclipse: { title: "ECLIPSE", sub: "The round is voided — and SHIELDS go DOWN for 2 rounds." },
  echo: { title: "ECHO", sub: "The round is voided — next round's points are DOUBLED." },
  ward: { title: "BLOCKED", sub: "Ward stops the opposing trick cold and scores a flat +5." },
  reversal: { title: "REVERSAL", sub: "Total scores are SWAPPED — the tables turn." },
  oracle: { title: "ORACLE", sub: "You peeked 2 of the opponent's cards." },
};
const MULT_INFO = "Points scored THIS round are multiplied. Round 7 always doubles (×2). Echo doubles the NEXT round instead — the bonuses add up, capped at ×3 (Echo during Round 7 = ×3).";
const SHIELD_INFO = "Eclipse disabled alignment shields. Normally Good vs Good or Bad vs Bad cancels the clash — with shields off, same alignments score the full power difference. Shields return after the counter hits 0.";
type RoundResultRow = {
  round: number;
  klein: string;
  you: string;
  kleinPts: number;
  youPts: number;
  kleinScore: number;
  youScore: number;
  note?: string;
};
type TranscriptRow = { round: number; p1: string; p2: string; p1Score: number; p2Score: number };

const CATALOGUE: readonly Card[] = [...NUMBERS, ...TRICKS];
const cardLabel = (c: Card) =>
  c.kind === "trick" ? `${c.name} [trick]` : `${c.name} [${c.power}${c.align === "bad" ? " BAD" : " GOOD"}]`;
const TRICK_HINT: Record<string, string> = {
  Void: "VOID ROUND", Oracle: "PEEK 2", Reversal: "SWAP SCORES", Ward: "BLOCK +5",
  Echo: "VOID · NEXT ×2", Executioner: "BEHEAD 7+", Eclipse: "VOID · NO SHIELDS ×2",
};
const OPPONENTS: Record<number, { name: string; portrait: string; rank: string }> = {
  1: { name: "KLEIN", portrait: "/students-portrait/2clubs-portrait.png", rank: "2♣" },
  2: { name: "SEAT II", portrait: "/students/3clubs.png", rank: "3♣" },
  3: { name: "SEAT III", portrait: "/students/4clubs.png", rank: "4♣" },
};

/* ---------- ANIM LAB — open /duel?demo=1 (loop one) or /duel?demo=all (playlist).
   Each scenario runs the REAL doReveal, so what you judge here is what ships. ---------- */
type DemoScenario = {
  key: string; label: string;
  you: CardId; klein: CardId;
  youScore?: number; kleinScore?: number; round?: number; shieldOff?: number; echoNext?: boolean;
};
const DEMO_SCENARIOS: DemoScenario[] = [
  { key: "countdown", label: "COUNTDOWN 10v7", you: "seraph", klein: "vampire" },
  { key: "shield", label: "SAME TYPE NULLIFY", you: "wizard", klein: "knight" },
  { key: "shieldoff", label: "SAME TYPE · SHIELDS OFF", you: "wizard", klein: "knight", shieldOff: 2 },
  { key: "tie", label: "EQUAL POWER TIE", you: "ward", klein: "witch" },
  { key: "execfail", label: "EXECUTIONER FAIL", you: "executioner", klein: "knight" },
  { key: "r7", label: "R7 ×2 CLASH", you: "angel", klein: "ogre", round: TOTAL_ROUNDS },
  { key: "r7echo", label: "R7 + ECHO ×3", you: "seraph", klein: "bandit", round: TOTAL_ROUNDS, echoNext: true },
  { key: "void", label: "VOID", you: "void", klein: "angel" },
  { key: "voidklein", label: "VOID · KLEIN'S", you: "angel", klein: "void" },
  { key: "echo", label: "ECHO", you: "echo", klein: "demon" },
  { key: "echoklein", label: "ECHO · KLEIN'S", you: "demon", klein: "echo" },
  { key: "echoclip", label: "ECHO + ECLIPSE", you: "echo", klein: "eclipse" },
  { key: "wardyou", label: "WARD · YOURS", you: "ward", klein: "oracle" },
  { key: "echocarry", label: "ECHO CARRY ×2", you: "demon", klein: "paladin", round: 4, echoNext: true },
  { key: "echowaste", label: "ECHO WASTED", you: "angel", klein: "seraph", echoNext: true },
  { key: "shieldtick", label: "SHIELD · TICKDOWN", you: "angel", klein: "vampire", shieldOff: 2 },
  { key: "shieldlast", label: "SHIELD · LAST TURN", you: "angel", klein: "vampire", shieldOff: 1 },
  { key: "eclipse", label: "ECLIPSE", you: "eclipse", klein: "seraph" },
  { key: "ward", label: "WARD BLOCK", you: "oracle", klein: "ward" },
  { key: "reversal", label: "REVERSAL 9v2", you: "reversal", klein: "angel", youScore: 9, kleinScore: 2 },
  { key: "executioner", label: "EXECUTIONER", you: "executioner", klein: "valkyrie", youScore: 5, kleinScore: 6 },
  { key: "execrev", label: "EXEC vs REVERSAL", you: "executioner", klein: "reversal", youScore: 9, kleinScore: 4 },
  { key: "oracle", label: "ORACLE PEEK", you: "oracle", klein: "vampire" },
];

export default function Duel() {
  const { student: studentParam, demo: demoParam } = useLocalSearchParams<{ student?: string; demo?: string }>();
  const demoParamStr = Array.isArray(demoParam) ? demoParam[0] : demoParam;
  const demoMode = !!demoParamStr;
  const studentId = Number(studentParam) || 1;
  const opp = OPPONENTS[studentId] ?? OPPONENTS[1];

  // The duel is designed on a fixed 1600x900 stage and scaled to fit the window,
  // so proportions hold on every screen instead of breaking on smaller ones.
  const { width: winW, height: winH } = useWindowDimensions();
  const stageScale = Math.min(winW / DESIGN_W, winH / DESIGN_H);

  const [phase, setPhase] = useState<Phase>("commit");
  const [round, setRound] = useState(1);
  const [p1Hand, setP1Hand] = useState<Card[]>([]);
  const [p2Count, setP2Count] = useState(7);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [p1Locked, setP1Locked] = useState<Card | null>(null);
  const [p2Locked, setP2Locked] = useState<Card | null>(null);
  const [echoNext, setEchoNext] = useState(false);
  /* echo's ×2 chip parked at the standby spot — keeps the chip on screen from the
     moment the flight lands until the real multiplier chip takes over (no gap) */
  const [chipStandby, setChipStandby] = useState(false);
  /* eclipse's shield chip parked at its corner slot until the real one appears */
  const [shieldStandby, setShieldStandby] = useState(false);
  /* spent-chip deaths: echo dies at the end of its turn when nothing scored,
     eclipse dies when its last shield turn is used up */
  const [echoChipDying, setEchoChipDying] = useState(false);
  const [shieldChipDying, setShieldChipDying] = useState(false);
  const multAppliedRef = useRef(true);
  const [shieldOff, setShieldOff] = useState(0);
  const [oppPeeked, setOppPeeked] = useState<Card[]>([]);
  const [kleinMsg, setKleinMsg] = useState("");
  const [kleinThinking, setKleinThinking] = useState(true);
  const [msgVisible, setMsgVisible] = useState(false);
  const [peekNote, setPeekNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<"win" | "loss" | "draw" | null>(null);
  const [saved, setSaved] = useState(false);
  const [tableArt, setTableArt] = useState(false);
  const [seqSteps, setSeqSteps] = useState<SeqStep[]>([]);
  const [seqIdx, setSeqIdx] = useState(0);
  const [clashTick, setClashTick] = useState(0);
  const [clashWinner, setClashWinner] = useState<null | "p1" | "p2" | "both">(null);
  const [execFailSide, setExecFailSide] = useState<null | "p1" | "p2">(null);
  const [drainSide, setDrainSide] = useState<null | "p1" | "p2">(null);
  /* one "-1" pop per drain tick, fanned beside the victim's chip */
  const [drainPops, setDrainPops] = useState<{ id: number; n: number; side: "p1" | "p2" }[]>([]);
  const [seqSubTick, setSeqSubTick] = useState(0);
  const [statusInfo, setStatusInfo] = useState<"mult" | "shield" | null>(null);

  const chain = useRef<{ interactionId: string | null; results: RoundResultRow[]; transcript: TranscriptRow[]; seed: number; rngState: number; shieldOff: number; echoNext: boolean; p2Hand: Card[] }>({
    interactionId: null, results: [], transcript: [], seed: 0, rngState: 0, shieldOff: 0, echoNext: false, p2Hand: [],
  });
  const p1Lock = useRef<Card | null>(null); // Klein's pick may land after ours — refs survive the async gap
  /* deferred reveal-side state (echo/shield) — applied when the sequence ends */
  const postRevealRef = useRef<{ echoNext: boolean; shieldOff: number }>({ echoNext: false, shieldOff: 0 });
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalResultRef = useRef<"win" | "loss" | "draw" | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; if (msgTimer.current) clearTimeout(msgTimer.current); }, []);

  const deal = useCallback(() => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
    const [{ p1Hand, p2Hand }, rngState] = dealHands(CATALOGUE, seed);
    chain.current = { interactionId: null, results: [], transcript: [], seed, rngState, shieldOff: 0, echoNext: false, p2Hand: [...p2Hand] };
    p1Lock.current = null;
    setP1Hand(p1Hand); setP2Count(p2Hand.length);
    setP1Score(0); setP2Score(0);
    setRound(1); setP1Locked(null); setP2Locked(null);
    setEchoNext(false); setShieldOff(0); setChipStandby(false); setShieldStandby(false);
    setEchoChipDying(false); setShieldChipDying(false);
    setOppPeeked([]); setKleinMsg(""); setPeekNote("");
    setError(null); setFinalResult(null); setSaved(false);
    finalResultRef.current = null;
    setSeqSteps([]); setSeqIdx(0); setStatusInfo(null); setClashTick(0);
    return { p1Hand, p2Hand };
  }, []);

  /** Klein locks via /ai-pick — stateful chain head + round results go with it.
   *  Runs in the BACKGROUND: the player picks whenever they like; the round
   *  resolves the moment both cards are in. */
  const lockAi = useCallback(async (viewRound: number, kleinHand: Card[], youHand: Card[], kleinScore: number, youScore: number, oppPeekedCards: Card[], burnedCards: Card[], shieldOffNow: number, echoNow: boolean) => {
    const view = {
      myHand: kleinHand, oppHand: youHand, peeked: [...youHand], oppPeeked: oppPeekedCards, burned: burnedCards,
      shieldOff: shieldOffNow, myScore: kleinScore, oppScore: youScore, round: viewRound, echoNext: echoNow,
      rngState: chain.current.rngState, studentId: 2, phase: "commit",
    };
    const res = await api<any>("/ai-pick", {
      view, characterId: 2,
      interactionId: chain.current.interactionId ?? undefined,
      roundResults: chain.current.results,
    });
    if (res.interactionId) chain.current.interactionId = res.interactionId;
    return res;
  }, []);

  const startRound = useCallback(async (roundNo: number, kleinHand: Card[], youHand: Card[], kleinScore: number, youScore: number, oppPeekedCards: Card[], burnedCards: Card[], shieldOffNow: number, echoNow: boolean) => {
    setPhase("commit");
    setError(null);
    setKleinThinking(true);
    setMsgVisible(false);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    try {
      const data = await lockAi(roundNo, kleinHand, youHand, kleinScore, youScore, oppPeekedCards, burnedCards, shieldOffNow, echoNow);
      if (!alive.current) return;
      setP2Locked(data.picked);
      setP2Count((n) => n - 1);
      chain.current.p2Hand = chain.current.p2Hand.filter((c) => c.id !== data.picked.id);
      setKleinThinking(false);
      // Klein's line lands the moment it arrives — not held back for the reveal.
      if (data.message) {
        setKleinMsg(data.message);
        setMsgVisible(true);
        if (msgTimer.current) clearTimeout(msgTimer.current);
        msgTimer.current = setTimeout(() => { if (alive.current) setMsgVisible(false); }, MSG_MS);
      }
      // If the player already locked, this was the last piece — resolve now.
      if (p1Lock.current) {
        doReveal(p1Lock.current, data.picked, {
          round: roundNo, echoNext: echoNow, shieldOff: shieldOffNow,
          youScore: youScore, kleinScore: kleinScore,
        });
      }
    } catch (e: any) {
      if (!alive.current) return;
      chain.current.interactionId = null;
      setKleinThinking(false);
      setError(e?.message ?? "AI PICK FAILED");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockAi]);

  /** Resolves the round once BOTH cards exist. Pure arg-driven — safe to call
   *  from either the player's pick or Klein's late return. Instead of applying
   *  the result instantly it builds the TEACHING SEQUENCE: showdown → flip →
   *  power countdown → award → per-trick cinematics. Scores land on screen at
   *  the step where they happen (award, then reversal/executioner patches). */
  const doReveal = (you: Card, klein: Card, ctx: { round: number; echoNext: boolean; shieldOff: number; youScore: number; kleinScore: number }) => {
    const out = resolveRound({
      p1Card: you, p2Card: klein, p1Score: ctx.youScore, p2Score: ctx.kleinScore,
      round: ctx.round, echoNext: ctx.echoNext, shieldOff: ctx.shieldOff,
    });
    setPhase("reveal");
    // echo/shield state updates are DEFERRED to the sequence end — the clash chip
    // must keep showing the multiplier ACTIVE this round while the reveal plays;
    // the echo carry flips off only after the award has flown.
    postRevealRef.current = { echoNext: out.echoNext, shieldOff: out.shieldOffAfter };
    if (out.peek?.side === "p1") {
      const seen = [...chain.current.p2Hand].sort(() => Math.random() - 0.5).slice(0, out.peek.count);
      setOppPeeked((p) => [...p, ...seen]);
      setPeekNote(`YOU PEEKED: ${seen.map((c) => c.name).join(" · ")}`);
    } else {
      setPeekNote("");
    }
    chain.current.results.push({
      round: ctx.round, klein: cardLabel(klein), you: cardLabel(you),
      kleinPts: out.p2Points, youPts: out.p1Points,
      kleinScore: out.p2Score, youScore: out.p1Score,
      note: [out.voided && "VOID", out.wardBlocked && "WARD", out.reversalSwapped && "SWAP!",
        out.scoreWiped && "EXECUTED", out.echoNext && "NEXT ×2", out.eclipseFired && "ECLIPSE"].filter(Boolean).join(", ") || undefined,
    });
    chain.current.transcript.push({ round: ctx.round, p1: you.id, p2: klein.id, p1Score: out.p1Score, p2Score: out.p2Score });
    chain.current.shieldOff = out.shieldOffAfter;
    chain.current.echoNext = out.echoNext;

    const preP1 = ctx.youScore + out.p1Points; // totals before Reversal/Executioner rewrite them
    const preP2 = ctx.kleinScore + out.p2Points;

    const steps: SeqStep[] = [{ kind: "showdown", ms: 3000 }, { kind: "flip", ms: 900 }];
    // THE CLASH MULTIPLIER — R7 climax (+1) and Echo carry (+1) stack to ×3.
    // It only matters when points actually flow, so the mash plays between the
    // clash countdown and the award: the ×N slams ON, then the multiplied points fly.
    const r7Mult = ctx.round === TOTAL_ROUNDS;
    const multTotal = (r7Mult ? 2 : 1) + (ctx.echoNext ? 1 : 0);
    const multScored = multTotal > 1 && (out.p1Points > 0 || out.p2Points > 0);
    multAppliedRef.current = multScored; // did this round actually spend the armed multiplier?
    const multSide: "p1" | "p2" = out.p1Points > 0 ? "p1" : "p2";
    const multBase = Math.max(out.p1Points, out.p2Points) / multTotal;
    // Eclipse from LAST round is why shields are down NOW — teach it right after the flip,
    // once (the first round of the 2-round window; the felt token covers the rest).
    if (ctx.shieldOff >= 2) steps.push({ kind: "shieldbreak", ms: 3200 });
    const yVoid = you.kind === "trick" && you.name === "Void";
    const kVoid = klein.kind === "trick" && klein.name === "Void";
    const yEcho = you.kind === "trick" && you.name === "Echo";
    const kEcho = klein.kind === "trick" && klein.name === "Echo";
    const yEcl = you.kind === "trick" && you.name === "Eclipse";
    const kEcl = klein.kind === "trick" && klein.name === "Eclipse";

    if (yVoid || kVoid) {
      // VOID — the void card mutates into a maw ON the felt and devours the other card
      steps.push({ kind: "trick", ms: 4800, trick: "void", youCard: you, kleinCard: klein });
    } else {
      if (yEcl || kEcl) {
        steps.push({ kind: "trick", ms: 4000, trick: "eclipse", youCard: you, kleinCard: klein });
      }
      if (yEcho || kEcho) {
        steps.push({ kind: "trick", ms: 4000, trick: "echo", youCard: you, kleinCard: klein });
      }
      if (out.wardBlocked) {
        steps.push({ kind: "trick", ms: 5000, trick: "ward", youCard: you, kleinCard: klein });
        if (multScored) {
          steps.push({
            kind: "multmash", ms: 2400, mult: multTotal,
            r7: r7Mult, echo: !!ctx.echoNext, base: multBase, final: Math.max(out.p1Points, out.p2Points), side: multSide,
          });
        }
        steps.push({ kind: "award", ms: 1400, p1After: preP1, p2After: preP2 });
      } else if (!out.voided) {
        // THE COUNTDOWN — both powers tick down; whoever still has numbers scores the difference.
        const yp = you.power ?? 0, kp = klein.power ?? 0;
        const sameShield = you.kind === "number" && klein.kind === "number" && you.align === klein.align && ctx.shieldOff === 0;
        if (sameShield) {
          // the nullify cinematic — both powers shown, smashed together, stamped void
          steps.push({ kind: "clash", ms: 3600, mode: "shield", you: yp, klein: kp, align: (you as any).align });
        } else if (yp === kp) {
          // same countdown as a power clash — but both numbers die TOGETHER
          steps.push({ kind: "clash", ms: 500 * (yp + 1) + 700, mode: "tie", you: yp, klein: kp });
        } else {
          // countdown stops the moment the WEAKER power hits 0 — the winner's
          // leftover is the score, and it freezes highlighted beside their card.
          const ticks = Math.min(yp, kp) + 1;
          steps.push({ kind: "clash", ms: 500 * ticks + 700, mode: "power", you: yp, klein: kp, ticks });
        }
        if (multScored) {
          steps.push({
            kind: "multmash", ms: 2400, mult: multTotal,
            r7: r7Mult, echo: !!ctx.echoNext, base: multBase, final: Math.max(out.p1Points, out.p2Points), side: multSide,
          });
        }
        steps.push({ kind: "award", ms: 1500, p1After: preP1, p2After: preP2, p1Pts: out.p1Points, p2Pts: out.p2Points });
      }
    }
    // failed execution — the blade found no 7+ NUMBER target (e.g. Exec vs Reversal:
    // tricks can't be executed). The MISFIRE plays FIRST, then the swap lands.
    const execFailed = !out.scoreWiped && (
      (you.id === "executioner" && !(klein.kind === "number" && (klein.power ?? 0) >= 7)) ||
      (klein.id === "executioner" && !(you.kind === "number" && (you.power ?? 0) >= 7))
    );
    if (execFailed) {
      steps.push({
        kind: "trick", ms: 3700, trick: "execfail",
        wipedSide: you.id === "executioner" ? "p1" : "p2",
        targetCard: you.id === "executioner" ? klein : you,
      });    }
    if (out.reversalSwapped) steps.push({ kind: "trick", ms: 2600, trick: "reversal", p1After: out.p1Score, p2After: out.p2Score, preP1, preP2 });
    if (out.scoreWiped) {
      // the wipe shows as the takeover; the chip then DRAINS to 0 beat-by-beat —
      // the score state only lands when the drain finishes. Tick rate adapts so
      // the whole drain holds ~2s whether the victim had 5 points or 14.
      const victim = out.scoreWiped.side;
      const from = victim === "p1" ? preP1 : preP2;
      steps.push({ kind: "trick", ms: 4400, trick: "executioner", preP1, preP2, wipedSide: victim, targetCard: victim === "p1" ? you : klein });
      if (from > 0) {
        const tickMs = Math.max(90, Math.min(400, Math.floor(2000 / from)));
        steps.push({ kind: "drain", ms: tickMs * from + 700, side: victim, from, tickMs });
      }
    }
    if (out.peek?.side === "p1") {
      const seen = [...chain.current.p2Hand].sort(() => Math.random() - 0.5).slice(0, out.peek.count);
      steps.push({ kind: "trick", ms: 2600, trick: "oracle", peekCards: seen });
    }
    steps.push({ kind: "idle", ms: 500 });

    setSeqSteps(steps);
    setSeqIdx(0);
    setClashTick(0);
    const done = ctx.round >= TOTAL_ROUNDS || out.p1Score >= SCORE_THRESHOLD || out.p2Score >= SCORE_THRESHOLD;
    if (done && !demoMode) {
      const result = out.p1Score > out.p2Score ? "win" : out.p2Score > out.p1Score ? "loss" : "draw";
      setFinalResult(result);
      finalResultRef.current = result;
    }
    if (!demoMode) api<any>("/campaign/result", {
      studentId, seed: chain.current.seed, p1Score: out.p1Score, p2Score: out.p2Score,
      rounds: ctx.round, transcript: chain.current.transcript,
    }).then((d) => setSaved(!!d?.ok)).catch(() => setSaved(false));
  };

  /* ---------- ANIM LAB runner: sets the table for a scenario and fires the real
     doReveal. No server, no AI, no hand — pure reveal choreography. ---------- */
  const demoKeyRef = useRef<string>(DEMO_SCENARIOS[0].key);
  const runDemo = (key: string) => {
    const sc = DEMO_SCENARIOS.find((s) => s.key === key) ?? DEMO_SCENARIOS[0];
    demoKeyRef.current = sc.key;
    const you = cardById(sc.you);
    const klein = cardById(sc.klein);
    const ctx = {
      round: sc.round ?? 3, echoNext: sc.echoNext ?? false, shieldOff: sc.shieldOff ?? 0,
      youScore: sc.youScore ?? 0, kleinScore: sc.kleinScore ?? 0,
    };
    setKleinThinking(false);
    setMsgVisible(false);
    setP1Hand([]); setP2Count(0); setPeekNote(""); setError(null);
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    setP1Score(ctx.youScore); setP2Score(ctx.kleinScore);
    setRound(ctx.round); setEchoNext(ctx.echoNext); setShieldOff(ctx.shieldOff);
    setChipStandby(ctx.echoNext);
    setShieldStandby(ctx.shieldOff > 0);
    setP1Locked(you); setP2Locked(klein); p1Lock.current = you;
    setPhase("commit");
    doReveal(you, klein, ctx);
  };

  /* ANIM LAB loop — when a run settles, replay it (or advance the playlist). */
  useEffect(() => {
    if (!demoMode || phase !== "reveal") return;
    const settled = seqSteps.length > 0 && seqIdx >= seqSteps.length;
    if (!settled) return;
    const t = setTimeout(() => {
      if (!alive.current) return;
      if (demoParamStr === "all") {
        const i = DEMO_SCENARIOS.findIndex((s) => s.key === demoKeyRef.current);
        runDemo(DEMO_SCENARIOS[(i + 1) % DEMO_SCENARIOS.length].key);
      } else {
        runDemo(demoKeyRef.current);
      }
    }, 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, phase, seqIdx, seqSteps]);

  /* Sequence driver — advances through the steps; score state lands on the felt
     at the exact step where the story puts it. */
  useEffect(() => {
    const step = seqSteps[seqIdx];
    if (!step) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step.kind === "clash" && (step.mode === "power" || step.mode === "tie")) {
      setClashTick(0);
      let t = 0;
      // freeze at the freeze point — the weaker power hitting 0 stops BOTH numbers,
      // and that same tick triggers the winner/loser card FX (tie = BOTH shatter)
      const maxTick = Math.min(step.you ?? 0, step.klein ?? 0);
      if (maxTick === 0) setClashWinner((step.you ?? 0) === (step.klein ?? 0) ? "both" : (step.you ?? 0) > (step.klein ?? 0) ? "p1" : "p2");
      interval = setInterval(() => {
        t += 1;
        if (t <= maxTick) {
          setClashTick(t);
          if (t === maxTick) {
            setClashWinner((step.you ?? 0) === (step.klein ?? 0) ? "both" : (step.you ?? 0) > (step.klein ?? 0) ? "p1" : "p2");
          }
        }
      }, 500);
    }
    if (step.kind === "trick" && step.trick === "execfail") {
      setExecFailSide(step.wipedSide ?? "p1");
    }
    if (step.kind === "trick" && step.trick === "eclipse") {
      setShieldStandby(true);
    }
    if (step.kind === "trick" && step.trick === "echo") {
      // the flight is starting — arm the standby chip so it takes over the
      // spot the moment this step ends (no gap before the real chip appears)
      setChipStandby(true);
    }
    if (step.kind === "drain") {
      // the victim's chip ticks down to 0, one number at a time — each tick
      // throws a big "-1" beside the chip so the drop can't be missed
      setDrainSide(step.side);
      let d = step.from;
      interval = setInterval(() => {
        d -= 1;
        if (d >= 0) {
          (step.side === "p1" ? setP1Score : setP2Score)(d);
          setDrainPops((pops) => [...pops, { id: Date.now() + Math.random(), n: step.from - d, side: step.side }]);
        }
        if (d <= 0) clearInterval(interval!);
      }, step.tickMs);
    }
    if (step.kind === "showdown") {
      setSeqSubTick(0);
      let t = 0;
      interval = setInterval(() => { t += 1; setSeqSubTick(t); }, 1000);
    }
    const timer = setTimeout(() => {
      if (interval) clearInterval(interval);
      if (step.kind === "drain") setDrainSide(null); // pulse ends with the drain — 0 is the last tick
      if (step.kind === "drain") setTimeout(() => { if (alive.current) setDrainPops([]); }, 900); // let the last pops finish
      if ((step.kind === "award" || step.kind === "trick") && step.p1After !== undefined) {
        setP1Score(step.p1After);
        setP2Score(step.p2After ?? 0);
      }
      if (seqIdx + 1 >= seqSteps.length) {
        // sequence over — the echo/shield state the round produced lands NOW
        // (the chip showed the active multiplier through the whole reveal)
        setEchoNext(postRevealRef.current.echoNext);
        setChipStandby(postRevealRef.current.echoNext);
        setShieldStandby(postRevealRef.current.shieldOff > 0);
        setShieldOff(postRevealRef.current.shieldOff);
        // chip deaths: echo spent with nothing to show for it, shield used up
        if (echoNext && !postRevealRef.current.echoNext && !multAppliedRef.current) {
          setEchoChipDying(true);
          setTimeout(() => { if (alive.current) setEchoChipDying(false); }, 900);
        }
        if (shieldOff > 0 && postRevealRef.current.shieldOff === 0) {
          setShieldChipDying(true);
          setTimeout(() => { if (alive.current) setShieldChipDying(false); }, 900);
        }
        // settle into reveal, then the finale if the match ended
        if (finalResultRef.current) {
          setTimeout(() => { if (alive.current) setPhase("over"); }, 1200);
        }
      }
      setSeqIdx((i) => i + 1);
    }, step.ms);
    return () => { clearTimeout(timer); if (interval) clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seqIdx, seqSteps]);

  useEffect(() => {
    if (demoMode) {
      const first = DEMO_SCENARIOS.find((s) => s.key === demoParamStr)?.key ?? DEMO_SCENARIOS[0].key;
      runDemo(first);
      return;
    }
    const { p1Hand, p2Hand } = deal();
    startRound(1, p2Hand, p1Hand, 0, 0, [], [], 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (card: Card) => {
    if (p1Locked || phase !== "commit") return;
    playCardPop();
    setP1Hand((h) => h.filter((c) => c.id !== card.id));
    setP1Locked(card);
    p1Lock.current = card;
    // Klein already locked? Clash now. Otherwise it resolves when his pick lands —
    // our card sits face-down on the felt in the meantime.
    if (p2Locked) {
      doReveal(card, p2Locked, { round, echoNext, shieldOff, youScore: p1Score, kleinScore: p2Score });
    }
  };

  const onNextRound = () => {
    if (phase !== "reveal") return;
    playClick();
    const nextRound = round + 1;
    setRound(nextRound);
    setP1Locked(null); setP2Locked(null); setPeekNote("");
    p1Lock.current = null;
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    startRound(nextRound, chain.current.p2Hand, p1Hand, p2Score, p1Score, oppPeeked, [], shieldOff, echoNext);
  };

  const onRematch = () => {
    playClick();
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    const { p1Hand: h1, p2Hand: h2 } = deal();
    startRound(1, h2, h1, 0, 0, [], [], 0, false);
  };

  const seqDone = seqSteps.length > 0 && seqIdx >= seqSteps.length;
  const cur = seqSteps[seqIdx] as SeqStep | undefined;
  const cardsUp = phase === "over" || (phase === "reveal" && seqIdx >= 1); // step 0 is the showdown hold; the flip is step 1 — must NOT leak into the next round's commit phase (Klein locks in the background there)
  const revealed = cardsUp;
  const mult = (round === TOTAL_ROUNDS ? 2 : 1) + (echoNext ? 1 : 0);
  const fanAngle = (i: number, n: number) => (i - (n - 1) / 2) * 5;
  /* power-clash countdown state — shared by both tally plates and the center FX.
     Runs for power clashes AND ties; `tie` flips the finish into mutual destruction. */
  const pow = (() => {
    if (!cur || cur.kind !== "clash" || (cur.mode !== "power" && cur.mode !== "tie") || cur.you === undefined || cur.klein === undefined) return null;
    const min = Math.min(cur.you, cur.klein);
    return {
      youLeft: Math.max(0, cur.you - clashTick), kleinLeft: Math.max(0, cur.klein - clashTick),
      finish: clashTick >= min, youWins: cur.you > cur.klein, tie: cur.you === cur.klein, min,
    };
  })();

  return (
    <View style={st.viewport as any}>
      <View style={[st.stage, { transform: [{ scale: stageScale }] } as any]}>
      {/* ---------- global keyframes ---------- */}
      {web && (
        <View pointerEvents="none" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" } as any}>
          <style>{`
            @keyframes dFloat{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-10px) rotate(-1deg)}}
            @keyframes dHandIn{from{opacity:0;transform:translateY(90px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
            @keyframes dFlipIn{0%{transform:perspective(700px) rotateX(78deg) translateY(26px) scale(.86);opacity:0}60%{transform:perspective(700px) rotateX(-12deg) translateY(0) scale(1.04);opacity:1}100%{transform:perspective(700px) rotateX(0) translateY(0) scale(1)}}
            @keyframes dImpact{0%{transform:translate(0,0) rotate(0)}20%{transform:translate(-9px,5px) rotate(-1.2deg)}40%{transform:translate(8px,-6px) rotate(1deg)}60%{transform:translate(-6px,3px) rotate(-.6deg)}80%{transform:translate(4px,-2px) rotate(.4deg)}100%{transform:translate(0,0) rotate(0)}}
            @keyframes dStampIn{0%{opacity:0;transform:scale(2.6) rotate(-18deg)}55%{opacity:1;transform:scale(.92) rotate(-8deg)}75%{transform:scale(1.08) rotate(-9deg)}100%{opacity:1;transform:scale(1) rotate(-9deg)}}
            @keyframes dBubbleIn{0%{opacity:0;transform:translateX(30px) skewX(-6deg) scale(.7)}70%{transform:translateX(-4px) skewX(-6deg) scale(1.05)}100%{opacity:1;transform:translateX(0) skewX(-6deg) scale(1)}}
            @keyframes dDots{0%,100%{opacity:.25}50%{opacity:1}}
            @keyframes dStripe{from{background-position:0 0}to{background-position:84px 0}}
            @keyframes dIntroT{0%{opacity:0;transform:scale(2.4) skewX(-14deg)}35%{opacity:1;transform:scale(1) skewX(-14deg)}80%{opacity:1;transform:scale(1) skewX(-14deg)}100%{opacity:0;transform:scale(1.1) skewX(-14deg)}}
            @keyframes dIntroPanel{0%{transform:translateX(0) skewX(-14deg)}100%{transform:translateX(-130%) skewX(-14deg)}}
            @keyframes dPanelL{0%{opacity:0;transform:translateX(-60%) skewX(-12deg)}100%{opacity:1;transform:translateX(0) skewX(-12deg)}}
            @keyframes dPanelR{0%{opacity:0;transform:translateX(60%) skewX(-12deg)}100%{opacity:1;transform:translateX(0) skewX(-12deg)}}
            @keyframes dTitleSlam{0%{opacity:0;transform:scale(3) rotate(-10deg)}60%{opacity:1;transform:scale(.94) rotate(-6deg)}80%{transform:scale(1.05) rotate(-7deg)}100%{opacity:1;transform:scale(1) rotate(-7deg)}}
            @keyframes dNumSlam{0%{opacity:0;transform:scale(2.2)}100%{opacity:1;transform:scale(1)}}
            @keyframes dPulse{0%,100%{transform:skewX(-10deg) scale(1)}50%{transform:skewX(-10deg) scale(1.04)}}
            @keyframes dLunge{0%{transform:scale(1)}35%{transform:scale(1.05) translateY(-8px)}100%{transform:scale(1)}}
            @keyframes dDotBounce{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-14px);opacity:1}}
            @keyframes dSwapL{0%{transform:translateX(-90px);opacity:0}30%{opacity:1}100%{transform:translateX(90px);opacity:1}}
            @keyframes dSwapR{0%{transform:translateX(90px);opacity:0}30%{opacity:1}100%{transform:translateX(-90px);opacity:1}}
            @keyframes dShard{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(0,-90px) rotate(220deg)}}
            @keyframes dFlyYou{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.2)}78%{opacity:1;transform:translate(-540px,122px) scale(1.45)}100%{opacity:0;transform:translate(-558px,130px) scale(1.15)}}
            @keyframes dFlyKlein{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.2)}78%{opacity:1;transform:translate(547px,-44px) scale(1.45)}100%{opacity:0;transform:translate(563px,-46px) scale(1.15)}}
            @keyframes dFlipBack{0%{transform:perspective(700px) rotateY(0deg) scale(1);opacity:1}100%{transform:perspective(700px) rotateY(92deg) scale(.94);opacity:0}}
            @keyframes dFlipFace{0%{transform:perspective(700px) rotateY(-92deg) scale(.9)}70%{transform:perspective(700px) rotateY(9deg) scale(1.04)}100%{transform:perspective(700px) rotateY(0deg) scale(1)}}
            @keyframes dShieldPop{0%{opacity:0;transform:scale(.4)}70%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
            @keyframes dNullFlash{0%{opacity:0}12%{opacity:.95}60%{opacity:.35}100%{opacity:0}}
            @keyframes dShieldWave{0%{transform:scale(.25);opacity:.95}100%{transform:scale(2.9);opacity:0}}
            @keyframes dNullSmash{0%{transform:scale(1)}25%{transform:scale(1.3)}55%{transform:scale(.9) rotate(2deg);opacity:1}100%{transform:scale(.8) rotate(4deg);opacity:.12}}
            @keyframes dTickPulse{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}
            @keyframes dLockIn{0%{transform:scale(1)}55%{transform:scale(1.55)}100%{transform:scale(1.38)}}
            @keyframes dLockOut{0%{transform:scale(1);opacity:1}100%{transform:scale(.6);opacity:.2}}
            @keyframes dCardWinY{0%{transform:scale(1);box-shadow:5px 7px 0 rgba(0,0,0,0.7)}60%{transform:scale(1.22);box-shadow:0 0 36px rgba(252,238,33,0.85), 5px 7px 0 rgba(0,0,0,0.7)}100%{transform:scale(1.15);box-shadow:0 0 30px rgba(252,238,33,0.7), 5px 7px 0 rgba(0,0,0,0.7)}}
            @keyframes dCardWinR{0%{transform:scale(1);box-shadow:5px 7px 0 rgba(0,0,0,0.7)}60%{transform:scale(1.22);box-shadow:0 0 36px rgba(255,77,94,0.85), 5px 7px 0 rgba(0,0,0,0.7)}100%{transform:scale(1.15);box-shadow:0 0 30px rgba(255,77,94,0.7), 5px 7px 0 rgba(0,0,0,0.7)}}
            @keyframes dCardLose{0%{opacity:1;transform:scale(1)}30%{transform:scale(1.05)}100%{opacity:.45;transform:scale(.94) rotate(2.5deg)}}
            @keyframes dShardOut{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(0,-120px) rotate(260deg)}}
            @keyframes dShieldSlam{0%{opacity:0;transform:scale(2.2) rotate(-16deg)}60%{opacity:1;transform:scale(.9) rotate(-6deg)}80%{transform:scale(1.08) rotate(-8deg)}100%{opacity:1;transform:scale(1) rotate(-8deg)}}
            @keyframes dSBAura{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.75;transform:scale(1.18)}}
            @keyframes dCrackIn{0%{opacity:0;transform:scale(1.7)}100%{opacity:1;transform:scale(1)}}
            @keyframes dShieldBreak{0%{opacity:1;transform:scale(1)}30%{transform:scale(1.15)}100%{opacity:0;transform:scale(.65)}}
            @keyframes dInfoPop{0%{opacity:0;transform:scale(.4) rotate(-9deg)}60%{opacity:1;transform:scale(1.08) rotate(1.8deg)}80%{transform:scale(.96) rotate(-2deg)}100%{opacity:1;transform:scale(1) rotate(-1.4deg)}}
            @keyframes dInfoFade{0%{opacity:0}100%{opacity:1}}
            @keyframes dShieldGlow{0%,100%{box-shadow:4px 4px 0 rgba(0,0,0,0.85)}50%{box-shadow:4px 4px 0 rgba(0,0,0,0.85), 0 0 22px rgba(230,0,18,0.85)}}
            @keyframes dRedPulse{0%,100%{box-shadow:0 0 0 rgba(230,0,18,0), 0 6px 18px rgba(0,0,0,0.8)}50%{box-shadow:0 0 26px rgba(230,0,18,0.85), 0 6px 18px rgba(0,0,0,0.8)}}
            @keyframes dHalfL{0%,100%{transform:rotate(-6deg) translateX(0)}50%{transform:rotate(-9deg) translateX(-3px)}}
            @keyframes dHalfR{0%,100%{transform:rotate(6deg) translateX(0)}50%{transform:rotate(9deg) translateX(3px)}}
            @keyframes dMultWobble{0%,100%{transform:rotate(-4deg) scale(1)}50%{transform:rotate(4deg) scale(1.07)}}
            @keyframes dYelPulse{0%,100%{box-shadow:0 0 0 rgba(252,238,33,0), 6px 8px 0 rgba(0,0,0,0.75)}50%{box-shadow:0 0 26px rgba(252,238,33,0.75), 6px 8px 0 rgba(0,0,0,0.75)}}
            @keyframes dSparkLine{0%{opacity:0;transform:scaleY(.4)}30%{opacity:1}100%{opacity:0;transform:scaleY(1.5)}}
            @keyframes dTkPanelL{0%{opacity:0;transform:translate(-700px,-260px)}100%{opacity:1;transform:translate(0,0)}}
            @keyframes dTkPanelR{0%{opacity:0;transform:translate(700px,260px)}100%{opacity:1;transform:translate(0,0)}}
            @keyframes dTkPanelOutL{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-700px,-260px)}}
            @keyframes dTkPanelOutR{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(700px,260px)}}
            @keyframes dTkSlashIn{0%{transform:rotate(16deg) scaleY(0);opacity:0}40%{opacity:1}100%{transform:rotate(16deg) scaleY(1);opacity:1}}
            @keyframes dTkSlashOut{0%{transform:rotate(16deg) scaleY(1);opacity:1}100%{transform:rotate(16deg) scaleY(0);opacity:0}}
            @keyframes dTkFadeIn{0%{opacity:0;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
            @keyframes dTkFadeOut{0%{opacity:1}100%{opacity:0}}
            @keyframes dTkShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-16px,10px)}40%{transform:translate(14px,-12px)}60%{transform:translate(-10px,7px)}80%{transform:translate(8px,-5px)}}
            @keyframes dTkHalfA{0%{opacity:0}1%{opacity:1}100%{opacity:0;transform:translate(-150px,-70px) rotateX(-75deg) rotateZ(-16deg)}}
            @keyframes dTkHalfB{0%{opacity:0}1%{opacity:1}100%{opacity:0;transform:translate(130px,100px) rotateX(55deg) rotateZ(12deg)}}
            @keyframes dTkCutFlash{0%{opacity:0;transform:scaleX(.2)}25%{opacity:1;transform:scaleX(1.1)}100%{opacity:0;transform:scaleX(1.3)}}
            @keyframes dTkNumGone{to{opacity:0}}
            @keyframes dTkBladeHold{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(8px) rotate(-1.4deg)}}
            @keyframes dTkBladeDrop{to{transform:translateY(235px)}}
            @keyframes dTkBladeStrain{0%{transform:translateY(0)}22%{transform:translateY(18px) rotate(1deg)}42%{transform:translateY(5px)}62%{transform:translateY(14px) rotate(-1.2deg)}82%{transform:translateY(8px)}100%{transform:translateY(11px)}}
            @keyframes dTkRopeStrain{0%{transform:none}22%{transform:translateY(9px)}42%{transform:translateY(3px)}62%{transform:translateY(7px)}82%{transform:translateY(4px)}100%{transform:translateY(5px)}}
            @keyframes dMeterFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
            @keyframes dZonePulse{0%,100%{filter:brightness(1)}50%{filter:brightness(2.2) saturate(1.6)}}
            @keyframes dTkRopeSlack{to{transform:translateY(28px) scaleY(.5) skewX(7deg)}}
            @keyframes dChipDrain{0%,100%{boxShadow:0 0 0 0 rgba(230,0,18,0)}50%{boxShadow:0 0 32px 7px rgba(230,0,18,0.85)}}
            @keyframes dChipTick{0%{transform:scale(1.5);opacity:.3}100%{transform:scale(1);opacity:1}}
            @keyframes dDrainPop{0%{transform:scale(2.4) translateY(0);opacity:0}12%{transform:scale(1) translateY(0);opacity:1}30%{transform:scale(1.08) translateY(-6px)}100%{transform:scale(1) translateY(-64px);opacity:0}}
            @keyframes dMuShake{0%,100%{transform:translate(0,0)}20%{transform:translate(-8px,5px)}40%{transform:translate(7px,-6px)}60%{transform:translate(-5px,4px)}80%{transform:translate(4px,-3px)}}
            @keyframes dMuRing{0%{transform:scale(.5);opacity:.95}100%{transform:scale(1.3);opacity:0}}
            /* the chip slurves into the number along a TRUE CURVE — offset-path
               traces a quadratic bezier arc. Progress easing is smooth from 0
               (no slow crawl at the start); the chip stays FULLY VISIBLE through
               the whole curve and only fades in the final dive (78%+), landing
               exactly at the impact beat. */
            @keyframes dMultChipFlyYou{
              0%{offset-distance:0%;opacity:1}
              100%{offset-distance:100%;opacity:1}
            }
            @keyframes dMultChipFlyFadeYou{
              0%,75%{opacity:1}
              100%{opacity:0}
            }
            @keyframes dMultChipFlyKlein{
              0%{offset-distance:0%;opacity:1}
              100%{offset-distance:100%;opacity:1}
            }
            @keyframes dMultChipFlyFadeKlein{
              0%,75%{opacity:1}
              100%{opacity:0}
            }
            /* continuous spin + shrink through the whole flight */
            @keyframes dMultChipSpin{
              0%{transform:rotate(-4deg) scale(1)}
              100%{transform:rotate(430deg) scale(.55)}
            }
            /* doubling beats — base number sucked small and out, final slams big in */
            @keyframes dMultDouble{0%{transform:scale(1);opacity:1}40%{transform:scale(1.25);opacity:1}100%{transform:scale(.2) rotate(14deg);opacity:0}}
            @keyframes dMultFinIn{0%{transform:scale(2.6) rotate(-8deg);opacity:0}55%{transform:scale(.9) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
            @keyframes dMultImpact{0%{transform:scale(.3) rotate(-20deg);opacity:0}35%{transform:scale(1.15) rotate(6deg);opacity:1}100%{transform:scale(1.5) rotate(14deg);opacity:0}}
            @keyframes dLetterSlam{0%{opacity:0;transform:scale(3.4) rotate(-14deg)}55%{opacity:1;transform:scale(.88) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
            /* VOID — maw mutation on the felt */
            @keyframes dVdFadeIn{from{opacity:0}to{opacity:1}}
            @keyframes dVdFadeOut{from{opacity:1}to{opacity:0}}
            @keyframes dVdMutate{0%{transform:perspective(500px) rotateX(0deg) scale(1);opacity:1;filter:brightness(1)}45%{transform:perspective(500px) rotateX(-40deg) scale(.94);opacity:1;filter:brightness(1.7)}100%{transform:perspective(500px) rotateX(-86deg) scale(.68);opacity:0;filter:brightness(2.4)}}
            @keyframes dVdDevourDown{0%{transform:perspective(600px) translateY(0) rotate(0deg) scale(1);opacity:1}14%{transform:perspective(600px) translateY(24px) rotate(4deg) scale(1.05,1.12);opacity:1}60%{transform:perspective(600px) translateY(104px) rotate(150deg) scale(.6,.8);opacity:1}100%{transform:perspective(600px) translateY(178px) rotate(330deg) scale(.05);opacity:0}}
            @keyframes dVdDevourUp{0%{transform:perspective(600px) translateY(0) rotate(0deg) scale(1);opacity:1}14%{transform:perspective(600px) translateY(-24px) rotate(-4deg) scale(1.05,1.12);opacity:1}60%{transform:perspective(600px) translateY(-104px) rotate(-150deg) scale(.6,.8);opacity:1}100%{transform:perspective(600px) translateY(-178px) rotate(-330deg) scale(.05);opacity:0}}
            @keyframes dVdIris{0%{transform:scale(.18);opacity:0}55%{transform:scale(1.09);opacity:1}100%{transform:scale(1);opacity:1}}
            @keyframes dVdPortalOut{to{transform:scale(.02) rotate(120deg);opacity:0}}
            @keyframes dVdRingSpin{to{transform:rotate(360deg)}}
            @keyframes dVdRingSpinRev{to{transform:rotate(-360deg)}}
            @keyframes dVdInfall{0%{transform:translateY(0);opacity:0}12%{opacity:.95}85%{opacity:.65}100%{transform:translateY(128px);opacity:0}}
            @keyframes dVdCoreIn{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}
            @keyframes dVdFlare{0%,100%{filter:brightness(1)}30%{filter:brightness(2.3)}}
            @keyframes dVdShadeSweep{0%{transform:translate(-34px,-34px);opacity:0}16%{opacity:.95}56%{transform:translate(36px,36px);opacity:.95}70%{opacity:0}100%{transform:translate(36px,36px);opacity:0}}
            @keyframes dVdShock{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1.75);opacity:0}}
            @keyframes dVdPlaqueOut{to{opacity:0;transform:scale(.86) translateY(8px)}}
            /* ECHO — clash-void rings, chip pop + lob */
            @keyframes dEsWave{0%{transform:scale(.35);opacity:.95}100%{transform:scale(4.4);opacity:0}}
            @keyframes dEsChipPop{0%{transform:scale(0) rotate(-24deg)}60%{transform:scale(1.18) rotate(6deg)}100%{transform:scale(1) rotate(0deg)}}
            @keyframes dEsChipFly{from{offset-distance:0%}to{offset-distance:100%}}
            /* WARD — victim trick: flares charging, shakes when the barrier
               plants in front of it (24% ≈ 1000ms), then dims to dead grey */
            @keyframes dWdVictim{
              0%{transform:none;filter:brightness(1)}
              9%{filter:brightness(1.75) saturate(1.5)}
              14%{transform:none;filter:brightness(1.15)}
              19%{transform:translateX(-4px);filter:brightness(1.3)}
              22%{transform:translateX(4px);filter:brightness(1.2)}
              25%{transform:translateX(-2px);filter:grayscale(.9) brightness(.6)}
              32%,100%{transform:none;filter:grayscale(1) brightness(.5)}}
            @keyframes dWdBarrierIn{0%{opacity:0;transform:scale(1.9) rotate(-12deg) translateY(-26px)}55%{opacity:1;transform:scale(.95) rotate(2deg) translateY(0)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
            @keyframes dWdActRing{0%{opacity:0;transform:scale(.8)}10%{opacity:1;transform:scale(1)}19%{opacity:1;transform:scale(1.06)}24%{opacity:0;transform:scale(1.5)}100%{opacity:0}}
            @keyframes dEsCrackL{0%,100%{transform:translateX(0) rotate(0deg)}30%{transform:translateX(-5px) rotate(-3deg)}65%{transform:translateX(-3px) rotate(-2deg)}}
            @keyframes dEsCrackR{0%,100%{transform:translateX(0) rotate(0deg)}30%{transform:translateX(5px) rotate(3deg)}65%{transform:translateX(3px) rotate(2deg)}}
            @keyframes dEsCrackFlash{0%{opacity:0;transform:scaleY(.2)}35%{opacity:1;transform:scaleY(1)}100%{opacity:0;transform:scaleY(1.15)}}
            /* spent-chip deaths */
            @keyframes dChipDeath{0%{transform:scale(1);opacity:1}25%{transform:scale(1.14) rotate(-3deg)}55%{transform:scale(.9) rotate(6deg);opacity:.9}100%{transform:scale(.15) rotate(14deg);opacity:0}}
            @keyframes dShieldDeathL{0%{transform:none;opacity:1}100%{transform:translateX(-26px) rotate(-14deg);opacity:0}}
            @keyframes dShieldDeathR{0%{transform:none;opacity:1}100%{transform:translateX(26px) rotate(14deg);opacity:0}}
            /* spent-chip deaths */
            @keyframes dChipDeath{0%{transform:scale(1);opacity:1}25%{transform:scale(1.14) rotate(-3deg)}55%{transform:scale(.9) rotate(6deg);opacity:.9}100%{transform:scale(.15) rotate(14deg);opacity:0}}
            @keyframes dShieldDeathL{0%{transform:none;opacity:1}100%{transform:translateX(-26px) rotate(-14deg);opacity:0}}
            @keyframes dShieldDeathR{0%{transform:none;opacity:1}100%{transform:translateX(26px) rotate(14deg);opacity:0}}
          `}</style>
        </View>
      )}

      {/* ---------- backdrop: stripes + halftone ---------- */}
      <View pointerEvents="none" style={st.backStripes as any} />
      <View pointerEvents="none" style={st.backDots as any} />

      {/* ---------- intro splash ---------- */}
      {web && (
        <View pointerEvents="none" style={[st.introWrap, { animation: "dIntroPanel 500ms 1150ms cubic-bezier(.7,0,.3,1) both" } as any]}>
          <View style={st.introPanel as any} />
          <Text style={[st.introTxt, { animation: "dIntroT 1250ms cubic-bezier(.2,1,.3,1) both" } as any] as any}>DUEL START</Text>
        </View>
      )}

      {/* ---------- HUD stickers ---------- */}
      {/* (SHIELDS OFF sticker removed — the corner shield chip carries the state) */}

      {/* ---------- opponent zone ---------- */}
      <View style={st.oppZone as any}>
        <View style={st.oppFrameBack as any} pointerEvents="none" />
        <View
          key={`opp-${round}-lunge`}
          style={[st.oppPortraitWrap, web && !revealed && ({ animation: "dFloat 6s ease-in-out infinite" } as any), web && revealed && ({ animation: "dLunge 500ms cubic-bezier(.2,1,.3,1) both" } as any)] as any}
          pointerEvents="none"
        >
          <Image source={{ uri: opp.portrait }} style={st.oppPortrait as any} resizeMode="contain" />
        </View>
        <View style={st.oppNameplate as any} pointerEvents="none">
          <Text style={st.oppNameTxt as any}>{opp.name}</Text>
          <Text style={st.oppRankTxt as any}>{opp.rank}</Text>
        </View>
        {/* opponent hand — fanned face-down minis */}
        <View style={st.oppFan as any} pointerEvents="none">
          {Array.from({ length: p2Count }).map((_, i, arr) => (
            <View key={i} style={[st.oppFanCard as any, web && ({ transform: `rotate(${(i - (arr.length - 1) / 2) * 7}deg) translateY(${Math.abs(i - (arr.length - 1) / 2) * 3}px)` } as any)]} />
          ))}
        </View>
        {/* Klein's chat bubble — anchored to his portrait, tail pointing at him.
            Bouncing dots while he thinks; his line the MOMENT it lands. */}
        {(kleinThinking || (msgVisible && !!kleinMsg)) && (
          <View
            style={[
              st.bubble,
              !kleinThinking && ({ animation: web ? "dBubbleIn 420ms cubic-bezier(.2,1,.3,1) both" : undefined } as any),
            ] as any}
          >
            <View style={st.bubbleTail as any} pointerEvents="none" />
            <View style={st.bubbleTag as any}><Text style={st.bubbleTagTxt as any}>{opp.name}</Text></View>
            {kleinThinking ? (
              <View style={st.bubbleDotsRow as any}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[st.bubbleDot as any, web && ({ animation: `dDotBounce 0.9s ${i * 150}ms ease-in-out infinite` } as any)]} />
                ))}
              </View>
            ) : (
              <Text style={st.bubbleTxt as any}>{kleinMsg}</Text>
            )}
          </View>
        )}
      </View>

      {/* ---------- THE TABLE ---------- */}
      <View style={st.tableZone as any}>
        <View
          key={`table-${round}`}
          style={[st.tableRim as any, web && revealed && ({ animation: "dImpact 380ms cubic-bezier(.2,1,.3,1)" } as any)]}
        >
          <View style={st.tableFelt as any} pointerEvents="none">
            {/* painted asset overlay — drop /table.png in public/ to replace the CSS felt */}
            {web && (
              <Image
                source={{ uri: "/table.png" }}
                style={[StyleSheet.absoluteFill, { opacity: tableArt ? 1 : 0, clipPath: TABLE_CLIP } as any]}
                resizeMode="stretch"
                onLoad={() => setTableArt(true)}
                onError={() => setTableArt(false)}
              />
            )}
            <View style={st.feltLine as any} pointerEvents="none" />
          </View>

          {/* Klein's played card — upper felt, face-up to the user. The tally plate
              sits LEFT OF HIS CARD so ownership of the number is unmistakable. */}
          <View style={[st.feltSlot, st.feltSlotTop] as any}>
            {p2Locked && (
              <View style={[
                ((clashWinner || execFailSide === "p2") ? (clashWinner === "p2" ? { animation: "dCardWinR 520ms cubic-bezier(.34,1.4,.64,1) both" } : { animation: "dCardLose 650ms 160ms ease-out both" }) : null) as any,
                cur?.kind === "trick" && cur.trick === "void" && web && ((cur.youCard?.name === "Void")
                  ? { animation: "dVdDevourDown 1150ms 1200ms cubic-bezier(.55,0,.85,.35) both" }
                  : { animation: "dVdMutate 620ms cubic-bezier(.55,0,.9,.4) both" }) as any,
                cur?.kind === "trick" && cur.trick === "ward" && web && (cur.youCard?.name === "Ward"
                  ? { animation: "dWdVictim 4200ms linear both" } : null) as any,
              ] as any}>
                <PlayCard card={p2Locked} revealed={revealed} opp />
                {(clashWinner === "p1" || clashWinner === "both" || execFailSide === "p2") && (
                  <View pointerEvents="none">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <View key={i} style={{ position: "absolute", left: 57, top: 76, width: 0, height: 0, transform: [{ rotate: `${i * 36}deg` }] } as any}>
                        <View style={[st.cardShard as any, web && ({ animation: `dShardOut 720ms ${i * 45}ms ease-out both` } as any)]} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            {pow && (
                <View
                  style={[
                    st.tallyPlate as any,
                    pow.finish && !pow.tie && !pow.youWins && ({ borderColor: theme.color.crimson } as any),
                    pow.finish && (pow.youWins || pow.tie) && ({ borderColor: "#3a3a3a", opacity: 0.5 } as any),
                  ]} pointerEvents="none"
                >
                  <Text style={st.tallyLbl as any}>{opp.name}</Text>
                  <Text
                    key={clashTick}
                    style={[
                      st.tallyNum as any,
                      { color: "#FF4D5E" },
                      pow.finish && !pow.tie && !pow.youWins
                        ? { animation: "dLockIn 480ms cubic-bezier(.34,1.4,.64,1) both", textShadow: "0 0 26px rgba(255,77,94,0.9), 3px 3px 0 #000" }
                        : pow.finish
                          ? { animation: "dLockOut 450ms ease-out both" }
                          : { animation: "dTickPulse 280ms ease-out both" },
                    ]}
                  >{pow.kleinLeft}</Text>
                </View>
            )}
          </View>
          {/* your played card — lower felt, your tally right beside it */}
          <View style={[st.feltSlot, st.feltSlotBottom] as any}>
            {p1Locked && (
              <View style={[
                ((clashWinner || execFailSide === "p1") ? (clashWinner === "p1" ? { animation: "dCardWinY 520ms cubic-bezier(.34,1.4,.64,1) both" } : { animation: "dCardLose 650ms 160ms ease-out both" }) : null) as any,
                cur?.kind === "trick" && cur.trick === "void" && web && ((cur.youCard?.name === "Void")
                  ? { animation: "dVdMutate 620ms cubic-bezier(.55,0,.9,.4) both" }
                  : { animation: "dVdDevourUp 1150ms 1200ms cubic-bezier(.55,0,.85,.35) both" }) as any,
                cur?.kind === "trick" && cur.trick === "ward" && web && (cur.youCard?.name === "Ward"
                  ? null : { animation: "dWdVictim 4200ms linear both" }) as any,
              ] as any}>
                <PlayCard card={p1Locked} revealed={revealed} />
                {(clashWinner === "p2" || clashWinner === "both" || execFailSide === "p1") && (
                  <View pointerEvents="none">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <View key={i} style={{ position: "absolute", left: 57, top: 76, width: 0, height: 0, transform: [{ rotate: `${i * 36}deg` }] } as any}>
                        <View style={[st.cardShard as any, web && ({ animation: `dShardOut 720ms ${i * 45}ms ease-out both` } as any)]} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            {pow && (
              <View
                style={[
                  st.tallyPlate as any,
                  pow.finish && !pow.tie && pow.youWins && ({ borderColor: theme.color.yellow } as any),
                  pow.finish && (!pow.youWins || pow.tie) && ({ borderColor: "#3a3a3a", opacity: 0.5 } as any),
                ]} pointerEvents="none"
              >
                <Text style={st.tallyLbl as any}>YOU</Text>
                <Text
                  key={clashTick}
                  style={[
                    st.tallyNum as any,
                    { color: theme.color.yellow },
                    pow.finish && !pow.tie && pow.youWins
                      ? { animation: "dLockIn 480ms cubic-bezier(.34,1.4,.64,1) both", textShadow: "0 0 26px rgba(252,238,33,0.9), 3px 3px 0 #000" }
                      : pow.finish
                        ? { animation: "dLockOut 450ms ease-out both" }
                        : { animation: "dTickPulse 280ms ease-out both" },
                  ]}
                >{pow.youLeft}</Text>
              </View>
            )}
          </View>

          {/* VOID — the void card mutates IN PLACE into a 3D maw (tilted accretion
              rings around a black event-horizon core) which devours the opposing
              card straight out of its slot. No takeover: a soft vignette just
              focuses the eye. Custom identity — zero spiky bursts. */}
          {cur?.kind === "trick" && cur.trick === "void" && web && (
            <VoidMaw atTop={cur.youCard?.name !== "Void"} />
          )}

          {/* SHOWDOWN hold — a visible 3..2..1 so the reveal never jump-scares */}
          {cur?.kind === "showdown" && (
            <View style={st.showdownWrap as any} pointerEvents="none">
              <Text style={st.showdownLbl as any}>SHOWDOWN</Text>
              <Text key={seqSubTick} style={[st.showdownNum as any, web && ({ animation: "dNumSlam 0.5s cubic-bezier(.2,1,.3,1) both" } as any)]}>{Math.max(1, 3 - seqSubTick)}</Text>
            </View>
          )}

          {/* SHIELD NULLIFY — full cinematic: powers pop in flanking a VS, "SAME TYPE!"
              banner, the numbers SMASH together with a flash, a shield ring expands,
              NULLIFIED stamp lands with the 0+0 verdict. Web only; native gets text. */}
          {cur?.kind === "clash" && cur.mode === "shield" && web && (
            <View style={st.shieldWrap as any} pointerEvents="none">
              <View style={[st.nullFlash as any, { animation: "dNullFlash 850ms 1500ms ease-out both" } as any]} />
              <View style={[st.shieldWave as any, { animation: "dShieldWave 950ms 1900ms ease-out both" } as any]} />
              {/* beat 1 — the two powers face off (smash wrapper hides them after impact) */}
              <View style={{ animation: "dNullSmash 650ms 1500ms cubic-bezier(.6,0,.8,.4) both" } as any}>
                <View style={st.shieldRow as any}>
                  <View style={[st.shieldPlate as any, { borderColor: cur.align === "good" ? "#16a34a" : theme.color.crimson, animation: "dShieldPop 450ms 100ms cubic-bezier(.2,1,.3,1) both" } as any]}>
                    <Text style={[st.shieldPlateNum as any, { color: cur.align === "good" ? "#16a34a" : "#FF4D5E" }]}>{cur.you ?? 0}</Text>
                    <Text style={st.shieldPlateLbl as any}>YOU</Text>
                  </View>
                  <Text style={[st.shieldVs as any, { animation: "dNumSlam 400ms 380ms cubic-bezier(.2,1,.3,1) both" } as any]}>VS</Text>
                  <View style={[st.shieldPlate as any, { borderColor: cur.align === "good" ? "#16a34a" : theme.color.crimson, animation: "dShieldPop 450ms 220ms cubic-bezier(.2,1,.3,1) both" } as any]}>
                    <Text style={[st.shieldPlateNum as any, { color: cur.align === "good" ? "#16a34a" : "#FF4D5E" }]}>{cur.klein ?? 0}</Text>
                    <Text style={st.shieldPlateLbl as any}>{opp.name.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              {/* beat 2 — why: same type */}
              <Text style={[st.shieldBanner as any, { animation: "dShieldPop 450ms 850ms cubic-bezier(.2,1,.3,1) both" } as any]}>SAME TYPE!</Text>
              {/* beat 3 — the verdict */}
              <View style={[st.nullStamp as any, { animation: "dStampIn 650ms 1800ms cubic-bezier(.2,1,.3,1) both" } as any]}>
                <Text style={st.nullStampTxt as any}>NULLIFIED</Text>
              </View>
            </View>
          )}

          {/* SHIELD BREAK — shields are down this round (Eclipse last round): a crimson
              shield slams in, cracks spider across it, it SHATTERS, and the verdict
              stamps down: same alignment now scores full damage. Web cinematic. */}
          {cur?.kind === "shieldbreak" && web && (
            <View style={st.sbWrap as any} pointerEvents="none">
              <View style={[st.nullFlash as any, { animation: "dNullFlash 700ms 1350ms ease-out both" } as any]} />
              <View style={{ animation: "dShieldBreak 420ms 1350ms cubic-bezier(.6,0,.8,.4) both" } as any}>
                <View style={[st.sbAura as any, { animation: "dSBAura 900ms 350ms ease-in-out infinite" } as any]} />
                <View style={[st.sbShield as any, { animation: "dShieldSlam 460ms cubic-bezier(.2,1,.3,1) both" } as any]}>
                  <View style={st.sbShieldInner as any} />
                  <Text style={st.sbShieldMark as any}>✕</Text>
                </View>
                {[18, -34, 76].map((deg, i) => (
                  <View key={i} style={[st.sbCrack as any, { transform: [{ rotate: `${deg}deg` }] }, { animation: `dCrackIn 180ms ${950 + i * 110}ms both` } as any]} />
                ))}
              </View>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <View key={i} style={[st.sbShard as any, { transform: [{ rotate: `${i * 45}deg` }] }, { animation: `dShard 820ms ${1350 + i * 50}ms ease-out both` } as any]} />
              ))}
              <View style={[st.nullStamp as any, { marginTop: 150, animation: "dStampIn 560ms 1800ms cubic-bezier(.2,1,.3,1) both" } as any]}>
                <Text style={st.nullStampTxt as any}>SHIELDS DOWN</Text>
              </View>
              <Text style={[st.shieldSub as any, { marginTop: 8, animation: "dNumSlam 400ms 2150ms cubic-bezier(.2,1,.3,1) both" } as any]}>SAME ALIGNMENT NOW SCORES FULL DAMAGE</Text>
            </View>
          )}

          {/* TIE verdict — both powers died together, both cards shatter: stamp it */}
          {cur?.kind === "clash" && cur.mode === "tie" && pow?.finish && (
            <View style={st.tieWrap as any} pointerEvents="none">
              <View style={[st.nullStamp as any, web && ({ animation: "dStampIn 620ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
                <Text style={st.nullStampTxt as any}>TIE!</Text>
              </View>
            </View>
          )}

          {/* shield explanation — native fallback only (web gets the shield-break cinematic) */}
          {cur?.kind === "clash" && cur.mode === "shield" && !web && (
            <View style={st.clashHud as any} pointerEvents="none">
              <Text style={st.clashShieldTxt as any}>SHIELDS CANCEL — SAME ALIGNMENT = 0</Text>
            </View>
          )}

          {/* AWARD — the leftover points literally fly into the winner's score chip */}
          {cur?.kind === "award" && (cur.p1Pts ?? 0) !== (cur.p2Pts ?? 0) && (
            <View
              pointerEvents="none"
              style={[
                st.flyBadge as any,
                (cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? st.flyYou : st.flyKlein,
                web && ({ animation: (cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? "dFlyYou 1.3s cubic-bezier(.45,0,.6,.5) both" : "dFlyKlein 1.3s cubic-bezier(.45,0,.6,.5) both" } as any),
              ] as any}
            >
              <Text style={[st.flyTxt as any, { color: (cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? theme.color.yellow : "#FF4D5E" }] as any}>
                +{(cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? cur.p1Pts : cur.p2Pts}
              </Text>
            </View>
          )}

          {/* TRICK CINEMATIC — one dedicated beat per effect */}
          {cur?.kind === "trick" && cur.trick !== "executioner" && cur.trick !== "execfail"
            && !(cur.trick === "void" && web) && !(cur.trick === "echo" && web)
            && !(cur.trick === "eclipse" && web) && !(cur.trick === "ward" && web) && (
            <View style={st.trickOverlay as any} pointerEvents="none">
              <View style={st.trickStamp as any}>
                <Text style={st.trickTitle as any}>{TRICK_SEQ[cur.trick]?.title ?? cur.trick.toUpperCase()}</Text>
                <Text style={st.trickSub as any}>{TRICK_SEQ[cur.trick]?.sub ?? ""}</Text>
              </View>
              {cur.trick === "reversal" && cur.preP1 !== undefined && cur.preP2 !== undefined && (
                <View style={st.swapRow as any}>
                  <Text style={[st.swapNum as any, { color: theme.color.yellow }, web && ({ animation: "dSwapL 1.6s ease-in-out both" } as any)]}>{cur.preP1}</Text>
                  <Text style={st.swapArrow as any}>⇄</Text>
                  <Text style={[st.swapNum as any, { color: "#FF4D5E" }, web && ({ animation: "dSwapR 1.6s ease-in-out both" } as any)]}>{cur.preP2}</Text>
                </View>
              )}
              {cur.trick === "oracle" && cur.peekCards?.map((c) => (
                <View key={c.id} style={[st.peekFloat as any, web && ({ animation: "dFlipIn 500ms both" } as any)]}>
                  <CardFace card={c} />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* MULT DOUBLING — the natural scoring flow, P5-ified: the BASE number
            pops in where the points would fly from and HANGS a beat... then the
            clash chip itself slurves off the table edge INTO the number, a
            crimson impact burst pops, and the number DOUBLES in place (×N stamp
            flashing beside it). The chip is consumed — spent. Then the award
            flies the doubled number into the score chip like normal. */}
        {cur?.kind === "multmash" && web && (() => {
          const tri = cur.mult === 3;
          const face = tri ? theme.color.crimson : theme.color.yellow;
          const youWin = cur.side === "p1";
          // anchor where the award's fly badge starts — flyYou/flyKlein are rim-relative
          // (37% of the 92%-wide rim = 4% + 37%×0.92 ≈ 38% of the table zone)
          const ax = "38%";
          const ay = youWin ? "40%" : "7%";
          return (
            <View pointerEvents="none" style={st.muFlyWrap as any}>
              {/* the hanging BASE number — pops, hangs, then doubles on impact */}
              <View style={[st.muHangNumWrap as any, { left: ax, top: ay }] as any}>
                <Text
                  key={`base-${cur.base}`}
                  style={[st.muHangNum as any, { color: face }, web && ({ animation: `dNumSlam 380ms 60ms cubic-bezier(.2,1,.3,1) both, dMultDouble ${tri ? "560ms" : "480ms"} 1500ms cubic-bezier(.2,1,.3,1) both` } as any)] as any}
                >
                  {cur.base}
                </Text>
                <Text
                  key={`fin-${cur.final}`}
                  style={[st.muHangNumFin as any, { color: face }, web && ({ animation: `dMultFinIn 380ms ${tri ? "1560" : "1520"}ms cubic-bezier(.2,1,.3,1) both` } as any)] as any}
                >
                  {cur.final}
                </Text>
              </View>
              {/* impact FX — crimson burst pop + ring on the moment of doubling.
                  The burst and ring center on the hanging number's anchor. */}
              <View style={[st.muImpBurst as any, { left: ax, top: ay }, web && ({ animation: `dMultImpact 620ms 1500ms cubic-bezier(.2,1,.3,1) both` } as any)] as any} />
              <View style={[st.muImpRing as any, { left: ax, top: ay }, web && ({ animation: `dMuRing 720ms 1500ms cubic-bezier(.2,1,.3,1) both` } as any)] as any} />
              {/* the ×N stamp flashing beside the number at the doubling beat */}
              <View
                style={[st.muStampX as any, { left: ax, top: ay, borderColor: face }, web && ({ animation: `dStampIn 360ms ${tri ? "1540" : "1500"}ms cubic-bezier(.2,1,.3,1) both` } as any)] as any}
              >
                <Text style={[st.muStampXTxt as any, { color: face }]}>×{cur.mult}</Text>
              </View>
              {/* the chip itself, slurving into the number along a true curved
                  path (offset-path). Glyph only — no tag/? in flight. Three
                  composed animations: the path (position), the fade (only in
                  the final dive), and the spin+shrink (continuous). */}
              <View
                key="chip-flight"
                style={[
                  st.muChipFly as any,
                  youWin ? st.muChipFlyPathYou : st.muChipFlyPathKlein,
                  web && ({
                    animation: `dMultChipFly${youWin ? "You" : "Klein"} 1500ms cubic-bezier(.45,0,.85,.6) both, dMultChipFlyFade${youWin ? "You" : "Klein"} 1500ms linear both, dMultChipSpin 1500ms cubic-bezier(.45,0,.85,.6) both`,
                  } as any),
                ] as any}
              >
                <View style={[st.multChipBurstB as any]} />
                <View style={[st.multChipBurstW as any]} />
                <View style={[st.multChipLive as any, { transform: [{ rotate: "-4deg" }] }]}>
                  <View style={[st.multChipFace as any, { backgroundColor: face }]} />
                  <Text style={[st.multChipTxt as any, { color: tri ? "#fff" : "#111" }]}>×{cur.mult}</Text>
                </View>
              </View>
            </View>
          );
        })()}


        {/* ECHO — the clash dissolves (rings + compact stamp), then the ×2 chip
            pops out of the echo card and curves into the corner slot at the
            table's upper left. Table-ZONE child (not the rim): the arc flies
            over the felt edge without ever clipping. */}
        {cur?.kind === "trick" && cur.trick === "echo" && web && (
          <EchoLoad youPlayed={cur.youCard?.name === "Echo"} />
        )}

        {/* ECLIPSE — same activation: rings + SHIELDS DOWN stamp, then the
            broken-shield chip flies to its corner slot (beside the ×2 when one
            is parked — echo owns the corner, eclipse stacks next to it) */}
        {cur?.kind === "trick" && cur.trick === "eclipse" && web && (
          <EclipseLoad youPlayed={cur.youCard?.name === "Eclipse"} beside={mult > 1 || chipStandby || cur.youCard?.name === "Echo" || cur.kleinCard?.name === "Echo"} />
        )}

        {/* WARD — the parry: the trick charges its activation (crimson aura, its
            name stamping), and just as it fires, Ward's golden barrier plants in
            front of it — the charge pops, the trick dims grey, BLOCKED + the flat
            +5 land on the barrier. Small, all on the felt. */}
        {cur?.kind === "trick" && cur.trick === "ward" && web && (
          <WardBlock
            victimTop={cur.youCard?.name === "Ward"}
            victimName={((cur.youCard?.name === "Ward") ? cur.kleinCard?.name : cur.youCard?.name) ?? ""}
          />
        )}

        {/* score chips + round marker — OVERLAYS on the table zone, never clipped by the felt */}
        <View style={st.roundMarker as any} pointerEvents="none">
          <Text style={st.roundLbl as any}>ROUND</Text>
          <Text style={st.roundNum as any}>{Math.min(round, TOTAL_ROUNDS)}<Text style={st.roundDim as any}>/{TOTAL_ROUNDS}</Text></Text>
          {mult > 1 && <Text style={st.roundMult as any}>×{mult}</Text>}
        </View>
        <View style={[st.chip, st.chipOpp] as any} pointerEvents="none">
          <Text style={st.chipLbl as any}>{opp.name}</Text>
          <Text key={`s2-${p2Score}`} style={[st.chipNum, { color: "#FF4D5E" }] as any}>{p2Score}</Text>
        </View>
        <View style={[st.chip, st.chipYou] as any} pointerEvents="none">
          <Text style={st.chipLbl as any}>YOU</Text>
          <Text key={`s1-${p1Score}`} style={[st.chipNum, { color: theme.color.yellow }] as any}>{p1Score}</Text>
        </View>

        {/* live status tokens — ON the table; press for the full rules */}
        {/* executioner drain — every tick slams a "-1" beside the victim's chip */}
        {drainPops.map((p) => {
          const j = ((p.n * 2654435761) % 1000) / 1000; // deterministic jitter per tick
          const dx = 14 + p.n * 13 + j * 40;             // fans outward as the drain runs
          const dy = (j - 0.5) * 88;
          const rot = (j - 0.5) * 30 - 5;
          return (
            <View
              key={p.id}
              style={[
                p.side === "p1" ? st.drainPopYou : st.drainPopOpp,
                { transform: [{ translateX: p.side === "p1" ? dx : -dx }, { translateY: dy }, { rotate: `${rot}deg` }] },
              ] as any}
              pointerEvents="none"
            >
              <View style={(web ? ({ animation: "dDrainPop 850ms cubic-bezier(.2,1,.3,1) both" } as any) : undefined) as any}>
                <Text style={st.drainPopTxt as any}>-1</Text>
              </View>
            </View>
          );
        })}
        {/* live status tokens — ON the table; press for the full rules.
            CLASH chip: the burst-seal glyph (same star as the verdict stamps),
            wobbling like the shield halves breathe; tag below names the state.
            During the mult beat the chip HIDES — its copy is flying into the number. */}
        {mult > 1 && cur?.kind !== "multmash" && (
          <Pressable
            onPress={() => setStatusInfo("mult")}
            onHoverIn={playHover}
            style={({ hovered }: any) => [st.shieldChip, { left: "17%", top: "7%" } as any, hovered && (st.shieldChipHover as any)]}
          >
            <View style={st.multChipArt as any} pointerEvents="none">
              <View style={[st.multChipBurstB as any]} />
              <View style={[st.multChipBurstW as any]} />
              <View
                key={mult}
                style={[st.multChipLive as any, web && ({ animation: "dShieldPop 380ms cubic-bezier(.2,1,.3,1) both, dMultWobble 2.4s ease-in-out 380ms infinite" } as any)]}
              >
                <View style={[st.multChipFace as any, { backgroundColor: mult === 3 ? theme.color.crimson : theme.color.yellow }]} />
                <Text style={[st.multChipTxt as any, { color: mult === 3 ? "#fff" : "#111" }]}>×{mult}</Text>
              </View>
            </View>
            <View style={st.shieldChipTag as any} pointerEvents="none">
              <Text style={[st.shieldChipTagTxt as any, { color: mult === 3 ? "#FF4D5E" : theme.color.yellow }]}>CLASH ×{mult}</Text>
            </View>
            <View style={st.shieldChipQ as any} pointerEvents="none">
              <Text style={st.statusTokenQTxt as any}>?</Text>
            </View>
          </Pressable>
        )}
        {shieldOff > 0 && (
          <Pressable
            onPress={() => setStatusInfo("shield")}
            onHoverIn={playHover}
            style={({ hovered }: any) => [st.shieldChip, { left: mult > 1 ? "calc(17% + 88px)" : "17%", top: "7%" }, web && ({ transition: "left 450ms cubic-bezier(.2,1,.3,1)" } as any), hovered && (st.shieldChipHover as any)]}
          >
            <View style={st.shieldChipArt as any} pointerEvents="none">
              <View style={st.shieldChipBack as any} />
              <View style={[st.shieldHalfL as any, web && ({ animation: "dHalfL 2.4s ease-in-out infinite" } as any)]} />
              <View style={[st.shieldHalfR as any, web && ({ animation: "dHalfR 2.4s ease-in-out infinite" } as any)]} />
              <View key={shieldOff} style={[st.shieldChipCount as any, web && ({ animation: "dNumSlam 350ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
                <Text style={st.shieldChipCountTxt as any}>{shieldOff}</Text>
              </View>
            </View>
            <View style={st.shieldChipTag as any} pointerEvents="none">
              <Text style={st.shieldChipTagTxt as any}>SHIELDS OFF</Text>
            </View>
            <View style={st.shieldChipQ as any} pointerEvents="none">
              <Text style={st.statusTokenQTxt as any}>?</Text>
            </View>
          </Pressable>
        )}
        {/* echo's ×2 chip PARKED at the corner slot — renders from the moment the
            flight lands until the real multiplier chip appears (mult > 1) */}
        {web && chipStandby && !(mult > 1) && !(cur?.kind === "trick" && cur.trick === "echo") && (
          <View style={[st.esChip as any, { left: "17%", top: "7%" }] as any} pointerEvents="none">
            <View style={st.multChipBurstB as any} />
            <View style={st.multChipBurstW as any} />
            <View style={[st.multChipLive as any, { transform: [{ rotate: "-4deg" }] }]}>
              <View style={[st.multChipFace as any, { backgroundColor: theme.color.yellow }]} />
              <Text style={[st.multChipTxt as any, { color: "#111" }]}>×2</Text>
            </View>
          </View>
        )}
        {/* echo's ×2 chip DYING — spent at the end of its turn with no score */}
        {web && echoChipDying && (
          <>
            <View style={[st.esChip as any, { left: "17%", top: "7%" }, web && ({ animation: "dChipDeath 650ms ease-in both" } as any)] as any} pointerEvents="none">
              <View style={st.multChipBurstB as any} />
              <View style={st.multChipBurstW as any} />
              <View style={[st.multChipLive as any, { transform: [{ rotate: "-4deg" }] }]}>
                <View style={[st.multChipFace as any, { backgroundColor: theme.color.yellow }]} />
                <Text style={[st.multChipTxt as any, { color: "#111" }]}>×2</Text>
              </View>
            </View>
            <View style={[st.wdWave as any, { left: "17%", top: "7%", width: 72, height: 72, marginLeft: 0, marginTop: 0 }, web && ({ animation: "dEsWave 600ms 120ms ease-out both" } as any)]} pointerEvents="none" />
          </>
        )}

        {/* eclipse's shield chip DYING — last turn used up, halves blast apart */}
        {web && shieldChipDying && (
          <View style={[st.esChip as any, { left: mult > 1 ? "calc(17% + 88px)" : "17%", top: "7%" }, { alignItems: "center", justifyContent: "center" }] as any} pointerEvents="none">
            <View style={st.shieldChipArt as any} pointerEvents="none">
              <View style={st.shieldChipBack as any} />
              <View style={[st.shieldHalfL as any, web && ({ animation: "dShieldDeathL 650ms cubic-bezier(.5,0,.8,.4) both" } as any)]} />
              <View style={[st.shieldHalfR as any, web && ({ animation: "dShieldDeathR 650ms cubic-bezier(.5,0,.8,.4) both" } as any)]} />
              <View style={[st.shieldChipCount as any, web && ({ animation: "dVdFadeOut 450ms 120ms both" } as any)]}>
                <Text style={st.shieldChipCountTxt as any}>0</Text>
              </View>
            </View>
          </View>
        )}

        {/* eclipse's shield chip PARKED at its slot until the real one appears */}
        {web && shieldStandby && !(shieldOff > 0) && !(cur?.kind === "trick" && cur.trick === "eclipse") && (
          <View style={[st.esChip as any, { left: (mult > 1 || chipStandby) ? "calc(17% + 88px)" : "17%", top: "7%" }, { alignItems: "center", justifyContent: "center" }] as any} pointerEvents="none">
            <View style={st.shieldChipArt as any} pointerEvents="none">
              <View style={st.shieldChipBack as any} />
              <View style={st.shieldHalfL as any} />
              <View style={st.shieldHalfR as any} />
              <View style={st.shieldChipCount as any}>
                <Text style={st.shieldChipCountTxt as any}>2</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ---------- player zone ---------- */}
      <View style={st.playerZone as any}>
        <View style={st.handCol as any}>
          {error && (
            <View style={st.errorWrap as any}>
              <Text style={st.errorTxt as any}>SIGNAL LOST — {error}</Text>
              <Pressable onPress={() => startRound(round, chain.current.p2Hand, p1Hand, p2Score, p1Score, oppPeeked, [], shieldOff, echoNext)} style={({ hovered }: any) => [s2bigBtn, hovered && s2bigBtnHovered] as any}>
                <Text style={st.bigBtnTxt as any}>RETRY ▶</Text>
              </Pressable>
            </View>
          )}
          {phase === "commit" && !p1Locked && !error && (
            <View style={[st.moveBanner, web && ({ animation: "dPulse 1.6s ease-in-out infinite" } as any)] as any}>
              <Text style={st.moveTxt as any}>YOUR MOVE</Text>
            </View>
          )}

          {/* THE HAND — fanned (outer layer flies in, inner layer carries the fan/hover transform) */}
          <View style={st.handRow as any}>
            {p1Hand.map((c, i) => (
              <View
                key={c.id}
                style={web ? { animation: `dHandIn 420ms ${i * 55}ms cubic-bezier(.2,1,.3,1) both` } as any : null}
              >
                <Pressable
                  onPress={() => onPick(c)}
                  onHoverIn={playHover}
                  disabled={!!p1Locked || phase !== "commit"}
                  style={({ hovered, pressed }: any) => {
                    const rot = fanAngle(i, p1Hand.length);
                    const hot = phase === "commit" && !p1Locked && (hovered || pressed);
                    return [
                      st.cardBtn,
                      { transform: hot
                          ? [{ rotate: "0deg" }, { translateY: hovered ? -34 : -26 }, { scale: hovered ? 1.14 : 1.06 }]
                          : [{ rotate: `${rot}deg` }, { translateY: -Math.abs(rot) * 1.6 }] },
                      (!!p1Locked || phase !== "commit") && st.cardDim,
                      hot && hovered && (st.cardHover as any),
                    ];
                  }}
                >
                  <CardFace card={c} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* peek note */}
        {!!peekNote && <Text style={st.peekNote as any}>{peekNote}</Text>}

        {/* round advance — appears once the teaching sequence has played out */}
        {phase === "reveal" && seqDone && (
          <Pressable
            onPress={onNextRound}
            onHoverIn={playHover}
            style={({ hovered, pressed }: any) => [
              st.nextBtn as any,
              hovered && (st.bigBtnHovered as any),
              pressed && (st.bigBtnPressed as any),
            ]}
          >
            <Text style={st.nextBtnTxt as any}>NEXT ROUND ▶</Text>
          </Pressable>
        )}
      </View>

      {/* ---------- ANIM LAB (demo only) ---------- */}
      {demoMode && (
        <View style={st.demoPanel as any}>
          <Text style={st.demoPanelTitle as any}>ANIM LAB · LOOP</Text>
          <View style={st.demoGrid as any}>
            {DEMO_SCENARIOS.map((s) => (
              <Pressable key={s.key} onPress={() => { playClick(); runDemo(s.key); }} onHoverIn={playHover} style={({ hovered }: any) => [st.demoBtn, hovered && st.demoBtnHover, demoKeyRef.current === s.key && st.demoBtnActive] as any}>
                <Text style={st.demoBtnTxt as any}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => { playClick(); router.replace("/campaign"); }} onHoverIn={playHover} style={({ hovered }: any) => [st.demoExit, hovered && st.demoBtnHover] as any}>
            <Text style={st.demoBtnTxt as any}>◀ EXIT LAB</Text>
          </Pressable>
        </View>
      )}

      {/* ---------- EXECUTIONER TAKEOVER — full-screen All-Out-Attack ---------- */}
      {cur?.kind === "trick" && (cur.trick === "executioner" || cur.trick === "execfail") && web && (
        <ExecTakeover
          mode={cur.trick === "execfail" ? "misfire" : "exec"}
          victimSide={(cur.wipedSide ?? "p2") === "p1" ? "p1" : "p2"}
          victimLabel={(cur.wipedSide ?? "p2") === "p1" ? "YOU" : opp.name}
          victimScore={cur.trick === "execfail" ? 0 : (cur.wipedSide ?? "p2") === "p1" ? cur.preP1 ?? 0 : cur.preP2 ?? 0}
          targetCard={cur.targetCard}
          oppName={opp.name}
        />
      )}

      {/* ---------- effect explainer ---------- */}
      {statusInfo && (
        <Pressable style={st.infoBackdrop as any} onPress={() => setStatusInfo(null)}>
          <View style={st.infoPanel as any}>
            <Text style={st.infoTitle as any}>{statusInfo === "mult" ? `CLASH ×${mult}` : `SHIELDS OFF — ${shieldOff} ROUND${shieldOff === 1 ? "" : "S"} LEFT`}</Text>
            <Text style={st.infoBody as any}>{statusInfo === "mult" ? MULT_INFO : SHIELD_INFO}</Text>
            <Pressable onPress={() => setStatusInfo(null)} style={({ hovered }: any) => [st.infoClose as any, hovered && (st.bigBtnHovered as any)]}>
              <Text style={st.infoCloseTxt as any}>GOT IT</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* ---------- result overlay ---------- */}
      {phase === "over" && finalResult && (
        <View style={st.resultWrap as any}>
          <View style={[st.resultPanelL, { animation: web ? "dPanelL 380ms cubic-bezier(.2,1,.3,1) both" : undefined } as any]} />
          <View style={[st.resultPanelR, { animation: web ? "dPanelR 380ms cubic-bezier(.2,1,.3,1) both" : undefined } as any]} />
          <View style={st.resultContent as any}>
            <Text style={[st.resultTitle, { color: finalResult === "win" ? theme.color.yellow : "#fff" }, { animation: web ? "dTitleSlam 520ms cubic-bezier(.2,1,.3,1) both" : undefined } as any] as any}>
              {finalResult === "win" ? "PACIFIED!" : finalResult === "loss" ? "DEFEAT" : "DRAW"}
            </Text>
            <Text style={st.resultScore as any}>FINAL {p1Score} — {p2Score}{finalResult === "win" && round < TOTAL_ROUNDS ? " · THRESHOLD" : ""}</Text>
            <Text style={st.resultSaved as any}>{saved ? "RESULT SAVED" : "OFFLINE — RESULT NOT SAVED"}</Text>
            <View style={st.resultBtns as any}>
              <Pressable onPress={onRematch} onHoverIn={playHover} style={({ hovered, pressed }: any) => [st.bigBtn, hovered && st.bigBtnHovered, pressed && st.bigBtnPressed] as any}>
                <Text style={st.bigBtnTxt as any}>REMATCH ▶</Text>
              </Pressable>
              <Pressable onPress={() => { playClick(); router.replace("/campaign"); }} onHoverIn={playHover} style={({ hovered }: any) => [st.bigBtnGhost, hovered && st.bigBtnGhostHovered] as any}>
                <Text style={st.bigBtnGhostTxt as any}>CAMPAIGN</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      </View>
    </View>
  );
}


/* Played card on the felt — face-down until reveal, then REALLY flips: the back
   swings away on its hinge while the face rotates in from the other side. */
function PlayCard({ card, revealed, opp }: { card: Card; revealed: boolean; opp?: boolean }) {
  if (web && revealed) {
    return (
      <View style={st.playCard as any}>
        <View style={{ width: "100%", height: "100%", animation: "dFlipFace 380ms 210ms cubic-bezier(.2,1,.3,1) both" } as any}>
          <CardFace card={card} />
        </View>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { animation: "dFlipBack 260ms cubic-bezier(.55,0,.85,.4) both" } as any]}>
          <CardBack opp={opp} />
        </View>
      </View>
    );
  }
  return (
    <View style={[st.playCard as any, !web && revealed && ({ animation: "dFlipIn 420ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
      {revealed ? <CardFace card={card} /> : <CardBack opp={opp} />}
    </View>
  );
}

/* P5 chaos typography — every letter gets its own tilt, baseline offset, and size.
   Seeded per-word so the same word always renders identically (deterministic jitter). */
function p5Letters(word: string, delay: number, size: number, color: string) {
  let h = 0;
  for (let i = 0; i < word.length; i++) h = (h * 31 + word.charCodeAt(i)) | 0;
  const jit = (i: number, salt: number) => {
    let x = (h ^ (i * 2654435761) ^ (salt * 40503)) | 0;
    x = (x ^ (x >>> 13)) * 0x5bd1e995;
    return (((x ^ (x >>> 15)) >>> 0) % 1000) / 1000;
  };
  return (
    <View style={st.tkLetters as any}>
      {word.split("").map((ch, i) => (
        <Text
          key={i}
          style={[st.tkLetter as any, {
            fontSize: size * (0.88 + jit(i, 1) * 0.28), color,
            transform: [{ rotate: `${(jit(i, 2) - 0.5) * 14}deg` }, { translateY: (jit(i, 3) - 0.5) * 26 }],
          }, web && ({ animation: `dLetterSlam 320ms ${delay + i * 55}ms cubic-bezier(.2,1,.3,1) both` } as any)] as any}
        >
          {ch}
        </Text>
      ))}
    </View>
  );
}

/* EXECUTIONER TAKEOVER — full-screen All-Out-Attack: diagonal panels slash the game
   away, a guillotine falls over the victim's huge score, the number splits in 3D,
   giant letters stamp the verdict, then the panels hand the game back. */
function ExecTakeover({ mode, victimSide, victimLabel, victimScore, targetCard, oppName }: {
  mode: "exec" | "misfire"; victimSide: "p1" | "p2"; victimLabel: string; victimScore: number; targetCard?: Card; oppName: string;
}) {
  const accent = victimSide === "p1" ? theme.color.yellow : "#FF4D5E";
  const fail = mode === "misfire";
  const panelAnim = (side: "L" | "R") => (web
    ? ({ animation: `dTkPanel${side} 340ms cubic-bezier(.7,0,.3,1) both, dTkPanelOut${side} 430ms ${fail ? 3300 : 3820}ms cubic-bezier(.7,0,.3,1) both` } as any)
    : null);
  // the meter shows the target's power — a number card's power, or 0 for a trick (nothing to cut)
  const targetPower = targetCard?.kind === "number" ? targetCard.power : 0;
  // shared sentencing meter, mounted ABOVE the rig in both modes — in success the
  // fill crosses into the crimson zone and stamps THRESHOLD MET; in fail it stalls short.
  const meter = (met: boolean, fillDelay: number, numDelay: number, baseDelay: number) => (
    <View style={[st.tkMeterWrap as any]}>
      <Text style={st.tkMeterLbl as any}>SENTENCING POWER</Text>
      <View style={st.tkMeterBar as any}>
        <View style={[st.tkMeterZone as any, met && (web ? ({ animation: "dZonePulse 320ms 1560ms cubic-bezier(.2,1,.3,1) 3" } as any) : null)]} />
        <View
          style={[st.tkMeterFill as any, { width: `${(targetPower / 12) * 100}%` }, web && ({ animation: `dMeterFill 900ms ${fillDelay}ms cubic-bezier(.2,1,.3,1) both`, transformOrigin: "left center" } as any)]}
        />
        {[...Array(11)].map((_, i) => (
          <View key={i} style={[st.tkMeterTick as any, { left: `${((i + 1) / 12) * 100}%` }]} />
        ))}
        <Text style={[st.tkMeterNum as any, { left: `${((targetPower / 12) * 100 - 4).toFixed(1)}%` }, web && ({ animation: `dNumSlam 340ms ${numDelay}ms cubic-bezier(.2,1,1.6,1) both` } as any)]}>{targetPower}</Text>
        {met && (
          <View style={[st.tkMeterMet as any, web && ({ animation: `dStampIn 460ms ${baseDelay}ms cubic-bezier(.2,1,.3,1) both` } as any)]}>
            <Text style={st.tkMeterMetTxt as any}>THRESHOLD MET</Text>
          </View>
        )}
      </View>
      <View style={st.tkMeterCaptionRow as any}>
        <Text style={st.tkMeterCaption as any}>{met ? "GUILTY" : "TOO LOW"}</Text>
        <View style={st.tkMeterCaptionSpacer as any} />
        <Text style={[st.tkMeterCaption as any, { color: met ? theme.color.crimson : theme.color.yellow }]}>7+ DROPS THE BLADE</Text>
      </View>
    </View>
  );
  return (
    <View style={[st.tkRoot as any, web && ({ animation: `dTkShake 460ms ${fail ? 1560 : 2530}ms cubic-bezier(.2,1,.3,1)` } as any)]} pointerEvents="none">
      <View style={[st.tkPanel, st.tkPanelL as any, panelAnim("L")]} />
      <View style={[st.tkPanel, st.tkPanelR as any, panelAnim("R")]} />
      <View style={[st.tkSlash as any, web && ({ animation: `dTkSlashIn 260ms 180ms ease-out both, dTkSlashOut 380ms ${fail ? 3300 : 3820}ms ease-in both` } as any)]} />
      <View style={[st.tkContent as any, web && ({ animation: `dTkFadeIn 240ms 300ms ease-out both, dTkFadeOut 300ms ${fail ? 3190 : 3710}ms ease-in both` } as any)]}>
        <View style={st.tkStripes as any} />
        <Text style={st.tkKicker as any}>{fail ? "SENTENCING" : "FINAL VERDICT"}</Text>

        {fail ? (
          <>
            {/* the sentencing meter ABOVE the rig — the fill stalls short of the
                crimson drop zone, so the blade below only strains, then gives up. */}
            {meter(false, 620, 1420, 0)}
            {/* the SAME full-size guillotine — the star of this verdict. It waits,
                strains against the latch... and never drops: SPARED. */}
            <View style={[st.tkGuillotine as any, { top: 330 }]}>
              <View style={[st.tkPostG as any]} />
              <View style={[st.tkPostG as any, { left: 446 }]} />
              <View style={st.tkCap as any} />
              <View style={st.tkPulley as any}>
                <View style={st.tkWheel as any} />
              </View>
              <View style={[st.tkRope as any, web && ({ animation: "dTkRopeStrain 900ms 1560ms ease-in-out both" } as any)]} />
              <View style={[st.tkMouton as any, web && ({ animation: "dTkBladeHold 560ms 1420ms ease-in-out both, dTkBladeStrain 900ms 1560ms ease-in-out both" } as any)]}>
                <View style={[st.tkMoutonRivets as any]} />
                <View style={[st.tkEdge as any]} />
              </View>
              <View style={st.tkBaschet as any} />
            </View>
            <View style={[st.tkVerdict as any, { top: 640 }]}>
              <View style={[st.tkBurstB as any, { backgroundColor: "#111" }, web && ({ animation: "dStampIn 480ms 2050ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
              <View style={[st.tkBurstW as any, web && ({ animation: "dStampIn 480ms 2090ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
              <View style={[st.tkBurst as any, { backgroundColor: theme.color.crimson }, web && ({ animation: "dStampIn 480ms 2130ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
              {p5Letters("SPARED", 2210, 84, "#fff")}
              <Text style={[st.tkZero as any, { color: "#fff" }, web && ({ animation: "dNumSlam 340ms 2560ms cubic-bezier(.2,1,.3,1) both" } as any)]}>SCORES BELOW 7 ESCAPE THE BLADE</Text>
            </View>
          </>
        ) : (
          <>
            {/* the sentencing meter ABOVE the rig — the fill crosses into the
                crimson zone, THRESHOLD MET stamps on, and the blade answers. */}
            {meter(true, 620, 1420, 1600)}
            {/* the rig — a REAL guillotine: grooved posts, capping beam, pulley + rope,
                weighted mouton with the angled blade hanging under it */}
            <View style={[st.tkGuillotine as any, { top: 310 }]}>
              <View style={[st.tkPostG as any]} />
              <View style={[st.tkPostG as any, { left: 446 }]} />
              <View style={st.tkCap as any} />
              <View style={st.tkPulley as any}>
                <View style={st.tkWheel as any} />
              </View>
              <View style={[st.tkRope as any, web && ({ animation: "dTkRopeSlack 190ms 2350ms cubic-bezier(.6,0,.9,.4) both" } as any)]} />
              <View style={[st.tkMouton as any, web && ({ animation: "dTkBladeHold 700ms 1650ms ease-in-out both, dTkBladeDrop 190ms 2350ms cubic-bezier(.6,0,.9,.4) both" } as any)]}>
                <View style={[st.tkMoutonRivets as any]} />
                <View style={[st.tkEdge as any]} />
              </View>
              <View style={st.tkBaschet as any} />
            </View>
            {/* the victim's score, huge — sits in the rig's throat so the falling
                blade cuts THROUGH it. And its 3D split. */}
            <View style={[st.tkNumWrap as any, { top: 470 }]}>
              <Text style={[st.tkNum as any, { color: accent }, web && ({ animation: "dNumSlam 380ms 520ms cubic-bezier(.2,1,.3,1) both, dTkNumGone 60ms 2520ms both" } as any)]}>{victimScore}</Text>
              <Text style={[st.tkNumHalf, st.tkNumHalfA as any, { color: accent }, web && ({ animation: "dTkHalfA 750ms 2530ms cubic-bezier(.3,0,.6,1) both" } as any)]}>{victimScore}</Text>
              <Text style={[st.tkNumHalf, st.tkNumHalfB as any, { color: accent }, web && ({ animation: "dTkHalfB 750ms 2530ms cubic-bezier(.3,0,.6,1) both" } as any)]}>{victimScore}</Text>
              <View style={[st.tkCutLine as any, web && ({ animation: "dTkCutFlash 320ms 2500ms ease-out both" } as any)]} />
            </View>
            <View style={[st.tkVerdict as any, { top: 690 }]}>
              <View style={[st.tkBurstB as any, { backgroundColor: "#111" }, web && ({ animation: "dStampIn 480ms 2720ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
              <View style={[st.tkBurstW as any, web && ({ animation: "dStampIn 480ms 2760ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
              <View style={[st.tkBurst as any, { backgroundColor: theme.color.yellow }, web && ({ animation: "dStampIn 480ms 2800ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
              {p5Letters("EXECUTED", 2880, 72, "#111")}
              <Text style={[st.tkZero as any, { color: "#111" }, web && ({ animation: "dNumSlam 340ms 3280ms cubic-bezier(.2,1,.3,1) both" } as any)]}>SCORE → 0</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/* ECHO — two-part beat, kept deliberately small (echo only voids the clash):
   1) rings emit from the echo card while a compact "CLASH VOIDED" stamp pops;
   2) the ×2 chip pops OUT of the echo card and curves into the multiplier
   chip's standby spot — the exact coordinates where the real chip renders
   next round, so the hand-off reads as the chip staying there. */
function EchoLoad({ youPlayed }: { youPlayed: boolean }) {
  const slotTop = youPlayed ? "38%" : "4%";
  return (
    // NOTE: no end-fade — the chip holds until unmount, then the persistent
    // standby chip (same spot, same look) takes over in the same frame.
    <View style={st.esWrap as any} pointerEvents="none">
      {/* the clash dissolves — rings emit from the echo card */}
      <View style={[st.esWave as any, { top: slotTop, marginTop: 31 }, web && ({ animation: "dEsWave 700ms 150ms ease-out both" } as any)]} />
      <View style={[st.esWave as any, { top: slotTop, marginTop: 31 }, web && ({ animation: "dEsWave 700ms 320ms ease-out both" } as any)]} />
      {/* compact verdict — small plaque, same family as ROUND VOIDED */}
      <View style={[st.esStampWrap as any, web && ({ animation: "dStampIn 380ms 400ms cubic-bezier(.2,1,.3,1) both, dVdFadeOut 300ms 1900ms ease-in both" } as any)]}>
        <View style={st.esStamp as any}>
          <Text style={st.esStampTxt as any}>CLASH VOIDED</Text>
        </View>
      </View>
      {/* the ×2 chip: pops from the echo card, curves to its standby spot */}
      <View
        style={[
          st.esChip as any,
          { left: "50%", top: slotTop, marginLeft: -36, marginTop: 40 },
          youPlayed ? st.esChipPathBottom : st.esChipPathTop,
          web && ({ animation: `dEsChipPop 340ms 800ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 1200ms 900ms cubic-bezier(.4,.1,.4,1) both` } as any),
        ] as any}
      >
        <View style={st.multChipBurstB as any} />
        <View style={st.multChipBurstW as any} />
        <View style={[st.multChipLive as any, { transform: [{ rotate: "-4deg" }] }, web && ({ animation: "dMultWobble 900ms 2050ms ease-in-out both" } as any)]}>
          <View style={[st.multChipFace as any, { backgroundColor: theme.color.yellow }]} />
          <Text style={[st.multChipTxt as any, { color: "#111" }]}>×2</Text>
        </View>
      </View>
    </View>
  );
}

/* ECLIPSE — the echo activation with the shield chip: rings emit from the eclipse
   card while a compact "SHIELDS DOWN" stamp pops, then the broken-shield chip
   (with the 2-rounds badge) pops out and curves into its corner slot — beside
   the ×2 chip when one is parked, the corner itself when it's alone. */
function EclipseLoad({ youPlayed, beside }: { youPlayed: boolean; beside: boolean }) {
  const slotTop = youPlayed ? "38%" : "4%";
  return (
    <View style={st.esWrap as any} pointerEvents="none">
      <View style={[st.esWave as any, { top: slotTop, marginTop: 31 }, web && ({ animation: "dEsWave 700ms 150ms ease-out both" } as any)]} />
      <View style={[st.esWave as any, { top: slotTop, marginTop: 31 }, web && ({ animation: "dEsWave 700ms 320ms ease-out both" } as any)]} />
      <View style={[st.esStampWrap as any, web && ({ animation: "dStampIn 380ms 400ms cubic-bezier(.2,1,.3,1) both, dVdFadeOut 300ms 1900ms ease-in both" } as any)]}>
        <View style={st.esStamp as any}>
          <Text style={st.esStampTxt as any}>SHIELDS DOWN</Text>
        </View>
      </View>
      <View
        style={[
          st.esChip as any,
          { left: "50%", top: slotTop, marginLeft: -36, marginTop: 40, alignItems: "center", justifyContent: "center" },
          beside ? (youPlayed ? st.esChipPathBottom2 : st.esChipPathTop2) : (youPlayed ? st.esChipPathBottom : st.esChipPathTop),
          web && ({ animation: "dEsChipPop 340ms 800ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 1200ms 1900ms cubic-bezier(.4,.1,.4,1) both" } as any),
        ] as any}
      >
        {/* INTACT at first — halves sit flush (no breathing), holds a beat,
            then the CRACK: halves jolt apart with a white flash down the seam,
            and only then does the broken shield fly to its slot. */}
        <View style={st.shieldChipArt as any} pointerEvents="none">
          <View style={st.shieldChipBack as any} />
          <View style={[st.shieldHalfL as any, web && ({ animation: "dEsCrackL 380ms 1600ms cubic-bezier(.34,1.5,.64,1) both" } as any)]} />
          <View style={[st.shieldHalfR as any, web && ({ animation: "dEsCrackR 380ms 1600ms cubic-bezier(.34,1.5,.64,1) both" } as any)]} />
          <View style={[st.esCrackFlash as any, web && ({ animation: "dEsCrackFlash 280ms 1600ms ease-out both" } as any)]} />
          <View style={st.shieldChipCount as any}>
            <Text style={st.shieldChipCountTxt as any}>2</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* VOID — the void card mutates IN PLACE into a 3D maw: tilted accretion rings
   grind around a black event-horizon core with a burning rim, infalling matter
   streams down the disc plane, and the opposing card is stretched off its slot
   and devoured. Custom identity: NO spiky bursts — the verdict is a black plaque
   with the maw glyph, hard crimson shadow. */
function VoidMaw({ atTop }: { atTop: boolean }) {
  return (
    <>
      {/* soft focus vignette — dims the felt edges, zero stripes */}
      <View style={[st.vnVignette as any, web && ({ animation: "dVdFadeIn 600ms 250ms ease-out both, dVdFadeOut 350ms 4250ms ease-in both" } as any)]} pointerEvents="none" />

      {/* the maw — anchored exactly over the void card's felt slot */}
      <View
        pointerEvents="none"
        style={[st.vnPortal, atTop ? st.vnPortalTop : st.vnPortalBottom, web && ({ animation: "dVdIris 620ms 350ms cubic-bezier(.2,1,.3,1) both, dVdPortalOut 340ms 4300ms cubic-bezier(.6,0,.8,.5) both" } as any)] as any}
      >
        {/* tilted accretion disc — conic arc rings + infalling matter */}
        <View style={st.vnPersp as any}>
          <View style={st.vnDisc as any}>
            <View style={[st.vnRingA as any, web && ({ animation: "dVdRingSpin 7s linear infinite, dVdFadeIn 500ms 500ms both" } as any)]} />
            <View style={[st.vnRingB as any, web && ({ animation: "dVdRingSpinRev 4.5s linear infinite, dVdFadeIn 500ms 650ms both" } as any)]} />
            <View style={[st.vnRingC as any, web && ({ animation: "dVdRingSpin 3.2s linear infinite, dVdFadeIn 500ms 800ms both" } as any)]} />
            {[...Array(12)].map((_, i) => (
              <View key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transform: [{ rotate: `${i * 45}deg` }] } as any}>
                <View style={[st.vnDot as any, web && ({ animation: `dVdInfall 1.5s ${i * 0.125}s linear infinite` } as any)]} />
              </View>
            ))}
          </View>
        </View>
        {/* far side of the disk lensing OVER the top of the sphere */}
        <View style={[st.vnWrapTop as any, web && ({ animation: "dVdFadeIn 500ms 700ms ease-out both" } as any)]} />
        {/* the event horizon — a real sphere with volume shading, facing the viewer */}
        <View style={[st.vnCore as any, web && ({ animation: "dVdCoreIn 480ms 500ms cubic-bezier(.2,1,.3,1) both, dVdFlare 520ms 2250ms ease-out both" } as any)]} />
        {/* the light gliding across the sphere face (11 o'clock → 4 o'clock) */}
        <View style={st.vnShadeClip as any}>
          <View style={[st.vnShade as any, web && ({ animation: "dVdShadeSweep 3.2s linear infinite" } as any)]} />
        </View>
        {/* photon ring hugging the horizon */}
        <View style={[st.vnPhoton as any, web && ({ animation: "dVdFadeIn 420ms 760ms ease-out both" } as any)]} />
        {/* near side of the disk crossing IN FRONT, below the horizon */}
        <View style={[st.vnWrapFront as any, web && ({ animation: "dVdFadeIn 500ms 860ms ease-out both" } as any)]} />
        {/* swallow shockwave */}
        <View style={[st.vnShock as any, web && ({ animation: "dVdShock 560ms 2280ms cubic-bezier(.2,1,.3,1) both" } as any)]} />
      </View>

      {/* verdict plaque — black, hard crimson shadow, maw glyph. NO spiky burst. */}
      <View style={[st.vnPlaque, atTop ? st.vnPlaqueLow : st.vnPlaqueHigh, web && ({ animation: "dStampIn 420ms 2600ms cubic-bezier(.2,1,.3,1) both, dVdPlaqueOut 280ms 4300ms ease-in both" } as any)] as any}>
        <View style={st.vnPlaqueInner as any}>
          <View style={st.vnPlaqueAccent as any} />
          <View style={st.vnGlyph as any}>
            <View style={st.vnGlyphSlit as any} />
          </View>
          <Text style={st.vnPlaqueTitle as any}>ROUND VOIDED</Text>
        </View>
      </View>
    </>
  );
}

/* WARD — the parry: the opposing trick charges its activation (crimson aura +
   its own name stamping crimson), and just as it fires, Ward's golden barrier
   plants IN FRONT of that card — the charge pops on it, the trick dims to grey
   behind it, and BLOCKED + the flat +5 land on the barrier itself. Small, all
   on the felt, the card stays visible the whole time. */
function WardBlock({ victimTop, victimName }: { victimTop: boolean; victimName: string }) {
  const slotTop = victimTop ? "4%" : "38%";
  return (
    <View style={[st.esWrap as any, web && ({ animation: "dVdFadeOut 260ms 3950ms ease-in both" } as any)]} pointerEvents="none">
      {/* the trick charging — crimson aura + its name stamping */}
      <View style={[st.wdName as any, { left: "50%", top: slotTop, marginLeft: victimTop ? -245 : 65, marginTop: 45 }, web && ({ animation: "dStampIn 300ms 300ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
        <Text style={st.wdNameTxt as any}>{victimName.toUpperCase()}?</Text>
      </View>
      <View style={[st.wdActRing as any, { left: "50%", top: slotTop, marginLeft: -75, marginTop: -19 }, web && ({ animation: "dWdActRing 4200ms linear both" } as any)]} />
      {/* the activation firing — crimson burst off the card */}
      <View style={[st.esWave as any, { left: "50%", top: slotTop, marginLeft: -45, marginTop: 31 }, web && ({ animation: "dEsWave 600ms 800ms ease-out both" } as any)]} />
      {/* WARD'S BARRIER plants in front of the trick */}
      <View style={[st.wdBarrier as any, { left: "50%", top: slotTop, marginLeft: -80, marginTop: 26 }, web && ({ animation: "dWdBarrierIn 320ms 1000ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
        <View style={st.wdBarrierIn as any} />
        <View style={[st.esStamp as any, { position: "absolute", top: "14%", alignSelf: "center" }, web && ({ animation: "dStampIn 340ms 1300ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
          <Text style={st.esStampTxt as any}>BLOCKED</Text>
        </View>
        <Text style={[st.wdPlus as any, { position: "absolute", top: "44%" }, web && ({ animation: "dNumSlam 360ms 1600ms cubic-bezier(.2,1,.3,1) both" } as any)]}>+5</Text>
      </View>
    </View>
  );
}
/* Mini broken-shield glyph — two cracked crimson halves on a black backing.
   Used in the shields-off chip and the info modal badge. */
function BrokenShieldMark({ w, h }: { w: number; h: number }) {
  return (
    <View style={{ width: w, height: h } as any}>
      <View style={[st.shieldMiniBack as any, { left: -3, right: -3, top: -3, bottom: -3 } as any]} />
      <View style={st.shieldHalfL as any} />
      <View style={st.shieldHalfR as any} />
    </View>
  );
}

/* Card back — crimson with diagonal banding + suit mark. */
function CardBack({ opp }: { opp?: boolean }) {  return (
    <View style={[st.back as any, opp && { borderColor: theme.color.paperDim } as any]}>
      <View style={st.backStripeA as any} pointerEvents="none" />
      <View style={st.backStripeB as any} pointerEvents="none" />
      <Text style={st.backSuit as any}>♠</Text>
    </View>
  );
}

/* Hand card face — big power numeral, name, alignment/trick tag. */
function CardFace({ card }: { card: Card }) {
  const trick = card.kind === "trick";
  const good = card.kind === "number" && card.align === "good";
  const bg = trick ? "#101010" : good ? "#F5EFE1" : "#FEF2F2";
  const col = trick ? "#F5EFE1" : "#111111";
  const border = trick ? theme.color.paperFaint : good ? "#16a34a" : theme.color.crimson;
  const hint = trick ? TRICK_HINT[card.name] ?? "TRICK" : card.kind === "number" ? card.align.toUpperCase() : "";
  return (
    <View style={[st.face as any, { backgroundColor: bg, borderColor: trick ? "#000" : border }]}>
      {trick && <View style={st.faceCornerA as any} pointerEvents="none" />}
      {trick && <View style={st.faceCornerB as any} pointerEvents="none" />}
      <Text style={[st.facePower, { color: trick ? theme.color.yellow : col } as any] as any}>{card.power ?? "—"}</Text>
      <Text style={[st.faceName, { color: col } as any] as any}>{card.name.toUpperCase()}</Text>
      <View style={[st.faceTag, { backgroundColor: trick ? theme.color.crimson : good ? "#16a34a" : theme.color.crimson }] as any}>
        <Text style={st.faceTagTxt as any}>{hint}</Text>
      </View>
    </View>
  );
}

/* Trapezoid table — wide near the viewer, narrow at the far edge. */
const TABLE_CLIP = "polygon(13% 0%, 87% 0%, 100% 100%, 0% 100%)";

/* Broken-shield glyphs — one full shield outline, split by a jagged crack down
   the middle. Percent-based clips, so the same polygons scale to any size. */
const SHIELD_CLIP = "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 0% 60%, 0% 11%)";
const SHIELD_CLIP_L = "polygon(50% 0%, 56% 9%, 47% 26%, 54% 45%, 46% 64%, 53% 82%, 50% 100%, 0% 60%, 0% 11%)";
const SHIELD_CLIP_R = "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 55.5% 82%, 48.5% 64%, 56.5% 45%, 49.5% 26%, 58.5% 9%)";

/* Irregular comic starburst — P5 sticker verdict shape (black offset layer + colored face). */
const BURST_CLIP = "polygon(50% 0%, 60% 11%, 76% 4%, 79% 20%, 96% 22%, 88% 37%, 100% 48%, 86% 57%, 93% 72%, 76% 71%, 73% 88%, 58% 78%, 46% 94%, 39% 78%, 22% 85%, 25% 67%, 6% 63%, 19% 51%, 4% 38%, 21% 34%, 16% 17%, 34% 21%, 41% 5%)";

/* Fixed design canvas — the whole stage scales to fit the window. */
const DESIGN_W = 1600;
const DESIGN_H = 900;
/* Klein's line lingers this long after it lands (a new message resets the timer). */
const MSG_MS = 8000;

const st = StyleSheet.create({
  /* the window fills; the 1600x900 stage inside scales to fit */
  viewport: { flex: 1, backgroundColor: "#080808", overflow: "hidden" } as any,
  stage: {
    position: "absolute", left: "50%", top: "50%", width: DESIGN_W, height: DESIGN_H,
    marginLeft: -DESIGN_W / 2, marginTop: -DESIGN_H / 2,
    backgroundColor: "#080808", overflow: "hidden",
  } as any,

  /* backdrop */
  backStripes: {
    ...StyleSheet.absoluteFillObject,
    ...(web ? ({
      backgroundImage:
        "repeating-linear-gradient(115deg, transparent 0 160px, rgba(230,0,18,0.05) 160px 190px), repeating-linear-gradient(65deg, transparent 0 220px, rgba(252,238,33,0.025) 220px 240px)",
    } as any) : {}),
  } as any,
  backDots: {
    ...StyleSheet.absoluteFillObject,
    ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1.6px)", backgroundSize: "9px 9px" } as any) : {}),
  } as any,

  /* intro splash */
  introWrap: { ...StyleSheet.absoluteFillObject, zIndex: 60, alignItems: "center", justifyContent: "center" } as any,
  introPanel: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson, transform: [{ skewX: "-14deg" }], borderLeftWidth: 14, borderRightWidth: 14, borderColor: "#000" } as any,
  introTxt: { fontFamily: theme.font.display, fontSize: 120, color: "#fff", letterSpacing: 10, textShadow: "10px 10px 0 #000" } as any,

  /* HUD stickers */
  stamp: { position: "absolute", zIndex: 40, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 3, transform: [{ rotate: "6deg" }, { skewX: "-10deg" }] } as any,
  stampRed: { top: 16, right: "3%", backgroundColor: theme.color.crimson, borderColor: "#fff", ...(web ? ({ animation: "dDots 1.1s steps(2) infinite" } as any) : {}) } as any,
  stampTxtLight: { fontFamily: theme.font.display, fontSize: 18, color: "#fff", letterSpacing: 2, textShadow: "2px 2px 0 #000" } as any,

  /* ---------- opponent zone ---------- */
  oppZone: { height: "31%", alignItems: "center", justifyContent: "flex-end", zIndex: 10 } as any,
  oppFrameBack: {
    position: "absolute", bottom: -8, width: 360, height: "88%", backgroundColor: "#0d0d0d",
    borderWidth: 4, borderColor: "#1c1c1c", transform: [{ rotate: "-2deg" }],
    ...(web ? ({ boxShadow: "14px 14px 0 rgba(230,0,18,0.16)", clipPath: "polygon(6% 0%, 94% 2%, 100% 100%, 0% 97%)" } as any) : {}),
  } as any,
  oppPortraitWrap: { position: "absolute", bottom: 0, height: "88%", justifyContent: "flex-end", alignItems: "center", zIndex: 1 } as any,
  oppPortrait: { width: 340, height: "100%", ...(web ? ({ filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.85))" } as any) : {}) } as any,
  oppNameplate: {
    position: "absolute", bottom: 10, left: "50%", marginLeft: -170, zIndex: 3, flexDirection: "row", alignItems: "baseline", gap: 12,
    backgroundColor: "#000", borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 22, paddingVertical: 7,
    transform: [{ rotate: "-2.5deg" }, { skewX: "-10deg" }],
    ...(web ? ({ boxShadow: "5px 5px 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  oppNameTxt: { fontFamily: theme.font.display, fontSize: 32, color: "#fff", letterSpacing: 4, textShadow: "2px 2px 0 rgba(230,0,18,0.9)" } as any,
  oppRankTxt: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow } as any,
  oppFan: { position: "absolute", top: "5%", left: "50%", marginLeft: -150, width: 300, height: 46, flexDirection: "row", justifyContent: "center", zIndex: 0 } as any,
  oppFanCard: {
    width: 32, height: 44, marginLeft: -14, borderRadius: 4, backgroundColor: theme.color.crimson,
    borderWidth: 2, borderColor: "rgba(0,0,0,0.85)", opacity: 0.92, ...(web ? ({ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0 4px, transparent 4px 8px)", boxShadow: "2px 2px 0 rgba(0,0,0,0.6)" } as any) : {}),
  } as any,
  bubble: {
    position: "absolute", left: "50%", marginLeft: 185, top: "12%", maxWidth: 400, zIndex: 20,
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18,
    ...(web ? ({ boxShadow: "7px 7px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  bubbleTail: {
    position: "absolute", left: -12, top: 30, width: 22, height: 22, backgroundColor: "#000",
    borderLeftWidth: 3, borderBottomWidth: 3, borderColor: "#fff", transform: [{ rotate: "45deg" }],
  } as any,
  bubbleTag: { position: "absolute", top: -16, left: 14, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#000", paddingHorizontal: 10, paddingVertical: 2, transform: [{ rotate: "-3deg" }], zIndex: 2 } as any,
  bubbleTagTxt: { fontFamily: theme.font.display, fontSize: 13, color: "#fff", letterSpacing: 2 } as any,
  bubbleTxt: { fontFamily: theme.font.body, fontSize: 19, color: "#fff", fontStyle: "italic", lineHeight: 27, textShadow: "1px 1px 0 rgba(0,0,0,0.9)" } as any,
  bubbleDotsRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 8 } as any,
  bubbleDot: { width: 14, height: 14, borderRadius: 999, backgroundColor: theme.color.yellow } as any,

  /* ---------- table — runs from below Klein to the very bottom of the screen ---------- */
  tableZone: { flex: 1, alignItems: "center", zIndex: 20 } as any,
  tableRim: {
    width: "92%", height: "100%", backgroundColor: "#2b2019", borderWidth: 4, borderColor: "#000",
    ...(web ? ({
      clipPath: TABLE_CLIP,
      backgroundImage: "linear-gradient(180deg, #7a5432 0%, #43301c 7%, #241a10 26%, #1a120a 55%, #2e2012 82%, #6b4a2a 94%, #a3763f 100%)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.85)",
    } as any) : {}),
  } as any,
  tableFelt: {
    ...StyleSheet.absoluteFillObject, top: 22, left: 22, right: 22, bottom: 16,
    backgroundColor: "#1c0d0f",
    ...(web ? ({
      clipPath: TABLE_CLIP,
      backgroundImage:
        "repeating-linear-gradient(115deg, rgba(255,255,255,0.014) 0 3px, transparent 3px 7px), radial-gradient(ellipse at 50% 22%, #55151b 0%, #3a0e13 40%, #1c0d0f 72%, #120809 100%)",
    } as any) : {}),
  } as any,
  feltLine: {
    position: "absolute", left: "16%", right: "16%", top: "50%", borderTopWidth: 2, borderStyle: "dashed",
    borderColor: "rgba(230,0,18,0.30)",
  } as any,
  roundMarker: {
    position: "absolute", left: "2%", top: "30%", width: 168, alignItems: "center",
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingVertical: 10,
    transform: [{ rotate: "-7deg" }, { skewX: "-8deg" }], zIndex: 25,
    ...(web ? ({ boxShadow: "5px 5px 0 rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  roundLbl: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 6, color: theme.color.paperDim, fontWeight: "900" } as any,
  roundNum: { fontFamily: theme.font.display, fontSize: 54, lineHeight: 56, color: "#fff", textShadow: "3px 3px 0 rgba(230,0,18,0.9)" } as any,
  roundDim: { fontSize: 28, color: theme.color.paperDim } as any,
  roundMult: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow, letterSpacing: 2 } as any,

  chip: {
    position: "absolute", width: 116, height: 116, borderRadius: 999, alignItems: "center", justifyContent: "center",
    backgroundColor: "#000", borderWidth: 3, zIndex: 25,
  } as any,
  chipOpp: { right: "5%", top: "6%", borderColor: theme.color.crimson, transform: [{ rotate: "4deg" }] } as any,
  chipYou: { left: "5%", bottom: "27%", borderColor: theme.color.yellow, transform: [{ rotate: "-4deg" }] } as any,
  chipLbl: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, color: theme.color.paperDim, fontWeight: "900", textAlign: "center" } as any,
  chipNum: { fontFamily: theme.font.display, fontSize: 48, lineHeight: 50, textShadow: "2px 2px 0 #000" } as any,

  /* executioner drain "-1" pops — anchored beside each chip, fan outward with each tick */
  drainPopOpp: { position: "absolute", right: "5%", top: "6%", width: 116, height: 116, zIndex: 30, alignItems: "center", justifyContent: "flex-start" } as any,
  drainPopYou: { position: "absolute", left: "5%", bottom: "27%", width: 116, height: 116, zIndex: 30, alignItems: "center", justifyContent: "flex-start" } as any,
  drainPopTxt: {
    fontFamily: theme.font.display, fontSize: 74, lineHeight: 74, color: theme.color.crimson,
    textShadow: "5px 5px 0 #000, 0 0 26px rgba(230,0,18,0.55)",
  } as any,

  feltSlot: { position: "absolute", left: "50%", marginLeft: -57, zIndex: 5 } as any,
  feltSlotTop: { top: "4%" } as any,
  feltSlotBottom: { top: "38%" } as any,
  playCard: {
    width: 114, height: 152, borderRadius: 9, overflow: "hidden",
    ...(web ? ({ boxShadow: "5px 7px 0 rgba(0,0,0,0.7)" } as any) : {}),
  } as any,

  back: { flex: 1, backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: theme.color.yellow, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden" } as any,
  backStripeA: { ...StyleSheet.absoluteFillObject, ...(web ? ({ backgroundImage: "repeating-linear-gradient(45deg, rgba(0,0,0,0.4) 0 7px, transparent 7px 16px)" } as any) : {}) } as any,
  backStripeB: { position: "absolute", left: "18%", right: "18%", top: 0, bottom: 0, borderWidth: 2, borderColor: "rgba(0,0,0,0.35)" } as any,
  backSuit: { fontSize: 30, color: "rgba(0,0,0,0.55)", fontWeight: "900", transform: [{ rotate: "-10deg" }] } as any,

  /* reveal sequence overlays */
  showdownWrap: { position: "absolute", left: "50%", top: "30%", marginLeft: -120, width: 240, alignItems: "center", zIndex: 8 } as any,
  showdownLbl: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 8, color: theme.color.yellow, fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  showdownNum: { fontFamily: theme.font.display, fontSize: 110, lineHeight: 112, color: "#fff", textShadow: "6px 6px 0 rgba(230,0,18,0.9), 3px 3px 0 #000" } as any,
  tallyPlate: {
    position: "absolute", left: -142, top: "50%", marginTop: -48, width: 124, alignItems: "center",
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingVertical: 6, zIndex: 6,
    ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  tallyLbl: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.paperDim, fontWeight: "900" } as any,
  tallyNum: { fontFamily: theme.font.display, fontSize: 48, lineHeight: 50, textShadow: "3px 3px 0 #000" } as any,
  flyBadge: { position: "absolute", width: 190, alignItems: "center", zIndex: 30 } as any,
  flyYou: { left: "37%", top: "40%" } as any,
  flyKlein: { left: "37%", top: "7%" } as any,
  flyTxt: { fontFamily: theme.font.display, fontSize: 76, lineHeight: 80, textShadow: "4px 4px 0 #000, 0 0 30px rgba(252,238,33,0.7)" } as any,

  /* shield nullify cinematic */
  shieldWrap: { position: "absolute", left: "50%", top: "16%", marginLeft: -240, width: 480, alignItems: "center", zIndex: 9, gap: 10 } as any,
  tieWrap: { position: "absolute", left: "50%", top: "27%", marginLeft: -120, width: 240, alignItems: "center", zIndex: 9 } as any,

  /* executioner takeover — full-screen All-Out-Attack stage (1600x900 design space) */
  tkRoot: { ...StyleSheet.absoluteFillObject, zIndex: 90 } as any,
  tkPanel: { ...StyleSheet.absoluteFillObject } as any,
  tkPanelL: {
    clipPath: "polygon(0 0, 60% 0, 44% 100%, 0 100%)",
    backgroundColor: "#0a0a0d",
    ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 2.2px)", backgroundSize: "10px 10px", boxShadow: "inset -14px 0 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  tkPanelR: {
    clipPath: "polygon(60% 0, 100% 0, 100% 100%, 44% 100%)",
    backgroundColor: "#120609",
    ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 2.2px)", backgroundSize: "10px 10px", boxShadow: "inset 14px 0 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  tkSlash: {
    position: "absolute", left: "51%", top: "-5%", width: 10, height: "110%", backgroundColor: "#fff",
    ...(web ? ({ boxShadow: "0 0 26px rgba(255,255,255,0.9)" } as any) : {}),
  } as any,
  tkContent: { ...StyleSheet.absoluteFillObject, alignItems: "center" } as any,
  tkStripes: {
    position: "absolute", left: "-20%", right: "-20%", top: "42%", height: 130, opacity: 0.14,
    transform: [{ rotate: "-12deg" }],
    ...(web ? ({
      backgroundImage: "repeating-linear-gradient(90deg, rgba(252,238,33,0.9) 0 10px, transparent 10px 26px)",
      backgroundSize: "84px 100%", animation: "dStripe 900ms linear infinite",
    } as any) : {}),
  } as any,
  tkKicker: {
    position: "absolute", top: 44, fontFamily: theme.font.body, fontSize: 24, letterSpacing: 10,
    color: theme.color.paperDim, fontWeight: "900", textShadow: "2px 2px 0 #000",
  } as any,
  tkNumWrap: { position: "absolute", left: 0, right: 0, height: 250, alignItems: "center", justifyContent: "center", ...(web ? ({ perspective: 900 } as any) : {}) } as any,
  tkNum: { fontFamily: theme.font.display, fontSize: 236, lineHeight: 244, textShadow: "10px 10px 0 rgba(0,0,0,0.85)" } as any,
  tkNumHalf: { position: "absolute", fontSize: 236, lineHeight: 244, textShadow: "10px 10px 0 rgba(0,0,0,0.85)" } as any,
  tkNumHalfA: { ...(web ? ({ clipPath: "polygon(0 0, 100% 0, 100% 44%, 0 56%)" } as any) : {}) } as any,
  tkNumHalfB: { ...(web ? ({ clipPath: "polygon(0 56%, 100% 44%, 100% 100%, 0 100%)" } as any) : {}) } as any,
  tkCutLine: {
    position: "absolute", left: -80, right: -80, top: "52%", height: 8, backgroundColor: "#fff",
    ...(web ? ({ boxShadow: "0 0 30px rgba(255,255,255,0.95)" } as any) : {}),
  } as any,
  tkSub: { position: "absolute", left: 0, right: 0, textAlign: "center", fontFamily: theme.font.body, fontSize: 24, letterSpacing: 8, color: "#fff", fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  /* the rig — a proper guillotine: two grooved uprights capped by a beam,
     pulley + rope on top, weighted mouton with the angled blade below it */
  tkGuillotine: { position: "absolute", left: "50%", marginLeft: -240, top: 100, width: 480, height: 560, pointerEvents: "none" } as any,
  tkPostG: {
    position: "absolute", left: 0, top: 60, width: 34, height: 460, backgroundColor: "#141419", borderWidth: 3, borderColor: "#2c2c36",
    ...(web ? ({ backgroundImage: "repeating-linear-gradient(180deg, #1d1d24 0 22px, #0b0b0e 22px 30px)" } as any) : {}),
  } as any,
  tkCap: {
    position: "absolute", left: -26, top: 14, width: 532, height: 44, backgroundColor: "#17171d", borderWidth: 3, borderColor: "#2c2c36",
    ...(web ? ({ backgroundImage: "linear-gradient(180deg, #26262e 0%, #101014 100%)", boxShadow: "0 8px 24px rgba(0,0,0,0.7)" } as any) : {}),
  } as any,
  tkPulley: { position: "absolute", left: 218, top: 30, width: 44, height: 44, ...(web ? ({ backgroundImage: "radial-gradient(circle at 35% 30%, #3a3a44, #101014 70%)", borderWidth: 3, borderColor: "#2c2c36" } as any) : {}) } as any,
  tkWheel: {
    position: "absolute", left: 8, top: 8, right: 8, bottom: 8, borderRadius: 999, backgroundColor: "#0c0c10",
    ...(web ? ({ backgroundImage: "conic-gradient(#565666 0 12.5%, #14141a 12.5% 25%, #565666 25% 37.5%, #14141a 37.5% 50%, #565666 50% 62.5%, #14141a 62.5% 75%, #565666 75% 87.5%, #14141a 87.5% 100%)" } as any) : {}),
  } as any,
  tkRope: {
    position: "absolute", left: 236, top: 58, width: 8, height: 96, backgroundColor: "#c9b48a",
    ...(web ? ({ boxShadow: "inset 0 0 3px rgba(0,0,0,0.6), 1px 1px 2px rgba(0,0,0,0.5)", transformOrigin: "50% 0%" } as any) : {}),
  } as any,
  tkMouton: {
    position: "absolute", left: 47, top: 150, width: 386, height: 88,
    ...(web ? ({
      backgroundImage: "linear-gradient(180deg, #3c3c46 0%, #23232b 30%, #14141a 100%)",
      borderWidth: 3, borderColor: "#050507",
      boxShadow: "0 14px 30px rgba(0,0,0,0.85), inset 0 4px 0 rgba(255,255,255,0.14)",
    } as any) : {}),
  } as any,
  tkMoutonRivets: {
    position: "absolute", left: 0, right: 0, top: 12, height: 14,
    ...(web ? ({ backgroundImage: "radial-gradient(circle, #6a6a78 2px, #191920 2.6px) 14px 14px", backgroundSize: "42px 14px", backgroundRepeat: "repeat-x" } as any) : {}),
  } as any,
  tkEdge: {
    position: "absolute", left: -6, right: -6, bottom: -46, height: 52,
    ...(web ? ({
      clipPath: "polygon(0 22%, 100% 0, 100% 100%, 0 100%)",
      backgroundImage: "linear-gradient(175deg, #e8ecf2 0%, #aab2bf 35%, #4a5058 60%, #23262c 100%)",
      boxShadow: "inset 0 -6px 0 rgba(230,0,18,0.55), 0 12px 26px rgba(0,0,0,0.8)",
    } as any) : {}),
  } as any,
  tkBaschet: {
    position: "absolute", left: 26, top: 508, width: 428, height: 34,
    ...(web ? ({ backgroundImage: "linear-gradient(180deg, #20202a 0%, #0b0b0e 100%)", borderWidth: 3, borderColor: "#050507", boxShadow: "0 10px 24px rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  tkVerdict: { position: "absolute", left: "50%", marginLeft: -390, width: 780, height: 200, alignItems: "center", justifyContent: "center", zIndex: 3 } as any,
  tkBurst: { ...StyleSheet.absoluteFillObject, ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: "#000" } as any) : {}) } as any,
  tkBurstB: { ...StyleSheet.absoluteFillObject, marginLeft: 10, marginTop: 12, ...(web ? ({ clipPath: BURST_CLIP } as any) : {}) } as any,
  tkBurstW: { ...StyleSheet.absoluteFillObject, marginLeft: 5, marginTop: 6, ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: "#fff" } as any) : {}) } as any,
  tkLetters: { flexDirection: "row", alignItems: "center", ...(web ? ({ perspective: 700 } as any) : {}) } as any,
  tkLetter: { fontFamily: theme.font.display, lineHeight: 82, textShadow: "4px 4px 0 rgba(0,0,0,0.35)", marginHorizontal: 2 } as any,
  tkZero: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 4, marginTop: 2 } as any,
  /* misfire → the sentencing meter under the blade: fill = target power,
     crimson-striped zone past 7 = where the blade would drop */
  tkMeterWrap: { position: "absolute", top: 110, left: "50%", marginLeft: -400, width: 800, alignItems: "center", gap: 12, zIndex: 2 } as any,
  tkMeterLbl: { fontFamily: theme.font.body, fontSize: 22, letterSpacing: 8, color: "#fff", fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  tkMeterBar: {
    position: "relative", width: 800, height: 64, backgroundColor: "#0a0a0d", borderWidth: 4, borderColor: "#fff",
    ...(web ? ({ boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  tkMeterZone: {
    position: "absolute", right: 0, top: 0, bottom: 0, width: "41.67%",
    ...(web ? ({
      backgroundImage: "repeating-linear-gradient(45deg, rgba(230,0,18,0.55) 0 12px, rgba(230,0,18,0.2) 12px 24px)",
      borderLeftWidth: 4, borderLeftColor: theme.color.crimson,
    } as any) : {}),
  } as any,
  tkMeterFill: {
    position: "absolute", left: 0, top: 4, bottom: 4, backgroundColor: theme.color.yellow,
    ...(web ? ({ boxShadow: "inset 0 -10px 0 rgba(230,0,18,0.4), 0 0 24px rgba(252,238,33,0.5)" } as any) : {}),
  } as any,
  tkMeterTick: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,255,255,0.22)" } as any,
  tkMeterNum: {
    position: "absolute", top: -34, width: 44, textAlign: "center", zIndex: 3,
    fontFamily: theme.font.display, fontSize: 40, lineHeight: 42, color: "#fff", textShadow: "3px 3px 0 rgba(230,0,18,0.95)",
  } as any,
  tkMeterMet: {
    position: "absolute", top: -54, left: "50%", marginLeft: -170, width: 340, paddingVertical: 6, alignItems: "center", zIndex: 4,
    backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff",
    ...(web ? ({ boxShadow: "6px 6px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  tkMeterMetTxt: { fontFamily: theme.font.display, fontSize: 28, lineHeight: 30, letterSpacing: 2, color: "#fff", textShadow: "2px 2px 0 #000" } as any,
  tkMeterCaptionRow: { flexDirection: "row", width: 800 } as any,
  tkMeterCaptionSpacer: { flex: 1 } as any,
  tkMeterCaption: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 3, color: theme.color.paperDim, fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,

  /* ---------- VOID — maw mutation on the felt (custom 3D identity) ---------- */
  vnVignette: { ...StyleSheet.absoluteFillObject, zIndex: 6, ...(web ? ({ backgroundImage: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 100%)" } as any) : {}) } as any,
  vnPortal: { position: "absolute", left: "50%", marginLeft: -150, width: 300, height: 300, zIndex: 8 } as any,
  vnPortalTop: { top: "4%", marginTop: -74 } as any,
  vnPortalBottom: { top: "38%", marginTop: -74 } as any,
  vnPersp: { ...StyleSheet.absoluteFillObject, ...(web ? ({ perspective: 700 } as any) : {}) } as any,
  vnDisc: { ...StyleSheet.absoluteFillObject, ...(web ? ({ transform: [{ rotateX: "60deg" }] } as any) : {}) } as any,
  vnRingA: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -150, marginTop: -150, width: 300, height: 300, borderRadius: 999,
    ...(web ? ({
      // doppler beaming — the approaching (left) side burns brighter
      backgroundImage: "conic-gradient(from 0deg, rgba(230,0,18,0) 0deg, rgba(230,0,18,0.4) 170deg, rgba(255,235,225,0.95) 265deg, rgba(230,0,18,0.35) 330deg, rgba(230,0,18,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 4px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 4px))",
    } as any) : {}),
  } as any,
  vnRingB: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -115, marginTop: -115, width: 230, height: 230, borderRadius: 999,
    ...(web ? ({
      backgroundImage: "conic-gradient(from 180deg, rgba(230,0,18,0) 0deg, rgba(230,0,18,0.7) 60deg, rgba(255,255,255,0.9) 120deg, rgba(230,0,18,0.15) 200deg, rgba(230,0,18,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
    } as any) : {}),
  } as any,
  vnRingC: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -88, marginTop: -88, width: 176, height: 176, borderRadius: 999,
    ...(web ? ({
      backgroundImage: "conic-gradient(from 40deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.8) 100deg, rgba(255,255,255,0.1) 220deg, rgba(255,255,255,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 1px))",
    } as any) : {}),
  } as any,
  vnDot: { position: "absolute", left: -2, top: -158, width: 4, height: 4, borderRadius: 4, backgroundColor: "rgba(255,214,196,0.95)" } as any,
  vnCore: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -66, marginTop: -66, width: 132, height: 132, borderRadius: 999,
    ...(web ? ({
      // the sphere — dark base volume; the orbiting shade (vnShade) supplies the light
      backgroundImage: "radial-gradient(circle at 38% 30%, #180910 0%, #0c0409 32%, #000 62%)",
      boxShadow: "0 0 34px rgba(230,0,18,0.5), 0 20px 55px rgba(0,0,0,0.65)",
    } as any) : {}),
  } as any,
  /* the sweeping light — a soft patch that GLIDES across the sphere face along a
     straight diagonal (11 o'clock → 4 o'clock), clipped by the sphere itself */
  vnShadeClip: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -66, marginTop: -66, width: 132, height: 132, borderRadius: 999, overflow: "hidden",
  } as any,
  vnShade: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -66, marginTop: -66, width: 132, height: 132,
    ...(web ? ({
      // wide, soft bloom — reads as a light REFLECTION rolling across the ball
      backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,228,206,0.65) 0%, rgba(255,198,166,0.34) 36%, rgba(255,172,142,0.12) 58%, transparent 76%)",
    } as any) : {}),
  } as any,
  /* photon ring — thin white-hot circle hugging the sphere's edge */
  vnPhoton: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -70, marginTop: -70, width: 140, height: 140, borderRadius: 999,
    borderWidth: 2, borderColor: "rgba(255,238,222,0.9)",
    ...(web ? ({ boxShadow: "0 0 14px rgba(255,190,150,0.85), inset 0 0 10px rgba(255,190,150,0.5)" } as any) : {}),
  } as any,
  /* the disk bending OVER the sphere (far side, light-lensed above the horizon) */
  vnWrapTop: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -120, marginTop: -75, width: 240, height: 150, borderRadius: "50%",
    ...(web ? ({
      backgroundImage: "conic-gradient(from 0deg, rgba(255,222,196,0) 0deg, rgba(255,224,198,0.95) 55deg, rgba(230,0,18,0.85) 115deg, rgba(255,222,196,0.15) 165deg, rgba(255,222,196,0) 195deg, rgba(255,222,196,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 2px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 2px))",
      clipPath: "polygon(0 0, 100% 0, 100% 52%, 0 52%)",
      filter: "drop-shadow(0 0 6px rgba(255,200,160,0.7))",
    } as any) : {}),
  } as any,
  /* the near side of the disk crossing IN FRONT of the sphere's lower edge */
  vnWrapFront: {
    position: "absolute", left: "50%", top: "50%", marginLeft: -130, marginTop: -73, width: 260, height: 156, borderRadius: "50%",
    ...(web ? ({
      backgroundImage: "conic-gradient(from 0deg, rgba(255,222,196,0) 0deg, rgba(255,222,196,0) 150deg, rgba(255,236,220,0.95) 195deg, rgba(230,0,18,0.9) 255deg, rgba(255,222,196,0.2) 300deg, rgba(255,222,196,0) 360deg)",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 3px))",
      clipPath: "polygon(0 48%, 100% 48%, 100% 100%, 0 100%)",
      filter: "drop-shadow(0 0 7px rgba(255,205,165,0.75))",
    } as any) : {}),
  } as any,
  vnShock: { position: "absolute", left: "50%", top: "50%", marginLeft: -80, marginTop: -80, width: 160, height: 160, borderRadius: 999, borderWidth: 3, borderColor: "rgba(255,235,225,0.9)" } as any,
  vnPlaque: { position: "absolute", left: "50%", marginLeft: -190, width: 380, zIndex: 9 } as any,
  vnPlaqueLow: { top: "46%" } as any,
  vnPlaqueHigh: { top: "21%" } as any,
  vnPlaqueInner: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 22, paddingRight: 20, paddingVertical: 13,
    backgroundColor: "#000", borderWidth: 2, borderColor: "#fff", overflow: "hidden",
    transform: [{ rotate: "-2.5deg" }, { skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "8px 8px 0 rgba(230,0,18,0.92), 16px 16px 0 rgba(0,0,0,0.5)" } as any) : {}),
  } as any,
  vnPlaqueAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: theme.color.crimson } as any,
  vnGlyph: {
    width: 36, height: 36, borderRadius: 999, backgroundColor: "#050505", borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
    ...(web ? ({ boxShadow: "0 0 12px rgba(230,0,18,0.75)" } as any) : {}),
  } as any,
  vnGlyphSlit: { width: 22, height: 3, borderRadius: 2, backgroundColor: "#fff", ...(web ? ({ boxShadow: "0 0 7px rgba(255,255,255,0.9)" } as any) : {}) } as any,
  vnPlaqueTitle: { fontFamily: theme.font.display, fontSize: 34, lineHeight: 38, letterSpacing: 4, color: "#fff", textShadow: "3px 3px 0 rgba(230,0,18,0.95), 5px 5px 0 rgba(0,0,0,0.6)" } as any,
  vdKicker: {
    position: "absolute", left: "50%", top: 116, marginLeft: -150, width: 300, alignItems: "center",
    backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingVertical: 6,
    transform: [{ rotate: "-3deg" }, { skewX: "-8deg" }], zIndex: 5,
    ...(web ? ({ boxShadow: "5px 5px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  vdKickerTxt: { fontFamily: theme.font.body, fontSize: 17, letterSpacing: 6, color: "#fff", fontWeight: "900" } as any,

  /* ---------- ECHO — clash-void rings, compact stamp, chip lob to standby ---------- */
  esWrap: { ...StyleSheet.absoluteFillObject, zIndex: 8 } as any,
  esWave: {
    position: "absolute", left: "50%", marginLeft: -45, width: 90, height: 90, borderRadius: 999,
    borderWidth: 4, borderColor: "rgba(230,0,18,0.8)",
    ...(web ? ({ boxShadow: "0 0 24px rgba(230,0,18,0.5)" } as any) : {}),
  } as any,
  esStampWrap: { position: "absolute", left: "50%", top: "22%", marginLeft: -145, width: 290, alignItems: "center", zIndex: 3 } as any,
  esStamp: {
    backgroundColor: "#000", borderWidth: 2, borderColor: "#fff", overflow: "hidden",
    paddingVertical: 8, paddingHorizontal: 18,
    transform: [{ rotate: "-2deg" }, { skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "6px 6px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  esStampTxt: { fontFamily: theme.font.display, fontSize: 24, lineHeight: 28, letterSpacing: 3, color: "#fff", textShadow: "2px 2px 0 rgba(230,0,18,0.95)" } as any,
  esCrackFlash: {
    position: "absolute", left: "50%", top: "8%", bottom: "8%", width: 3, marginLeft: -1.5, backgroundColor: "#fff",
    ...(web ? ({ boxShadow: "0 0 10px rgba(255,255,255,0.95)" } as any) : {}),
  } as any,
  esChip: { position: "absolute", width: 72, height: 72, zIndex: 5, ...(web ? ({ offsetRotate: "0deg" } as any) : {}) } as any,
  /* lobs into the corner slot at the table's upper left (zone left 17%, top 7%).
     Chrome puts the element's CENTER on the path point, so each endpoint is the
     standby CENTER (272+36, 43.5+36) minus the chip's static anchor position
     (764+36, slotY+36): you Δ = (−456,−196), klein Δ = (−456,+15). */
  esChipPathTop: { offsetPath: 'path("M 0 0 C -80 -55, -400 -48, -456 15")' } as any,
  esChipPathBottom: { offsetPath: 'path("M 0 0 C -80 -260, -400 -240, -456 -196")' } as any,
  /* same lobs into the BESIDE slot (center 396, 79.5 — +88px right of the corner) */
  esChipPathTop2: { offsetPath: 'path("M 0 0 C -80 -50, -320 -45, -368 15")' } as any,
  esChipPathBottom2: { offsetPath: 'path("M 0 0 C -80 -255, -340 -240, -368 -196")' } as any,

  /* ---------- WARD — the parry barrier ---------- */
  wdActRing: {
    position: "absolute", width: 150, height: 190, borderRadius: 999,
    borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(230,0,18,0.85)",
    ...(web ? ({ boxShadow: "0 0 22px rgba(230,0,18,0.5)" } as any) : {}),
  } as any,
  wdBarrier: {
    position: "absolute", width: 160, height: 210, alignItems: "center", zIndex: 8,
    ...(web ? ({ clipPath: SHIELD_CLIP, backgroundColor: theme.color.yellow, boxShadow: "0 0 40px rgba(252,238,33,0.4)" } as any) : {}),
  } as any,
  wdBarrierIn: {
    position: "absolute", left: 5, right: 5, top: 5, bottom: 5,
    ...(web ? ({ clipPath: SHIELD_CLIP, backgroundColor: "#0a0a0a" } as any) : {}),
  } as any,
  wdName: {
    position: "absolute", zIndex: 9, backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.crimson,
    paddingVertical: 4, paddingHorizontal: 12, transform: [{ rotate: "-5deg" }],
    ...(web ? ({ boxShadow: "4px 4px 0 rgba(230,0,18,0.85)" } as any) : {}),
  } as any,
  wdNameTxt: { fontFamily: theme.font.display, fontSize: 26, lineHeight: 30, letterSpacing: 2, color: "#FF4D5E", textShadow: "2px 2px 0 #000" } as any,
  wdPlus: {
    position: "absolute", top: "44%", fontFamily: theme.font.display, fontSize: 56, lineHeight: 60, color: theme.color.yellow,
    textShadow: "3px 3px 0 rgba(230,0,18,0.95), 0 0 26px rgba(252,238,33,0.45)",
  } as any,
  wdWave: {
    position: "absolute", borderRadius: 999,
    borderWidth: 4, borderColor: "rgba(230,0,18,0.8)",
  } as any,

  /* mult doubling beat — hanging number, impact FX, ×N stamp, chip flight */
  muFlyWrap: { ...StyleSheet.absoluteFillObject, zIndex: 12 } as any,
  muHangNumWrap: { position: "absolute", width: 120, height: 120, alignItems: "center", justifyContent: "center" } as any,
  muHangNum: { position: "absolute", fontFamily: theme.font.display, fontSize: 92, lineHeight: 96, textShadow: "6px 6px 0 rgba(0,0,0,0.85)" } as any,
  muHangNumFin: { position: "absolute", fontFamily: theme.font.display, fontSize: 128, lineHeight: 132, textShadow: "8px 8px 0 rgba(0,0,0,0.85), 0 0 44px rgba(252,238,33,0.55)" } as any,
  muImpBurst: { position: "absolute", width: 150, height: 150, marginLeft: -75, marginTop: -75, ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: theme.color.crimson } as any) : {}) } as any,
  muImpRing: { position: "absolute", width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: 999, borderWidth: 6, borderColor: "#fff" } as any,
  muStampX: { position: "absolute", backgroundColor: "#000", borderWidth: 3, paddingVertical: 4, paddingHorizontal: 12, transform: [{ rotate: "8deg" }], ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
  muStampXTxt: { fontFamily: theme.font.display, fontSize: 34, lineHeight: 38, textShadow: "2px 2px 0 #000" } as any,
  muChipFly: { position: "absolute", left: "17%", top: "7%", width: 72, height: 72 } as any,
  /* cubic beziers from the chip's corner parking spot to the hanging number.
     Control points pull AWAY from the straight line immediately, so it's
     curving from frame 1. Chip parks at zone left 17% (origin ≈ 272px);
     the number hangs at zone 38% (≈608px) → Δx ≈ +336 at stage width 1600. */
  muChipFlyPathYou: { offsetPath: 'path("M 0 0 C 80 -120, 240 -40, 336 188")', offsetRotate: "0deg" } as any,
  muChipFlyPathKlein: { offsetPath: 'path("M 0 0 C 80 -140, 260 -90, 336 3")', offsetRotate: "0deg" } as any,

  nullFlash: { position: "absolute", top: -30, left: "50%", marginLeft: -430, width: 860, height: 440, borderRadius: 999, ...(web ? ({ backgroundImage: "radial-gradient(rgba(255,255,255,0.95) 0%, rgba(252,238,33,0.35) 38%, transparent 68%)" } as any) : {}) } as any,
  shieldWave: { position: "absolute", top: 60, left: "50%", marginLeft: -120, width: 240, height: 240, borderRadius: 999, borderWidth: 6, borderColor: theme.color.yellow, ...(web ? ({ boxShadow: "0 0 40px rgba(252,238,33,0.7), inset 0 0 40px rgba(252,238,33,0.5)" } as any) : {}) } as any,
  shieldRow: { flexDirection: "row", alignItems: "center", gap: 18 } as any,
  shieldPlate: { width: 112, alignItems: "center", backgroundColor: "#000", borderWidth: 3, borderRadius: 6, paddingVertical: 8, ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.8)" } as any) : {}) } as any,
  shieldPlateNum: { fontFamily: theme.font.display, fontSize: 54, lineHeight: 56, textShadow: "3px 3px 0 rgba(0,0,0,0.9)" } as any,
  shieldPlateLbl: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.paperDim, fontWeight: "900" } as any,
  shieldVs: { fontFamily: theme.font.display, fontSize: 44, lineHeight: 46, color: "#fff", textShadow: "4px 4px 0 rgba(230,0,18,0.9), 2px 2px 0 #000" } as any,
  shieldBanner: { fontFamily: theme.font.display, fontSize: 32, lineHeight: 36, color: theme.color.yellow, backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingHorizontal: 14, transform: [{ skewX: "-12deg" }], textShadow: "3px 3px 0 rgba(230,0,18,0.9)" } as any,
  shieldSub: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 4, color: "#fff", fontWeight: "900", textShadow: "2px 2px 0 #000" } as any,
  nullStamp: { backgroundColor: "#000", borderWidth: 4, borderColor: theme.color.yellow, paddingVertical: 8, paddingHorizontal: 22, ...(web ? ({ boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
  nullStampTxt: { fontFamily: theme.font.display, fontSize: 42, lineHeight: 46, letterSpacing: 5, color: theme.color.yellow, textShadow: "3px 3px 0 rgba(230,0,18,0.9)" } as any,

  /* power countdown FX — plates live in the felt slots; loser card explodes, winner card pops */
  cardShard: { position: "absolute", left: -6, top: -12, width: 12, height: 24, backgroundColor: "#F5EFE1", borderWidth: 1, borderColor: "rgba(0,0,0,0.4)" } as any,

  /* shield-break cinematic */
  sbWrap: { position: "absolute", left: "50%", top: "9%", marginLeft: -240, width: 480, alignItems: "center", zIndex: 9 } as any,
  sbAura: { position: "absolute", left: "50%", top: "50%", marginLeft: -115, marginTop: -115, width: 230, height: 230, borderRadius: 999, ...(web ? ({ backgroundImage: "radial-gradient(rgba(230,0,18,0.55) 0%, rgba(230,0,18,0.18) 45%, transparent 70%)" } as any) : {}) } as any,
  sbShield: {
    width: 150, height: 170, alignItems: "center", justifyContent: "center",
    ...(web ? ({ clipPath: "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 0% 60%, 0% 11%)", backgroundColor: theme.color.crimson, boxShadow: "0 14px 40px rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  sbShieldInner: { position: "absolute", left: 8, right: 8, top: 8, bottom: 16, backgroundColor: "#16090a", ...(web ? ({ clipPath: "polygon(50% 0%, 100% 11%, 100% 60%, 50% 100%, 0% 60%, 0% 11%)" } as any) : {}) } as any,
  sbShieldMark: { fontFamily: theme.font.display, fontSize: 56, color: "#FF4D5E", textShadow: "0 0 24px rgba(230,0,18,0.9)" } as any,
  sbCrack: { position: "absolute", left: "50%", top: 82, marginLeft: -70, width: 140, height: 4, backgroundColor: "rgba(255,255,255,0.92)" } as any,
  sbShard: { position: "absolute", left: 234, top: 70, width: 13, height: 28, backgroundColor: theme.color.crimson } as any,

  /* ANIM LAB switcher — bottom-right, clear of the player's score chip */
  demoPanel: {
    position: "absolute", right: 14, bottom: 14, zIndex: 80, width: 380,
    backgroundColor: "rgba(0,0,0,0.92)", borderWidth: 3, borderColor: theme.color.yellow, padding: 10,
    transform: [{ skewX: "-4deg" }], ...(web ? ({ boxShadow: "6px 6px 0 rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  demoPanelTitle: { fontFamily: theme.font.display, fontSize: 16, letterSpacing: 3, color: theme.color.yellow, marginBottom: 8, textShadow: "2px 2px 0 rgba(230,0,18,0.9)" } as any,
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 } as any,
  demoBtn: { backgroundColor: "#111", borderWidth: 2, borderColor: theme.color.paperDim, paddingVertical: 5, paddingHorizontal: 8 } as any,
  demoBtnHover: { borderColor: theme.color.yellow, backgroundColor: theme.color.crimson } as any,
  demoBtnActive: { borderColor: theme.color.yellow, backgroundColor: "#20130a" } as any,
  demoBtnTxt: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1, color: "#fff", fontWeight: "900" } as any,
  demoExit: { marginTop: 8, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: "#000", paddingVertical: 5, paddingHorizontal: 8, alignSelf: "flex-start" } as any,
  clashHud: {
    position: "absolute", left: "50%", top: "30%", marginLeft: -210, width: 420, zIndex: 8,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)", borderWidth: 3, borderColor: "#fff", paddingVertical: 10,
  } as any,
  clashShieldTxt: { fontFamily: theme.font.display, fontSize: 19, color: theme.color.yellow, letterSpacing: 1, textAlign: "center" } as any,
  trickOverlay: { position: "absolute", left: "50%", top: "26%", marginLeft: -230, width: 460, alignItems: "center", zIndex: 9 } as any,
  trickStamp: { width: "100%", alignItems: "center", backgroundColor: "#000", borderWidth: 4, borderColor: theme.color.yellow, paddingVertical: 12, paddingHorizontal: 16, ...(web ? ({ boxShadow: "8px 8px 0 rgba(0,0,0,0.85)" } as any) : {}) } as any,
  trickTitle: { fontFamily: theme.font.display, fontSize: 34, letterSpacing: 5, color: theme.color.yellow, textShadow: "3px 3px 0 #000" } as any,
  trickSub: { fontFamily: theme.font.body, fontSize: 15, color: "#fff", textAlign: "center", marginTop: 4, lineHeight: 21 } as any,
  swapRow: { flexDirection: "row", alignItems: "center", gap: 22, marginTop: 10 } as any,
  swapNum: { fontFamily: theme.font.display, fontSize: 40, backgroundColor: "#000", borderWidth: 3, borderColor: "#fff", paddingHorizontal: 18, paddingVertical: 2 } as any,
  swapArrow: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.yellow } as any,
  peekFloat: { width: 92, height: 122, borderRadius: 8, overflow: "hidden", marginHorizontal: 5, marginTop: 10, ...(web ? ({ boxShadow: "4px 5px 0 rgba(0,0,0,0.7)" } as any) : {}) } as any,

  statusTokenQTxt: { fontFamily: theme.font.display, fontSize: 11, color: "#000" } as any,

  /* clash-multiplier chip — mini burst seal (the verdict-star identity): black
     offset backing with a P5 crimson hard shadow, white mid-ring, face (yellow
     ×2 / crimson ×3) wobbling like the shield halves breathe, skewed tag, ? bubble */
  multChipArt: { width: 72, height: 72 } as any,
  multChipBurstB: {
    ...StyleSheet.absoluteFillObject, marginLeft: 7, marginTop: 9, backgroundColor: "#000",
    ...(web ? ({ clipPath: BURST_CLIP, boxShadow: "0 0 0 3px #000, 5px 6px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  multChipBurstW: {
    ...StyleSheet.absoluteFillObject, marginLeft: 4, marginTop: 5,
    ...(web ? ({ clipPath: BURST_CLIP, backgroundColor: "#fff" } as any) : {}),
  } as any,
  multChipLive: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" } as any,
  multChipFace: { ...StyleSheet.absoluteFillObject, ...(web ? ({ clipPath: BURST_CLIP } as any) : {}) } as any,
  multChipTxt: { fontFamily: theme.font.display, fontSize: 38, lineHeight: 40, textShadow: "2px 2px 0 rgba(0,0,0,0.3)" } as any,

  /* shields-off chip — a split shield emblem: cracked halves breathing apart,
     danger aura, round counter in the crack, skewed tag beneath */
  shieldChip: {
    position: "absolute", zIndex: 26, alignItems: "center",
    ...(web ? ({ cursor: "pointer", animation: "dShieldPop 380ms cubic-bezier(.2,1,.3,1) both" } as any) : {}),
  } as any,
  shieldChipHover: { ...(web ? ({ transform: [{ scale: 1.12 }, { rotate: "-3deg" }] } as any) : {}) } as any,
  shieldChipArt: { width: 66, height: 74 } as any,
  shieldChipBack: {
    ...StyleSheet.absoluteFillObject, backgroundColor: "#000",
    ...(web ? ({ clipPath: SHIELD_CLIP, animation: "dRedPulse 1.6s ease-in-out infinite", boxShadow: "0 6px 18px rgba(0,0,0,0.8)" } as any) : {}),
  } as any,
  shieldHalfL: {
    ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson,
    transform: [{ rotate: "-6deg" }],
    ...(web ? ({ clipPath: SHIELD_CLIP_L } as any) : {}),
  } as any,
  shieldHalfR: {
    ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson,
    transform: [{ rotate: "6deg" }],
    ...(web ? ({ clipPath: SHIELD_CLIP_R } as any) : {}),
  } as any,
  shieldMiniBack: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", ...(web ? ({ clipPath: SHIELD_CLIP } as any) : {}) } as any,
  shieldChipCount: {
    position: "absolute", left: -12, top: -6, width: 25, height: 25,
    backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow,
    alignItems: "center", justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
    ...(web ? ({ boxShadow: "3px 3px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  shieldChipCountTxt: { fontFamily: theme.font.display, fontSize: 15, lineHeight: 17, color: theme.color.yellow } as any,
  shieldChipTag: {
    backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 6,
    transform: [{ skewX: "-10deg" }, { rotate: "-3deg" }],
    ...(web ? ({ boxShadow: "3px 3px 0 rgba(0,0,0,0.85)" } as any) : {}),
  } as any,
  shieldChipTagTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.yellow, fontWeight: "900" } as any,
  shieldChipQ: {
    position: "absolute", top: -8, right: -10, width: 20, height: 20, borderRadius: 999,
    backgroundColor: theme.color.yellow, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#000",
  } as any,

  /* effect explainer modal — stamped notice */
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject, zIndex: 80, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center",
    ...(web ? ({ backdropFilter: "blur(4px)" } as any) : {}),
  } as any,
  infoPanel: {
    width: 600, backgroundColor: "#0b0b0b", borderWidth: 4, borderColor: theme.color.yellow,
    alignItems: "center", overflow: "hidden",
    ...(web ? ({ boxShadow: "12px 12px 0 rgba(230,0,18,0.9), 0 0 70px rgba(0,0,0,0.9)" } as any) : {}),
  } as any,
  infoTitleBar: {
    flexDirection: "row", alignItems: "center", gap: 14, alignSelf: "stretch",
    backgroundColor: theme.color.crimson, borderBottomWidth: 4, borderBottomColor: "#000",
    paddingVertical: 12, paddingHorizontal: 20,
  } as any,
  infoTitleBadge: { width: 44, height: 44, backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] } as any,
  infoTitleBadgeTxt: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow } as any,
  infoTitle: { flex: 1, fontFamily: theme.font.display, fontSize: 28, color: theme.color.yellow, letterSpacing: 3, textShadow: "2px 2px 0 rgba(0,0,0,0.9)" } as any,
  infoInner: {
    alignSelf: "stretch", marginHorizontal: 20, marginTop: 20, borderWidth: 2, borderStyle: "dashed",
    borderColor: "rgba(230,0,18,0.55)", backgroundColor: "#160a0b", padding: 18,
  } as any,
  infoBody: { fontFamily: theme.font.body, fontSize: 16, lineHeight: 25, color: "#fff", textAlign: "left" } as any,
  infoClose: {
    backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 30, paddingVertical: 10,
    marginVertical: 20, transform: [{ skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "4px 4px 0 rgba(0,0,0,0.85)", cursor: "pointer" } as any) : {}),
  } as any,
  infoCloseHover: { ...(web ? ({ transform: [{ skewX: "-8deg" }, { scale: 1.08 }], boxShadow: "4px 4px 0 rgba(0,0,0,0.85), 0 0 22px rgba(252,238,33,0.65)" } as any) : {}) } as any,
  infoCloseTxt: { fontFamily: theme.font.display, fontSize: 17, color: "#fff", letterSpacing: 2 } as any,

  /* ---------- player zone — overlays the table's near edge, like held cards ---------- */
  playerZone: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", zIndex: 30, paddingBottom: 44 } as any,
  handCol: { alignItems: "center", gap: 8 } as any,
  moveBanner: {
    backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 32, paddingVertical: 8,
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 5 },
    ...(web ? ({ boxShadow: "0 0 0 3px #000, 6px 6px 0 rgba(0,0,0,0.9)" } as any) : {}),
  } as any,
  moveTxt: { fontFamily: theme.font.display, fontSize: 26, letterSpacing: 6, color: "#fff", textShadow: "3px 3px 0 #000" } as any,
  errorWrap: { alignItems: "center", gap: 8 } as any,
  errorTxt: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 1, color: "#FF4D5E", fontWeight: "800" } as any,

  handRow: { flexDirection: "row", justifyContent: "center", marginTop: 6 } as any,
  cardBtn: {
    width: 114, height: 156, borderRadius: 10, marginLeft: -16,
    ...(web ? ({ boxShadow: "3px 5px 0 rgba(0,0,0,0.7)", transition: "transform 150ms cubic-bezier(.2,1,.3,1), opacity 150ms" } as any) : {}),
  } as any,
  cardHover: { zIndex: 50, borderColor: theme.color.yellow } as any,
  cardDim: { opacity: 0.35 } as any,

  peekNote: { position: "absolute", right: "3%", bottom: 150, maxWidth: "26%", fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1, color: "#fff", fontWeight: "800", textAlign: "right", textShadow: "1px 1px 0 #000" } as any,

  nextBtn: {
    position: "absolute", right: "4%", bottom: 60, zIndex: 40,
    backgroundColor: theme.color.crimson, borderWidth: 4, borderColor: "#fff", paddingHorizontal: 36, paddingVertical: 16,
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }],
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 6, height: 6 },
    ...(web ? ({ boxShadow: "0 0 0 4px #000, 8px 8px 0 rgba(0,0,0,0.9)", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.12) 5px 10px), linear-gradient(180deg, #E60012 0%, #b8000f 100%)" } as any) : {}),
  } as any,
  nextBtnTxt: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 3, color: theme.color.paper, textShadow: "3px 3px 0 #000" } as any,

  /* ---------- result overlay ---------- */
  resultWrap: { ...StyleSheet.absoluteFillObject, zIndex: 70, alignItems: "center", justifyContent: "center" } as any,
  resultPanelL: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0a0a0a", transform: [{ skewX: "-12deg" }], borderRightWidth: 10, borderRightColor: theme.color.crimson } as any,
  resultPanelR: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(230,0,18,0.12)", transform: [{ skewX: "10deg" }] } as any,
  resultContent: { alignItems: "center", gap: 12 } as any,
  resultTitle: {
    fontFamily: theme.font.display, fontSize: 128, letterSpacing: 8,
    textShadow: "10px 10px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
  } as any,
  resultScore: { fontFamily: theme.font.display, fontSize: 32, letterSpacing: 4, color: "#fff", textShadow: "4px 4px 0 #000" } as any,
  resultSaved: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.paperFaint, fontWeight: "800" } as any,
  resultBtns: { flexDirection: "row", gap: 16, marginTop: 14 } as any,

  bigBtn: {
    backgroundColor: theme.color.crimson, borderWidth: 4, borderColor: "#fff", paddingHorizontal: 34, paddingVertical: 14,
    transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }],
    shadowColor: "#000", shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 6, height: 6 },
    ...(web ? ({ boxShadow: "0 0 0 4px #000, 7px 7px 0 #000", backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.12) 5px 10px), linear-gradient(180deg, #E60012 0%, #b8000f 100%)" } as any) : {}),
  } as any,
  bigBtnHovered: { transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }, { scale: 1.08 }], ...(web ? ({ filter: "brightness(1.12) saturate(1.2)" } as any) : {}) } as any,
  bigBtnPressed: { transform: [{ skewX: "-10deg" }, { rotate: "-1deg" }, { scale: 0.94 }] } as any,
  bigBtnTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 3, color: theme.color.paper, textShadow: "3px 3px 0 #000" } as any,
  bigBtnGhost: { backgroundColor: "#0f0f0f", borderWidth: 4, borderColor: theme.color.paperFaint, paddingHorizontal: 34, paddingVertical: 14, transform: [{ skewX: "-10deg" }] } as any,
  bigBtnGhostHovered: { borderColor: theme.color.paperDim } as any,
  bigBtnGhostTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 3, color: theme.color.paperDim } as any,

  /* card face */
  face: { flex: 1, borderRadius: 9, borderWidth: 2.5, alignItems: "center", justifyContent: "center", gap: 3, overflow: "hidden" } as any,
  faceCornerA: { position: "absolute", top: -14, left: -14, width: 30, height: 30, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
  faceCornerB: { position: "absolute", bottom: -14, right: -14, width: 30, height: 30, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
  facePower: { fontFamily: theme.font.display, fontSize: 52, lineHeight: 54, textShadow: "2px 2px 0 rgba(0,0,0,0.25)" } as any,
  faceName: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1.5, fontWeight: "900" } as any,
  faceTag: { paddingHorizontal: 8, paddingVertical: 2, transform: [{ skewX: "-8deg" }], borderWidth: 1, borderColor: "rgba(0,0,0,0.5)" } as any,
  faceTagTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: "#fff", fontWeight: "900" } as any,
});

/* small inline for retry button */
const s2bigBtn = { backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 22, paddingVertical: 10, transform: [{ skewX: "-10deg" }] } as any;
const s2bigBtnHovered = { transform: [{ skewX: "-10deg" }, { scale: 1.06 }] } as any;
