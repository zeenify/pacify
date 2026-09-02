/* DUEL — THE TABLE. P5-collage layout: student portrait looms across the top,
   a perspective card table takes the middle, your hand fans at the bottom edge.
   Mechanics unchanged: engine-dealt hands + stateful /ai-pick chain. */
import { View, Text, Pressable, StyleSheet, Platform, Image, useWindowDimensions } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { NUMBERS, TRICKS, dealHands, resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, type Card, type ResolveOutput } from "@pacify/engine";
import { api } from "../lib/api";
import { playHover, playClick, playCardPop } from "../lib/sfx";

const web = Platform.OS === "web";

type Phase = "commit" | "reveal" | "over";

/* The reveal is a choreographed step sequence so new players can watch the game
   teach itself: showdown hold → flip → power countdown → award → trick cinematics. */
type SeqStep =
  | { kind: "showdown"; ms: number }
  | { kind: "flip"; ms: number }
  | { kind: "clash"; ms: number; mode: "power" | "shield" | "tie"; you?: number; klein?: number; ticks?: number }
  | { kind: "award"; ms: number; p1After: number; p2After: number; p1Pts?: number; p2Pts?: number }
  | { kind: "trick"; ms: number; trick: string; p1After?: number; p2After?: number; peekCards?: Card[]; preP1?: number; preP2?: number; wipedSide?: "p1" | "p2" }
  | { kind: "idle"; ms: number };

const TRICK_SEQ: Record<string, { title: string; sub: string }> = {
  void: { title: "VOID", sub: "The round is nullified — no points scored, both cards burn." },
  eclipse: { title: "ECLIPSE", sub: "The round is voided — and SHIELDS go DOWN for 2 rounds." },
  echo: { title: "ECHO", sub: "The round is voided — next round's points are DOUBLED." },
  ward: { title: "BLOCKED", sub: "Ward stops the opposing trick cold and scores a flat +5." },
  reversal: { title: "REVERSAL", sub: "Total scores are SWAPPED — the tables turn." },
  executioner: { title: "EXECUTED", sub: "A 7+ power card was beheaded — that score drops to 0." },
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

export default function Duel() {
  const { student: studentParam } = useLocalSearchParams<{ student?: string }>();
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
  const [seqSubTick, setSeqSubTick] = useState(0);
  const [statusInfo, setStatusInfo] = useState<"mult" | "shield" | null>(null);

  const chain = useRef<{ interactionId: string | null; results: RoundResultRow[]; transcript: TranscriptRow[]; seed: number; rngState: number; shieldOff: number; echoNext: boolean; p2Hand: Card[] }>({
    interactionId: null, results: [], transcript: [], seed: 0, rngState: 0, shieldOff: 0, echoNext: false, p2Hand: [],
  });
  const p1Lock = useRef<Card | null>(null); // Klein's pick may land after ours — refs survive the async gap
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
    setEchoNext(false); setShieldOff(0);
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
    setEchoNext(out.echoNext); setShieldOff(out.shieldOffAfter);
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
    const yVoid = you.kind === "trick" && you.name === "Void";
    const kVoid = klein.kind === "trick" && klein.name === "Void";
    const yEcho = you.kind === "trick" && you.name === "Echo";
    const kEcho = klein.kind === "trick" && klein.name === "Echo";
    const yEcl = you.kind === "trick" && you.name === "Eclipse";
    const kEcl = klein.kind === "trick" && klein.name === "Eclipse";

    if (yVoid || kVoid) {
      steps.push({ kind: "trick", ms: 2400, trick: "void" });
    } else {
      if (yEcl || kEcl) steps.push({ kind: "trick", ms: 2400, trick: "eclipse" });
      if (yEcho || kEcho) steps.push({ kind: "trick", ms: 2400, trick: "echo" });
      if (out.wardBlocked) {
        steps.push({ kind: "trick", ms: 2200, trick: "ward" });
        steps.push({ kind: "award", ms: 1400, p1After: preP1, p2After: preP2 });
      } else if (!out.voided) {
        // THE COUNTDOWN — both powers tick down; whoever still has numbers scores the difference.
        const yp = you.power ?? 0, kp = klein.power ?? 0;
        const sameShield = you.kind === "number" && klein.kind === "number" && you.align === klein.align && ctx.shieldOff === 0;
        if (sameShield) {
          steps.push({ kind: "clash", ms: 1800, mode: "shield" });
        } else if (yp === kp) {
          steps.push({ kind: "clash", ms: 1600, mode: "tie", you: yp, klein: kp });
        } else {
          // countdown stops the moment the WEAKER power hits 0 — the winner's
          // leftover is the score, and it freezes highlighted beside their card.
          const ticks = Math.min(yp, kp) + 1;
          steps.push({ kind: "clash", ms: 500 * ticks + 700, mode: "power", you: yp, klein: kp, ticks });
        }
        steps.push({ kind: "award", ms: 1500, p1After: preP1, p2After: preP2, p1Pts: out.p1Points, p2Pts: out.p2Points });
      }
    }
    if (out.reversalSwapped) steps.push({ kind: "trick", ms: 2600, trick: "reversal", p1After: out.p1Score, p2After: out.p2Score, preP1, preP2 });
    if (out.scoreWiped) steps.push({ kind: "trick", ms: 2600, trick: "executioner", p1After: out.p1Score, p2After: out.p2Score, preP1, preP2, wipedSide: out.scoreWiped?.side });
    if (out.peek?.side === "p1") {
      const seen = [...chain.current.p2Hand].sort(() => Math.random() - 0.5).slice(0, out.peek.count);
      steps.push({ kind: "trick", ms: 2600, trick: "oracle", peekCards: seen });
    }
    steps.push({ kind: "idle", ms: 500 });

    setSeqSteps(steps);
    setSeqIdx(0);
    setClashTick(0);
    const done = ctx.round >= TOTAL_ROUNDS || out.p1Score >= SCORE_THRESHOLD || out.p2Score >= SCORE_THRESHOLD;
    if (done) {
      const result = out.p1Score > out.p2Score ? "win" : out.p2Score > out.p1Score ? "loss" : "draw";
      setFinalResult(result);
      finalResultRef.current = result;
    }
    api<any>("/campaign/result", {
      studentId, seed: chain.current.seed, p1Score: out.p1Score, p2Score: out.p2Score,
      rounds: ctx.round, transcript: chain.current.transcript,
    }).then((d) => setSaved(!!d?.ok)).catch(() => setSaved(false));
  };

  /* Sequence driver — advances through the steps; score state lands on the felt
     at the exact step where the story puts it. */
  useEffect(() => {
    const step = seqSteps[seqIdx];
    if (!step) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step.kind === "clash" && step.mode === "power") {
      setClashTick(0);
      let t = 0;
      interval = setInterval(() => { t += 1; setClashTick(t); }, 500);
    }
    if (step.kind === "showdown") {
      setSeqSubTick(0);
      let t = 0;
      interval = setInterval(() => { t += 1; setSeqSubTick(t); }, 1000);
    }
    const timer = setTimeout(() => {
      if (interval) clearInterval(interval);
      if ((step.kind === "award" || step.kind === "trick") && step.p1After !== undefined) {
        setP1Score(step.p1After);
        setP2Score(step.p2After ?? 0);
      }
      if (seqIdx + 1 >= seqSteps.length) {
        // sequence over — settle into reveal, then the finale if the match ended
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
    startRound(nextRound, chain.current.p2Hand, p1Hand, p2Score, p1Score, oppPeeked, [], shieldOff, echoNext);
  };

  const onRematch = () => {
    playClick();
    const { p1Hand: h1, p2Hand: h2 } = deal();
    startRound(1, h2, h1, 0, 0, [], [], 0, false);
  };

  const seqDone = seqSteps.length > 0 && seqIdx >= seqSteps.length;
  const cur = seqSteps[seqIdx] as SeqStep | undefined;
  const cardsUp = phase === "over" || seqIdx >= 1; // step 0 is the showdown hold; the flip is step 1
  const revealed = cardsUp;
  const mult = (round === TOTAL_ROUNDS ? 2 : 1) + (echoNext ? 1 : 0);
  const fanAngle = (i: number, n: number) => (i - (n - 1) / 2) * 5;

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
            @keyframes dWinPulse{0%,100%{transform:scale(1.25)}50%{transform:scale(1.45)}}
            @keyframes dFlyYou{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.15)}78%{opacity:1;transform:translate(-640px,66px) scale(1.3)}100%{opacity:0;transform:translate(-658px,73px) scale(1)}}
            @keyframes dFlyKlein{0%{opacity:0;transform:translate(0,0) scale(.6)}12%{opacity:1;transform:translate(0,0) scale(1.15)}78%{opacity:1;transform:translate(650px,-4px) scale(1.3)}100%{opacity:0;transform:translate(666px,-6px) scale(1)}}
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
      {shieldOff > 0 && (
        <View style={[st.stamp, st.stampRed] as any}><Text style={st.stampTxtLight as any}>SHIELDS OFF</Text></View>
      )}

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
            {p2Locked && <PlayCard card={p2Locked} revealed={revealed} opp />}
            {cur?.kind === "clash" && cur.mode === "power" && cur.klein !== undefined && (
              <View style={st.tallyPlate as any} pointerEvents="none">
                <Text style={st.tallyLbl as any}>{opp.name}</Text>
                <Text style={[
                  st.tallyNum as any,
                  { color: "#FF4D5E" },
                  cur.you !== undefined && cur.you - clashTick <= 0 && cur.klein - clashTick > 0 && (st.tallyWin as any),
                ]}>{Math.max(0, cur.klein - clashTick)}</Text>
              </View>
            )}
          </View>
          {/* your played card — lower felt, your tally right beside it */}
          <View style={[st.feltSlot, st.feltSlotBottom] as any}>
            {p1Locked && <PlayCard card={p1Locked} revealed={revealed} />}
            {cur?.kind === "clash" && cur.mode === "power" && cur.you !== undefined && (
              <View style={st.tallyPlate as any} pointerEvents="none">
                <Text style={st.tallyLbl as any}>YOU</Text>
                <Text style={[
                  st.tallyNum as any,
                  { color: theme.color.yellow },
                  cur.klein !== undefined && cur.klein - clashTick <= 0 && cur.you - clashTick > 0 && (st.tallyWin as any),
                ]}>{Math.max(0, cur.you - clashTick)}</Text>
              </View>
            )}
          </View>

          {/* SHOWDOWN hold — a visible 3..2..1 so the reveal never jump-scares */}
          {cur?.kind === "showdown" && (
            <View style={st.showdownWrap as any} pointerEvents="none">
              <Text style={st.showdownLbl as any}>SHOWDOWN</Text>
              <Text key={seqSubTick} style={[st.showdownNum as any, web && ({ animation: "dNumSlam 0.5s cubic-bezier(.2,1,.3,1) both" } as any)]}>{Math.max(1, 3 - seqSubTick)}</Text>
            </View>
          )}

          {/* shield / tie explanation — center text (power clash tallies beside the cards instead) */}
          {cur?.kind === "clash" && cur.mode !== "power" && (
            <View style={st.clashHud as any} pointerEvents="none">
              {cur.mode === "shield" ? (
                <Text style={st.clashShieldTxt as any}>SHIELDS CANCEL — SAME ALIGNMENT = 0</Text>
              ) : (
                <Text style={st.clashShieldTxt as any}>EQUAL POWER — TIE, NO POINTS</Text>
              )}
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
              <Text style={st.flyTxt as any}>
                +{(cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? cur.p1Pts : cur.p2Pts}
              </Text>
            </View>
          )}

          {/* TRICK CINEMATIC — one dedicated beat per effect */}
          {cur?.kind === "trick" && (
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
              {cur.trick === "executioner" && cur.preP1 !== undefined && (
                <View style={st.execRow as any}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <View key={i} style={[st.shard as any, web && ({ animation: `dShard 1.1s ${i * 90}ms ease-out both`, transform: [{ rotate: `${i * 45}deg` }] } as any)]} />
                  ))}
                  <Text style={st.execNum as any}>
                    {(cur.wipedSide ?? "p1") === "p1" ? "YOU" : opp.name} {cur.wipedSide === "p1" ? cur.preP1 : cur.preP2} → 0
                  </Text>
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
        {mult > 1 && (
          <Pressable onPress={() => setStatusInfo("mult")} style={[st.statusToken, { left: "27%", top: "7%" } as any]}>
            <Text style={st.statusTokenTxt as any}>CLASH ×{mult}</Text>
            <View style={st.statusTokenQ as any}><Text style={st.statusTokenQTxt as any}>?</Text></View>
          </Pressable>
        )}
        {shieldOff > 0 && (
          <Pressable onPress={() => setStatusInfo("shield")} style={[st.statusToken, { right: "26%", top: "7%" } as any]}>
            <Text style={st.statusTokenTxt as any}>SHIELDS OFF · {shieldOff}</Text>
            <View style={st.statusTokenQ as any}><Text style={st.statusTokenQTxt as any}>?</Text></View>
          </Pressable>
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

/* Played card on the felt — face-down until reveal, then flips with a slam. */
function PlayCard({ card, revealed, opp }: { card: Card; revealed: boolean; opp?: boolean }) {
  return (
    <View style={[st.playCard as any, web && revealed && ({ animation: "dFlipIn 420ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
      {revealed ? <CardFace card={card} /> : <CardBack opp={opp} />}
    </View>
  );
}

/* Card back — crimson with diagonal banding + suit mark. */
function CardBack({ opp }: { opp?: boolean }) {
  return (
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
  tallyWin: { transform: [{ scale: 1.3 }], textShadow: "0 0 22px rgba(252,238,33,0.85), 3px 3px 0 #000", ...(web ? ({ animation: "dWinPulse 0.8s ease-in-out infinite" } as any) : {}) } as any,
  flyBadge: { position: "absolute", width: 130, alignItems: "center", zIndex: 30 } as any,
  flyYou: { left: "46%", top: "47%" } as any,
  flyKlein: { left: "46%", top: "13%" } as any,
  flyTxt: { fontFamily: theme.font.display, fontSize: 48, textShadow: "3px 3px 0 #000, 0 0 24px rgba(252,238,33,0.6)" } as any,
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
  execRow: { alignItems: "center", marginTop: 10 } as any,
  execNum: { fontFamily: theme.font.display, fontSize: 30, color: "#FF4D5E", textShadow: "3px 3px 0 #000" } as any,
  shard: { position: "absolute", width: 16, height: 16, backgroundColor: theme.color.crimson, borderWidth: 1, borderColor: "#000" } as any,
  peekFloat: { width: 92, height: 122, borderRadius: 8, overflow: "hidden", marginHorizontal: 5, marginTop: 10, ...(web ? ({ boxShadow: "4px 5px 0 rgba(0,0,0,0.7)" } as any) : {}) } as any,

  /* status tokens on the felt */
  statusToken: {
    position: "absolute", zIndex: 26, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#000", borderWidth: 2, borderColor: theme.color.yellow, paddingHorizontal: 12, paddingVertical: 5,
    transform: [{ skewX: "-8deg" }],
    ...(web ? ({ boxShadow: "3px 3px 0 rgba(0,0,0,0.8)", cursor: "pointer" } as any) : {}),
  } as any,
  statusTokenTxt: { fontFamily: theme.font.display, fontSize: 14, color: theme.color.yellow, letterSpacing: 1 } as any,
  statusTokenQ: { width: 16, height: 16, borderRadius: 999, backgroundColor: theme.color.yellow, alignItems: "center", justifyContent: "center" } as any,
  statusTokenQTxt: { fontFamily: theme.font.display, fontSize: 10, color: "#000" } as any,

  /* effect explainer modal */
  infoBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 80, backgroundColor: "rgba(0,0,0,0.82)", alignItems: "center", justifyContent: "center" } as any,
  infoPanel: {
    width: 560, backgroundColor: "#0c0c0c", borderWidth: 4, borderColor: theme.color.yellow, padding: 26,
    transform: [{ skewX: "-4deg" }], alignItems: "center", gap: 14,
    ...(web ? ({ boxShadow: "10px 10px 0 rgba(230,0,18,0.9)" } as any) : {}),
  } as any,
  infoTitle: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.yellow, letterSpacing: 3, textShadow: "3px 3px 0 #000", textAlign: "center" } as any,
  infoBody: { fontFamily: theme.font.body, fontSize: 16, lineHeight: 24, color: "#fff", textAlign: "center" } as any,
  infoClose: { backgroundColor: theme.color.crimson, borderWidth: 3, borderColor: "#fff", paddingHorizontal: 26, paddingVertical: 10, transform: [{ skewX: "-8deg" }] } as any,
  infoCloseTxt: { fontFamily: theme.font.display, fontSize: 16, color: "#fff", letterSpacing: 2 } as any,

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
