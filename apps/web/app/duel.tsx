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
  | { kind: "trick"; ms: number; trick: string; p1After?: number; p2After?: number; peekCards?: Card[]; peekCount?: number; preP1?: number; preP2?: number; wipedSide?: "p1" | "p2"; targetCard?: Card; youCard?: Card; kleinCard?: Card }
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
  { key: "oracleklein", label: "ORACLE · KLEIN'S", you: "vampire", klein: "oracle" },
];

/* Corner-rack membership: claims the chip's slot while any form of it is on
   screen, releases it when all forms are gone. The rack array order IS the
   slot order — first chip in takes slot 0, everyone else follows. */
function useCornerChip(id: string, present: boolean, claim: (id: string) => void, release: (id: string) => void) {
  useEffect(() => {
    if (present) claim(id); else release(id);
  }, [present, id, claim, release]);
}

/* The echo/eclipse chip lob — a true offset-path curve from the played card's
   felt slot to its corner-rack slot. The slot-0 endpoints are the calibrated
   originals; each further slot shifts the landing one pitch (+88px) right, so
   the lob lands naturally on ANY rack slot, not just the first two. */
const lobPath = (fromBottom: boolean, slotIdx: number) => {
  const mx = -400 + slotIdx * 80;
  const ex = -456 + slotIdx * 88;
  return fromBottom
    ? `path("M 0 0 C -80 -260, ${mx} -240, ${ex} -196")`
    : `path("M 0 0 C -80 -55, ${mx} -48, ${ex} 15")`;
};

/* R7's ×2 arrival — from the ROUND MARKER (center ≈ 116, 240 zone px) up and
   over into its corner-rack slot center (308 + 88·idx, 79.5), diving in from
   above-right so the landing reads as the chip taking its seat. */
const r7ArrivalPath = (slotIdx: number) => {
  const dx = 192 + slotIdx * 88;
  return `path("M 0 0 C 70 -30, ${Math.round(dx * 0.55)} -195, ${dx} -160")`;
};

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
  /* ward's victim stays BURNED — pinned hidden from the end of the beat until
     the round resets (the animation's fill can't outlive its step) */
  const [wardBurned, setWardBurned] = useState<null | "p1" | "p2">(null);
  const multAppliedRef = useRef(true);
  /* this round's multiplier has ALREADY flown into the number — once the multmash
     flight starts, the corner chip is spent and must never come back */
  const [multSpent, setMultSpent] = useState(false);
  const [shieldOff, setShieldOff] = useState(0);
  const [oppPeeked, setOppPeeked] = useState<Card[]>([]);
  /* how many of YOUR cards Klein has committed to memory (his Oracle peeks) */
  const [kleinPeekCount, setKleinPeekCount] = useState(0);
  /* the oracle markers (peek star / seen chip / note) stay hidden from the
     moment a peek fires until the star-chart beat's stars actually land */
  const [oracleBeatDone, setOracleBeatDone] = useState(true);
  const [kleinMsg, setKleinMsg] = useState("");
  const [kleinThinking, setKleinThinking] = useState(true);
  const [msgVisible, setMsgVisible] = useState(false);
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
  const [statusInfo, setStatusInfo] = useState<"mult" | "shield" | "peek" | "peekKlein" | null>(null);
  /* the ANIM LAB panel folds down to a pill so it never covers the felt markers */
  const [labOpen, setLabOpen] = useState(true);

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

  /* ---------- THE CORNER RACK — three slots at the table's top left. Chips
     claim the first free slot when they arrive and release it when they die;
     the survivors slide left (CSS left-transition) to close the gap. Slot
     positions derive from the rack order — nothing hardcoded — so any new
     chip just registers an id and slots in naturally. ---------- */
  const [cornerRack, setCornerRack] = useState<string[]>([]);
  const claimCorner = useCallback((id: string) => {
    setCornerRack((q) => (q.includes(id) ? q : [...q, id]));
  }, []);
  const releaseCorner = useCallback((id: string) => {
    setCornerRack((q) => q.filter((c) => c !== id));
  }, []);
  /* R7'S OWN ×2 — round 7's climax chip detaches from the round marker and
     flies to its rack slot when the round starts; if an echo ×2 is parked
     there they FUSE into the crimson ×3 the moment it lands. */
  const [r7Arrival, setR7Arrival] = useState<null | "flying" | "landed">(null);
  /* ROUND WIPE — the next-round number while the crimson sweep crosses; null
     when no transition is playing */
  const [roundAdv, setRoundAdv] = useState<number | null>(null);

  const deal = useCallback(() => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
    const [{ p1Hand, p2Hand }, rngState] = dealHands(CATALOGUE, seed);
    chain.current = { interactionId: null, results: [], transcript: [], seed, rngState, shieldOff: 0, echoNext: false, p2Hand: [...p2Hand] };
    p1Lock.current = null;
    setP1Hand(p1Hand); setP2Count(p2Hand.length);
    setP1Score(0); setP2Score(0);
    setRound(1); setP1Locked(null); setP2Locked(null);
    setEchoNext(false); setShieldOff(0); setChipStandby(false); setShieldStandby(false);
    setEchoChipDying(false); setShieldChipDying(false); setMultSpent(false);
    setCornerRack([]); setR7Arrival(null); setRoundAdv(null); // fresh match — empty rack, no wipe
    setOppPeeked([]); setKleinMsg("");
    setKleinPeekCount(0); setOracleBeatDone(true);
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
    setWardBurned(null); // fresh round — the table is whole again
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
    // ORACLE PEEK — the cards the oracle's owner gets to see, drawn once here
    // (demo mode synthesizes a Klein hand — the demo never deals one)
    const peekPool = chain.current.p2Hand.length ? chain.current.p2Hand
      : demoMode ? [cardById("seraph"), cardById("bandit"), cardById("ogre")] : [];
    const peekSeen = out.peek && out.peek.side === "p1" && peekPool.length
      ? [...peekPool].sort(() => Math.random() - 0.5).slice(0, out.peek.count)
      : null;
    if (peekSeen) {
      // demo re-runs the same peek every loop — replace, don't stack duplicates
      if (demoMode) setOppPeeked(peekSeen);
      else setOppPeeked((p) => [...p, ...peekSeen]);
      setOracleBeatDone(false); // the markers stay hidden until the stars land
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
        if (web) setWardBurned(you.name === "Ward" ? "p2" : "p1"); // the victim stays burned for the round
        if (multScored) {
          steps.push({
            kind: "multmash", ms: 2400, mult: multTotal,
            r7: r7Mult, echo: !!ctx.echoNext, base: multBase, final: Math.max(out.p1Points, out.p2Points), side: multSide,
          });
        }
        steps.push({ kind: "award", ms: 1400, p1After: preP1, p2After: preP2, p1Pts: out.p1Points, p2Pts: out.p2Points });
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
    if (out.reversalSwapped) steps.push({ kind: "trick", ms: 4600, trick: "reversal", p1After: out.p1Score, p2After: out.p2Score, preP1, preP2 });
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
    if (peekSeen) {
      steps.push({ kind: "trick", ms: 4600, trick: "oracle", peekCards: peekSeen, youCard: you, kleinCard: klein });
    } else if (out.peek && out.peek.side === "p2") {
      // KLEIN'S oracle — the player never sees the cards; a persistent top-left
      // chip announces that your hand was read. Count = what he actually saw.
      const mineLeft = Math.max(0, p1Hand.length - (p1Locked ? 0 : 1));
      const cnt = demoMode ? 2 : Math.min(out.peek.count, mineLeft);
      steps.push({ kind: "trick", ms: 4600, trick: "oracle", peekCount: cnt, youCard: you, kleinCard: klein });
      setKleinPeekCount((c) => c + cnt);
      setOracleBeatDone(false); // the chip stays hidden until the stars land
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
    setWardBurned(null);
    setP1Hand([]); setP2Count(0); setError(null);
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    setP1Score(ctx.youScore); setP2Score(ctx.kleinScore);
    setRound(ctx.round); setEchoNext(ctx.echoNext); setShieldOff(ctx.shieldOff);
    setChipStandby(ctx.echoNext);
    setShieldStandby(ctx.shieldOff > 0);
    setMultSpent(false);
    // demo R7 scenarios get the same climax-chip arrival as the real game
    if (web && ctx.round === TOTAL_ROUNDS) {
      setR7Arrival("flying");
      setTimeout(() => { if (alive.current) setR7Arrival("landed"); }, 1500);
    } else {
      setR7Arrival(null);
    }
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
        const nxt = DEMO_SCENARIOS[(i + 1) % DEMO_SCENARIOS.length];
        // the wipe plays between scenarios so the lab loop reads like a match
        const nextRoundNo = Math.min(TOTAL_ROUNDS, nxt.round ?? 3);
        if (web && nxt.key !== demoKeyRef.current) {
          setRoundAdv(nextRoundNo);
          setTimeout(() => { if (alive.current) setRoundAdv(null); }, 1750);
        }
        runDemo(nxt.key);
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
    if (step.kind === "multmash") {
      // the corner chip's copy is flying into the number — the corner copy is
      // gone for good the moment the flight starts (spent, never returns)
      setMultSpent(true);
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
      // the oracle beat just finished — its stars have landed, reveal the markers
      if (step.kind === "trick" && step.trick === "oracle") setOracleBeatDone(true);
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
    setP1Locked(null); setP2Locked(null);
    setMultSpent(false); // the new round's multiplier (if any) is armed again
    // ROUND WIPE — the crimson sweep that covers the table while the round turns
    if (web) {
      setRoundAdv(nextRound);
      setTimeout(() => { if (alive.current) setRoundAdv(null); }, 1750);
    }
    // ROUND 7 — its own ×2 tears off the round marker and claims a rack slot
    if (web) {
      if (nextRound === TOTAL_ROUNDS) {
        setR7Arrival("flying");
        setTimeout(() => { if (alive.current) setR7Arrival("landed"); }, 1500);
      } else {
        setR7Arrival(null);
      }
    }
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
  /* reversal chip-swap: while the vortex beat runs, each chip rolls its own
     number out and the swapped total in (the score state itself lands at step end) */
  const revSwap = web && cur?.kind === "trick" && cur.trick === "reversal" && cur.p1After !== undefined
    ? { to1: cur.p1After, to2: cur.p2After ?? 0 } : null;
  const cardsUp = phase === "over" || (phase === "reveal" && seqIdx >= 1); // step 0 is the showdown hold; the flip is step 1 — must NOT leak into the next round's commit phase (Klein locks in the background there)
  const revealed = cardsUp;
  const mult = (round === TOTAL_ROUNDS ? 2 : 1) + (echoNext ? 1 : 0);
  const fanAngle = (i: number, n: number) => (i - (n - 1) / 2) * 5;
  /* ---------- corner-rack membership (derived) — a chip holds its slot while
     ANY of its forms is on screen (in flight, parked, live, dying) and releases
     it when all are gone; the survivors slide left into the freed slot. ---------- */
  const echoBeatNow = !!(cur?.kind === "trick" && cur.trick === "echo");
  const eclipseBeatNow = !!(cur?.kind === "trick" && cur.trick === "eclipse");
  const multChipOn = mult > 1 && !multSpent && cur?.kind !== "multmash";
  /* while R7's ×2 is in the air the corner keeps whatever was there (a parked
     echo ×2) — the real chip only materializes once the flight lands */
  const r7Flying = web && round === TOTAL_ROUNDS && r7Arrival === "flying";
  const multChipVis = multChipOn && !r7Flying;
  const echoParked = web && chipStandby && !(mult > 1) && !echoBeatNow;
  const echoParkedR7 = web && chipStandby && round === TOTAL_ROUNDS && echoNext && r7Arrival === "flying" && !echoBeatNow;
  const shieldParked = web && shieldStandby && !(shieldOff > 0) && !eclipseBeatNow;
  const multRack = web && (echoBeatNow || echoParked || echoParkedR7 || echoChipDying || (cur?.kind === "multmash" && mult > 1) || (round === TOTAL_ROUNDS && r7Arrival !== null) || multChipOn);
  const shieldRack = web && (eclipseBeatNow || shieldParked || shieldChipDying || shieldOff > 0);
  useCornerChip("mult", multRack, claimCorner, releaseCorner);
  useCornerChip("shield", shieldRack, claimCorner, releaseCorner);
  useCornerChip("seen", web && kleinPeekCount > 0, claimCorner, releaseCorner);
  const rackIdx = (id: string) => { const i = cornerRack.indexOf(id); return i >= 0 ? i : 0; };
  const slotLeft = (id: string) => `calc(17% + ${rackIdx(id) * 88}px)`;
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
                wardBurned === "p2" && !(cur?.kind === "trick" && cur.trick === "ward") && ({ opacity: 0 } as any),
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
                wardBurned === "p1" && !(cur?.kind === "trick" && cur.trick === "ward") && ({ opacity: 0 } as any),
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
            && !(cur.trick === "eclipse" && web) && !(cur.trick === "ward" && web)
            && !(cur.trick === "reversal" && web) && !(cur.trick === "oracle" && web) && (
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
                  path (offset-path) from its corner-rack slot. Glyph only — no
                  tag/? in flight. Three composed animations: the path
                  (position), the fade (only in the final dive), and the
                  spin+shrink (continuous). */}
              <View
                key="chip-flight"
                style={[
                  st.muChipFly as any,
                  { left: slotLeft("mult") } as any,
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
          <EchoLoad youPlayed={cur.youCard?.name === "Echo"} slotIdx={rackIdx("mult")} />
        )}

        {/* ECLIPSE — same activation: rings + SHIELDS DOWN stamp, then the
            broken-shield chip flies to its corner-rack slot */}
        {cur?.kind === "trick" && cur.trick === "eclipse" && web && (
          <EclipseLoad youPlayed={cur.youCard?.name === "Eclipse"} slotIdx={rackIdx("shield")} />
        )}

        {/* WARD — the watcher: the trick charges, a golden eye snaps open right
            on the ward card and locks its gaze — the gaze ignites the opposing
            card and it BURNS to ash (canvas particle fire), +5 rolls out of the embers. */}
        {cur?.kind === "trick" && cur.trick === "ward" && web && (
          <WardBlock victimTop={cur.youCard?.name === "Ward"} />
        )}

        {/* REVERSAL — a procedural vortex at the middle of the table: both
            totals spiral into the core as two chasing streams, then the burst
            flips the spin — the tables turn — and the numbers themselves fly
            through the storm and trade places, landing dead-center in the
            other chip's slot. zIndex 30: the flyers ride OVER the chips. */}
        {cur?.kind === "trick" && cur.trick === "reversal" && web && (
          <View style={[st.esWrap as any, { zIndex: 30 } as any, web && ({ animation: "dVdFadeOut 400ms 4200ms ease-in both" } as any)]} pointerEvents="none">
            <View style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -320, marginTop: -320 } as any}>
              <RevVortex />
            </View>
            {/* your total leaves your chip, arcs over the storm, rises into
                Klein's. left is zone-shifted (+63.75): offset-path anchors the
                laid-out center at (left - zone.x, top) — calibrated so the
                flight starts dead-center on the resident slot and lands
                dead-center on the other (slots measured from the live DOM). */}
            <View
              style={[
                { position: "absolute", left: 139, top: 405, width: 60, height: 50, alignItems: "center", justifyContent: "center", offsetRotate: "0deg" } as any,
                st.rvFlyPathYou as any,
                web && ({ animation: "dEsChipFly 1050ms 1100ms cubic-bezier(.4,.1,.4,1) both" } as any),
              ]}
            >
              <Text style={[st.chipNum as any, { color: theme.color.yellow } as any]}>{p1Score}</Text>
            </View>
            {/* Klein's total takes the mirrored arc under the storm and drops into yours */}
            <View
              style={[
                { position: "absolute", left: 1461, top: 105, width: 60, height: 50, alignItems: "center", justifyContent: "center", offsetRotate: "0deg" } as any,
                st.rvFlyPathKlein as any,
                web && ({ animation: "dEsChipFly 1050ms 1100ms cubic-bezier(.4,.1,.4,1) both" } as any),
              ]}
            >
              <Text style={[st.chipNum as any, { color: "#FF4D5E" } as any]}>{p2Score}</Text>
            </View>
            <View style={[st.esStamp as any, { position: "absolute", left: "50%", top: "58%", marginLeft: -80, width: 160, alignItems: "center" }, web && ({ animation: "dStampIn 340ms 2300ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
              <Text style={st.esStampTxt as any}>SWAPPED</Text>
            </View>
          </View>
        )}

        {/* ORACLE — the star chart: constellations form over the night-dark
            felt, the peeked faces burn through (yours only), and the collapse
            glints fly off to dock — the peek star lower right (yours) or the
            hand-seen chip top left (Klein's). */}
        {cur?.kind === "trick" && cur.trick === "oracle" && web && (
          <StarChart
            mine={cur.youCard?.name === "Oracle"}
            cards={cur.peekCards ?? []}
            count={cur.peekCount ?? cur.peekCards?.length ?? 2}
            slotIdx={rackIdx("seen")}
          />
        )}

        {/* score chips + round marker — OVERLAYS on the table zone, never clipped by the felt */}
        <View style={st.roundMarker as any} pointerEvents="none">
          <Text style={st.roundLbl as any}>ROUND</Text>
          <Text style={st.roundNum as any}>{Math.min(round, TOTAL_ROUNDS)}<Text style={st.roundDim as any}>/{TOTAL_ROUNDS}</Text></Text>
          {mult > 1 && <Text style={st.roundMult as any}>×{mult}</Text>}
        </View>
        <View style={[st.chip, st.chipOpp, drainSide === "p2" && (web ? ({ animation: "dChipDrain 400ms ease-in-out infinite" } as any) : null)] as any} pointerEvents="none">
          <Text style={st.chipLbl as any}>{opp.name}</Text>
          {revSwap ? (
            <View style={{ height: 50, width: "100%" } as any} /> // the number is away — flying through the vortex
          ) : (
            <Text key={`s2-${p2Score}`} style={[st.chipNum, { color: "#FF4D5E" }, drainSide === "p2" && (web ? ({ animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } as any) : null)] as any}>{p2Score}</Text>
          )}
        </View>
        <View style={[st.chip, st.chipYou, drainSide === "p1" && (web ? ({ animation: "dChipDrain 400ms ease-in-out infinite" } as any) : null)] as any} pointerEvents="none">
          <Text style={st.chipLbl as any}>YOU</Text>
          {revSwap ? (
            <View style={{ height: 50, width: "100%" } as any} /> // the number is away — flying through the vortex
          ) : (
            <Text key={`s1-${p1Score}`} style={[st.chipNum, { color: theme.color.yellow }, drainSide === "p1" && (web ? ({ animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } as any) : null)] as any}>{p1Score}</Text>
          )}
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
        {multChipVis && (
          <Pressable
            onPress={() => setStatusInfo("mult")}
            onHoverIn={playHover}
            style={({ hovered }: any) => [st.shieldChip, { left: slotLeft("mult"), top: "7%" } as any, web && ({ transition: "left 450ms cubic-bezier(.2,1,.3,1)" } as any), hovered && (st.shieldChipHover as any)]}
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
            style={({ hovered }: any) => [st.shieldChip, { left: slotLeft("shield"), top: "7%" }, web && ({ transition: "left 450ms cubic-bezier(.2,1,.3,1)" } as any), hovered && (st.shieldChipHover as any)]}
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
        {/* YOUR PEEK — the star the constellation docked as. Appears only once
            the stars have landed, clickable for the rest of the match. The glyph
            anchors dead-center of the plate; the tag hangs UNDER it, same house
            style as every other chip tag. */}
        {web && oppPeeked.length > 0 && oracleBeatDone && (
          <Pressable
            onPress={() => setStatusInfo("peek")}
            onHoverIn={playHover}
            style={({ hovered }: any) => [st.peekStar, { right: "5%", bottom: "27%" } as any, hovered && (st.peekStarHover as any), web && ({ animation: "dOcDock 450ms cubic-bezier(.34,1.5,.64,1) both" } as any)]}
          >
            <View style={[st.peekStarGlyph as any, { marginLeft: -20, marginTop: -20 } as any]} pointerEvents="none">
              <Sparkle size={40} color="#ffe98a" />
            </View>
            <View style={st.peekStarCount as any} pointerEvents="none">
              <Text style={st.peekStarCountTxt as any}>{oppPeeked.length}</Text>
            </View>
            <View style={st.peekStarTagRow as any} pointerEvents="none">
              <View style={st.shieldChipTag as any}>
                <Text style={st.shieldChipTagTxt as any}>PEEK</Text>
              </View>
            </View>
          </Pressable>
        )}
        {/* KLEIN'S PEEK — your cards were read. You never see which; the chip
            appears once his stars land and stays for the match. */}
        {web && kleinPeekCount > 0 && oracleBeatDone && (
          <Pressable
            onPress={() => setStatusInfo("peekKlein")}
            onHoverIn={playHover}
            style={({ hovered }: any) => [st.peekStar, st.peekStarKlein, { left: slotLeft("seen"), top: "7%" } as any, web && ({ transition: "left 450ms cubic-bezier(.2,1,.3,1)" } as any), hovered && (st.peekStarKleinHover as any), web && ({ animation: "dOcDock 450ms cubic-bezier(.34,1.5,.64,1) both" } as any)]}
          >
            <View style={[st.peekStarGlyph as any, { marginLeft: -20, marginTop: -20 } as any]} pointerEvents="none">
              <Sparkle size={40} color="#ff9a9a" />
            </View>
            <View style={[st.peekStarCount as any, { backgroundColor: theme.color.crimson } as any]} pointerEvents="none">
              <Text style={st.peekStarCountTxt as any}>{kleinPeekCount}</Text>
            </View>
            <View style={st.peekStarTagRow as any} pointerEvents="none">
              <View style={[st.shieldChipTag as any, { borderColor: theme.color.crimson } as any]}>
                <Text style={[st.shieldChipTagTxt as any, { color: "#FF4D5E" } as any]}>SEEN</Text>
              </View>
            </View>
          </Pressable>
        )}
        {/* R7'S ARRIVAL — round 7's own ×2 detaches from the ROUND MARKER and
            flies to its rack slot. If an echo ×2 is parked there, the landing
            fuses them into the crimson ×3 (the flash below). */}
        {r7Flying && (
          <View
            style={[
              st.esChip as any,
              { left: 80, top: 204, offsetPath: r7ArrivalPath(rackIdx("mult")) } as any,
              web && ({ animation: "dEsChipPop 340ms 100ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 1100ms 400ms cubic-bezier(.4,.1,.4,1) both, dVdFadeOut 250ms 1350ms ease-in both" } as any),
            ] as any}
            pointerEvents="none"
          >
            <View style={st.multChipBurstB as any} />
            <View style={st.multChipBurstW as any} />
            <View style={[st.multChipLive as any, { transform: [{ rotate: "-4deg" }] }]}>
              <View style={[st.multChipFace as any, { backgroundColor: theme.color.yellow }]} />
              <Text style={[st.multChipTxt as any, { color: "#111" }]}>×2</Text>
            </View>
          </View>
        )}
        {/* the FUSE — one flash the instant R7's ×2 lands on a parked echo ×2;
            the chip that materializes here is the crimson ×3 */}
        {web && r7Arrival === "landed" && round === TOTAL_ROUNDS && echoNext && chipStandby && (
          <View style={[st.wdWave as any, { left: slotLeft("mult"), top: "7%", width: 72, height: 72, marginLeft: 0, marginTop: 0 }, web && ({ animation: "dEsWave 650ms ease-out both" } as any)]} pointerEvents="none" />
        )}
        {/* echo's ×2 chip PARKED at the corner slot — renders from the moment the
            flight lands until the real multiplier chip appears (mult > 1). In R7
            it holds its slot while R7's ×2 flies in to fuse with it. */}
        {(echoParked || echoParkedR7) && (
          <View style={[st.esChip as any, { left: slotLeft("mult"), top: "7%" }, web && ({ transition: "left 450ms cubic-bezier(.2,1,.3,1)" } as any)] as any} pointerEvents="none">
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
            <View style={[st.esChip as any, { left: slotLeft("mult"), top: "7%" }, web && ({ animation: "dChipDeath 650ms ease-in both" } as any)] as any} pointerEvents="none">
              <View style={st.multChipBurstB as any} />
              <View style={st.multChipBurstW as any} />
              <View style={[st.multChipLive as any, { transform: [{ rotate: "-4deg" }] }]}>
                <View style={[st.multChipFace as any, { backgroundColor: theme.color.yellow }]} />
                <Text style={[st.multChipTxt as any, { color: "#111" }]}>×2</Text>
              </View>
            </View>
            <View style={[st.wdWave as any, { left: slotLeft("mult"), top: "7%", width: 72, height: 72, marginLeft: 0, marginTop: 0 }, web && ({ animation: "dEsWave 600ms 120ms ease-out both" } as any)]} pointerEvents="none" />
          </>
        )}

        {/* eclipse's shield chip DYING — last turn used up, halves blast apart */}
        {web && shieldChipDying && (
          <View style={[st.esChip as any, { left: slotLeft("shield"), top: "7%" }, { alignItems: "center", justifyContent: "center" }] as any} pointerEvents="none">
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
        {web && shieldStandby && !(shieldOff > 0) && !eclipseBeatNow && (
          <View style={[st.esChip as any, { left: slotLeft("shield"), top: "7%" }, { alignItems: "center", justifyContent: "center" }] as any} pointerEvents="none">
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

        {/* (the peek note retired — the peek star's own tag carries the label) */}

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

      {/* ---------- ROUND WIPE — the P5 sweep that opens the next round ---------- */}
      {roundAdv !== null && web && <RoundWipe n={roundAdv} total={TOTAL_ROUNDS} />}

      {/* ---------- ANIM LAB (demo only, collapsible) ---------- */}
      {demoMode && labOpen && (
        <View style={st.demoPanel as any}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 } as any}>
            <Text style={[st.demoPanelTitle as any, { marginBottom: 0 }]}>ANIM LAB · LOOP</Text>
            <Pressable onPress={() => setLabOpen(false)} onHoverIn={playHover} style={({ hovered }: any) => [st.demoPanelToggle as any, hovered && st.demoBtnHover as any]}>
              <Text style={st.demoPanelToggleTxt as any}>▾</Text>
            </Pressable>
          </View>
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
      {demoMode && !labOpen && (
        <Pressable onPress={() => setLabOpen(true)} onHoverIn={playHover} style={({ hovered }: any) => [st.demoPanelMini as any, hovered && { borderColor: theme.color.crimson } as any]}>
          <Text style={st.demoBtnTxt as any}>▶ ANIM LAB</Text>
        </Pressable>
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
                  : statusInfo === "peek" || statusInfo === "peekKlein"
                    ? <Sparkle size={22} color={statusInfo === "peek" ? "#ffe98a" : "#ff9a9a"} />
                    : <BrokenShieldMark w={22} h={26} />}
              </View>
              <Text style={st.infoTitle as any}>{statusInfo === "mult" ? "CLASH MULTIPLIER" : statusInfo === "shield" ? "SHIELDS OFF" : statusInfo === "peek" ? "YOUR PEEK" : "YOUR HAND SEEN"}</Text>
            </View>
            <View style={st.infoInner as any}>
              {statusInfo === "peek" ? (
                <>
                  <View style={st.peekCardsRow as any}>
                    {oppPeeked.map((c, i) => (
                      <View key={`${c.id}-${i}`} style={[st.playCard as any, web && ({ transform: [{ rotate: i % 2 ? "2.5deg" : "-2.5deg" }] } as any)] as any}>
                        <CardFace card={c} />
                      </View>
                    ))}
                  </View>
                  <Text style={st.infoBody as any}>Klein's hand when you played Oracle. He may have played some of these since — the peek shows what you saw, not what he holds now.</Text>
                </>
              ) : statusInfo === "peekKlein" ? (
                <Text style={st.infoBody as any}>Klein played Oracle and committed {kleinPeekCount} of your cards to memory. He knows what you are holding — expect him to play around it. He cannot show you which, and neither can you.</Text>
              ) : (
                <Text style={st.infoBody as any}>{statusInfo === "mult" ? MULT_INFO : SHIELD_INFO}</Text>
              )}
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

/* ROUND WIPE — the transition that opens every new round: a black lead bar
   with a yellow rim pushes across, the fat crimson diagonal follows, the next
   round number SLAMS in huge while the sweep holds over the screen, then the
   whole panel exits and the fresh table is revealed underneath. Pure P5 —
   hard offsets, skewed slabs, no soft fades. */
function RoundWipe({ n, total }: { n: number; total: number }) {
  const climax = n === total;
  const accent = climax ? theme.color.yellow : "#fff";
  return (
    <View pointerEvents="none" style={st.rwRoot as any}>
      {/* the black lead bar — telegraphs the sweep by a beat */}
      <View style={[st.rwLead as any, web && ({ animation: "dRwLead 1750ms cubic-bezier(.7,0,.3,1) both" } as any)] as any} />
      {/* the fat crimson slab — the carrier of the whole sweep */}
      <View style={[st.rwPanel as any, web && ({ animation: "dRwPanel 1750ms cubic-bezier(.7,0,.3,1) both" } as any)] as any}>
        <View style={st.rwStripe as any} pointerEvents="none" />
        <View style={st.rwDots as any} pointerEvents="none" />
      </View>
      {/* the verdict — dead-center through the hold: kicker, huge number, n/7 */}
      <View style={st.rwContent as any}>
        <Text style={[st.rwKicker as any, { color: theme.color.yellow }]}>NEXT</Text>
        <Text style={[st.rwNum as any, { color: accent }, web && ({ animation: "dRwNumSlam 520ms 640ms cubic-bezier(.2,1,.3,1) both" } as any)] as any}>
          ROUND {n}
        </Text>
        <View style={[st.rwOfRow as any, web && ({ animation: "dNumSlam 420ms 860ms cubic-bezier(.2,1,.3,1) both" } as any)] as any}>
          <Text style={st.rwOfTxt as any}>{n} / {total}{climax ? " — CLIMAX ×2" : ""}</Text>
        </View>
      </View>
    </View>
  );
}

/* ECHO — two-part beat, kept deliberately small (echo only voids the clash):
   1) rings emit from the echo card while a compact "CLASH VOIDED" stamp pops;
   2) the ×2 chip pops OUT of the echo card and curves into its corner-rack
   slot — the exact coordinates where the real chip renders next round, so
   the hand-off reads as the chip staying there. slotIdx comes from the rack:
   if another chip got there first, the lob simply lands one pitch further. */
function EchoLoad({ youPlayed, slotIdx }: { youPlayed: boolean; slotIdx: number }) {
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
      {/* the ×2 chip: pops from the echo card, curves to its rack slot */}
      <View
        style={[
          st.esChip as any,
          { left: "50%", top: slotTop, marginLeft: -36, marginTop: 40 },
          { offsetPath: lobPath(youPlayed, slotIdx) } as any,
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
   (with the 2-rounds badge) pops out and curves into its corner-rack slot —
   first free slot, exactly where the persistent chip will stand. */
function EclipseLoad({ youPlayed, slotIdx }: { youPlayed: boolean; slotIdx: number }) {
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
          { offsetPath: lobPath(youPlayed, slotIdx) } as any,
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

/* VOID — the maw, hand-drawn on canvas (the same procedural family as the ward
   fire and the oracle star chart): matter spirals along a tilted accretion
   disc into a pure-black horizon, burning hotter as it approaches (doppler);
   the far side of the disc LENSES over the top of the sphere; a thin photon
   ring hugs the edge; a shock rings out the instant the card is devoured. */
function VoidCanvas() {
  const host = useRef<any>(null);
  useEffect(() => {
    const hostEl = host.current as any;
    if (!hostEl) return;
    const cv = document.createElement("canvas");
    const W = 420, H = 420, CX = W / 2, CY = H / 2;
    cv.width = W; cv.height = H;
    hostEl.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const T0 = performance.now();
    let raf = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const HORIZON = 52;
    const DISC_IN = 66;
    const DISC_OUT = 196;
    const TILT = 0.26; // vertical squash of the disc plane (≈15° toward the viewer)
    type Q = { a: number; r: number; w: number; sz: number; ph: number; dust: boolean; rain: boolean };
    const ps: Q[] = [];
    for (let i = 0; i < 150; i++) {
      const rain = i < 36;
      ps.push({ a: rand(0, 6.283), r: rand(rain ? 90 : DISC_IN, DISC_OUT), w: rand(0.7, 1.7), sz: rand(1.2, 3.2), ph: rand(0, 6.283), dust: Math.random() < 0.2, rain });
    }
    const loop = (now: number) => {
      // rAF timestamps can land a hair BEFORE the effect captured its clock —
      // clamp so the horizon radius (HORIZON * open) never goes negative on
      // the first frame (arc() throws on negative radii)
      const t = Math.max(0, now - T0);
      const dt = 1 / 60;
      // beat clock: iris opens 0–500, feeds (the devour lands ~2280), dies 4100+
      const open = Math.min(1, t / 500);
      const die = t < 4100 ? 0 : Math.min(1, (t - 4100) / 450);
      const fade = open * (1 - die);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      for (const q of ps) {
        if (q.rain) {
          // polar rain — streams falling INTO the maw from above/below the plane
          q.a += q.w * 0.8 * dt;
          const s = Math.min(1, t / 2280);
          q.r -= (26 + 40 * s) * dt;
          if (q.r < HORIZON * 0.8) q.r = rand(120, DISC_OUT);
        } else {
          // keplerian-ish: inner orbits spin faster, the whole disc creeps inward
          q.a += q.w * (230 / Math.max(50, q.r)) * dt;
          const s = Math.min(1, t / 2280);
          q.r -= 8 * s * dt * (DISC_OUT / q.r);
          if (q.r < DISC_IN * 0.92) q.r = rand(DISC_IN + 30, DISC_OUT);
        }
        const x = CX + Math.cos(q.a) * q.r;
        const y = CY + Math.sin(q.a) * q.r * (q.rain ? 0.6 : TILT);
        // doppler: the side sweeping toward the viewer glows whiter/hotter
        const dop = 0.55 + 0.45 * (Math.cos(q.a - Math.PI) * 0.5 + 0.5);
        const heat = q.r < DISC_IN + 40 ? 1 : Math.max(0.25, 1 - (q.r - DISC_IN) / (DISC_OUT - DISC_IN));
        const a = (q.dust ? 0.22 : 0.5 + dop * 0.4) * heat * fade;
        ctx.fillStyle = q.dust
          ? `rgba(200,80,60,${a * 0.5})`
          : heat > 0.75
            ? `rgba(255,238,214,${a})`
            : heat > 0.45
              ? `rgba(255,150,80,${a})`
              : `rgba(220,60,40,${a})`;
        ctx.beginPath(); ctx.arc(x, y, q.sz * (0.6 + heat * 0.8), 0, 6.29); ctx.fill();
      }
      // the far side of the disc lensing OVER the sphere — an arc ABOVE the horizon
      const lensA = 0.5 * fade;
      ctx.save();
      ctx.translate(CX, CY - HORIZON * 1.15);
      ctx.scale(1.35, 0.32);
      const lens = ctx.createLinearGradient(0, -60, 0, 20);
      lens.addColorStop(0, "rgba(255,190,140,0)");
      lens.addColorStop(0.55, `rgba(255,225,190,${lensA * 0.8})`);
      lens.addColorStop(1, "rgba(255,150,90,0)");
      ctx.strokeStyle = lens as any;
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.arc(0, 0, HORIZON * 1.06, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = `rgba(255,170,110,${lensA * 0.55})`;
      ctx.beginPath(); ctx.arc(0, 0, HORIZON * 1.32, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke();
      ctx.restore();
      // the photon ring — white-hot, razor thin, hugging the horizon
      const prA = 0.85 * fade;
      ctx.strokeStyle = `rgba(255,240,225,${prA})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, HORIZON + 3.5, 0, 6.29); ctx.stroke();
      ctx.strokeStyle = `rgba(255,190,150,${prA * 0.35})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(CX, CY, HORIZON + 6, 0, 6.29); ctx.stroke();
      // the horizon itself: pure black, drawn in normal mode so it BLOCKS the light
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(CX, CY, HORIZON * open, 0, 6.29); ctx.fillStyle = "#000"; ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      // swallow shock the instant the card crosses the horizon (devour beat)
      const k = t - 2280;
      if (k >= 0 && k < 620) {
        const p = k / 620;
        ctx.strokeStyle = `rgba(255,235,220,${(1 - p) * 0.9 * fade})`;
        ctx.lineWidth = 5 * (1 - p) + 0.5;
        ctx.beginPath(); ctx.arc(CX, CY, HORIZON + p * 210, 0, 6.29); ctx.stroke();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <View ref={host as any} pointerEvents="none" style={{ width: 420, height: 420 } as any} />
  );
}

/* VOID — the void card mutates IN PLACE into the maw and the opposing card is
   stretched off its slot and devoured. The hole itself is the canvas above;
   the verdict is a black plaque with the maw glyph, hard crimson shadow. */
function VoidMaw({ atTop }: { atTop: boolean }) {
  return (
    <>
      {/* soft focus vignette — dims the felt edges, zero stripes */}
      <View style={[st.vnVignette as any, web && ({ animation: "dVdFadeIn 600ms 250ms ease-out both, dVdFadeOut 350ms 4250ms ease-in both" } as any)]} pointerEvents="none" />

      {/* the maw — the hand-drawn black hole, anchored exactly over the void
          card's felt slot (420×420 canvas centered on the 300×300 portal box) */}
      <View
        pointerEvents="none"
        style={[st.vnPortal, atTop ? st.vnPortalTop : st.vnPortalBottom, web && ({ animation: "dVdIris 620ms 350ms cubic-bezier(.2,1,.3,1) both, dVdPortalOut 340ms 4300ms cubic-bezier(.6,0,.8,.5) both" } as any)] as any}
      >
        <View style={{ position: "absolute", left: -60, top: -60 } as any}>
          <VoidCanvas />
        </View>
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

/* WARD — the watcher: a golden eye opens right on the ward card and darts its
   slit-pupil gaze onto the opposing card — then the gaze IGNITES it. A canvas
   particle-fire burns it from base to tip: the card chars, wobbles in 3D and
   collapses while embers rise, leaving ash and ward's flat +5. All fire is
   procedural (additive-blended particles). */
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
        // soft-fade any particle drifting past a canvas edge — never a hard cut
        ctx.globalAlpha = Math.max(0, Math.min(1, q.y / 26, q.x / 14, (W - q.x) / 14));
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
      ctx.globalAlpha = 1;
      // base glow — elliptical and fully contained: alpha hits 0 BEFORE the
      // canvas edges, so the light never shows a clipped rectangle
      ctx.save();
      ctx.translate(W / 2, 217);
      ctx.scale(1, 0.55);
      const g = ctx.createRadialGradient(0, 0, 6, 0, 0, 74);
      const ga = (0.35 + Math.sin(t * 11) * 0.08) * (1 - die);
      g.addColorStop(0, `rgba(255,170,60,${ga})`);
      g.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-W / 2, -217 / 0.55, W, H / 0.55);
      ctx.restore();
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

/* REVERSAL — a procedural vortex (same approach as the ward fire): both totals
   spiral into a core at the middle of the table as two chasing streams — gold
   for yours, crimson for Klein's — then the burst REVERSES the spin and the
   streams tear back through each other's paths. The tables turn. */
function RevVortex() {
  const host = useRef<any>(null);
  useEffect(() => {
    const hostEl = host.current as any;
    if (!hostEl) return;
    const cv = document.createElement("canvas");
    const W = 640, H = 640, CX = W / 2, CY = H / 2;
    cv.width = W; cv.height = H;
    hostEl.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const BURST = 1100;
    const T0 = performance.now();
    let raf = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const ps: { team: number; a: number; r: number; r0: number; w: number; size: number; px: number; py: number; dust: boolean; flipped: boolean }[] = [];
    for (let i = 0; i < 175; i++) {
      const team = i % 2;
      const r0 = rand(62, 288);
      ps.push({ team, a: rand(0, 6.283) + (team ? Math.PI : 0), r: r0, r0, w: rand(1.3, 2.4), size: rand(2, 4.6), px: 0, py: 0, dust: Math.random() < 0.28, flipped: false });
    }
    const loop = (now: number) => {
      const t = now - T0;
      const dt = 1 / 60;
      const toBurst = Math.min(1, t / BURST);
      const k = t - BURST;
      const burst = k >= 0;
      const fade = (t < 2600 ? 1 : Math.max(0, 1 - (t - 2600) / 1600)) * Math.min(1, t / 280);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      // the core — breathes while it feeds, detonates on the burst; the glow
      // stays fully inside the canvas so no square edge ever shows
      const coreA = (burst ? Math.max(0, 0.85 - k / 480) : 0.3 + toBurst * 0.45 + Math.sin(t * 0.011) * 0.06);
      const coreR = burst ? 45 + Math.min(95, k * 0.55) : 22 + toBurst * 18 + Math.sin(t * 0.011) * 4;
      const cg = ctx.createRadialGradient(CX, CY, 2, CX, CY, coreR * 2.2);
      cg.addColorStop(0, `rgba(255,242,210,${coreA})`);
      cg.addColorStop(0.45, `rgba(252,238,33,${coreA * 0.5})`);
      cg.addColorStop(1, "rgba(252,238,33,0)");
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(CX, CY, coreR * 2.2, 0, 6.29); ctx.fill();
      // shockwave ring on the burst
      if (burst && k < 650) {
        const rp = k / 650;
        ctx.strokeStyle = `rgba(255,224,150,${(1 - rp) * 0.85})`;
        ctx.lineWidth = 4.5 * (1 - rp) + 0.5;
        ctx.beginPath(); ctx.arc(CX, CY, 10 + rp * 285, 0, 6.29); ctx.stroke();
      }
      ctx.lineCap = "round";
      for (const q of ps) {
        if (!burst) {
          // FEED — spiral inward, the spin tightening as the radius collapses
          q.a += q.w * 2.1 * (160 / Math.max(30, q.r)) * dt;
          const s = toBurst * toBurst * (3 - 2 * toBurst); // smoothstep suck
          q.r = Math.max(15, q.r0 * (1 - 0.94 * s));
        } else {
          // THE REVERSAL — the spin flips with an overshoot, orbits re-tighten
          if (!q.flipped) { q.flipped = true; q.w *= -1.8; q.r += rand(9, 38); }
          q.w *= 0.995;
          q.a += q.w * 1.6 * (160 / Math.max(30, q.r)) * dt;
          const rT = 20 + (q.r0 - 20) * 0.32;
          q.r += (rT - q.r) * 0.06;
        }
        const x = CX + Math.cos(q.a) * q.r;
        const y = CY + Math.sin(q.a) * q.r * 0.94;
        if (q.px || q.py) {
          const spd = Math.min(1, Math.hypot(x - q.px, y - q.py) / 14);
          const col = q.dust ? "255,244,214" : q.team ? "255,77,94" : "252,238,33";
          ctx.strokeStyle = `rgba(${col},${(q.dust ? 0.45 : 0.95) * (0.35 + spd * 0.65)})`;
          ctx.lineWidth = q.size;
          ctx.beginPath(); ctx.moveTo(q.px, q.py); ctx.lineTo(x, y); ctx.stroke();
        }
        q.px = x; q.py = y;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <View
      ref={host as any}
      pointerEvents="none"
      style={{ width: 640, height: 640 } as any}
    />
  );
}

/* Four-point star glyph — two crossed sparkle polygons. Used by the oracle
   beat's docking glints and the persistent peek markers. Both layers anchor
   dead-center explicitly (no reliance on flex-centering of absolute children),
   so the star reads perfectly centered inside its circle plate. */
function Sparkle({ size, color }: { size: number; color: string }) {
  const clip = "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)";
  const s2 = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", position: "relative" } as any}>
      <View style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, backgroundColor: color, clipPath: clip } as any} />
      <View style={{ position: "absolute", left: "50%", top: "50%", width: s2, height: s2, marginLeft: -s2 / 2, marginTop: -s2 / 2, backgroundColor: color, clipPath: clip, transform: [{ rotate: "45deg" }], opacity: 0.85 } as any} />
    </View>
  );
}

/* ORACLE — THE STAR CHART: the felt dims to night, stars ignite and string
   themselves into card-shaped constellations; the real faces burn through
   (yours) — or the frames stay hollow (Klein's peek: you never see what he
   saw). Then the constellations collapse into glints that fly off and dock:
   the peek star at the lower right (yours — clickable all match) or the
   hand-seen chip at the top left (his). Same procedural-canvas family as the
   ward fire and the reversal vortex. */
function StarChart({ mine, cards, count, slotIdx }: { mine: boolean; cards: Card[]; count: number; slotIdx: number }) {
  const host = useRef<any>(null);
  const n = Math.max(1, Math.min(2, count || cards.length || 2));
  const W = 720, H = 500;
  // constellation frame centers, canvas-local, then in esWrap design coords.
  // The esWrap spans the full stage width (origin x=0), so felt-based values
  // get +63.75 — the same correction the dock glints carry.
  const fc = n === 2 ? [[237, 250], [483, 250]] : [[360, 250]];
  const fcEs = fc.map(([x, y]) => [736.25 + (x - W / 2) + 63.75, 310.6 + (y - H / 2)]);
  // dock = the persistent marker's rack slot: yours lives lower right; Klein's
  // SEEN chip claims its corner-rack slot (peekStar 76px → center +38/+38)
  const dock = mine ? [1482, 415] : [272 + slotIdx * 88 + 38, 81];
  useEffect(() => {
    const hostEl = host.current as any;
    if (!hostEl) return;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    hostEl.appendChild(cv);
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const T0 = performance.now();
    let raf = 0;
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const stars = Array.from({ length: 48 }, () => ({ x: rand(14, W - 14), y: rand(14, H - 14), s: rand(0.8, 2.1), ph: rand(0, 6.283) }));
    const framePts = (cx: number, cy: number) => {
      const w2 = 75, h2 = 105, r = 12;
      return [
        [cx - w2 + r, cy - h2], [cx + w2 - r, cy - h2],
        [cx + w2, cy - h2 + r], [cx + w2, cy + h2 - r],
        [cx + w2 - r, cy + h2], [cx - w2 + r, cy + h2],
        [cx - w2, cy + h2 - r], [cx - w2, cy - h2 + r],
      ];
    };
    const frames = fc.map(([cx, cy]) => ({ cx, cy, pts: framePts(cx, cy) }));
    const loop = (now: number) => {
      const t = now - T0;
      const drawP = Math.max(0, Math.min(1, (t - 600) / 1200));
      const colP = Math.max(0, Math.min(1, (t - 3000) / 600));
      const colE = colP * colP * (3 - 2 * colP);
      const fade = (t < 4100 ? 1 : Math.max(0, 1 - (t - 4100) / 450)) * Math.min(1, t / 420);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade;
      // ambient star field — twinkles in as the veil falls
      for (const s of stars) {
        const a = (0.35 + Math.sin(t * 0.004 + s.ph) * 0.3) * fade;
        ctx.fillStyle = `rgba(255,244,214,${Math.max(0, a)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.29); ctx.fill();
      }
      for (const f of frames) {
        const pts = f.pts.map(([x, y]) => [x + (f.cx - x) * colE, y + (f.cy - y) * colE]);
        // constellation lines — drawn on around the frame, dissolving on collapse
        const lineA = (0.85 + Math.sin(t * 0.006) * 0.15) * (1 - colE) * fade;
        ctx.strokeStyle = `rgba(252,238,33,${Math.max(0, lineA)})`;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = "rgba(252,238,33,0.8)";
        ctx.shadowBlur = 6;
        const total = pts.length;
        const segs = drawP * total;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i <= total; i++) {
          const [ax, ay] = pts[i - 1];
          const [bx, by] = pts[i % total];
          const seg = i - 1;
          if (segs <= seg) break;
          const k = Math.min(1, segs - seg);
          ctx.lineTo(ax + (bx - ax) * k, ay + (by - ay) * k);
        }
        ctx.stroke();
        // the star points themselves
        pts.forEach(([x, y], i) => {
          if (drawP * total < i + 0.2) return;
          const tw = 0.7 + Math.sin(t * 0.007 + i * 1.7) * 0.3;
          const a = (0.35 + tw * 0.55) * (1 - colE * 0.75) * fade;
          ctx.strokeStyle = `rgba(255,240,190,${Math.max(0, a)})`;
          ctx.lineWidth = 1.1;
          const ray = 4.5 * tw;
          ctx.beginPath();
          ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
          ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
          ctx.stroke();
          ctx.fillStyle = `rgba(255,250,225,${Math.max(0, a)})`;
          ctx.beginPath(); ctx.arc(x, y, 1.7, 0, 6.29); ctx.fill();
        });
        ctx.shadowBlur = 0;
        // starlight pooling inside (only where faces will burn through)
        if (mine && drawP > 0.5) {
          const wa = (drawP - 0.5) * 2 * (1 - colE) * 0.12 * fade;
          const wg = ctx.createRadialGradient(f.cx, f.cy, 4, f.cx, f.cy, 88);
          wg.addColorStop(0, `rgba(252,238,33,${wa})`);
          wg.addColorStop(1, "rgba(252,238,33,0)");
          ctx.fillStyle = wg;
          ctx.fillRect(f.cx - 95, f.cy - 125, 190, 250);
        }
        // the collapse glint — the star that will fly off and dock
        if (colP > 0) {
          const gr = 5 + colP * 26;
          const ga = (mine ? 0.95 : 0.5) * fade;
          const gg = ctx.createRadialGradient(f.cx, f.cy, 1, f.cx, f.cy, gr);
          gg.addColorStop(0, `rgba(255,250,225,${ga})`);
          gg.addColorStop(0.4, `rgba(252,238,33,${ga * 0.6})`);
          gg.addColorStop(1, "rgba(252,238,33,0)");
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.arc(f.cx, f.cy, gr, 0, 6.29); ctx.fill();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <View style={[st.esWrap as any, { zIndex: 30 } as any]} pointerEvents="none">
      {/* the night falls over the table */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(3,3,14,0.82)" }, web && ({ animation: "dVdFadeIn 500ms ease-out both, dVdFadeOut 500ms 4100ms ease-in both" } as any)]} />
      <View style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -360, marginTop: -250 } as any}>
        <View ref={host as any} pointerEvents="none" style={{ width: W, height: H } as any} />
      </View>
      {/* the faces burn through — only when YOUR oracle did the peeking.
          The playCard box pins them to 114×152 so they center on the frame. */}
      {mine && cards.slice(0, n).map((c, i) => (
        <View
          key={c.id}
          style={[
            { position: "absolute", left: fcEs[i][0] - 57, top: fcEs[i][1] - 76 } as any,
            web && ({ animation: `dOcFace 700ms ${2100 + i * 240}ms cubic-bezier(.2,1,.3,1) both, dVdFadeOut 400ms 3250ms ease-in both`, filter: "drop-shadow(0 0 22px rgba(252,238,33,0.45))" } as any),
          ]}
        >
          <View style={st.playCard as any}>
            <CardFace card={c} />
          </View>
        </View>
      ))}

      {/* the collapse glints fly off and dock at their plate (fcEs already
          carries the +63.75 anchor shift) */}
      {fcEs.map(([x, y], i) => {
        const dx = dock[0] - x, dy = dock[1] - y;
        const path = `path('M 0 0 C ${dx * 0.3} ${dy / 2 - 110}, ${dx * 0.72} ${dy / 2 + 100}, ${dx} ${dy}')`;
        const popAt = 3000 + i * 200, flyAt = 3450 + i * 200;
        return (
          <View
            key={`glint-${i}`}
            style={[
              { position: "absolute", left: x, top: y, width: 46, height: 46, alignItems: "center", justifyContent: "center", offsetRotate: "0deg", offsetPath: path } as any,
              web && ({ animation: `dOcPop 320ms ${popAt}ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 950ms ${flyAt}ms cubic-bezier(.4,.1,.4,1) both` } as any),
            ]}
          >
            <Sparkle size={46} color={mine ? "#ffe98a" : "#ff9a9a"} />
          </View>
        );
      })}
      <View style={[st.esStamp as any, { position: "absolute", left: "50%", top: "72%", marginLeft: -80, width: 160, alignItems: "center" }, web && ({ animation: "dStampIn 340ms 2100ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
        <Text style={st.esStampTxt as any}>{mine ? "PEEKED" : "HAND SEEN"}</Text>
      </View>
    </View>
  );
}

/* WARD — the watcher: the trick charges while a golden eye SNAPS open right on
   top of the ward card and locks its slit-pupil gaze on the opposing card —
   the gaze sets it ALIGHT: canvas fire climbs it, the burnt part crumbles into
   falling ash, and the card collapses. The victim stays burned for the round;
   +5 goes to the award beat like every other score. */
function WardBlock({ victimTop }: { victimTop: boolean }) {
  const wardTop = !victimTop;          // which slot the ward card sits in
  const slotTop = victimTop ? "4%" : "38%"; // the victim card's top edge (esWrap %)
  const [fireOn, setFireOn] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setFireOn(true), 2400);
    const b = setTimeout(() => setFireOn(false), 6100); // let the die-out ramp play under the beat's fade
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
      {/* THE BURN — canvas particle fire; the card erodes bottom-up under it */}
      {fireOn && (
        <View style={{ position: "absolute", left: "50%", marginLeft: -75, top: victimTop ? -30 : 181, animation: web ? "dVdFadeIn 400ms both" : undefined } as any}>
          <FireCanvas />
        </View>
      )}
      {/* the ash settles + the verdict lands beside it */}
      <View style={[st.wdAsh as any, { left: "50%", marginLeft: -55, top: victimTop ? 165 : 376 }, web && ({ animation: "dWdAshIn 500ms 4700ms cubic-bezier(.2,1,.3,1) both" } as any)]} pointerEvents="none" />
      <View style={[st.esStamp as any, { position: "absolute", left: "50%", top: victimTop ? 190 : 402, marginLeft: -80, width: 160, alignItems: "center" }, web && ({ animation: "dStampIn 340ms 4900ms cubic-bezier(.2,1,.3,1) both" } as any)]}>
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
