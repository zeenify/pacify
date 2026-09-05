/* DUEL — THE TABLE. P5-collage layout: student portrait looms across the top,
   a perspective card table takes the middle, your hand fans at the bottom edge.
   Mechanics unchanged: engine-dealt hands + stateful /ai-pick chain. */
import { View, Text, Pressable, StyleSheet, Platform, Image, useWindowDimensions } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { NUMBERS, TRICKS, dealHands, resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, cardById, type Card, type CardId, type ResolveOutput } from "@pacify/engine";
import { st, DUEL_KEYFRAMES } from "./_duel.styles";
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
        steps.push({ kind: "trick", ms: 6200, trick: "ward", youCard: you, kleinCard: klein });
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
          <style>{`${DUEL_KEYFRAMES}`}</style>
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
                  ? { animation: "dWdBurn 6200ms linear both", transformOrigin: "50% 100%" } : null) as any,
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
                  ? null : { animation: "dWdBurn 6200ms linear both", transformOrigin: "50% 100%" }) as any,
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

        {/* WARD — the watcher: the trick charges, a golden eye snaps open right
            on the ward card and locks its gaze — the gaze ignites the opposing
            card and it BURNS to ash (canvas particle fire), +5 rolls out of the embers. */}
        {cur?.kind === "trick" && cur.trick === "ward" && web && (
          <WardBlock victimTop={cur.youCard?.name === "Ward"} />
        )}

        {/* score chips + round marker — OVERLAYS on the table zone, never clipped by the felt */}
        <View style={st.roundMarker as any} pointerEvents="none">
          <Text style={st.roundLbl as any}>ROUND</Text>
          <Text style={st.roundNum as any}>{Math.min(round, TOTAL_ROUNDS)}<Text style={st.roundDim as any}>/{TOTAL_ROUNDS}</Text></Text>
          {mult > 1 && <Text style={st.roundMult as any}>×{mult}</Text>}
        </View>
        <View style={[st.chip, st.chipOpp, drainSide === "p2" && (web ? ({ animation: "dChipDrain 400ms ease-in-out infinite" } as any) : null)] as any} pointerEvents="none">
          <Text style={st.chipLbl as any}>{opp.name}</Text>
          <Text key={`s2-${p2Score}`} style={[st.chipNum, { color: "#FF4D5E" }, drainSide === "p2" && (web ? ({ animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } as any) : null)] as any}>{p2Score}</Text>
        </View>
        <View style={[st.chip, st.chipYou, drainSide === "p1" && (web ? ({ animation: "dChipDrain 400ms ease-in-out infinite" } as any) : null)] as any} pointerEvents="none">
          <Text style={st.chipLbl as any}>YOU</Text>
          <Text key={`s1-${p1Score}`} style={[st.chipNum, { color: theme.color.yellow }, drainSide === "p1" && (web ? ({ animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } as any) : null)] as any}>{p1Score}</Text>
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

      {/* ---------- effect explainer — slams in like a stamped notice ---------- */}
      {statusInfo && (
        <Pressable style={[st.infoBackdrop as any, web && ({ animation: "dInfoFade 200ms ease-out both" } as any)]} onPress={() => setStatusInfo(null)}>
          <Pressable
            style={[st.infoPanel as any, web && ({ animation: "dInfoPop 440ms cubic-bezier(.34,1.5,.64,1) both" } as any)]}
            onPress={(e: any) => e.stopPropagation()}
          >
            <View style={st.infoTitleBar as any}>
              <View style={st.infoTitleBadge as any}>
                {statusInfo === "mult"
                  ? <Text style={st.infoTitleBadgeTxt as any}>×{mult}</Text>
                  : <BrokenShieldMark w={22} h={26} />}
              </View>
              <Text style={st.infoTitle as any}>{statusInfo === "mult" ? "CLASH MULTIPLIER" : "SHIELDS OFF"}</Text>
            </View>
            <View style={st.infoInner as any}>
              <Text style={st.infoBody as any}>{statusInfo === "mult" ? MULT_INFO : SHIELD_INFO}</Text>
            </View>
            <Pressable onPress={() => setStatusInfo(null)} style={({ hovered }: any) => [st.infoClose as any, hovered && (st.infoCloseHover as any)]}>
              <Text style={st.infoCloseTxt as any}>GOT IT</Text>
            </Pressable>
          </Pressable>
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

/* WARD — the watcher: a golden eye opens above the felt, darts its slit-pupil
   gaze onto the activating trick through a burning beam — then the gaze
   IGNITES the card. A canvas particle-fire burns it from base to tip: the
   card chars, wobbles in 3D and collapses while embers rise, leaving ash and
   ward's flat +5. All fire is procedural (additive-blended particles). */
function FireCanvas() {
  const host = useRef<any>(null);
  useEffect(() => {
    const hostEl = host.current as any;
    if (!hostEl) return;
    const cv = document.createElement("canvas");
    const W = 150, H = 262;
    cv.width = W; cv.height = H;
    hostEl.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const t0 = performance.now();
    const ps: { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; soot: boolean; seed: number }[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const prog = Math.max(0, Math.min(1, (t - 0.25) / 1.9));
      const die = Math.max(0, Math.min(1, (t - 2.9) / 0.8));
      const intensity = (t < 0.25 ? t / 0.25 : 1) * (1 - die * 0.8);
      const frontY = 55 + (1 - prog) * 152; // the burn front climbs the card
      const spawn = Math.round(6 * intensity);
      for (let i = 0; i < spawn; i++) {
        ps.push({ x: rand(24, 126), y: frontY + rand(-8, 8), vx: rand(-12, 12), vy: -rand(45, 95), life: 0, max: rand(0.5, 1), r: rand(2.5, 6), soot: Math.random() < 0.14, seed: rand(0, 6.28) });
      }
      // the burnt zone crumbles: grey ash crumbs fall from the front line
      if (Math.random() < 0.55 * intensity) ps.push({ x: rand(22, 128), y: frontY + rand(2, Math.max(4, prog * 140)), vx: rand(-12, 12), vy: rand(20, 60), life: 0, max: rand(0.5, 1), r: rand(1.5, 3.5), soot: true, seed: rand(0, 6.28) });
      // embers
      if (Math.random() < 0.45 * intensity) ps.push({ x: rand(24, 126), y: frontY - rand(0, 30), vx: rand(-8, 8), vy: -rand(60, 120), life: 0, max: rand(0.6, 1.1), r: rand(1, 2), soot: false, seed: 0 });
      ctx.globalCompositeOperation = "lighter";
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i];
        q.life += 1 / 60;
        if (q.life >= q.max) { ps.splice(i, 1); continue; }
        const k = q.life / q.max;
        const wob = Math.sin(t * 6 + q.seed) * 16 * k;
        q.x += (q.vx + wob) / 60; q.y += (q.vy + (q.soot ? 30 * k : 0)) / 60;
        if (q.soot) {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = `rgba(46,38,32,${(1 - k) * 0.75})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 + k * 0.6), 0, 6.29); ctx.fill();
          ctx.globalCompositeOperation = "lighter";
          continue;
        }
        const rr = q.r * (1 - k * 0.75);
        ctx.fillStyle = k < 0.18 ? "rgba(255,236,190,0.95)" : k < 0.45 ? "rgba(255,160,60,0.8)" : k < 0.75 ? "rgba(255,70,25,0.55)" : "rgba(120,25,10,0.3)";
        ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, 6.29); ctx.fill();
      }
      const g = ctx.createRadialGradient(W / 2, 217, 6, W / 2, 217, 90);
      const ga = (0.35 + Math.sin(t * 11) * 0.08) * (1 - die);
      g.addColorStop(0, `rgba(255,170,60,${ga})`);
      g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 55, W, H - 55);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <View
      ref={host as any}
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width: 150, height: 262 } as any}
    />
  );
}

/* The watcher eye — an SVG asset injected as raw markup (crisp linework:
   almond, gold iris, slit pupil, glint, lash arc). The iris DARTS toward the
   offending card on the gaze lock and is CLIPPED by the almond — nothing
   pokes past the lids. */
function TheEye({ gazeDown }: { gazeDown: boolean }) {
  const host = useRef<any>(null);
  useEffect(() => {
    const el = host.current as any;
    if (!el) return;
    const dy = gazeDown ? 12 : -12; // iris darts toward the victim card
    el.innerHTML = `<svg width="260" height="156" viewBox="0 0 260 156" style="display:block;overflow:visible">
      <defs>
        <radialGradient id="wdIris">
          <stop offset="0%" stop-color="#ffe9a8"/>
          <stop offset="55%" stop-color="#f2c14e"/>
          <stop offset="100%" stop-color="#7a5210"/>
        </radialGradient>
        <filter id="wdEyeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="wdAlmond"><path d="M13 78 Q130 -20 247 78 Q130 176 13 78 Z"/></clipPath>
        <style>
          @keyframes wdIrisDart{0%,52%{transform:translate(0,0)}68%,100%{transform:translate(0,${dy}px)}}
          .wdIrisG{animation:wdIrisDart 4200ms linear both}
        </style>
      </defs>
      <g filter="url(#wdEyeGlow)">
        <path d="M13 78 Q130 -20 247 78 Q130 176 13 78 Z" fill="#0b0b0e" stroke="#f2c14e" stroke-width="4"/>
        <g clip-path="url(#wdAlmond)">
          <g class="wdIrisG">
            <circle cx="130" cy="78" r="44" fill="url(#wdIris)" stroke="#3a2a08" stroke-width="2.5"/>
            <ellipse cx="130" cy="78" rx="10" ry="35" fill="#050505"/>
            <circle cx="113" cy="62" r="8" fill="rgba(255,255,255,0.9)"/>
          </g>
        </g>
        <path d="M17 76 Q130 -14 243 76" fill="none" stroke="rgba(252,238,33,0.45)" stroke-width="2"/>
      </g>
    </svg>`;
  }, [gazeDown]);
  return (
    <View
      ref={host as any}
      pointerEvents="none"
      style={{ width: 260, height: 156 } as any}
    />
  );
}

/* WARD — the watcher: the trick charges while a golden eye SNAPS open right on
   top of the ward card and fires a vertical gaze beam down (or up) the card
   column — the gaze sets the opposing card ALIGHT: canvas fire climbs it, the
   burnt part crumbles into falling ash, and the card collapses. +5 goes to the
   award beat like every other score. */
function WardBlock({ victimTop }: { victimTop: boolean }) {
  const wardTop = !victimTop;          // which slot the ward card sits in
  const slotTop = victimTop ? "4%" : "38%"; // the victim card's top edge (esWrap %)
  const [fireOn, setFireOn] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setFireOn(true), 2400);
    const b = setTimeout(() => setFireOn(false), 5300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <View style={[st.esWrap as any, web && ({ animation: "dVdFadeOut 300ms 5850ms ease-in both" } as any)]} pointerEvents="none">
      {/* the trick charging — crimson aura ring around the victim card */}
      <View style={[st.wdActRing as any, { left: "50%", top: slotTop, marginLeft: -75, marginTop: -19 }, web && ({ animation: "dWdActRing 6200ms linear both" } as any)]} />
      {/* opening flare — a burst of gold the instant the lids snap apart */}
      <View style={[st.wdEyeFlare as any, { left: "50%", top: wardTop ? "4%" : "38%", marginLeft: -170, marginTop: -32 }, web && ({ animation: "dWdEyeFlare 700ms 800ms ease-out both" } as any)]} />
      {/* THE WATCHER — snaps open directly on the ward card */}
      <View style={[st.wdEyeWrap as any, { left: "50%", top: wardTop ? "4%" : "38%", marginLeft: -130, marginTop: -2 }, web && ({ animation: "dWdEyeOpen 620ms 500ms cubic-bezier(.2,1,.3,1) both, dWdEyeFloat 5s ease-in-out 1500ms infinite" } as any)]}>
        <TheEye gazeDown={!victimTop} />
      </View>
      {/* the gaze beam — a vertical ray down (or up) the card column from the
          eye to the victim; it turns hot and ignites the card */}
      <View
        style={[
          { position: "absolute", left: "50%", marginLeft: -2, top: "4%", marginTop: 76, width: 4, height: "34%", transformOrigin: wardTop ? "top center" : "bottom center", zIndex: 8 } as any,
          web && ({ animation: "dWdBeamGrow 380ms 1500ms cubic-bezier(.2,1,.3,1) both" } as any),
        ]}
        pointerEvents="none"
      >
        <View style={[{ ...StyleSheet.absoluteFillObject, borderRadius: 2, backgroundColor: "#f2c14e" }, web && ({ boxShadow: "0 0 14px rgba(252,238,33,0.8)", animation: "dWdBeamHot 260ms 2400ms ease-in-out 2, dVdFadeOut 250ms 3100ms ease-in both" } as any)]} />
      </View>
      {/* THE BURN — canvas particle fire; the card erodes bottom-up under it */}
      {fireOn && (
        <View style={{ position: "absolute", left: "50%", marginLeft: -75, top: victimTop ? -30 : 181, animation: web ? "dVdFadeIn 400ms both" : undefined } as any}>
          <FireCanvas />
        </View>
      )}
      {/* the ash settles + the verdict lands beside it */}
      <View style={[st.wdAsh as any, { left: "50%", marginLeft: -55, top: victimTop ? 165 : 376 }, web && ({ animation: "dWdAshIn 500ms 4700ms cubic-bezier(.2,1,.3,1) both" } as any)]} pointerEvents="none" />
      <View style={[st.esStamp as any, { left: "50%", top: victimTop ? 190 : 402, marginLeft: -80, width: 160, alignItems: "center" }, web && ({ animation: "dStampIn 340ms 4900ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
        <Text style={st.esStampTxt as any}>BURNED</Text>
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

/* Fixed design canvas — the whole stage scales to fit the window. */
const DESIGN_W = 1600;
const DESIGN_H = 900;
/* Klein's line lingers this long after it lands (a new message resets the timer). */
const MSG_MS = 8000;




/* small inline for retry button */
const s2bigBtn = { backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 22, paddingVertical: 10, transform: [{ skewX: "-10deg" }] } as any;
const s2bigBtnHovered = { transform: [{ skewX: "-10deg" }, { scale: 1.06 }] } as any;
