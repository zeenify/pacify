/* DUEL — THE TABLE. P5-collage layout: student portrait looms across the top,
   a perspective card table takes the middle, your hand fans at the bottom edge.
   Mechanics unchanged: engine-dealt hands + stateful /ai-pick chain. */
import { IonPage, useIonViewWillEnter, useIonViewWillLeave } from "@ionic/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { NUMBERS, TRICKS, dealHands, resolveRound, TOTAL_ROUNDS, SCORE_THRESHOLD, cardById, type Card, type CardId } from "@pacify/engine";
import { DUEL_KEYFRAMES } from "./duel-keyframes";
import { api } from "../lib/api";
import { buildAiView, createAiRound, type AiRound, type AiPickResponse } from "../lib/ai-round";
import { router } from "../lib/nav";
import { playHover, playClick, play, playAt, scheduleTimeline, cancelTimeline, duckBgm } from "../lib/sfx";
import { GameOptions, loadOptions, saveOptions, applyOptions } from "../lib/options";
import { navigationInProgress } from "../lib/nav";
import { playVoice, stopVoice, voiceBusy, type VoiceHandle } from "../lib/voice";
import { useVoiceUnlock } from "../lib/useVoiceUnlock";
import { cuesForStep, shouldDuckBgm, DUCK_TO, DUCK_ATTACK_MS, DUCK_RELEASE_MS } from "../lib/duel-cues";
import { trickBeats } from "../lib/trick-beats";
import { restoreEncounter, challengePath, warmEncounter, type EncounterStart } from "../lib/encounter";
import { VICTOR_PORTRAITS, type VictorPose } from "../data/victor";
import { TOTAL_TRICKS, TRICK_DECOYS, TRICK_DEMO, TRICK_ORDER, trickLineFor, type TrickPhase } from "../data/tutorial-tricks";
import { playVictorClip, type VictorPlayHandle } from "../lib/victor-voice";
import { appendTutorialLog, loadTutorialLog, type TutorialLogEntry } from "../lib/tutorial-log";
import { P5Image } from "../components/P5Image";
import s from "./duel.module.css";
import v from "./tutorial-duel.module.css";
import tut from "./tutorial.module.css";
import tTrick from "./tutorial-tricks.module.css";

const web = true; // web-only app — the `web &&` branches from the Expo build are always on

type Phase = "commit" | "reveal" | "over";

/* The reveal is a choreographed step sequence so new players can watch the game
   teach itself: showdown hold → flip → power countdown → award → trick cinematics. */
export type SeqStep =
  | { kind: "showdown"; ms: number }
  | { kind: "flip"; ms: number }
  | { kind: "shieldbreak"; ms: number }
  | { kind: "clash"; ms: number; mode: "power" | "shield" | "tie"; you?: number; klein?: number; ticks?: number; align?: "good" | "bad" }
  | { kind: "award"; ms: number; p1After: number; p2After: number; p1Pts?: number; p2Pts?: number }
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
type TranscriptRow = { round: number; p1: CardId; p2: CardId; p1Score: number; p2Score: number; aiAttempt: number };
/* TABLE LOG — one row per revealed round: both played cards + the verified
   outcome. Rows exist only after doReveal, so the log can never spoil a pick. */
type PlayLogRow = {
  round: number;
  you: Card;
  klein: Card;
  youPts: number;
  kleinPts: number;
  youScore: number;
  kleinScore: number;
  note?: string;
};

const CATALOGUE: readonly Card[] = [...NUMBERS, ...TRICKS];
const cardLabel = (c: Card) =>
  c.kind === "trick" ? `${c.name} [trick]` : `${c.name} [${c.power}${c.align === "bad" ? " BAD" : " GOOD"}]`;
const TRICK_HINT: Record<string, string> = {
  Void: "VOID ROUND", Oracle: "PEEK 2", Reversal: "SWAP SCORES", Ward: "BLOCK +5",
  Echo: "VOID · NEXT ×2", Executioner: "BEHEAD 7+", Eclipse: "VOID · NO SHIELDS ×2",
};
const OPPONENTS: Record<number, { name: string; portrait: string; rank: string }> = {
  1: { name: "KLEIN", portrait: "/students-portrait/2clubs-portrait.png", rank: "2♣" },
  2: { name: "SATO", portrait: "/students-portrait/3-clubs-portrait.png", rank: "3♣" },
  3: { name: "NATHALIE", portrait: "/students-portrait/4-clubs-portrait.png", rank: "4♣" },
  // Jaxen — bust on the table, same treatment as Klein's duel portrait.
  4: { name: "JAXEN", portrait: "/students-portrait/5-clubs-portrait.png", rank: "5♣" },
  5: { name: "HAYDEN", portrait: "/students-portrait/6-clubs-portrait.png", rank: "6♣" },
  6: { name: "HYACINTH", portrait: "/students-portrait/7-clubs-portrait.png", rank: "7♣" },
  7: { name: "YANA", portrait: "/students-portrait/8-clubs-portrait.png", rank: "8♣" },
  8: { name: "TRISTAN", portrait: "/students-portrait/9-clubs-portrait.png", rank: "9♣" },
  9: { name: "NOIR", portrait: "/students-portrait/10-clubs-portrait.png", rank: "10♣" },
  10: { name: "ANTHONY", portrait: "/students-portrait/jack-clubs-portrait.png", rank: "J♣" },
  11: { name: "CECILIA", portrait: "/students-portrait/queen-clubs-portrait.png", rank: "Q♣" },
  12: { name: "REEVE", portrait: "/students-portrait/king-clubs-portrait.png", rank: "K♣" },
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
  { key: "wardexec", label: "WARD vs EXECUTIONER", you: "executioner", klein: "ward" },
  { key: "wardeclipse", label: "WARD vs ECLIPSE", you: "ward", klein: "eclipse" },
  { key: "wardecho", label: "WARD vs ECHO", you: "echo", klein: "ward" },
  { key: "voidexec", label: "VOID vs EXECUTIONER", you: "void", klein: "executioner" },
  { key: "reversal", label: "REVERSAL 9v2", you: "reversal", klein: "angel", youScore: 9, kleinScore: 2 },
  { key: "executioner", label: "EXECUTIONER", you: "executioner", klein: "valkyrie", youScore: 5, kleinScore: 6 },
  { key: "execrev", label: "EXEC vs REVERSAL", you: "executioner", klein: "reversal", youScore: 9, kleinScore: 4 },
  { key: "oracle", label: "ORACLE PEEK", you: "oracle", klein: "vampire" },
  { key: "oracleklein", label: "ORACLE · KLEIN'S", you: "vampire", klein: "oracle" },
  { key: "chiprack", label: "CHIP RACK", you: "witch", klein: "oracle", round: TOTAL_ROUNDS, shieldOff: 2 },
];

/* Corner-rack membership: claims the chip's slot while any form of it is on
   screen, releases it when all forms are gone. The rack array order IS the
   slot order — first chip in takes slot 0, everyone else follows. */
function useCornerChip(id: string, present: boolean, claim: (id: string) => void, release: (id: string) => void) {
  useEffect(() => {
    if (present) claim(id); else release(id);
  }, [present, id, claim, release]);
}

/* Corner-rack slot pitch — one 72px chip frame + room for its 92px tag. */
const RACK_PITCH = 104;

/* The echo/eclipse chip lob — a true offset-path curve from the played card's
   felt slot to its corner-rack slot. The slot-0 endpoints are the calibrated
   originals; each further slot shifts the landing one RACK_PITCH right, so
   the lob lands naturally on ANY rack slot, not just the first two. */
const lobPath = (fromBottom: boolean, slotIdx: number) => {
  const mx = -400 + slotIdx * (RACK_PITCH - 8);
  const ex = -456 + slotIdx * RACK_PITCH;
  return fromBottom
    ? `path("M 0 0 C -80 -260, ${mx} -240, ${ex} -196")`
    : `path("M 0 0 C -80 -55, ${mx} -48, ${ex} 15")`;
};

/* R7's ×2 arrival — from the ROUND MARKER (center ≈ 116, 240 zone px) up and
   over into its corner-rack slot center (308 + RACK_PITCH·idx, 79.5), diving in from
   above-right so the landing reads as the chip taking its seat. */
const r7ArrivalPath = (slotIdx: number) => {
  const dx = 192 + slotIdx * RACK_PITCH;
  return `path("M 0 0 C 70 -30, ${Math.round(dx * 0.55)} -195, ${dx} -160")`;
};

/* window size (replaces RN useWindowDimensions). The poll covers embedded
   webviews that boot at 0x0 and suspend rAF/resize while hidden — without it
   the stage scale latches at 0 and the whole duel collapses. */
function useWindowDimensions() {
  const [d, setD] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const on = () => setD({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", on);
    const iv = setInterval(() => {
      setD((prev) => (prev.width === window.innerWidth && prev.height === window.innerHeight ? prev : { width: window.innerWidth, height: window.innerHeight }));
    }, 250);
    return () => { clearInterval(iv); window.removeEventListener("resize", on); };
  }, []);
  return d;
}

/* Dialog focus containment — focus the first control on open, trap Tab inside,
   Escape closes (the caller decides what "close" means per dialog state), and
   restore focus to the invoking control on unmount. */
function useDialogFocus(active: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active || !dialogRef.current) return;
    const root = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const selector = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(selector));
    focusables()[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [active]);

  return dialogRef;
}

/* Fixed design canvas — the whole stage scales to fit the window. */
const DESIGN_W = 1600;
const DESIGN_H = 900;
/* Klein's line lingers this long after it lands (a new message resets the timer). */
const MSG_MS = 8000;
/** Minimum visible opponent-response beat before a reveal (Klein's pick often
    lands while the player is still choosing — the turn must never skip it). */
const KLEIN_RESPONSE_MS = 700;
/* Trapezoid table — wide near the viewer, narrow at the far edge. */
const TABLE_CLIP = "polygon(13% 0%, 87% 0%, 100% 100%, 0% 100%)";
/* jagged lightning tail — points back at the speaker */
const TAIL_CLIP = "polygon(100% 0%, 100% 100%, 0% 90%, 26% 64%, 8% 44%, 30% 20%)";
/* P5 speech-bubble silhouette — a seeded jagged polygon walked around the rect,
   each edge kicked inward by 0–4% with the occasional deeper bite. One shape,
   used by both the black keyline layer and the white face (scaled per layer),
   so the keyline hugs every spike. */
const JAGGED_CLIP = (() => {
  const rnd = (i: number) => {
    let x = (i * 668265263 + 987654321) | 0;
    x = (x ^ (x >>> 13)) * 1274126177;
    return (((x ^ (x >>> 16)) >>> 0) % 1000) / 1000;
  };
  const kick = (i: number) => (rnd(i) * 3 + (rnd(i + 40) > 0.75 ? 3.2 : 0)).toFixed(1);
  const per = 7; // points per edge
  const pts: string[] = [];
  for (let i = 0; i < per; i++) pts.push(`${((i / per) * 100).toFixed(1)}% ${kick(i)}%`);            // top →
  for (let i = 0; i < per; i++) pts.push(`${(100 - parseFloat(kick(i + 7)))}% ${((i / per) * 100).toFixed(1)}%`);   // right ↓
  for (let i = 0; i < per; i++) pts.push(`${(100 - (i / per) * 100).toFixed(1)}% ${(100 - parseFloat(kick(i + 13))).toFixed(1)}%`); // bottom ←
  for (let i = 0; i < per; i++) pts.push(`${kick(i + 19)}% ${(100 - (i / per) * 100).toFixed(1)}%`); // left ↑
  return `polygon(${pts.join(", ")})`;
})();

export default function Duel() {
  const [sp] = useSearchParams();
  const studentParam = sp.get("student") ?? undefined;
  const demoParamStr = sp.get("demo") ?? undefined;
  const demoMode = !!demoParamStr;
  const tricksMode = sp.get("tutorial") === "tricks";
  const encounterParam = sp.get("encounter") ?? undefined;
  const studentId = Number(studentParam) || 1;
  // The opponent's seat: the query param for direct duels, otherwise the seat the
  // server stamped on the encounter (the story → duel flow carries no ?student).
  const [oppSeat, setOppSeat] = useState(studentId);
  const oppSeatRef = useRef(studentId);
  const opp = tricksMode ? { name: "DEMO", portrait: "", rank: "" } : OPPONENTS[oppSeat] ?? OPPONENTS[1];

  // The duel is designed on a fixed 1600x900 stage and scaled to fit the window,
  // so proportions hold on every screen instead of breaking on smaller ones.
  const { width: winW, height: winH } = useWindowDimensions();
  /* landscape-phone mode: on a short viewport the 900-tall plane would be
     height-limited to ~0.43x (tiny cards, dead side bars). The plane shrinks
     to 1600x740 — the opponent zone compacts, %-anchored zones reflow on
     their own — so the scale stays width-limited (~0.53x) and every px-sized
     card/font renders ~22% bigger. */
  const phone = !tricksMode && winH < 620 && winW < 1100;
  const designH = phone ? 740 : DESIGN_H;
  const stageScale = Math.min(winW / DESIGN_W, winH / designH);

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
  /* ward's victim stays BURNED — pinned hidden from the END of the ward beat
     until the round resets (the animation's fill can't outlive its step) */
  const [wardBurned, setWardBurned] = useState<null | "p1" | "p2">(null);
  /* void's DEVOUR — after the beat, the VICTIM stays gone but the void card
     returns to the felt as the only card left until the round resets */
  const [voidGone, setVoidGone] = useState<null | "p1" | "p2">(null);
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
  /* Mirror of the voice chain (speaking or parked) — dots never cover a line
     that is still talking; the bubble holds until the chain drains. */
  const [voiceLive, setVoiceLive] = useState(false);
  /* TABLE LOG — played cards per round (display state; the verified chain lives in the ref) */
  const [playLog, setPlayLog] = useState<PlayLogRow[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [logClosing, setLogClosing] = useState(false);
  /* PAUSE — the corner button opens the system modal: bus volumes (same
     storage as OPTIONS), fullscreen, forfeit (with confirm), continue */
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseClosing, setPauseClosing] = useState(false);
  const [forfeitConfirm, setForfeitConfirm] = useState(false);
  const pauseCloseTimer = useRef<number | null>(null);
  const [opts, setOpts] = useState<GameOptions>(() => loadOptions());
  const updateOpts = (patch: Partial<GameOptions>) =>
    setOpts((prev) => {
      const next = { ...prev, ...patch };
      saveOptions(next);
      applyOptions(next);
      return next;
    });
  const [fsOn, setFsOn] = useState(!!(document as any).fullscreenElement);

  /* ---------- GIMMICK CRASH COURSE (tricksMode) ---------- */
  const [trickIndex, setTrickIndex] = useState(0);
  const [trickPhase, setTrickPhase] = useState<TrickPhase>("setup");
  const [trickChars, setTrickChars] = useState(0);
  const [trickTargetId, setTrickTargetId] = useState<CardId | null>(null);
  const [trickHistory, setTrickHistory] = useState<TutorialLogEntry[]>(() => (tricksMode ? loadTutorialLog() : []));
  const [trickLogOpen, setTrickLogOpen] = useState(false);
  const trickVoiceRef = useRef<VictorPlayHandle | null>(null);
  const tutorialSettledRef = useRef<() => void>(() => {});
  const trickExitingRef = useRef(false);
  const trickLine = tricksMode ? trickLineFor(trickIndex, trickPhase) : null;
  const trickFull = trickLine?.text ?? "";
  const trickDone = trickChars >= trickFull.length;
  const trickPose: VictorPose = trickLine?.pose ?? "composed";
  const toggleFs = async () => {
    try {
      if ((document as any).fullscreenElement) await (document as any).exitFullscreen();
      else await (document.documentElement as any).requestFullscreen();
    } catch {}
  };
  useEffect(() => {
    const sync = () => setFsOn(!!(document as any).fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const openPause = () => {
    if (pauseCloseTimer.current !== null) window.clearTimeout(pauseCloseTimer.current);
    pauseCloseTimer.current = null;
    playClick();
    setForfeitConfirm(false);
    setPauseClosing(false);
    setPauseOpen(true);
  };
  const closePause = () => {
    if (pauseClosing) return;
    playClick();
    setForfeitConfirm(false);
    setPauseClosing(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!document.querySelector(".p5-reduce");
    pauseCloseTimer.current = window.setTimeout(() => {
      setPauseOpen(false);
      setPauseClosing(false);
      pauseCloseTimer.current = null;
    }, reduced ? 0 : 300);
  };
  const doForfeit = () => {
    if (pauseCloseTimer.current !== null) window.clearTimeout(pauseCloseTimer.current);
    pauseCloseTimer.current = null;
    playAt("duel.defeat", 120);
    stopVoice();
    duckBgm(1, 200);
    setPauseOpen(false);
    router.replace("/campaign");
  };
  useEffect(() => () => {
    if (pauseCloseTimer.current !== null) window.clearTimeout(pauseCloseTimer.current);
  }, []);
  useEffect(() => {
    if (pauseOpen) duckBgm(0.25, 250);
    else duckBgm(1, 250);
  }, [pauseOpen]);
  const cancelForfeit = () => {
    setForfeitConfirm(false);
    requestAnimationFrame(() => pauseDialogRef.current?.querySelector<HTMLElement>("button")?.focus());
  };
  const pauseDialogRef = useDialogFocus(pauseOpen && !pauseClosing, forfeitConfirm ? cancelForfeit : closePause);
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

  const chain = useRef<{ interactionId: string | null; results: RoundResultRow[]; resultsSent: number; transcript: TranscriptRow[]; seed: number; rngState: number; shieldOff: number; echoNext: boolean; p2Hand: Card[] }>({
    interactionId: null, results: [], resultsSent: 0, transcript: [], seed: 0, rngState: 0, shieldOff: 0, echoNext: false, p2Hand: [],
  });
  const duelId = useRef("");
  const encounter = useRef<{ id: string; transcript: EncounterStart["transcript"] } | null>(null);
  const aiRound = useRef<AiRound | null>(null);
  const aiAttempt = useRef(0);
  const revealedRound = useRef<number | null>(null);
  const p2Lock = useRef<Card | null>(null);
  const p1Lock = useRef<Card | null>(null); // Klein's pick may land after ours — refs survive the async gap
  /* TABLE LOG — the row built at reveal time, dropped into the log only when
     the round's sequence ENDS (the pile grows on the award, not on the pick) */
  const pendingLogRef = useRef<PlayLogRow | null>(null);
  /* deferred reveal-side state (echo/shield) — applied when the sequence ends */
  const postRevealRef = useRef<{ echoNext: boolean; shieldOff: number }>({ echoNext: false, shieldOff: 0 });
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalResultRef = useRef<"win" | "loss" | "draw" | null>(null);
  const alive = useRef(true);
  /** The visible beat between our lock and the reveal when Klein's pick already
      arrived in the background — the turn must read as a real opponent response. */
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* the sequence-end auto-advance reads the latest round handler through a ref */
  const onNextRoundRef = useRef<() => void>(() => {});
  /* Speech rides the exact bubble text. The message object is the playback
     identity: when the text is actually on screen (not dots) and unspoken, it
     starts; whenever dots/hide/navigation replace it, it stops. */
  const [viewActive, setViewActive] = useState(true);
  const [navReady, setNavReady] = useState(!navigationInProgress());
  // session restore can reach the duel with no login gesture — unlock + retry on first input
  const voiceUnlockTick = useVoiceUnlock();
  const voiceHandle = useRef<VoiceHandle | null>(null);
  const lastMsg = useRef<{ text: string; ticket?: string } | null>(null);
  const spokenMsg = useRef<{ text: string; ticket?: string } | null>(null);
  const voiceSignaledTick = useRef(0);

  const cancelSpeech = useCallback(() => {
    voiceHandle.current = null;
    stopVoice(); // flush the speaking line AND anything parked behind it
  }, []);

  /* TABLE LOG open/close — the close beat plays before unmount (150ms exit). */
  const openLog = useCallback(() => { playClick(); setLogOpen(true); setLogClosing(false); }, []);
  const closeLog = useCallback(() => {
    setLogClosing(true);
    setTimeout(() => { setLogOpen(false); setLogClosing(false); }, 150);
  }, []);

  const setMessage = useCallback((text: string, ticket?: string) => {
    // NO cancel here — the outgoing line finishes speaking and the new one
    // queues behind it (conversation mode); nothing is ever cut mid-word.
    lastMsg.current = { text, ticket };
    setKleinMsg(text);
    setMsgVisible(true);
    // No hide deadline yet: while the line speaks, the bubble is held (bounded
    // by the player's own watchdogs); text-only lines hide after MSG_MS below.
    if (msgTimer.current) clearTimeout(msgTimer.current);
    if (!ticket) msgTimer.current = setTimeout(() => { if (alive.current) setMsgVisible(false); }, MSG_MS);
  }, []);

  /* The bubble's hide timer starts only when its own speech ends, and only if
     the message is still the one on screen — the speak/stop effect lives next
     to `showThinking`, because dots covering the text must stop the voice. */

  useIonViewWillEnter(() => { setViewActive(true); setNavReady(!navigationInProgress()); }, []);
  useIonViewWillLeave(() => {
    setViewActive(false); setNavReady(false);
    cancelSpeech();
    trickVoiceRef.current?.cancel();
    trickVoiceRef.current = null;
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMsgVisible(false);
  }, [cancelSpeech]);

  useEffect(() => {
    const leaving = () => {
      setNavReady(false);
      cancelSpeech();
      trickVoiceRef.current?.cancel();
      trickVoiceRef.current = null;
    };
    const settled = () => setNavReady(true);
    window.addEventListener("pacify:nav-start", leaving);
    window.addEventListener("pacify:nav-settled", settled);
    return () => {
      alive.current = false;
      cancelSpeech();
      stopVoice();
      trickVoiceRef.current?.cancel();
      trickVoiceRef.current = null;
      window.removeEventListener("pacify:nav-start", leaving);
      window.removeEventListener("pacify:nav-settled", settled);
    };
  }, [cancelSpeech]);

  /* GIMMICK COURSE — one spoken line at a time (setup, explanation, wrap). */
  useEffect(() => {
    if (!tricksMode || !trickLine || !navReady || trickLogOpen) { setTrickChars(0); return; }
    setTrickChars(0);
    play("duel.bubble");
    setTrickHistory(appendTutorialLog({ id: trickLine.id, speaker: "VICTOR", text: trickLine.text }));
    let aliveLine = true;
    const voice = playVictorClip(trickLine.audio, {
      onPlaying: () => { if (aliveLine) setTrickChars(trickLine.text.length); },
    });
    trickVoiceRef.current = voice;
    const iv = setInterval(() => setTrickChars((c) => Math.min(c + 1, trickLine.text.length)), 26);
    return () => {
      aliveLine = false;
      clearInterval(iv);
      voice.cancel();
      if (trickVoiceRef.current === voice) trickVoiceRef.current = null;
    };
  }, [tricksMode, trickLine, navReady, trickLogOpen]);


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
     there they FUSE into the crimson ×3 the moment it lands. It WAITS for the
     round wipe to clear so the flight is never covered (Klein still picks
     underneath — the wipe is cosmetic). */
  const [r7Arrival, setR7Arrival] = useState<null | "waiting" | "flying" | "landed">(null);
  /* ROUND WIPE — the next-round number while the crimson sweep crosses; null
     when no transition is playing */
  const [roundAdv, setRoundAdv] = useState<number | null>(null);

  /* the painted felt overlay — /table.png swaps in when it loads */
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setTableArt(true);
    img.onerror = () => setTableArt(false);
    img.src = "/table.png";
  }, []);

  /* Match-open intro — the DUEL START slam lands with dIntroT, the panel wipes
     at 1150ms (dIntroPanel's delay). Fires in demo mode too: the splash does. */
  useEffect(() => {
    play("duel.intro.slam");
    playAt("duel.intro.panel", 1150);
  }, []);

  const deal = useCallback(() => {
    aiRound.current?.cancel();
    duelId.current = crypto.randomUUID();
    revealedRound.current = null;
    p2Lock.current = null;
    aiAttempt.current = 0;
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
    const [{ p1Hand, p2Hand }, rngState] = dealHands(CATALOGUE, seed);
    chain.current = { interactionId: null, results: [], resultsSent: 0, transcript: [], seed, rngState, shieldOff: 0, echoNext: false, p2Hand: [...p2Hand] };
    p1Lock.current = null;
    setP1Hand(p1Hand); setP2Count(p2Hand.length);
    setP1Score(0); setP2Score(0);
    setRound(1); setP1Locked(null); setP2Locked(null);
    setEchoNext(false); setShieldOff(0); setChipStandby(false); setShieldStandby(false);
    setEchoChipDying(false); setShieldChipDying(false); setMultSpent(false);
    setCornerRack([]); setR7Arrival(null); setRoundAdv(null); // fresh match — empty rack, no wipe
    setPlayLog([]); setLogOpen(false); setLogClosing(false);  // fresh table log too
    setOppPeeked([]); setKleinMsg("");
    setKleinPeekCount(0); setOracleBeatDone(true);
    setError(null); setFinalResult(null); setSaved(false);
    finalResultRef.current = null;
    setSeqSteps([]); setSeqIdx(0); setStatusInfo(null); setClashTick(0);
    // 7-card deal sweep — same 55ms stagger as the dHandIn cascade
    for (let i = 0; i < 7; i++) playAt("duel.deal", 55 * i, { pitch: 0.95 + i * 0.02 });
    return { p1Hand, p2Hand };
  }, []);

  const doRevealRef = useRef<(you: Card, klein: Card, ctx: { round: number; echoNext: boolean; shieldOff: number; youScore: number; kleinScore: number }) => void>(() => {});

  const startRound = useCallback((roundNo: number, kleinHand: Card[], youHand: Card[], kleinScore: number, youScore: number, oppPeekedCards: Card[], shieldOffNow: number, echoNow: boolean) => {
    aiRound.current?.cancel();
    p2Lock.current = null;
    aiAttempt.current = 0;
    setPhase("commit");
    setError(null);
    setKleinThinking(true);
    play("duel.thinking");
    // Speech-owned bubble: a line still speaking (or parked) holds the bubble
    // across the redeal — its own onEnd hides it after the linger. Only a
    // silent table clears it here.
    if (!voiceBusy()) {
      setMsgVisible(false);
      if (msgTimer.current) clearTimeout(msgTimer.current);
    }
    setWardBurned(null);
    setVoidGone(null);

    const currentChain = chain.current;
    const currentDuelId = duelId.current;
    const resultCount = currentChain.results.length;
    const view = buildAiView({
      myHand: kleinHand, oppHand: youHand, oppPeeked: oppPeekedCards,
      shieldOff: shieldOffNow, myScore: kleinScore, oppScore: youScore, round: roundNo, echoNext: echoNow,
      rngState: currentChain.rngState, studentId: oppSeatRef.current + 1, phase: "commit",
    }, currentChain.transcript);
    const pending = createAiRound({
      request: (attempt, p1Locked, signal) => {
        setKleinThinking(true);
        if (encounter.current) {
          return api<AiPickResponse>("/ai-pick", {
            encounterId: encounter.current.id, attempt, p1Locked, transcript: encounter.current.transcript,
          }, signal);
        }
        return api<AiPickResponse>("/ai-pick", {
          duelId: currentDuelId, seed: currentChain.seed, view, characterId: oppSeatRef.current + 1, attempt, p1Locked,
          interactionId: currentChain.interactionId ?? undefined,
          roundResults: currentChain.results.slice(currentChain.resultsSent, resultCount),
        }, signal);
      },
      onBeat: (data) => {
        setKleinThinking(false);
        aiAttempt.current = data.attempt;
        if (data.interactionId && data.interactionId !== currentChain.interactionId) {
          currentChain.resultsSent = resultCount;
        }
        currentChain.interactionId = data.interactionId;
        if (data.message) {
          play("duel.bubble");
          setMessage(data.message, data.voiceTicket);
        }
      },
      onCommit: (data) => {
        p2Lock.current = data.picked;
        setP2Locked(data.picked);
        setP2Count((n) => n - 1);
        currentChain.p2Hand = currentChain.p2Hand.filter((c) => c.id !== data.picked.id);
        setKleinThinking(false);
        if (p1Lock.current) {
          doRevealRef.current(p1Lock.current, data.picked, {
            round: roundNo, echoNext: echoNow, shieldOff: shieldOffNow,
            youScore, kleinScore,
          });
        }
      },
      onError: (error) => {
        setKleinThinking(false);
        setError(error.message);
      },
    });
    aiRound.current = pending;
    void pending.start();
  }, []);

  /** Resolves the round once BOTH cards exist. Pure arg-driven — safe to call
   *  from either the player's pick or Klein's late return. Instead of applying
   *  the result instantly it builds the TEACHING SEQUENCE: showdown → flip →
   *  power countdown → award → per-trick cinematics. Scores land on screen at
   *  the step where they happen (award, then reversal/executioner patches). */
  const doReveal = (you: Card, klein: Card, ctx: { round: number; echoNext: boolean; shieldOff: number; youScore: number; kleinScore: number }) => {
    if (!demoMode && !tricksMode && revealedRound.current === ctx.round) return;
    revealedRound.current = ctx.round;
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
    const logNote = [out.voided && "VOID", out.wardBlocked && "WARD", out.reversalSwapped && "SWAP!",
      out.scoreWiped && "EXECUTED", out.echoNext && "NEXT ×2", out.eclipseFired && "ECLIPSE"].filter(Boolean).join(", ") || undefined;
    chain.current.results.push({
      round: ctx.round, klein: cardLabel(klein), you: cardLabel(you),
      kleinPts: out.p2Points, youPts: out.p1Points,
      kleinScore: out.p2Score, youScore: out.p1Score,
      note: logNote,
    });
    chain.current.transcript.push({ round: ctx.round, p1: you.id, p2: klein.id, p1Score: out.p1Score, p2Score: out.p2Score, aiAttempt: aiAttempt.current });
    if (encounter.current) encounter.current.transcript = [...encounter.current.transcript, { round: ctx.round, p1: you.id, p2: klein.id }];
    pendingLogRef.current = { round: ctx.round, you, klein, youPts: out.p1Points, kleinPts: out.p2Points, youScore: out.p1Score, kleinScore: out.p2Score, note: logNote };
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
    const beats = trickBeats(out);

    if (beats.void) {
      // VOID — the void card mutates into a maw ON the felt and devours the other
      // card. Cards stay VISIBLE through the whole beat; the victim-only sticky
      // arms when the beat ends (set in the sequence driver).
      steps.push({ kind: "trick", ms: 4800, trick: "void", youCard: you, kleinCard: klein });
    } else {
      if (beats.eclipse) {
        steps.push({ kind: "trick", ms: 4000, trick: "eclipse", youCard: you, kleinCard: klein });
      }
      if (beats.echo) {
        steps.push({ kind: "trick", ms: 4000, trick: "echo", youCard: you, kleinCard: klein });
      }
      if (beats.ward) {
        steps.push({ kind: "trick", ms: 6200, trick: "ward", youCard: you, kleinCard: klein });
        // the victim's burn is pinned when the ward step ENDS (driver) — not before,
        // so the cards stay visible through showdown/flip/beat
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
    if (beats.execFail) {
      steps.push({
        kind: "trick", ms: 3700, trick: "execfail",
        wipedSide: beats.execFail,
        targetCard: beats.execFail === "p1" ? klein : you,
      });
    }
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
    if (done && !demoMode && !tricksMode) {
      const result = out.p1Score > out.p2Score ? "win" : out.p2Score > out.p1Score ? "loss" : "draw";
      setFinalResult(result);
      finalResultRef.current = result;
    }
    if (!demoMode && !tricksMode) {
      if (encounter.current) {
        const path = done ? `/campaign/encounters/${encounter.current.id}/result` : `/campaign/encounters/${encounter.current.id}/round`;
        api<any>(path, { transcript: encounter.current.transcript })
          .then((d) => {
            if (!done) return;
            setSaved(!!d?.ok);
            // PREWARM — the server generates the epilogue + episodic memory on
            // completion; stage the next encounter id so REMATCH loads instantly.
            const nextId = crypto.randomUUID();
            api<any>("/campaign/encounters", { id: nextId, studentId: oppSeatRef.current })
              .then(() => { warmEncounter(nextId, oppSeatRef.current); }).catch(() => {});
          })
          .catch(() => { if (done) setSaved(false); });
        // KLEIN REACTS — one voice line about what just resolved, generated from
        // the server-verified round and shown if the reveal is still on screen.
        api<any>(`/campaign/encounters/${encounter.current.id}/reactions`, { transcript: encounter.current.transcript })
          .then((d) => {
            if (!alive.current || !d?.message || revealedRound.current !== ctx.round) return;
            setMessage(String(d.message), d.voiceTicket);
          })
          .catch(() => {});
      } else if (done) {
        api<any>("/campaign/result", {
          studentId, seed: chain.current.seed, p1Score: out.p1Score, p2Score: out.p2Score,
          rounds: ctx.round, transcript: chain.current.transcript,
        }).then((d) => setSaved(!!d?.ok)).catch(() => setSaved(false));
      }
    }
  };
  doRevealRef.current = doReveal;

  /* ---------- ANIM LAB runner: sets the table for a scenario and fires the real
     doReveal. No server, no AI, no hand — pure reveal choreography. ---------- */
  const demoKeyRef = useRef<string>(DEMO_SCENARIOS[0].key);
  const runDemo = (key: string) => {
    const sc = DEMO_SCENARIOS.find((x) => x.key === key) ?? DEMO_SCENARIOS[0];
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
    setVoidGone(null);
    setP1Hand([]); setP2Count(0); setError(null);
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    setP1Score(ctx.youScore); setP2Score(ctx.kleinScore);
    setRound(ctx.round); setEchoNext(ctx.echoNext); setShieldOff(ctx.shieldOff);
    setChipStandby(ctx.echoNext);
    setShieldStandby(ctx.shieldOff > 0);
    setPlayLog([]); // each lab scenario starts from a clean table
    setMultSpent(false);
    // demo R7 scenarios get the same climax-chip arrival as the real game —
    // also sequenced after the wipe (the playlist plays one between scenarios)
    if (ctx.round === TOTAL_ROUNDS) {
      setR7Arrival("waiting");
      setTimeout(() => {
        if (!alive.current) return;
        setR7Arrival("flying");
        setTimeout(() => { if (alive.current) setR7Arrival("landed"); }, 1500);
      }, 1950);
    } else {
      setR7Arrival(null);
    }
    setP1Locked(you); setP2Locked(klein); p1Lock.current = you;
    setPhase("commit");
    doReveal(you, klein, ctx);
  };

  /* ---------- GIMMICK COURSE setup / advance ---------- */
  const startTutorialTrick = useCallback((i: number) => {
    const trick = cardById(TRICK_ORDER[i]);
    trickExitingRef.current = false;
    aiRound.current?.cancel();
    if (revealTimer.current) { clearTimeout(revealTimer.current); revealTimer.current = null; }
    duelId.current = crypto.randomUUID();
    revealedRound.current = null;
    p2Lock.current = null;
    p1Lock.current = null;
    aiAttempt.current = 0;
    chain.current = {
      interactionId: null, results: [], resultsSent: 0, transcript: [], seed: 0, rngState: 0,
      shieldOff: 0, echoNext: false,
      p2Hand: TRICK_ORDER.slice(i).map((id) => cardById(TRICK_DEMO[id])),
    };
    postRevealRef.current = { echoNext: false, shieldOff: 0 };
    setP1Hand([...TRICK_DECOYS, trick]);
    setP2Count(TOTAL_TRICKS - i);
    setP1Score(0); setP2Score(0);
    setRound(1); setP1Locked(null); setP2Locked(null);
    setEchoNext(false); setShieldOff(0); setChipStandby(false); setShieldStandby(false);
    setEchoChipDying(false); setShieldChipDying(false); setMultSpent(false);
    setCornerRack([]); setR7Arrival(null); setRoundAdv(null);
    setPlayLog([]); setLogOpen(false); setLogClosing(false);
    setOppPeeked([]); setKleinMsg(""); setKleinPeekCount(0); setOracleBeatDone(true);
    setError(null); setFinalResult(null); setSaved(false);
    finalResultRef.current = null;
    setSeqSteps([]); setSeqIdx(0); setStatusInfo(null); setClashTick(0);
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    setWardBurned(null); setVoidGone(null);
    setKleinThinking(false); setMsgVisible(false);
    setPhase("commit");
    setTrickIndex(i);
    setTrickPhase("setup");
    setTrickChars(0);
    setTrickTargetId(trick.id);
    setTrickLogOpen(false);
    trickVoiceRef.current?.cancel();
    trickVoiceRef.current = null;
  }, []);
  tutorialSettledRef.current = () => { setTrickPhase("explain"); setTrickChars(0); };

  const tutorialAdvance = useCallback(() => {
    if (!tricksMode || trickLogOpen || trickExitingRef.current) return;
    if (trickPhase === "reveal") return;
    if (!trickDone) { setTrickChars(trickFull.length); return; }
    if (trickPhase === "setup") return; // the highlighted gimmick is the only way forward
    playClick();
    if (trickPhase === "explain") {
      if (trickIndex < TOTAL_TRICKS - 1) {
        startTutorialTrick(trickIndex + 1);
      } else {
        // course over — Victor's final briefing waits on the live seat board
        trickExitingRef.current = true;
        trickVoiceRef.current?.cancel();
        trickVoiceRef.current = null;
        router.push("/campaign?tutorial=briefing", { word: "THE THIRTEEN" });
      }
    }
  }, [tricksMode, trickLogOpen, trickPhase, trickDone, trickFull.length, trickIndex, startTutorialTrick]);

  const openTrickLog = useCallback(() => {
    if (!tricksMode || trickLogOpen) return;
    playClick();
    trickVoiceRef.current?.cancel();
    trickVoiceRef.current = null;
    setTrickLogOpen(true);
  }, [tricksMode, trickLogOpen]);

  useEffect(() => {
    if (!tricksMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (trickLogOpen) {
        if (e.code === "Escape") { e.preventDefault(); setTrickLogOpen(false); }
        return;
      }
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); tutorialAdvance(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tricksMode, trickLogOpen, tutorialAdvance]);

  /* ANIM LAB loop — when a run settles, replay it (or advance the playlist). */
  useEffect(() => {
    if (!demoMode || phase !== "reveal") return;
    const settled = seqSteps.length > 0 && seqIdx >= seqSteps.length;
    if (!settled) return;
    const t = setTimeout(() => {
      if (!alive.current) return;
      if (demoParamStr === "all") {
        const i = DEMO_SCENARIOS.findIndex((x) => x.key === demoKeyRef.current);
        const nxt = DEMO_SCENARIOS[(i + 1) % DEMO_SCENARIOS.length];
        // the wipe plays between scenarios so the lab loop reads like a match
        const nextRoundNo = Math.min(TOTAL_ROUNDS, nxt.round ?? 3);
        if (nxt.key !== demoKeyRef.current) {
          setRoundAdv(nextRoundNo);
          setTimeout(() => { if (alive.current) setRoundAdv(null); }, 2300);
        }
        runDemo(nxt.key);
      } else {
        runDemo(demoKeyRef.current);
      }
    }, 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, phase, seqIdx, seqSteps]);

  /* Trick cinematics duck the music. Restore on unmount only — putting this in the
     driver's cleanup would unduck between two consecutive trick steps and pump the bus. */
  useEffect(() => () => { duckBgm(1, 400); }, []);

  /* Sequence driver — advances through the steps; score state lands on the felt
     at the exact step where the story puts it. */
  useEffect(() => {
    const step = seqSteps[seqIdx];
    if (!step) return;
    // The whole beat's cue timeline, scheduled on the AudioContext clock in one call:
    // drift-free, and immune to the setTimeout throttling that would desync a background tab.
    const audio = scheduleTimeline(cuesForStep(step));
    if (shouldDuckBgm(step)) duckBgm(DUCK_TO, DUCK_ATTACK_MS);
    else duckBgm(1, DUCK_RELEASE_MS);
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
      // the void beat just finished — the victim stays devoured; the void card
      // itself returns to the felt (its mutate animation is step-gated)
      if (step.kind === "trick" && step.trick === "void") {
        setVoidGone(step.youCard?.name === "Void" ? "p2" : "p1");
      }
      // same for ward — the victim's burn is pinned from the beat's end, not before
      if (step.kind === "trick" && step.trick === "ward") {
        setWardBurned(step.youCard?.name === "Ward" ? "p2" : "p1");
      }
      if (seqIdx + 1 >= seqSteps.length) {
        // sequence over — the echo/shield state the round produced lands NOW
        // (the chip showed the active multiplier through the whole reveal)
        setEchoNext(postRevealRef.current.echoNext);
        setChipStandby(postRevealRef.current.echoNext);
        setShieldStandby(postRevealRef.current.shieldOff > 0);
        setShieldOff(postRevealRef.current.shieldOff);
        // TABLE LOG — the round ended: the staged row lands in the log NOW
        if (pendingLogRef.current) {
          const logRow = pendingLogRef.current;
          pendingLogRef.current = null;
          setPlayLog((prev) => (prev.some((x) => x.round === logRow.round) ? prev : [...prev, logRow]));
        }
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
          setTimeout(() => {
            if (!alive.current) return;
            play("round.panelIn");
            playAt(finalResultRef.current === "win" ? "duel.victory" : finalResultRef.current === "loss" ? "duel.defeat" : "duel.draw", 380);
            setPhase("over");
          }, 1200);
        } else if (tricksMode) {
          // the cinematic has finished — hand the table back to the coach
          setTimeout(() => { if (alive.current) tutorialSettledRef.current(); }, 900);
        } else if (!demoMode) {
          // NO NEXT-ROUND BUTTON — the table clears itself: the fresh round
          // opens on its own once the last beat has had a beat to breathe
          setTimeout(() => { if (alive.current) onNextRoundRef.current(); }, 2000);
        }
      }
      setSeqIdx((i) => i + 1);
    }, step.ms);
    return () => {
      clearTimeout(timer);
      if (interval) clearInterval(interval);
      // stop not-yet-sounded voices too — stop() at or before a source's start time means it
      // never plays, which is what makes the ANIM LAB's rapid scenario switching clean.
      cancelTimeline(audio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seqIdx, seqSteps]);

  const beginEncounter = useCallback(async (id: string) => {
    let data: EncounterStart;
    try {
      data = await api<EncounterStart>(`/campaign/encounters/${id}/start`, { readCount: 0 });
    } catch (e: any) {
      if (!alive.current) return;
      const msg = String(e?.message ?? "");
      if (msg.includes("NOT LOGGED IN")) router.replace("/login");
      else router.replace("/campaign");
      return;
    }
    if (!alive.current) return;
    let restored: ReturnType<typeof restoreEncounter>;
    try {
      restored = restoreEncounter(data.seed, data.transcript);
    } catch {
      router.replace("/campaign");
      return;
    }
    const { state, results, rounds, playerPeeked, kleinPeekCount } = restored;
    encounter.current = { id, transcript: data.transcript };
    const seat = data.studentId || studentId;
    oppSeatRef.current = seat;
    setOppSeat(seat);
    duelId.current = id;
    revealedRound.current = null;
    p2Lock.current = null;
    p1Lock.current = null;
    aiAttempt.current = 0;
    chain.current = { interactionId: null, results, resultsSent: results.length, transcript: rounds,
      seed: data.seed, rngState: state.rngState, shieldOff: state.shieldOff, echoNext: state.echoNext, p2Hand: [...state.p2Hand] };
    setPlayLog(rounds.map((t) => {
      const r = results.find((x) => x.round === t.round);
      return { round: t.round, you: cardById(t.p1), klein: cardById(t.p2), youPts: r?.youPts ?? 0, kleinPts: r?.kleinPts ?? 0, youScore: r?.youScore ?? 0, kleinScore: r?.kleinScore ?? 0, note: r?.note };
    }));
    setP1Hand(state.p1Hand); setP2Count(state.p2Hand.length);
    setP1Score(state.p1Score); setP2Score(state.p2Score);
    setRound(state.round); setEchoNext(state.echoNext); setShieldOff(state.shieldOff);
    setChipStandby(state.echoNext); setShieldStandby(state.shieldOff > 0);
    setEchoChipDying(false); setShieldChipDying(false); setMultSpent(false);
    setCornerRack([]); setR7Arrival(null); setRoundAdv(null);
    setOppPeeked(playerPeeked); setKleinPeekCount(kleinPeekCount); setOracleBeatDone(true);
    setKleinMsg(""); setError(null); setFinalResult(null); setSaved(false);
    finalResultRef.current = null;
    setSeqSteps([]); setSeqIdx(0); setStatusInfo(null); setClashTick(0);
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    setWardBurned(null); setVoidGone(null);
    setPhase("commit"); setP1Locked(null); setP2Locked(null);
    let lockedCard: Card | null = null;
    if (data.p1Locked) {
      lockedCard = state.p1Hand.find((c) => c.id === data.p1Locked) ?? null;
      if (lockedCard) {
        p1Lock.current = lockedCard;
        setP1Locked(lockedCard);
        setP1Hand((h) => h.filter((c) => c.id !== lockedCard!.id));
      }
    }
    startRound(state.round, state.p2Hand, state.p1Hand, state.p2Score, state.p1Score, playerPeeked, state.shieldOff, state.echoNext);
    if (lockedCard) aiRound.current?.lock(lockedCard.id);
  }, [startRound]);

  useEffect(() => {
    if (tricksMode) {
      startTutorialTrick(0);
      return;
    }
    if (demoMode) {
      const first = DEMO_SCENARIOS.find((x) => x.key === demoParamStr)?.key ?? DEMO_SCENARIOS[0].key;
      runDemo(first);
      return;
    }
    if (encounterParam) {
      void beginEncounter(encounterParam);
      return;
    }
    const { p1Hand, p2Hand } = deal();
    startRound(1, p2Hand, p1Hand, 0, 0, [], 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (card: Card) => {
    if (tricksMode) {
      if (trickPhase !== "setup" || card.id !== trickTargetId) return;
      play("duel.pick");
      setP1Hand((h) => h.filter((c) => c.id !== card.id));
      setP1Locked(card);
      p1Lock.current = card;
      const demo = cardById(TRICK_DEMO[TRICK_ORDER[trickIndex]]);
      setP2Locked(demo);
      p2Lock.current = demo;
      setP2Count((c) => Math.max(0, c - 1));
      chain.current.p2Hand = TRICK_ORDER.slice(trickIndex + 1).map((id) => cardById(TRICK_DEMO[id]));
      chain.current.results = [];
      chain.current.resultsSent = 0;
      chain.current.transcript = [];
      setTrickHistory(appendTutorialLog({
        id: `played-${card.id}`,
        speaker: "YOU",
        text: `PLAYED ${card.name.toUpperCase()}`,
      }));
      setTrickTargetId(null);
      setTrickChars(0);
      setTrickPhase("reveal");
      trickVoiceRef.current?.cancel();
      trickVoiceRef.current = null;
      // the REAL campaign reveal: showdown → flip → clash/award → trick cinematic
      doReveal(card, demo, { round: 1, echoNext: false, shieldOff: 0, youScore: 0, kleinScore: 0 });
      return;
    }
    if (p1Lock.current || phase !== "commit" || error) return;
    play("duel.pick");
    setP1Hand((h) => h.filter((c) => c.id !== card.id));
    setP1Locked(card);
    p1Lock.current = card;
    if (p2Lock.current) {
      // Klein already picked in the background — never an instant reveal. Give
      // the response its own visible thinking beat, then flip the cards.
      setKleinThinking(true);
      play("duel.thinking");
      const you = card, klein = p2Lock.current;
      const ctx = { round, echoNext, shieldOff, youScore: p1Score, kleinScore: p2Score };
      if (revealTimer.current) clearTimeout(revealTimer.current);
      revealTimer.current = setTimeout(() => {
        revealTimer.current = null;
        if (!alive.current) return;
        setKleinThinking(false);
        doReveal(you, klein, ctx);
      }, KLEIN_RESPONSE_MS);
    } else {
      aiRound.current?.lock(card.id);
    }
  };

  const onRetryAi = () => {
    setError(null);
    setKleinThinking(true);
    void aiRound.current?.retry();
  };

  const onNextRound = () => {
    if (phase !== "reveal") return;
    playClick();
    const nextRound = round + 1;
    setRound(nextRound);
    setP1Locked(null); setP2Locked(null);
    setMultSpent(false); // the new round's multiplier (if any) is armed again
    // ROUND WIPE — the crimson sweep that covers the table while the round turns
    setRoundAdv(nextRound);
    setTimeout(() => { if (alive.current) setRoundAdv(null); }, 2300);
    // the wipe's 14 cues, laid on the same clock as the sweep art
    play("round.sweep"); playAt("round.next", 480); playAt("round.bars", 560); playAt("round.bars", 710, { pitch: 1.04 }); playAt("round.bars", 860, { pitch: 1.09 }); playAt("round.burst", 580); playAt("round.burst", 615, { pitch: 1.06 }); playAt("round.burst", 650, { pitch: 1.12 }); playAt("round.letters", 700); playAt("round.number", 760); playAt("round.plate", 980); playAt("round.cutFlash", 1480); playAt("round.burstOut", 1500); playAt("round.split", 1520);
    // ROUND 7 — its own ×2 tears off the round marker only AFTER the wipe clears
    if (nextRound === TOTAL_ROUNDS) {
      setR7Arrival("waiting");
      setTimeout(() => {
        if (!alive.current) return;
        setR7Arrival("flying");
        play("score.chip.pop"); playAt("score.chip.fly", 300); playAt("score.chip.land", 1250);
        setTimeout(() => { if (alive.current) setR7Arrival("landed"); }, 1500);
      }, 1950);
    } else {
      setR7Arrival(null);
    }
    p1Lock.current = null;
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    startRound(nextRound, chain.current.p2Hand, p1Hand, p2Score, p1Score, oppPeeked, shieldOff, echoNext);
  };
  onNextRoundRef.current = onNextRound;

  const onRematch = () => {
    playClick();
    if (encounter.current) { router.replace(challengePath(oppSeatRef.current)); return; }
    setClashWinner(null); setExecFailSide(null); setDrainSide(null); setDrainPops([]);
    const { p1Hand: h1, p2Hand: h2 } = deal();
    startRound(1, h2, h1, 0, 0, [], 0, false);
  };

  /* (round advance is automatic — the driver schedules it when the sequence ends) */
  const cur = seqSteps[seqIdx] as SeqStep | undefined;
  /* reversal chip-swap: while the vortex beat runs, each chip rolls its own
     number out and the swapped total in (the score state itself lands at step end) */
  const revSwap = cur?.kind === "trick" && cur.trick === "reversal" && cur.p1After !== undefined
    ? { to1: cur.p1After, to2: cur.p2After ?? 0 } : null;
  const cardsUp = phase === "over" || (phase === "reveal" && seqIdx >= 1); // step 0 is the showdown hold; the flip is step 1 — must NOT leak into the next round's commit phase (Klein locks in the background there)
  const revealed = cardsUp;
  const showThinking = !voiceLive && (kleinThinking || (phase === "commit" && !p2Locked && !msgVisible && !error));

  /* Speech start/stop — the exact bubble text is the source of truth. */
  useEffect(() => {
    const shown = viewActive && navReady && msgVisible && !!kleinMsg && !showThinking && lastMsg.current?.text === kleinMsg;
    if (!shown) { cancelSpeech(); return; }
    const current = lastMsg.current!;
    if (spokenMsg.current === current && voiceSignaledTick.current === voiceUnlockTick) return;
    spokenMsg.current = current;
    voiceSignaledTick.current = voiceUnlockTick;
    setVoiceLive(true); // the chain owns the table until the last line's onEnd
    voiceHandle.current = playVoice(current.ticket ?? "", {
      onStart: () => setVoiceLive(true),
      onError: (err) => console.warn("[voice] playback failed", err),
      onEnd: () => {
        if (spokenMsg.current !== current) return; // superseded — the new line owns the chain
        voiceHandle.current = null;
        setVoiceLive(false);
        // Bounded linger: the text keeps its normal 8s window after speech.
        if (alive.current) {
          if (msgTimer.current) clearTimeout(msgTimer.current);
          msgTimer.current = setTimeout(() => { if (alive.current) setMsgVisible(false); }, MSG_MS);
        }
      },
    }, { queue: true }); // conversation mode — never cut a line mid-word
  }, [viewActive, navReady, msgVisible, kleinMsg, showThinking, cancelSpeech, voiceUnlockTick]);

  const mult = (round === TOTAL_ROUNDS ? 2 : 1) + (echoNext ? 1 : 0);
  const fanAngle = (i: number, n: number) => (i - (n - 1) / 2) * 5;
  /* ---------- corner-rack membership (derived) — a chip holds its slot while
     ANY of its forms is on screen (in flight, parked, live, dying) and releases
     it when all are gone; the survivors slide left into the freed slot. ---------- */
  const echoBeatNow = !!(cur?.kind === "trick" && cur.trick === "echo");
  const eclipseBeatNow = !!(cur?.kind === "trick" && cur.trick === "eclipse");
  const multChipOn = mult > 1 && !multSpent && cur?.kind !== "multmash";
  /* while R7's ×2 is waiting out the wipe / in the air, the corner keeps
     whatever was there (a parked echo ×2) — the real chip only materializes
     once the flight lands */
  const r7Flying = round === TOTAL_ROUNDS && r7Arrival === "flying";
  const r7Pending = round === TOTAL_ROUNDS && (r7Arrival === "waiting" || r7Arrival === "flying");
  const multChipVis = multChipOn && !r7Pending;
  const echoParked = chipStandby && !(mult > 1) && !echoBeatNow;
  const echoParkedR7 = chipStandby && round === TOTAL_ROUNDS && echoNext && r7Pending && !echoBeatNow;
  const shieldParked = shieldStandby && !(shieldOff > 0) && !eclipseBeatNow;
  const multRack = echoBeatNow || echoParked || echoParkedR7 || echoChipDying || (cur?.kind === "multmash" && mult > 1) || (round === TOTAL_ROUNDS && r7Arrival !== null) || multChipOn;
  const shieldRack = eclipseBeatNow || shieldParked || shieldChipDying || shieldOff > 0;
  useCornerChip("mult", multRack, claimCorner, releaseCorner);
  useCornerChip("shield", shieldRack, claimCorner, releaseCorner);
  useCornerChip("seen", kleinPeekCount > 0, claimCorner, releaseCorner);
  const rackIdx = (id: string) => { const i = cornerRack.indexOf(id); return i >= 0 ? i : 0; };
  const slotLeft = (id: string) => `calc(17% + ${rackIdx(id) * RACK_PITCH}px)`;
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
  /* Camera rig — the whole stage rides a tiny virtual camera, but ONLY during
     the three big trick cinematics (void / eclipse / executioner). Each
     duration is bounded by its trick step (4800/4000/4400/3700 ms), and the
     rig sits idle (= no transform) for every other beat. */
  const cameraAnim = cur?.kind === "trick"
    ? cur.trick === "void" ? "dCameraVoid 4400ms ease-in-out both"
      : cur.trick === "eclipse" ? "dCameraEclipse 3600ms ease-in-out both"
        : cur.trick === "execfail" ? "dCameraExec 3500ms ease-in-out both"
          : cur.trick === "executioner" ? "dCameraExec 4200ms ease-in-out both"
            : undefined
    : undefined;

  return (
    <IonPage>
    <div className={`v ${s.viewport}`}>
      <div className={`v ${s.stage} ${phone ? s.stagePhone : ""}`} style={{ transform: `scale(${stageScale})` }} inert={pauseOpen || logOpen ? true : undefined}>
      {/* ---------- global keyframes ---------- */}
      <style>{DUEL_KEYFRAMES}</style>
      <div className={`v ${s.cameraRig}`} style={cameraAnim ? { animation: cameraAnim } : undefined}>
      <div className={`v ${s.stageSpeedlines}`} style={{ pointerEvents: "none" }} />

      {/* ---------- backdrop: stripes + halftone ---------- */}
      <div className={`v ${s.backStripes}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.backDots}`} style={{ pointerEvents: "none" }} />

      {/* ---------- intro splash ---------- */}
      <div className={`v ${s.introWrap}`} style={{ pointerEvents: "none", animation: "dIntroPanel 500ms 1150ms cubic-bezier(.7,0,.3,1) both" }}>
        <div className={`v ${s.introPanel}`} />
        <div className={`t ${s.introTxt}`} style={{ animation: "dIntroT 1250ms cubic-bezier(.2,1,.3,1) both" }}>{tricksMode ? "GIMMICK DECK" : "DUEL START"}</div>
      </div>

      {/* ---------- opponent zone ---------- */}
      <div className={`v ${s.oppZone}`}>
        {/* (the black frame panel removed — the portrait lighten-blends straight
            onto the striped backdrop, so no rectangle reads around Klein) */}
        {!tricksMode && (
          <div
            key={`opp-${round}-lunge`}
            className={`v ${s.oppPortraitWrap}`}
            style={{ pointerEvents: "none", ...(revealed ? { animation: "dLunge 500ms cubic-bezier(.2,1,.3,1) both" } : { animation: "dFloat 6s ease-in-out infinite" }) }}
          >
            <P5Image src={opp.portrait} resizeMode="contain" className={s.oppPortrait} />
          </div>
        )}
        {/* opponent hand — fanned face-down minis, held at his lower front */}
        <div className={`v ${s.oppFan}`} style={{ pointerEvents: "none" }}>
          {Array.from({ length: p2Count }).map((_, i, arr) => (
            <div key={i} className={`v ${s.oppFanCard}`} style={{ transform: `rotate(${(i - (arr.length - 1) / 2) * 7}deg) translateY(${Math.abs(i - (arr.length - 1) / 2) * 3}px)` }} />
          ))}
        </div>
        {tricksMode && (
          <div className={`t ${v.demoFanLbl}`} style={{ position: "absolute", bottom: 62, left: "50%", transform: "translateX(-50%)" }}>DEMO HAND</div>
        )}
        {/* Klein's chat bubble — anchored to his portrait, tail pointing at him.
            Bouncing dots while he thinks; his line the MOMENT it lands. */}
        {!tricksMode && (showThinking || (msgVisible && !!kleinMsg)) && (
          <div
            className={`v ${s.bubble}`}
            style={!showThinking ? { animation: "dBubbleIn 420ms cubic-bezier(.2,1,.3,1) both" } : undefined}
          >
            <div className={`v ${s.bubbleTail}`} style={{ pointerEvents: "none", clipPath: TAIL_CLIP }}>
              <div className={`v ${s.bubbleTailFace}`} style={{ clipPath: TAIL_CLIP }} />
            </div>
            <div className={`v ${s.bubblePanel}`} style={{ clipPath: JAGGED_CLIP }}>
              <div className={`v ${s.bubbleFace}`} style={{ clipPath: JAGGED_CLIP }}>
                {showThinking ? (
                  <div className={`v ${s.bubbleDotsRow}`}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`v ${s.bubbleDot}`} style={{ animation: `dDotBounce 0.9s ${i * 150}ms ease-in-out infinite` }} />
                    ))}
                  </div>
                ) : (
                  <div className={`t ${s.bubbleTxt}`}>{kleinMsg}</div>
                )}
              </div>
            </div>
            <div className={`v ${s.bubbleTag}`}><div className={`t ${s.bubbleTagTxt}`}>{opp.name}</div></div>
          </div>
        )}
      </div>
      {/* ---------- THE TABLE ---------- */}
      <div className={`v ${s.tableZone}`}>
        <div
          key={`table-${round}`}
          className={`v ${s.tableRim}`}
          style={revealed ? { animation: "dImpact 380ms cubic-bezier(.2,1,.3,1)" } : undefined}
        >
          <div className={`v ${s.tableFelt}`} style={{ pointerEvents: "none" }}>
            {/* painted asset overlay — drop /table.png in public/ to replace the CSS felt */}
            <P5Image
              src="/table.png"
              resizeMode="stretch"
              style={{ position: "absolute", inset: 0, opacity: tableArt ? 1 : 0, clipPath: TABLE_CLIP }}
            />
            <div className={`v ${s.feltLine}`} style={{ pointerEvents: "none" }} />
          </div>

          {/* Klein's played card — upper felt, face-up to the user. The tally plate
              sits LEFT OF HIS CARD so ownership of the number is unmistakable. */}
          <div className={`v ${s.feltSlot} ${s.feltSlotTop}`}>
            {p2Locked && (
              <div className={`v`} style={{
                ...((clashWinner || execFailSide === "p2")
                  ? (clashWinner === "p2" ? { animation: "dCardWinR 520ms cubic-bezier(.34,1.4,.64,1) both" } : { animation: "dCardLose 650ms 160ms ease-out both" })
                  : {}),
                ...(cur?.kind === "trick" && cur.trick === "void" && ((cur.youCard?.name === "Void")
                  ? { animation: "dVdDevourDown 1150ms 1200ms cubic-bezier(.55,0,.85,.35) both" }
                  : { animation: "dVdMutate 620ms cubic-bezier(.55,0,.9,.4) both" })),
                ...(cur?.kind === "trick" && cur.trick === "ward" && (cur.youCard?.name === "Ward"
                  ? { animation: "dWdBurn 6200ms linear both", transformOrigin: "50% 100%" } : {})),
                ...(wardBurned === "p2" && !(cur?.kind === "trick" && cur.trick === "ward") ? { opacity: 0 } : {}),
                ...(voidGone === "p2" && !(cur?.kind === "trick" && cur.trick === "void") ? { opacity: 0 } : {}),
              }}>
                <PlayCard card={p2Locked} revealed={revealed} opp />
                {(clashWinner === "p1" || clashWinner === "both" || execFailSide === "p2") && (
                  <div style={{ pointerEvents: "none" }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <div key={i} className="v" style={{ position: "absolute", left: 57, top: 76, width: 0, height: 0, transform: `rotate(${i * 36}deg)` }}>
                        <div className={`v ${s.cardShard}`} style={{ animation: `dShardOut 720ms ${i * 45}ms ease-out both` }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {pow && (
              <div
                className={`v ${s.tallyPlate}`}
                style={{
                  pointerEvents: "none",
                  ...(pow.finish && !pow.tie && !pow.youWins ? { borderColor: "#E60012" } : null),
                  ...(pow.finish && (pow.youWins || pow.tie) ? { borderColor: "#3a3a3a", opacity: 0.5 } : null),
                }}
              >
                <div className={`t ${s.tallyLbl}`}>{opp.name}</div>
                <div
                  key={clashTick}
                  className={`t ${s.tallyNum}`}
                  style={{
                    color: "#FF4D5E",
                    ...(pow.finish && !pow.tie && !pow.youWins
                      ? { animation: "dLockIn 480ms cubic-bezier(.34,1.4,.64,1) both", textShadow: "0 0 26px rgba(255,77,94,0.9), 3px 3px 0 #000" }
                      : pow.finish
                        ? { animation: "dLockOut 450ms ease-out both" }
                        : { animation: "dTickPulse 280ms ease-out both" }),
                  }}
                >{pow.kleinLeft}</div>
              </div>
            )}
          </div>
          {/* your played card — lower felt, your tally right beside it */}
          <div className={`v ${s.feltSlot} ${s.feltSlotBottom}`}>
            {p1Locked && (
              <div className={`v`} style={{
                ...((clashWinner || execFailSide === "p1")
                  ? (clashWinner === "p1" ? { animation: "dCardWinY 520ms cubic-bezier(.34,1.4,.64,1) both" } : { animation: "dCardLose 650ms 160ms ease-out both" })
                  : {}),
                ...(cur?.kind === "trick" && cur.trick === "void" && ((cur.youCard?.name === "Void")
                  ? { animation: "dVdMutate 620ms cubic-bezier(.55,0,.9,.4) both" }
                  : { animation: "dVdDevourUp 1150ms 1200ms cubic-bezier(.55,0,.85,.35) both" })),
                ...(cur?.kind === "trick" && cur.trick === "ward" && (cur.youCard?.name === "Ward"
                  ? {} : { animation: "dWdBurn 6200ms linear both", transformOrigin: "50% 100%" })),
                ...(wardBurned === "p1" && !(cur?.kind === "trick" && cur.trick === "ward") ? { opacity: 0 } : {}),
                ...(voidGone === "p1" && !(cur?.kind === "trick" && cur.trick === "void") ? { opacity: 0 } : {}),
              }}>
                <PlayCard card={p1Locked} revealed={revealed} />
                {(clashWinner === "p2" || clashWinner === "both" || execFailSide === "p1") && (
                  <div style={{ pointerEvents: "none" }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <div key={i} className="v" style={{ position: "absolute", left: 57, top: 76, width: 0, height: 0, transform: `rotate(${i * 36}deg)` }}>
                        <div className={`v ${s.cardShard}`} style={{ animation: `dShardOut 720ms ${i * 45}ms ease-out both` }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {pow && (
              <div
                className={`v ${s.tallyPlate}`}
                style={{
                  pointerEvents: "none",
                  ...(pow.finish && !pow.tie && pow.youWins ? { borderColor: "#FCEE21" } : null),
                  ...(pow.finish && (!pow.youWins || pow.tie) ? { borderColor: "#3a3a3a", opacity: 0.5 } : null),
                }}
              >
                <div className={`t ${s.tallyLbl}`}>YOU</div>
                <div
                  key={clashTick}
                  className={`t ${s.tallyNum}`}
                  style={{
                    color: "#FCEE21",
                    ...(pow.finish && !pow.tie && pow.youWins
                      ? { animation: "dLockIn 480ms cubic-bezier(.34,1.4,.64,1) both", textShadow: "0 0 26px rgba(252,238,33,0.9), 3px 3px 0 #000" }
                      : pow.finish
                        ? { animation: "dLockOut 450ms ease-out both" }
                        : { animation: "dTickPulse 280ms ease-out both" }),
                  }}
                >{pow.youLeft}</div>
              </div>
            )}
          </div>

          {/* VOID — the void card mutates IN PLACE into a 3D maw (tilted accretion
              rings around a black event-horizon core) which devours the opposing
              card straight out of its slot. No takeover: a soft vignette just
              focuses the eye. Custom identity — zero spiky bursts. */}
          {cur?.kind === "trick" && cur.trick === "void" && (
            <VoidMaw atTop={cur.youCard?.name !== "Void"} />
          )}

          {/* SHOWDOWN hold — a visible 3..2..1 so the reveal never jump-scares */}
          {cur?.kind === "showdown" && (
            <div className={`v ${s.showdownWrap}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.showdownLbl}`}>SHOWDOWN</div>
              <div key={seqSubTick} className={`t ${s.showdownNum}`} style={{ animation: "dNumSlam 0.5s cubic-bezier(.2,1,.3,1) both" }}>{Math.max(1, 3 - seqSubTick)}</div>
            </div>
          )}

          {/* SHIELD NULLIFY — full cinematic: powers pop in flanking a VS, "SAME TYPE!"
              banner, the numbers SMASH together with a flash, a shield ring expands,
              NULLIFIED stamp lands with the 0+0 verdict. Web only; native gets text. */}
          {cur?.kind === "clash" && cur.mode === "shield" && (
            <div className={`v ${s.shieldWrap}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.nullFlash}`} style={{ animation: "dNullFlash 850ms 1500ms ease-out both" }} />
              <div className={`v ${s.shieldWave}`} style={{ animation: "dShieldWave 950ms 1900ms ease-out both" }} />
              {/* beat 1 — the two powers face off (smash wrapper hides them after impact) */}
              <div style={{ animation: "dNullSmash 650ms 1500ms cubic-bezier(.6,0,.8,.4) both" }}>
                <div className={`v ${s.shieldRow}`}>
                  <div className={`v ${s.shieldPlate}`} style={{ borderColor: cur.align === "good" ? "#16a34a" : "#E60012", animation: "dShieldPop 450ms 100ms cubic-bezier(.2,1,.3,1) both" }}>
                    <div className={`t ${s.shieldPlateNum}`} style={{ color: cur.align === "good" ? "#16a34a" : "#FF4D5E" }}>{cur.you ?? 0}</div>
                    <div className={`t ${s.shieldPlateLbl}`}>YOU</div>
                  </div>
                  <div className={`t ${s.shieldVs}`} style={{ animation: "dNumSlam 400ms 380ms cubic-bezier(.2,1,.3,1) both" }}>VS</div>
                  <div className={`v ${s.shieldPlate}`} style={{ borderColor: cur.align === "good" ? "#16a34a" : "#E60012", animation: "dShieldPop 450ms 220ms cubic-bezier(.2,1,.3,1) both" }}>
                    <div className={`t ${s.shieldPlateNum}`} style={{ color: cur.align === "good" ? "#16a34a" : "#FF4D5E" }}>{cur.klein ?? 0}</div>
                    <div className={`t ${s.shieldPlateLbl}`}>{opp.name.toUpperCase()}</div>
                  </div>
                </div>
              </div>
              {/* beat 2 — why: same type */}
              <div className={`t ${s.shieldBanner}`} style={{ animation: "dShieldPop 450ms 850ms cubic-bezier(.2,1,.3,1) both" }}>SAME TYPE!</div>
              {/* beat 3 — the verdict */}
              <div className={`v ${s.nullStamp}`} style={{ animation: "dStampIn 650ms 1800ms cubic-bezier(.2,1,.3,1) both" }}>
                <div className={`t ${s.nullStampTxt}`}>NULLIFIED</div>
              </div>
            </div>
          )}

          {/* SHIELD BREAK — shields are down this round (Eclipse last round): a crimson
              shield slams in, cracks spider across it, it SHATTERS, and the verdict
              stamps down: same alignment now scores full damage. Web cinematic. */}
          {cur?.kind === "shieldbreak" && (
            <div className={`v ${s.sbWrap}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.nullFlash}`} style={{ animation: "dNullFlash 700ms 1350ms ease-out both" }} />
              <div style={{ animation: "dShieldBreak 420ms 1350ms cubic-bezier(.6,0,.8,.4) both" }}>
                <div className={`v ${s.sbAura}`} style={{ animation: "dSBAura 900ms 350ms ease-in-out infinite" }} />
                <div className={`v ${s.sbShield}`} style={{ animation: "dShieldSlam 460ms cubic-bezier(.2,1,.3,1) both" }}>
                  <div className={`v ${s.sbShieldInner}`} />
                  <div className={`t ${s.sbShieldMark}`}>✕</div>
                </div>
                {[18, -34, 76].map((deg, i) => (
                  <div key={i} className={`v ${s.sbCrack}`} style={{ transform: `rotate(${deg}deg)`, animation: `dCrackIn 180ms ${950 + i * 110}ms both` }} />
                ))}
              </div>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className={`v ${s.sbShard}`} style={{ transform: `rotate(${i * 45}deg)`, animation: `dShard 820ms ${1350 + i * 50}ms ease-out both` }} />
              ))}
              <div className={`v ${s.nullStamp}`} style={{ marginTop: 150, animation: "dStampIn 560ms 1800ms cubic-bezier(.2,1,.3,1) both" }}>
                <div className={`t ${s.nullStampTxt}`}>SHIELDS DOWN</div>
              </div>
              <div className={`t ${s.shieldSub}`} style={{ marginTop: 8, animation: "dNumSlam 400ms 2150ms cubic-bezier(.2,1,.3,1) both" }}>SAME ALIGNMENT NOW SCORES FULL DAMAGE</div>
            </div>
          )}

          {/* TIE verdict — both powers died together, both cards shatter: stamp it */}
          {cur?.kind === "clash" && cur.mode === "tie" && pow?.finish && (
            <div className={`v ${s.tieWrap}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.nullStamp}`} style={{ animation: "dStampIn 620ms cubic-bezier(.2,1,.3,1) both" }}>
                <div className={`t ${s.nullStampTxt}`}>TIE!</div>
              </div>
            </div>
          )}

          {/* AWARD — the leftover points literally fly into the winner's score chip */}
          {cur?.kind === "award" && (cur.p1Pts ?? 0) !== (cur.p2Pts ?? 0) && (
            <div
              className={`v ${s.flyBadge} ${(cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? s.flyYou : s.flyKlein}`}
              style={{
                pointerEvents: "none",
                animation: (cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? "dFlyYou 1.3s cubic-bezier(.45,0,.6,.5) both" : "dFlyKlein 1.3s cubic-bezier(.45,0,.6,.5) both",
              }}
            >
              <div className={`t ${s.flyTxt}`} style={{ color: (cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? "#FCEE21" : "#FF4D5E" }}>
                +{(cur.p1Pts ?? 0) > (cur.p2Pts ?? 0) ? cur.p1Pts : cur.p2Pts}
              </div>
            </div>
          )}

          {/* TRICK CINEMATIC — one dedicated beat per effect */}
          {cur?.kind === "trick" && cur.trick !== "executioner" && cur.trick !== "execfail"
            && !(cur.trick === "void") && !(cur.trick === "echo")
            && !(cur.trick === "eclipse") && !(cur.trick === "ward")
            && !(cur.trick === "reversal") && !(cur.trick === "oracle") && (
            <div className={`v ${s.trickOverlay}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.trickStamp}`}>
                <div className={`t ${s.trickTitle}`}>{TRICK_SEQ[cur.trick]?.title ?? cur.trick.toUpperCase()}</div>
                <div className={`t ${s.trickSub}`}>{TRICK_SEQ[cur.trick]?.sub ?? ""}</div>
              </div>
              {cur.trick === "reversal" && cur.preP1 !== undefined && cur.preP2 !== undefined && (
                <div className={`v ${s.swapRow}`}>
                  <div className={`t ${s.swapNum}`} style={{ color: "#FCEE21", animation: "dSwapL 1.6s ease-in-out both" }}>{cur.preP1}</div>
                  <div className={`t ${s.swapArrow}`}>⇄</div>
                  <div className={`t ${s.swapNum}`} style={{ color: "#FF4D5E", animation: "dSwapR 1.6s ease-in-out both" }}>{cur.preP2}</div>
                </div>
              )}
              {cur.trick === "oracle" && cur.peekCards?.map((c) => (
                <div key={c.id} className={`v ${s.peekFloat}`} style={{ animation: "dFlipIn 500ms both" }}>
                  <CardFace card={c} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MULT DOUBLING — the natural scoring flow, P5-ified: the BASE number
            pops in where the points would fly from and HANGS a beat... then the
            clash chip itself slurves off the table edge INTO the number, a
            crimson impact burst pops, and the number DOUBLES in place (×N stamp
            flashing beside it). The chip is consumed — spent. Then the award
            flies the doubled number into the score chip like normal. */}
        {cur?.kind === "multmash" && (() => {
          const tri = cur.mult === 3;
          const face = tri ? "#E60012" : "#FCEE21";
          const youWin = cur.side === "p1";
          // anchor where the award's fly badge starts — flyYou/flyKlein are rim-relative
          // (37% of the 92%-wide rim = 4% + 37%×0.92 ≈ 38% of the table zone)
          const ax = "38%";
          const ay = youWin ? "40%" : "7%";
          return (
            <div className={`v ${s.muFlyWrap}`} style={{ pointerEvents: "none" }}>
              {/* the hanging BASE number — pops, hangs, then doubles on impact */}
              <div className={`v ${s.muHangNumWrap}`} style={{ left: ax, top: ay }}>
                <div
                  key={`base-${cur.base}`}
                  className={`t ${s.muHangNum}`}
                  style={{ color: face, animation: `dNumSlam 380ms 60ms cubic-bezier(.2,1,.3,1) both, dMultDouble ${tri ? "560ms" : "480ms"} 1500ms cubic-bezier(.2,1,.3,1) both` }}
                >
                  {cur.base}
                </div>
                <div
                  key={`fin-${cur.final}`}
                  className={`t ${s.muHangNumFin}`}
                  style={{ color: face, animation: `dMultFinIn 380ms ${tri ? "1560" : "1520"}ms cubic-bezier(.2,1,.3,1) both` }}
                >
                  {cur.final}
                </div>
              </div>
              {/* impact FX — crimson burst pop + ring on the moment of doubling.
                  The burst and ring center on the hanging number's anchor. */}
              <div className={`v ${s.muImpBurst}`} style={{ left: ax, top: ay, animation: `dMultImpact 620ms 1500ms cubic-bezier(.2,1,.3,1) both` }} />
              <div className={`v ${s.muImpRing}`} style={{ left: ax, top: ay, animation: `dMuRing 720ms 1500ms cubic-bezier(.2,1,.3,1) both` }} />
              {/* the ×N stamp flashing beside the number at the doubling beat */}
              <div
                className={`v ${s.muStampX}`}
                style={{ left: ax, top: ay, borderColor: "#000", animation: `dStampIn 360ms ${tri ? "1540" : "1500"}ms cubic-bezier(.2,1,.3,1) both` }}
              >
                <div className={`t ${s.muStampXTxt}`} style={{ color: face }}>×{cur.mult}</div>
              </div>
              {/* the chip itself, slurving into the number along a true curved
                  path (offset-path) from its corner-rack slot. Glyph only — no
                  tag/? in flight. Three composed animations: the path
                  (position), the fade (only in the final dive), and the
                  spin+shrink (continuous). */}
              <div
                key="chip-flight"
                className={`v ${s.muChipFly} ${youWin ? s.muChipFlyPathYou : s.muChipFlyPathKlein}`}
                style={{
                  left: slotLeft("mult"),
                  animation: `dMultChipFly${youWin ? "You" : "Klein"} 1500ms cubic-bezier(.45,0,.85,.6) both, dMultChipFlyFade${youWin ? "You" : "Klein"} 1500ms linear both, dMultChipSpin 1500ms cubic-bezier(.45,0,.85,.6) both`,
                }}
              >
                <div className={`v ${s.multChipBurstB}`} />
                <div className={`v ${s.multChipBurstW}`} />
                <div className={`v ${s.multChipLive}`} style={{ transform: "rotate(-4deg)" }}>
                  <div className={`v ${s.multChipFace}`} style={{ backgroundColor: face }} />
                  <div className={`t ${s.multChipTxt}`} style={{ color: tri ? "#fff" : "#111" }}>×{cur.mult}</div>
                </div>
              </div>
            </div>
          );
        })()}


        {/* ECHO — the clash dissolves (rings + compact stamp), then the ×2 chip
            pops out of the echo card and curves into the corner slot at the
            table's upper left. Table-ZONE child (not the rim): the arc flies
            over the felt edge without ever clipping. */}
        {cur?.kind === "trick" && cur.trick === "echo" && (
          <EchoLoad youPlayed={cur.youCard?.name === "Echo"} slotIdx={rackIdx("mult")} />
        )}

        {/* ECLIPSE — same activation: rings + SHIELDS DOWN stamp, then the
            broken-shield chip flies to its corner-rack slot */}
        {cur?.kind === "trick" && cur.trick === "eclipse" && (
          <EclipseLoad youPlayed={cur.youCard?.name === "Eclipse"} slotIdx={rackIdx("shield")} />
        )}

        {/* WARD — the watcher: the trick charges, a golden eye snaps open right
            on the ward card and locks its gaze — the gaze ignites the opposing
            card and it BURNS to ash (canvas particle fire), +5 rolls out of the embers. */}
        {cur?.kind === "trick" && cur.trick === "ward" && (
          <WardBlock victimTop={cur.youCard?.name === "Ward"} />
        )}

        {/* REVERSAL — a procedural vortex at the middle of the table: both
            totals spiral into the core as two chasing streams, then the burst
            flips the spin — the tables turn — and the numbers themselves fly
            through the storm and trade places, landing dead-center in the
            other chip's slot. zIndex 30: the flyers ride OVER the chips. */}
        {cur?.kind === "trick" && cur.trick === "reversal" && (
          <div className={`v ${s.esWrap}`} style={{ zIndex: 30, animation: "dVdFadeOut 400ms 4200ms ease-in both" }} onPointerDown={undefined}>
            <div style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -320, marginTop: -320 }}>
              <RevVortex />
            </div>
            {/* your total leaves your chip, arcs over the storm, rises into
                Klein's. left is zone-shifted (+63.75): offset-path anchors the
                laid-out center at (left - zone.x, top) — calibrated so the
                flight starts dead-center on the resident slot and lands
                dead-center on the other (slots measured from the live DOM). */}
            <div
              className={`v ${s.rvFlyPathYou}`}
              style={{ position: "absolute", left: 139, top: 405, width: 60, height: 50, alignItems: "center", justifyContent: "center", offsetRotate: "0deg", animation: "dEsChipFly 1050ms 1100ms cubic-bezier(.4,.1,.4,1) both" } as any}
            >
              <div className={`t ${s.chipNum}`} style={{ color: "#FCEE21" }}>{p1Score}</div>
            </div>
            {/* Klein's total takes the mirrored arc under the storm and drops into yours */}
            <div
              className={`v ${s.rvFlyPathKlein}`}
              style={{ position: "absolute", left: 1461, top: 105, width: 60, height: 50, alignItems: "center", justifyContent: "center", offsetRotate: "0deg", animation: "dEsChipFly 1050ms 1100ms cubic-bezier(.4,.1,.4,1) both" } as any}
            >
              <div className={`t ${s.chipNum}`} style={{ color: "#FF4D5E" }}>{p2Score}</div>
            </div>
            <div className={`v ${s.esStamp}`} style={{ position: "absolute", left: "50%", top: "58%", marginLeft: -80, width: 160, alignItems: "center", animation: "dStampIn 340ms 2300ms cubic-bezier(.2,1,.3,1) both" }}>
              <div className={`t ${s.esStampTxt}`}>SWAPPED</div>
            </div>
          </div>
        )}

        {/* ORACLE — the star chart: constellations form over the night-dark
            felt, the peeked faces burn through (yours only), and the collapse
            glints fly off to dock — the peek star lower right (yours) or the
            hand-seen chip top left (Klein's). */}
        {cur?.kind === "trick" && cur.trick === "oracle" && (
          <StarChart
            mine={cur.youCard?.name === "Oracle"}
            cards={cur.peekCards ?? []}
            count={cur.peekCount ?? cur.peekCards?.length ?? 2}
            slotIdx={rackIdx("seen")}
          />
        )}

        {/* score chips + round marker — OVERLAYS on the table zone, never clipped by the felt */}
        <div className={`v ${s.roundMarker}`} style={{ pointerEvents: "none" }}>
          <div className={`t ${s.roundLbl}`}>{tricksMode ? "GIMMICK" : "ROUND"}</div>
          <div className={`t ${s.roundNum}`}>
            {tricksMode ? trickIndex + 1 : Math.min(round, TOTAL_ROUNDS)}
            <span className={`ti ${s.roundDim}`}>/{tricksMode ? TOTAL_TRICKS : TOTAL_ROUNDS}</span>
          </div>
          {mult > 1 && <div className={`t ${s.roundMult}`}>×{mult}</div>}
        </div>
        <div className={`v ${s.chip} ${s.chipOpp}`} style={{ pointerEvents: "none", ...(drainSide === "p2" ? { animation: "dChipDrain 400ms ease-in-out infinite" } : {}) }}>
          <div className={`t ${s.chipLbl}`}>{opp.name}</div>
          {revSwap ? (
            <div style={{ height: 50, width: "100%" }} /> // the number is away — flying through the vortex
          ) : (
            <div key={`s2-${p2Score}`} className={`t ${s.chipNum}`} style={{ color: "#FF4D5E", ...(drainSide === "p2" ? { animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } : {}) }}>{p2Score}</div>
          )}
        </div>
        <div className={`v ${s.chip} ${s.chipYou}`} style={{ pointerEvents: "none", ...(drainSide === "p1" ? { animation: "dChipDrain 400ms ease-in-out infinite" } : {}) }}>
          <div className={`t ${s.chipLbl}`}>YOU</div>
          {revSwap ? (
            <div style={{ height: 50, width: "100%" }} /> // the number is away — flying through the vortex
          ) : (
            <div key={`s1-${p1Score}`} className={`t ${s.chipNum}`} style={{ color: "#FCEE21", ...(drainSide === "p1" ? { animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } : {}) }}>{p1Score}</div>
          )}
        </div>

        {/* TABLE LOG — the discard pile: one dashed slot on a clean table, then
            the played stack grows every reveal. Click opens the overview. */}
        {!tricksMode && <TableLogPile count={playLog.length} onOpen={openLog} />}

        {/* executioner drain — every tick slams a "-1" beside the victim's chip */}
        {drainPops.map((p) => {
          const j = ((p.n * 2654435761) % 1000) / 1000; // deterministic jitter per tick
          const dx = 14 + p.n * 13 + j * 40;             // fans outward as the drain runs
          const dy = (j - 0.5) * 88;
          const rot = (j - 0.5) * 30 - 5;
          return (
            <div
              key={p.id}
              className={`v ${p.side === "p1" ? s.drainPopYou : s.drainPopOpp}`}
              style={{ pointerEvents: "none", transform: `translateX(${p.side === "p1" ? dx : -dx}px) translateY(${dy}px) rotate(${rot}deg)` }}
            >
              <div style={{ animation: "dDrainPop 850ms cubic-bezier(.2,1,.3,1) both" }}>
                <div className={`t ${s.drainPopTxt}`}>-1</div>
              </div>
            </div>
          );
        })}
        {/* live status tokens — ON the table; press for the full rules.
            CLASH chip: the burst-seal glyph (same star as the verdict stamps),
            wobbling like the shield halves breathe; tag below names the state.
            During the mult beat the chip HIDES — its copy is flying into the number. */}
        {multChipVis && (
          <div
            className={`press ${s.shieldChip}`}
            style={{ left: slotLeft("mult"), top: "7%", transition: "left 450ms cubic-bezier(.2,1,.3,1)" }}
            onMouseEnter={playHover}
            onClick={() => setStatusInfo("mult")}
          >
            <div className={`v ${s.multChipArt}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.multChipBurstB}`} />
              <div className={`v ${s.multChipBurstW}`} />
              <div
                key={mult}
                className={`v ${s.multChipLive}`}
                style={{ animation: "dShieldPop 380ms cubic-bezier(.2,1,.3,1) both, dMultWobble 2.4s ease-in-out 380ms infinite" }}
              >
                <div className={`v ${s.multChipFace}`} style={{ backgroundColor: mult === 3 ? "#E60012" : "#FCEE21" }} />
                <div className={`t ${s.multChipTxt}`} style={{ color: mult === 3 ? "#fff" : "#111" }}>×{mult}</div>
              </div>
            </div>
            <div className={`v ${s.shieldChipTag}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.shieldChipTagTxt}`} style={{ color: mult === 3 ? "#FF4D5E" : "#FCEE21" }}>CLASH ×{mult}</div>
            </div>
            <div className={`v ${s.shieldChipQ}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.statusTokenQTxt}`}>?</div>
            </div>
          </div>
        )}
        {shieldOff > 0 && (
          <div
            className={`press ${s.shieldChip}`}
            style={{ left: slotLeft("shield"), top: "7%", transition: "left 450ms cubic-bezier(.2,1,.3,1)" }}
            onMouseEnter={playHover}
            onClick={() => setStatusInfo("shield")}
          >
            <div className={`v ${s.shieldChipArt}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.shieldChipBack}`} />
              <div className={`v ${s.shieldHalfL}`} style={{ animation: "dHalfL 2.4s ease-in-out infinite" }} />
              <div className={`v ${s.shieldHalfR}`} style={{ animation: "dHalfR 2.4s ease-in-out infinite" }} />
              <div className={`v ${s.shieldChipCount}`}>
                <div key={shieldOff} className={`t ${s.shieldChipCountTxt}`} style={{ animation: "dNumSlam 350ms cubic-bezier(.2,1,.3,1) both" }}>{shieldOff}</div>
              </div>
            </div>
            <div className={`v ${s.shieldChipTag}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.shieldChipTagTxt}`}>SHIELDS OFF</div>
            </div>
            <div className={`v ${s.shieldChipQ}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.statusTokenQTxt}`}>?</div>
            </div>
          </div>
        )}
        {/* YOUR PEEK — the star the constellation docked as. Appears only once
            the stars have landed, clickable for the rest of the match. Same chip
            frame as the rack chips: count top-left, info top-right, tag under. */}
        {oppPeeked.length > 0 && oracleBeatDone && (
          <div
            className={`press ${s.shieldChip}`}
            style={{ right: "5%", bottom: "27%", animation: "dOcDock 450ms cubic-bezier(.34,1.5,.64,1) both" }}
            onMouseEnter={playHover}
            onClick={() => setStatusInfo("peek")}
          >
            <div className={`v ${s.peekStar}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.peekStarGlyph}`} style={{ marginLeft: -20, marginTop: -20 }}>
                <Sparkle size={40} color="#ffe98a" />
              </div>
            </div>
            <div className={`v ${s.shieldChipCount}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.shieldChipCountTxt}`}>{oppPeeked.length}</div>
            </div>
            <div className={`v ${s.shieldChipTag}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.shieldChipTagTxt}`}>PEEK</div>
            </div>
            <div className={`v ${s.shieldChipQ}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.statusTokenQTxt}`}>?</div>
            </div>
          </div>
        )}
        {/* KLEIN'S PEEK — your cards were read. You never see which; the chip
            appears once his stars land and stays for the match. */}
        {kleinPeekCount > 0 && oracleBeatDone && (
          <div
            className={`press ${s.shieldChip}`}
            style={{ left: slotLeft("seen"), top: "7%", transition: "left 450ms cubic-bezier(.2,1,.3,1)", animation: "dOcDock 450ms cubic-bezier(.34,1.5,.64,1) both" }}
            onMouseEnter={playHover}
            onClick={() => setStatusInfo("peekKlein")}
          >
            <div className={`v ${s.peekStar} ${s.peekStarKlein}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.peekStarGlyph}`} style={{ marginLeft: -20, marginTop: -20 }}>
                <Sparkle size={40} color="#ff9a9a" />
              </div>
            </div>
            <div className={`v ${s.shieldChipCount}`} style={{ pointerEvents: "none", borderColor: "#E60012" }}>
              <div className={`t ${s.shieldChipCountTxt}`} style={{ color: "#FF4D5E" }}>{kleinPeekCount}</div>
            </div>
            <div className={`v ${s.shieldChipTag}`} style={{ pointerEvents: "none", borderColor: "#E60012" }}>
              <div className={`t ${s.shieldChipTagTxt}`} style={{ color: "#FF4D5E" }}>SEEN</div>
            </div>
            <div className={`v ${s.shieldChipQ}`} style={{ pointerEvents: "none" }}>
              <div className={`t ${s.statusTokenQTxt}`}>?</div>
            </div>
          </div>
        )}
        {/* R7'S ARRIVAL — round 7's own ×2 detaches from the ROUND MARKER and
            flies to its rack slot. If an echo ×2 is parked there, the landing
            fuses them into the crimson ×3 (the flash below). */}
        {r7Flying && (
          <div
            className={`v ${s.esChip}`}
            style={{ left: 80, top: 204, offsetPath: r7ArrivalPath(rackIdx("mult")), animation: "dEsChipPop 340ms 100ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 1100ms 400ms cubic-bezier(.4,.1,.4,1) both, dVdFadeOut 250ms 1350ms ease-in both", pointerEvents: "none" } as any}
          >
            <div className={`v ${s.multChipBurstB}`} />
            <div className={`v ${s.multChipBurstW}`} />
            <div className={`v ${s.multChipLive}`} style={{ transform: "rotate(-4deg)" }}>
              <div className={`v ${s.multChipFace}`} style={{ backgroundColor: "#FCEE21" }} />
              <div className={`t ${s.multChipTxt}`} style={{ color: "#111" }}>×2</div>
            </div>
          </div>
        )}
        {/* the FUSE — one flash the instant R7's ×2 lands on a parked echo ×2;
            the chip that materializes here is the crimson ×3 */}
        {r7Arrival === "landed" && round === TOTAL_ROUNDS && echoNext && chipStandby && (
          <div className={`v ${s.wdWave}`} style={{ left: slotLeft("mult"), top: "7%", width: 72, height: 72, marginLeft: 0, marginTop: 0, animation: "dEsWave 650ms ease-out both", pointerEvents: "none" }} />
        )}
        {/* echo's ×2 chip PARKED at the corner slot — renders from the moment the
            flight lands until the real multiplier chip appears (mult > 1). In R7
            it holds its slot while R7's ×2 flies in to fuse with it. */}
        {(echoParked || echoParkedR7) && (
          <div className={`v ${s.esChip}`} style={{ left: slotLeft("mult"), top: "7%", transition: "left 450ms cubic-bezier(.2,1,.3,1)", pointerEvents: "none" }}>
            <div className={`v ${s.multChipBurstB}`} />
            <div className={`v ${s.multChipBurstW}`} />
            <div className={`v ${s.multChipLive}`} style={{ transform: "rotate(-4deg)" }}>
              <div className={`v ${s.multChipFace}`} style={{ backgroundColor: "#FCEE21" }} />
              <div className={`t ${s.multChipTxt}`} style={{ color: "#111" }}>×2</div>
            </div>
          </div>
        )}
        {/* echo's ×2 chip DYING — spent at the end of its turn with no score */}
        {echoChipDying && (
          <>
            <div className={`v ${s.esChip}`} style={{ left: slotLeft("mult"), top: "7%", animation: "dChipDeath 650ms ease-in both", pointerEvents: "none" }}>
              <div className={`v ${s.multChipBurstB}`} />
              <div className={`v ${s.multChipBurstW}`} />
              <div className={`v ${s.multChipLive}`} style={{ transform: "rotate(-4deg)" }}>
                <div className={`v ${s.multChipFace}`} style={{ backgroundColor: "#FCEE21" }} />
                <div className={`t ${s.multChipTxt}`} style={{ color: "#111" }}>×2</div>
              </div>
            </div>
            <div className={`v ${s.wdWave}`} style={{ left: slotLeft("mult"), top: "7%", width: 72, height: 72, marginLeft: 0, marginTop: 0, animation: "dEsWave 600ms 120ms ease-out both", pointerEvents: "none" }} />
          </>
        )}

        {/* eclipse's shield chip DYING — last turn used up, halves blast apart */}
        {shieldChipDying && (
          <div className={`v ${s.esChip}`} style={{ left: slotLeft("shield"), top: "7%", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div className={`v ${s.shieldChipArt}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.shieldChipBack}`} />
              <div className={`v ${s.shieldHalfL}`} style={{ animation: "dShieldDeathL 650ms cubic-bezier(.5,0,.8,.4) both" }} />
              <div className={`v ${s.shieldHalfR}`} style={{ animation: "dShieldDeathR 650ms cubic-bezier(.5,0,.8,.4) both" }} />
              <div className={`v ${s.shieldChipCount}`} style={{ animation: "dVdFadeOut 450ms 120ms both" }}>
                <div className={`t ${s.shieldChipCountTxt}`}>0</div>
              </div>
            </div>
          </div>
        )}

        {/* eclipse's shield chip PARKED at its slot until the real one appears */}
        {shieldStandby && !(shieldOff > 0) && !eclipseBeatNow && (
          <div className={`v ${s.esChip}`} style={{ left: slotLeft("shield"), top: "7%", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div className={`v ${s.shieldChipArt}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.shieldChipBack}`} />
              <div className={`v ${s.shieldHalfL}`} />
              <div className={`v ${s.shieldHalfR}`} />
              <div className={`v ${s.shieldChipCount}`}>
                <div className={`t ${s.shieldChipCountTxt}`}>2</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- player zone ---------- */}
      <div className={`v ${s.playerZone}`}>
        <div className={`v ${s.handCol}`}>
          {error && (
            <div className={`v ${s.errorWrap}`}>
              <div className={`t ${s.errorTxt}`}>SIGNAL LOST — {error}</div>
              <div className={`press ${s.retryBtn}`} onMouseEnter={playHover} onClick={onRetryAi}>
                <div className={`t ${s.bigBtnTxt}`}>RETRY ▶</div>
              </div>
            </div>
          )}
          {phase === "commit" && !p1Locked && !error && (
            <div className={`v ${s.moveBanner}`} style={{ animation: "dPulse 1.6s ease-in-out infinite" }}>
              <div className={`t ${s.moveTxt}`}>{tricksMode ? "PLAY THE NEW CARD" : "YOUR MOVE"}</div>
            </div>
          )}

          {/* THE HAND — fanned (outer layer flies in, inner layer carries the fan/hover transform) */}
          <div className={`v ${s.handRow}`}>
            {p1Hand.map((c, i) => (
              <HandCard
                key={c.id}
                c={c}
                i={i}
                total={p1Hand.length}
                interactive={phase === "commit" && !p1Locked && !error && (!tricksMode || c.id === trickTargetId)}
                highlight={tricksMode && c.id === trickTargetId}
                onPick={onPick}
              />
            ))}
          </div>
        </div>

        {/* (the peek note retired — the peek star's own tag carries the label) */}
        {/* (round advance is automatic — no next-round button) */}
      </div>

      {/* ---------- ROUND WIPE — the P5 sweep that opens the next round ---------- */}
      {roundAdv !== null && <RoundWipe n={roundAdv} total={TOTAL_ROUNDS} />}

      {/* ---------- ANIM LAB (demo only, collapsible) ---------- */}
      {demoMode && labOpen && (
        <div className={`v ${s.demoPanel}`}>
          <div className={`v`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <div className={`t ${s.demoPanelTitle}`} style={{ marginBottom: 0 }}>ANIM LAB · LOOP</div>
            <div className={`press ${s.demoPanelToggle}`} onMouseEnter={playHover} onClick={() => setLabOpen(false)}>
              <div className={`t ${s.demoPanelToggleTxt}`}>▾</div>
            </div>
          </div>
          <div className={`v ${s.demoGrid}`}>
            {DEMO_SCENARIOS.map((sc) => (
              <div
                key={sc.key}
                className={`press ${s.demoBtn} ${demoKeyRef.current === sc.key ? s.demoBtnActive : ""}`}
                onMouseEnter={playHover}
                onClick={() => { playClick(); runDemo(sc.key); }}
              >
                <div className={`t ${s.demoBtnTxt}`}>{sc.label}</div>
              </div>
            ))}
          </div>
          <div className={`press ${s.demoExit}`} onMouseEnter={playHover} onClick={() => { playClick(); router.replace("/campaign"); }}>
            <div className={`t ${s.demoBtnTxt}`}>◀ EXIT LAB</div>
          </div>
        </div>
      )}
      {demoMode && !labOpen && (
        <div className={`press ${s.demoPanelMini}`} onMouseEnter={playHover} onClick={() => setLabOpen(true)}>
          <div className={`t ${s.demoBtnTxt}`}>▶ ANIM LAB</div>
        </div>
      )}

      {/* ---------- EXECUTIONER TAKEOVER — full-screen All-Out-Attack ---------- */}
      {cur?.kind === "trick" && (cur.trick === "executioner" || cur.trick === "execfail") && (
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
        <div className={`press ${s.infoBackdrop}`} style={{ animation: "dInfoFade 200ms ease-out both" }} onClick={() => setStatusInfo(null)}>
          <div
            className={`press ${s.infoPanel}`}
            style={{ animation: "dInfoPop 440ms cubic-bezier(.34,1.5,.64,1) both" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`v ${s.infoTitleBar}`}>
              <div className={`v ${s.infoTitleBadge}`}>
                {statusInfo === "mult"
                  ? <div className={`t ${s.infoTitleBadgeTxt}`}>×{mult}</div>
                  : statusInfo === "peek" || statusInfo === "peekKlein"
                    ? <Sparkle size={22} color={statusInfo === "peek" ? "#ffe98a" : "#ff9a9a"} />
                    : <BrokenShieldMark w={22} h={26} />}
              </div>
              <div className={`t ${s.infoTitle}`}>{statusInfo === "mult" ? "CLASH MULTIPLIER" : statusInfo === "shield" ? "SHIELDS OFF" : statusInfo === "peek" ? "YOUR PEEK" : "YOUR HAND SEEN"}</div>
            </div>
            <div className={`v ${s.infoInner}`}>
              {statusInfo === "peek" ? (
                <>
                  <div className={`v ${s.peekCardsRow}`}>
                    {oppPeeked.map((c, i) => (
                      <div key={`${c.id}-${i}`} className={`v ${s.playCard}`} style={{ transform: `rotate(${i % 2 ? 2.5 : -2.5}deg)` }}>
                        <CardFace card={c} />
                      </div>
                    ))}
                  </div>
                  <div className={`t ${s.infoBody}`}>Klein's hand when you played Oracle. He may have played some of these since — the peek shows what you saw, not what he holds now.</div>
                </>
              ) : statusInfo === "peekKlein" ? (
                <div className={`t ${s.infoBody}`}>Klein played Oracle and committed {kleinPeekCount} of your cards to memory. He knows what you are holding — expect him to play around it. He cannot show you which, and neither can you.</div>
              ) : (
                <div className={`t ${s.infoBody}`}>{statusInfo === "mult" ? MULT_INFO : SHIELD_INFO}</div>
              )}
            </div>
            <div className={`press ${s.infoClose}`} onMouseEnter={playHover} onClick={() => setStatusInfo(null)}>
              <div className={`t ${s.infoCloseTxt}`}>GOT IT</div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- result overlay ---------- */}
      {phase === "over" && finalResult && (
        <div className={`v ${s.resultWrap}`}>
          <div className={`v ${s.resultPanelL}`} style={{ animation: "dPanelL 380ms cubic-bezier(.2,1,.3,1) both" }} />
          <div className={`v ${s.resultPanelR}`} style={{ animation: "dPanelR 380ms cubic-bezier(.2,1,.3,1) both" }} />
          <div className={`v ${s.resultContent}`}>
            <div
              className={`t ${s.resultTitle}`}
              style={{ color: finalResult === "win" ? "#FCEE21" : "#fff", animation: "dTitleSlam 520ms cubic-bezier(.2,1,.3,1) both" }}
            >
              {finalResult === "win" ? "PACIFIED!" : finalResult === "loss" ? "DEFEAT" : "DRAW"}
            </div>
            <div className={`t ${s.resultScore}`}>FINAL {p1Score} — {p2Score}{finalResult === "win" && round < TOTAL_ROUNDS ? " · THRESHOLD" : ""}</div>
            <div className={`t ${s.resultSaved}`}>{saved ? "RESULT SAVED" : "OFFLINE — RESULT NOT SAVED"}</div>
            <div className={`v ${s.resultBtns}`}>
              <div className={`press ${s.bigBtn}`} onMouseEnter={playHover} onClick={onRematch}>
                <div className={`t ${s.bigBtnTxt}`}>REMATCH ▶</div>
              </div>
              {encounter.current && (
                <div className={`press ${s.bigBtnGhost}`} onMouseEnter={playHover}
                  onClick={() => { playClick(); router.replace(`/story?encounter=${encounter.current!.id}&after=1`); }}
                  data-testid="story-continue">
                  <div className={`t ${s.bigBtnGhostTxt}`}>CONTINUE ▶</div>
                </div>
              )}
              <div className={`press ${s.bigBtnGhost}`} onMouseEnter={playHover} onClick={() => { playClick(); router.replace("/campaign"); }}>
                <div className={`t ${s.bigBtnGhostTxt}`}>CAMPAIGN</div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* ---------- GIMMICK COURSE OVERLAY — same 1600×900 plane as the stage ---------- */}
      {tricksMode && (
        <div className={tTrick.tutorialLayer} style={{ transform: `scale(${stageScale})` }}>
          <div className={`v ${tTrick.rack}`} style={{ pointerEvents: "none" }}>
            <div className={`t ${tTrick.rackLbl}`}>GIMMICK DECK</div>
            <div className={`v ${tTrick.rackRow}`}>
              {TRICK_ORDER.map((id, i) => {
                const c = cardById(id);
                const on = i <= trickIndex;
                return (
                  <div key={id} className={tTrick.rackCell}>
                    <div className={`v ${tTrick.rackSlot} ${on ? tTrick.rackSlotOn : ""} ${i === trickIndex ? tTrick.rackCurrent : ""}`}>
                      {on && <div className={tTrick.rackScale}><CardFace card={c} /></div>}
                    </div>
                    {on && <div className={tTrick.rackName}>{c.name.toUpperCase()}</div>}
                    {i === trickIndex && <div className={tTrick.rackNew}>NEW</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`v ${v.victorDock} ${trickPhase === "reveal" ? tTrick.victorHidden : ""}`}>
            {(Object.keys(VICTOR_PORTRAITS) as VictorPose[]).map((p) => (
              <div
                key={p}
                className={`v ${v.victorImg}`}
                style={{ backgroundImage: `url("${VICTOR_PORTRAITS[p]}")`, opacity: p === trickPose ? 1 : 0 }}
              />
            ))}
          </div>

          {trickLine && (
            <div className={`v ${v.coachBubble}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${s.bubblePanel}`}>
                <div className={`v ${s.bubbleFace}`}>
                  <div className={`t ${s.bubbleTxt}`}>
                    {trickFull.slice(0, trickChars)}
                    {!trickDone && <span className={v.caret}>▍</span>}
                  </div>
                  {trickDone && (
                    <div className={`t ${v.coachHint} ${trickPhase === "setup" ? v.coachHintPick : ""}`}>
                      {trickPhase === "setup" ? "CLICK THE HIGHLIGHTED CARD" : "TAP ANYWHERE"}
                    </div>
                  )}
                </div>
              </div>
              <div className={`v ${s.bubbleTag}`}><div className={`t ${s.bubbleTagTxt}`}>VICTOR</div></div>
              <div className={v.coachTail} aria-hidden />
            </div>
          )}

          {trickPhase === "explain" && (
            <div className={tTrick.tapLayer} onClick={tutorialAdvance} />
          )}

          {trickLogOpen && (
            <div className={`v ${tut.logOverlay}`} onClick={(e) => { e.stopPropagation(); setTrickLogOpen(false); }}>
              <div className={`v ${tut.logPanel}`} onClick={(e) => e.stopPropagation()} data-testid="tutorial-tricks-log-panel">
                <div className={`v ${tut.logHead}`}>
                  <div className={`t ${tut.logKicker}`}>ORIENTATION RECORD // VX—00</div>
                  <div className={`v ${tut.logTitleRow}`}>
                    <div className={`t ${tut.logTitle}`}>WHAT WAS SAID</div>
                    <div
                      className={`v ${tut.logCloseBtn} press`}
                      onMouseEnter={playHover}
                      onClick={() => setTrickLogOpen(false)}
                      role="button"
                      tabIndex={0}
                      aria-label="Close orientation log"
                      data-testid="tutorial-tricks-log-close"
                      onKeyDown={(e) => {
                        if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); setTrickLogOpen(false); }
                      }}
                    >
                      <div className={`t ${tut.logCloseTxt}`}>CLOSE ✕</div>
                    </div>
                  </div>
                </div>
                <div className={`v ${tut.logScroll}`}>
                  {trickHistory.length === 0 ? (
                    <div className={`t ${tut.logEmpty}`}>NOTHING ON RECORD YET.</div>
                  ) : trickHistory.map((entry) => (
                    <div key={entry.id} className={`v ${tut.logEntry} ${entry.speaker === "YOU" ? tut.logEntryYou : ""}`}>
                      <div className={`v ${tut.logWho}`}>
                        <div className={`t ${tut.logWhoTxt} ${entry.speaker === "YOU" ? tut.logWhoYou : ""}`}>{entry.speaker}</div>
                      </div>
                      <div className={`t ${tut.logLine}`}>{entry.text}</div>
                    </div>
                  ))}
                </div>
                <div className={`v ${tut.logFoot}`}>
                  <div className={`t ${tut.logFootTxt}`}>
                    ORIENTATION RECORD — {String(trickHistory.filter((e) => e.speaker === "VICTOR").length).padStart(2, "0")} ENTRIES
                  </div>
                  <div className={`t ${tut.logFootHint}`}>ESC / TAP OUTSIDE TO CLOSE</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tricksMode && !trickLogOpen && (
        <div className={v.logDock}>
          <div
            className={`v ${tut.logBtn} press`}
            onMouseEnter={playHover}
            onClick={(e) => { e.stopPropagation(); openTrickLog(); }}
            role="button"
            tabIndex={0}
            aria-label="Open orientation log"
            data-testid="tutorial-tricks-log"
            onKeyDown={(e) => {
              if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); openTrickLog(); }
            }}
          >
            <div className={`t ${tut.logBtnTxt}`}>▤ LOG</div>
          </div>
        </div>
      )}

      {/* ---------- TABLE LOG — real-pixel clash case file (outside the scaled stage) ---------- */}
      {logOpen && (
        <TableLogOverlay
          closing={logClosing}
          rows={playLog}
          oppName={opp.name}
          currentRound={round}
          onClose={closeLog}
        />
      )}

      {/* ---------- PAUSE — corner button + system modal (settings / forfeit / continue) ---------- */}
      {!tricksMode && phase !== "over" && !pauseOpen && !logOpen && (
        <button type="button" className={`press ${s.pauseBtn}`} onMouseEnter={playHover} onClick={openPause} aria-label="Pause">
          <P5Image src="/ui/pause.png" resizeMode="contain" className={s.pauseIcoImg} />
        </button>
      )}
      {pauseOpen && (
        <div className={`v ${s.pauseWrap} ${pauseClosing ? s.pauseClosing : ""}`} onClick={closePause}>
          <div className={`v ${s.pauseCuts}`} aria-hidden="true">
            <div className={`v ${s.pauseCutA}`} />
            <div className={`v ${s.pauseCutB}`} />
            <div className={`v ${s.pauseCutC}`} />
          </div>
          <section
            ref={pauseDialogRef}
            className={`v ${s.pausePanel}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={`v ${s.pauseHead}`}>
              <div className="v" style={{ flex: 1, minWidth: 0 }}>
                <div className={`t ${s.pauseKicker}`}>DUEL // SYSTEM INTERRUPT</div>
                <h2 id="pause-title" className={`t ${s.pauseTitle}`}>PAUSED</h2>
                <div className={`t ${s.pauseMeta}`}>ROUND {String(round).padStart(2, "0")} / 07</div>
                <div className={`t ${s.pauseSideNote}`}>TAKE FIVE.<br />THE TABLE CAN WAIT.</div>
              </div>
            </header>
            <button type="button" className={`press ${s.pClose}`} onMouseEnter={playHover} onClick={closePause} aria-label="Close pause menu">
              <span className={`ti ${s.pCloseTxt}`}>✕</span>
            </button>
            {forfeitConfirm ? (
              <div className={`v ${s.pConfirm}`}>
                <svg className={`t ${s.pConfirmIco}`} viewBox="0 0 24 24" aria-hidden="true"><path className="st" d="M6 3 V21" /><path className="fl" d="M6 4 H19 L15.5 8.5 L19 13 H6 Z" /></svg>
                <div className={`t ${s.pConfirmTxt}`}>FORFEIT THE DUEL?</div>
                <div className={`t ${s.pConfirmCopy}`}>This duel will end and you will return to campaign.</div>
                <div className={`v ${s.pConfirmRow}`}>
                  <button type="button" autoFocus className={`press ${s.pConfBtn} ${s.pConfNo}`} onMouseEnter={playHover} onClick={cancelForfeit}>STAY IN DUEL</button>
                  <button type="button" className={`press ${s.pConfBtn} ${s.pConfYes}`} onMouseEnter={playHover} onClick={doForfeit}>YES, FORFEIT</button>
                </div>
              </div>
            ) : (
              <>
              <div className={`v ${s.pauseBody}`}>
                <div className={`v ${s.pauseRows}`}>
                  {([
                    { key: "main", label: "MASTER", vol: opts.mainVol, muted: opts.mutedMain, volKey: "mainVol", muteKey: "mutedMain" },
                    { key: "bgm", label: "MUSIC", vol: opts.bgmVol, muted: opts.mutedBgm, volKey: "bgmVol", muteKey: "mutedBgm" },
                    { key: "sfx", label: "SFX", vol: opts.sfxVol, muted: opts.mutedSfx, volKey: "sfxVol", muteKey: "mutedSfx" },
                    { key: "voice", label: "VOICE", vol: opts.voiceVol, muted: opts.mutedVoice, volKey: "voiceVol", muteKey: "mutedVoice" },
                  ] as { key: string; label: string; vol: number; muted: boolean; volKey: keyof GameOptions; muteKey: keyof GameOptions }[]).map((b) => (
                    <div key={b.key} className={`v ${s.pRow}`}>
                      <div className={`t ${s.pBusLbl}`}>{b.label}</div>
                      <button
                        type="button"
                        className={`press ${s.pMute}`}
                        onMouseEnter={playHover}
                        onClick={() => updateOpts({ [b.muteKey]: !b.muted } as Partial<GameOptions>)}
                        aria-pressed={b.muted}
                        aria-label={`${b.muted ? "Unmute" : "Mute"} ${b.label.toLowerCase()}`}
                      >
                        <IcoBus bus={b.key} muted={b.muted} />
                        <span className={`ti ${s.pMuteTxt}`}>{b.muted ? "OFF" : "ON"}</span>
                      </button>
                      <PauseSlider value={b.muted ? 0 : b.vol} label={b.label} onPick={(v) => updateOpts({ [b.volKey]: v } as Partial<GameOptions>)} />
                      <div className={`t ${s.pVal} ${b.muted ? s.pValMuted : ""}`}>{b.muted ? "MUTED" : `${b.vol}%`}</div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`press ${s.pFs}`}
                    onMouseEnter={playHover}
                    onClick={toggleFs}
                    aria-pressed={fsOn}
                    aria-label="Fullscreen"
                  >
                    <IcoFs />
                    <span className={`ti ${s.pFsLbl}`}>FULLSCREEN</span>
                    <span className={`ti ${s.pFsState}`}>{fsOn ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>
              <div className={`v ${s.pauseActions}`}>
                <button type="button" className={`press ${s.pContinue}`} onMouseEnter={playHover} onClick={closePause}>
                  <span className={`v ${s.pContinueIco}`} aria-hidden="true"><P5Image src="/ui/play.png" resizeMode="contain" style={{ width: "100%", height: "100%" }} /></span>
                  CONTINUE DUEL
                </button>
                <button type="button" className={`press ${s.pForfeit}`} onMouseEnter={playHover} onClick={() => { playClick(); setForfeitConfirm(true); }}>FORFEIT DUEL</button>
              </div>
              </>
            )}
          </section>
        </div>
      )}
      </div>
    </IonPage>
  );

}

/* ---------- TABLE LOG — discard pile + played-cards overview ---------- */

/* The pile at the table's bottom-right: a dashed empty slot on a clean table,
   then the played stack (mini card backs) grows with every reveal. */
function TableLogPile({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <div
      className={`press ${s.logPile}`}
      onMouseEnter={playHover}
      onClick={onOpen}
      style={{ animation: "dPileIn 420ms cubic-bezier(.2,1,.3,1) both" }}
    >
      {Array.from({ length: Math.min(3, count) }).map((_, i) => (
        <div key={`g${i}`} className={`v ${s.logPileGhost}`} style={{ transform: `translate(${(i + 1) * 3}px, ${(i + 1) * -3}px) rotate(${4 + i * 3}deg)` }} />
      ))}
      {count === 0 ? (
        <div className={`v ${s.logPileSlot}`}><div className={`t ${s.logPileSlotTxt}`}>?</div></div>
      ) : (
        <div key={`top-${count}`} className={`v ${s.logPileTop}`} style={{ animation: "dPileDrop 380ms cubic-bezier(.2,1,.3,1) both" }}>
          <div className={`v ${s.logMiniBack}`}>
            <div className={`v ${s.logMiniBackStripeA}`} style={{ pointerEvents: "none" }} />
            <div className={`v ${s.logMiniBackStripeB}`} style={{ pointerEvents: "none" }} />
            <div className={`t ${s.logMiniBackSuit}`}>♠</div>
          </div>
        </div>
      )}
      <div key={`tag-${count}`} className={`v ${s.logPileTag}`} style={{ animation: "dNumSlam 240ms 110ms cubic-bezier(.2,1,.3,1) both" }}>
        <div className={`t ${s.logPileTagTxt}`}>×{count * 2}</div>
      </div>
      <div className={`v ${s.logPileLbl}`}><div className={`t ${s.logPileLblTxt}`}>TABLE LOG</div></div>
    </div>
  );
}

/* The clash case file: a round rail (R1–R7) beside one large selected-clash
   record. Read-only: rows exist only after a round ends, so nothing here can
   spoil a locked pick. Selection opens on the latest completed round and never
   auto-jumps while the player is reading. */
function TableLogOverlay({ closing, rows, oppName, currentRound, onClose }: {
  closing: boolean; rows: PlayLogRow[]; oppName: string; currentRound: number; onClose: () => void;
}) {
  const dialogRef = useDialogFocus(!closing, onClose);
  const [selectedRound, setSelectedRound] = useState(() => rows[rows.length - 1]?.round ?? currentRound);
  const selected = rows.find((row) => row.round === selectedRound);
  const outcomeOf = (row: PlayLogRow) => row.youPts === row.kleinPts ? "TIED" : row.youPts > row.kleinPts ? "WON" : "LOST";
  const outcome = selected ? outcomeOf(selected) : null;
  return (
    <div
      className={`v ${s.logWrap} ${closing ? s.logClosing : ""}`}
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        className={`v ${s.logPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={`v ${s.logHead}`}>
          <div className={`v ${s.logHeadTag}`}><div className={`t ${s.logHeadTagTxt}`}>TABLE LOG</div></div>
          <div className="v" style={{ flex: 1, minWidth: 0 }}>
            <h2 id="log-title" className={`t ${s.logTitle}`}>CLASH ARCHIVE</h2>
            <div className={`t ${s.logProg}`}>YOU VS {oppName}</div>
          </div>
          <div className={`t ${s.logHeadNo}`} aria-hidden="true">FILE // 01—07</div>
          <button type="button" className={`press ${s.logClose}`} onMouseEnter={playHover} onClick={onClose} aria-label="Close table log">
            <span className={`ti ${s.logCloseTxt}`}>✕</span>
          </button>
        </header>
        {rows.length === 0 ? (
          <div className={`v ${s.logEmpty}`}>
            <div className={`t ${s.logEmptyNo}`} aria-hidden="true">00</div>
            <div className={`t ${s.logEmptyTag}`}>WAITING FOR EVIDENCE</div>
            <div className={`t ${s.logEmptyTxt}`}>NO CLASH DATA</div>
            <div className={`t ${s.logEmptySub}`}>Finish a round. The cards will be filed here.</div>
          </div>
        ) : (
          <div className={`v ${s.logBody}`}>
            <nav className={`v ${s.logRoundRail}`} aria-label="Rounds">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => {
                const row = rows.find((x) => x.round === r);
                const inPlay = !row && r === currentRound;
                const oc = row ? outcomeOf(row) : null;
                return (
                  <button
                    key={r}
                    type="button"
                    className={`press ${s.logRoundBtn}`}
                    disabled={!row}
                    aria-pressed={selectedRound === r}
                    onClick={() => { playClick(); setSelectedRound(r); }}
                  >
                    <span className={`ti ${s.logRoundNum}`}>R{r}</span>
                    <span className={`ti ${s.logRoundState} ${oc === "WON" ? s.logStateWon : oc === "LOST" ? s.logStateLost : oc === "TIED" ? s.logStateTied : ""}`}>
                      {oc ?? (inPlay ? "IN PLAY" : "LOCKED")}
                    </span>
                    {row && <span className={`ti ${s.logRoundScore}`}>{row.youScore}–{row.kleinScore}</span>}
                  </button>
                );
              })}
            </nav>
            <section className={`v ${s.logDetail}`} aria-live="polite">
              {selected && (
                <div key={selected.round} className={`v ${s.logDetailInner}`}>
                  <div className={`t ${s.logDetailKicker}`}>ROUND {selected.round} // CLASH RECORD</div>
                  <div className={`v ${s.logClashCards}`}>
                    <div className={`v ${s.logSide}`}>
                      <div className={`t ${s.logSideLbl}`}>YOU</div>
                      <div className={`v ${s.logCardW} ${outcome === "WON" ? s.logCardWon : ""}`}>
                        <CardFace card={selected.you} />
                      </div>
                      <div className={`t ${s.logPtsBig} ${selected.youPts === 0 ? s.logPtsZero : ""}`}>+{selected.youPts}</div>
                    </div>
                    <div className={`t ${s.logVsBig}`}>VS</div>
                    <div className={`v ${s.logSide}`}>
                      <div className={`t ${s.logSideLbl}`}>{oppName}</div>
                      <div className={`v ${s.logCardW} ${outcome === "LOST" ? s.logCardWon : ""}`}>
                        <CardFace card={selected.klein} />
                      </div>
                      <div className={`t ${s.logPtsBig} ${selected.kleinPts === 0 ? s.logPtsZero : ""}`}>+{selected.kleinPts}</div>
                    </div>
                  </div>
                  <div className={`v ${s.logStamp} ${outcome === "WON" ? s.logStampYou : outcome === "LOST" ? s.logStampOpp : s.logStampTie}`}>
                    <div className={`t ${s.logStampTxt}`}>
                      {outcome === "WON" ? "YOU TOOK THE CLASH" : outcome === "LOST" ? `${oppName} TOOK THE CLASH` : "CLASH TIED"}
                    </div>
                  </div>
                  {selected.note && <div className={`t ${s.logNote}`}>{selected.note}</div>}
                  <div className={`t ${s.logTotal}`}>TOTAL {selected.youScore} — {selected.kleinScore}</div>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

/* hand card — hover/press mirror the RN Pressable render-prop exactly */
function HandCard({ c, i, total, interactive, highlight, onPick }: { c: Card; i: number; total: number; interactive: boolean; highlight?: boolean; onPick: (c: Card) => void }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const rot = fanAngleOf(i, total);
  const hot = interactive && (hovered || pressed);
  return (
    <div className="v" style={{ animation: `dHandIn 420ms ${i * 55}ms cubic-bezier(.2,1,.3,1) both` }}>
      <div
        className={`press ${s.cardBtn} ${(!interactive) ? s.cardDim : ""} ${hot && hovered ? s.cardHover : ""} ${highlight ? v.target : ""}`}
        onMouseEnter={() => { setHovered(true); playHover(); }}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onClick={() => { if (interactive) onPick(c); }}
        style={{
          transform: hot
            ? `rotate(0deg) translateY(${hovered ? -34 : -26}px) scale(${hovered ? 1.14 : 1.06})`
            : `rotate(${rot}deg) translateY(${-Math.abs(rot) * 1.6}px)`,
        }}
      >
        <CardFace card={c} />
        {highlight && <div className={v.playRibbon}><div className={`t ${v.playRibbonTxt}`}>PLAY</div></div>}
      </div>
    </div>
  );
}
const fanAngleOf = (i: number, n: number) => (i - (n - 1) / 2) * 5;
/* Played card on the felt — face-down until reveal, then REALLY flips: the back
   swings away on its hinge while the face rotates in from the other side. */
export function PlayCard({ card, revealed, opp }: { card: Card; revealed: boolean; opp?: boolean }) {
  if (revealed) {
    return (
      <div className={`v ${s.playCard}`}>
        <div className="v" style={{ width: "100%", height: "100%", animation: "dFlipFace 380ms 210ms cubic-bezier(.2,1,.3,1) both" }}>
          <CardFace card={card} />
        </div>
        <div className="v" style={{ pointerEvents: "none", position: "absolute", inset: 0, animation: "dFlipBack 260ms cubic-bezier(.55,0,.85,.4) both" }}>
          <CardBack opp={opp} />
        </div>
      </div>
    );
  }
  return (
    <div className={`v ${s.playCard}`}>
      <CardBack opp={opp} />
    </div>
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
    <div className={`v ${s.tkLetters}`}>
      {word.split("").map((ch, i) => (
        <div
          key={i}
          className={`t ${s.tkLetter}`}
          style={{
            fontSize: size * (0.88 + jit(i, 1) * 0.28), color,
            transform: `rotate(${(jit(i, 2) - 0.5) * 14}deg) translateY(${(jit(i, 3) - 0.5) * 26}px)`,
            animation: `dLetterSlam 320ms ${delay + i * 55}ms cubic-bezier(.2,1,.3,1) both`,
          }}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

/* EXECUTIONER TAKEOVER — full-screen All-Out-Attack: diagonal panels slash the game
   away, a guillotine falls over the victim's huge score, the number splits in 3D,
   giant letters stamp the verdict, then the panels hand the game back. */
export function ExecTakeover({ mode, victimSide, victimScore, targetCard }: {
  mode: "exec" | "misfire"; victimSide: "p1" | "p2"; victimLabel: string; victimScore: number; targetCard?: Card; oppName: string;
}) {
  const accent = victimSide === "p1" ? "#FCEE21" : "#FF4D5E";
  const fail = mode === "misfire";
  const panelAnim = (side: "L" | "R") =>
    ({ animation: `dTkPanel${side} 340ms cubic-bezier(.7,0,.3,1) both, dTkPanelOut${side} 430ms ${fail ? 3300 : 3820}ms cubic-bezier(.7,0,.3,1) both` });
  // the meter shows the target's power — a number card's power, or 0 for a trick (nothing to cut)
  const targetPower = targetCard?.kind === "number" ? targetCard.power : 0;
  // shared sentencing meter, mounted ABOVE the rig in both modes — in success the
  // fill crosses into the crimson zone and stamps THRESHOLD MET; in fail it stalls short.
  const meter = (met: boolean, fillDelay: number, numDelay: number, baseDelay: number) => (
    <div className={`v ${s.tkMeterWrap}`}>
      <div className={`t ${s.tkMeterLbl}`}>SENTENCING POWER</div>
      <div className={`v ${s.tkMeterBar}`}>
        <div className={`v ${s.tkMeterZone}`} style={met ? { animation: "dZonePulse 320ms 1560ms cubic-bezier(.2,1,.3,1) 3" } : undefined} />
        <div
          className={`v ${s.tkMeterFill}`}
          style={{ width: `${(targetPower / 12) * 100}%`, animation: `dMeterFill 900ms ${fillDelay}ms cubic-bezier(.2,1,.3,1) both`, transformOrigin: "left center" }}
        />
        {[...Array(11)].map((_, i) => (
          <div key={i} className={`v ${s.tkMeterTick}`} style={{ left: `${((i + 1) / 12) * 100}%` }} />
        ))}
        <div className={`t ${s.tkMeterNum}`} style={{ left: `${((targetPower / 12) * 100 - 4).toFixed(1)}%`, animation: `dNumSlam 340ms ${numDelay}ms cubic-bezier(.2,1,1.6,1) both` }}>{targetPower}</div>
        {met && (
          <div className={`v ${s.tkMeterMet}`} style={{ animation: `dStampIn 460ms ${baseDelay}ms cubic-bezier(.2,1,.3,1) both` }}>
            <div className={`t ${s.tkMeterMetTxt}`}>THRESHOLD MET</div>
          </div>
        )}
      </div>
      <div className={`v ${s.tkMeterCaptionRow}`}>
        <div className={`t ${s.tkMeterCaption}`}>{met ? "GUILTY" : "TOO LOW"}</div>
        <div className={`v ${s.tkMeterCaptionSpacer}`} />
        <div className={`t ${s.tkMeterCaption}`} style={{ color: met ? "#E60012" : "#FCEE21" }}>7+ DROPS THE BLADE</div>
      </div>
    </div>
  );
  return (
    <div className={`v ${s.tkRoot}`} style={{ pointerEvents: "none", animation: `dTkShake 460ms ${fail ? 1560 : 2530}ms cubic-bezier(.2,1,.3,1)` }}>
      <div className={`v ${s.tkPanel} ${s.tkPanelL}`} style={panelAnim("L")} />
      <div className={`v ${s.tkPanel} ${s.tkPanelR}`} style={panelAnim("R")} />
      <div className={`v ${s.tkSlash}`} style={{ animation: `dTkSlashIn 260ms 180ms ease-out both, dTkSlashOut 380ms ${fail ? 3300 : 3820}ms ease-in both` }} />
      <div className={`v ${s.tkContent}`} style={{ animation: `dTkFadeIn 240ms 300ms ease-out both, dTkFadeOut 300ms ${fail ? 3190 : 3710}ms ease-in both` }}>
        <div className={`v ${s.tkStripes}`} />
        <div className={`t ${s.tkKicker}`}>{fail ? "SENTENCING" : "FINAL VERDICT"}</div>

        {fail ? (
          <>
            {/* the sentencing meter ABOVE the rig — the fill stalls short of the
                crimson drop zone, so the blade below only strains, then gives up. */}
            {meter(false, 620, 1420, 0)}
            {/* the SAME full-size guillotine — the star of this verdict. It waits,
                strains against the latch... and never drops: SPARED. */}
            <div className={`v ${s.tkGuillotine}`} style={{ top: 330 }}>
              <div className={`v ${s.tkPostG}`} />
              <div className={`v ${s.tkPostG}`} style={{ left: 446 }} />
              <div className={`v ${s.tkCap}`} />
              <div className={`v ${s.tkPulley}`}>
                <div className={`v ${s.tkWheel}`} />
              </div>
              <div className={`v ${s.tkRope}`} style={{ animation: "dTkRopeStrain 900ms 1560ms ease-in-out both" }} />
              <div className={`v ${s.tkMouton}`} style={{ animation: "dTkBladeHold 560ms 1420ms ease-in-out both, dTkBladeStrain 900ms 1560ms ease-in-out both" }}>
                <div className={`v ${s.tkMoutonRivets}`} />
                <div className={`v ${s.tkEdge}`} />
              </div>
              <div className={`v ${s.tkBaschet}`} />
            </div>
            <div className={`v ${s.tkVerdict}`} style={{ top: 640 }}>
              <div className={`v ${s.tkBurstB}`} style={{ backgroundColor: "#111", animation: "dStampIn 480ms 2050ms cubic-bezier(.2,1,.3,1) both" }} />
              <div className={`v ${s.tkBurstW}`} style={{ animation: "dStampIn 480ms 2090ms cubic-bezier(.2,1,.3,1) both" }} />
              <div className={`v ${s.tkBurst}`} style={{ backgroundColor: "#E60012", animation: "dStampIn 480ms 2130ms cubic-bezier(.2,1,.3,1) both" }} />
              {p5Letters("SPARED", 2210, 84, "#fff")}
              <div className={`t ${s.tkZero}`} style={{ color: "#fff", animation: "dNumSlam 340ms 2560ms cubic-bezier(.2,1,.3,1) both" }}>SCORES BELOW 7 ESCAPE THE BLADE</div>
            </div>
          </>
        ) : (
          <>
            {/* the sentencing meter ABOVE the rig — the fill crosses into the
                crimson zone, THRESHOLD MET stamps on, and the blade answers. */}
            {meter(true, 620, 1420, 1600)}
            {/* the rig — a REAL guillotine: grooved posts, capping beam, pulley + rope,
                weighted mouton with the angled blade hanging under it */}
            <div className={`v ${s.tkGuillotine}`} style={{ top: 310 }}>
              <div className={`v ${s.tkPostG}`} />
              <div className={`v ${s.tkPostG}`} style={{ left: 446 }} />
              <div className={`v ${s.tkCap}`} />
              <div className={`v ${s.tkPulley}`}>
                <div className={`v ${s.tkWheel}`} />
              </div>
              <div className={`v ${s.tkRope}`} style={{ animation: "dTkRopeSlack 190ms 2350ms cubic-bezier(.6,0,.9,.4) both" }} />
              <div className={`v ${s.tkMouton}`} style={{ animation: "dTkBladeHold 700ms 1650ms ease-in-out both, dTkBladeDrop 190ms 2350ms cubic-bezier(.6,0,.9,.4) both" }}>
                <div className={`v ${s.tkMoutonRivets}`} />
                <div className={`v ${s.tkEdge}`} />
              </div>
              <div className={`v ${s.tkBaschet}`} />
            </div>
            {/* the victim's score, huge — sits in the rig's throat so the falling
                blade cuts THROUGH it. The target card hangs beside it and is
                split in half along with the number when the blade lands. */}
            <div className={`v ${s.tkNumWrap}`} style={{ top: 470 }}>
              {targetCard && (
                <div className={`v ${s.tkTargetCard}`} style={{ animation: "dTkTargetIn 460ms 820ms cubic-bezier(.2,1,.3,1) both" }}>
                  <div className={`v ${s.tkTargetHalf} ${s.tkTargetHead}`} style={{ animation: "dTkTargetHead 850ms 2520ms cubic-bezier(.3,0,.7,1) both" }}><CardFace card={targetCard} /></div>
                  <div className={`v ${s.tkTargetHalf} ${s.tkTargetBody}`} style={{ animation: "dTkTargetBody 850ms 2520ms cubic-bezier(.3,0,.7,1) both" }}><CardFace card={targetCard} /></div>
                </div>
              )}
              <div className={`t ${s.tkNum}`} style={{ color: accent, animation: "dNumSlam 380ms 520ms cubic-bezier(.2,1,.3,1) both, dTkNumGone 60ms 2520ms both" }}>{victimScore}</div>
              <div className={`t ${s.tkNumHalf} ${s.tkNumHalfA}`} style={{ color: accent, animation: "dTkHalfA 750ms 2530ms cubic-bezier(.3,0,.6,1) both" }}>{victimScore}</div>
              <div className={`t ${s.tkNumHalf} ${s.tkNumHalfB}`} style={{ color: accent, animation: "dTkHalfB 750ms 2530ms cubic-bezier(.3,0,.6,1) both" }}>{victimScore}</div>
              <div className={`v ${s.tkCutLine}`} style={{ animation: "dTkCutFlash 320ms 2500ms ease-out both" }} />
            </div>
            <div className={`v ${s.tkVerdict}`} style={{ top: 690 }}>
              <div className={`v ${s.tkBurstB}`} style={{ backgroundColor: "#111", animation: "dStampIn 480ms 2720ms cubic-bezier(.2,1,.3,1) both" }} />
              <div className={`v ${s.tkBurstW}`} style={{ animation: "dStampIn 480ms 2760ms cubic-bezier(.2,1,.3,1) both" }} />
              <div className={`v ${s.tkBurst}`} style={{ backgroundColor: "#FCEE21", animation: "dStampIn 480ms 2800ms cubic-bezier(.2,1,.3,1) both" }} />
              {p5Letters("EXECUTED", 2880, 72, "#111")}
              <div className={`t ${s.tkZero}`} style={{ color: "#111", animation: "dNumSlam 340ms 3280ms cubic-bezier(.2,1,.3,1) both" }}>SCORE → 0</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
/* ROUND WIPE — the transition that opens every new round, full P5: a dark
   depth slab, the black lead bar and the fat crimson diagonal sweep in
   staggered; during the hold a starburst seal pops, ROUND slams in as chaos
   letters, the round number slams huge, yellow slices cut across, the count
   plate stamps... then the number SPLITS IN HALF and flies apart as the
   panels sweep out over the fresh table. */
function RoundWipe({ n, total }: { n: number; total: number }) {
  const climax = n === total;
  const accent = climax ? "#FCEE21" : "#fff";
  return (
    <div className={`v ${s.rwRoot}`} style={{ pointerEvents: "none" }}>
      {/* the dark depth slab — lags the crimson by a beat */}
      <div className={`v ${s.rwBack}`} style={{ animation: "dRwBack 2200ms cubic-bezier(.7,0,.3,1) both" }} />
      {/* the black lead bar — telegraphs the sweep by a beat */}
      <div className={`v ${s.rwLead}`} style={{ animation: "dRwLead 2200ms cubic-bezier(.7,0,.3,1) both" }} />
      {/* the fat crimson slab — the carrier of the whole sweep */}
      <div className={`v ${s.rwPanel}`} style={{ animation: "dRwPanel 2200ms cubic-bezier(.7,0,.3,1) both" }}>
        <div className={`v ${s.rwStripe}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.rwDots}`} style={{ pointerEvents: "none" }} />
      </div>
      {/* accent bars — thin yellow slices cutting across during the hold */}
      {[0, 1, 2].map((i) => (
        <div key={i} className={`v ${s.rwBar}`} style={{ top: `${14 + i * 27}%`, animation: `dRwBar 820ms ${560 + i * 150}ms cubic-bezier(.2,1,.3,1) both` }} />
      ))}
      {/* the verdict — starburst seal, chaos ROUND, the huge number */}
      <div className={`v ${s.rwContent}`}>
        <div className={`v ${s.rwBurstB}`} style={{ animation: "dRwBurst 560ms 580ms cubic-bezier(.34,1.5,.64,1) both, dRwBurstOut 480ms 1500ms cubic-bezier(.6,0,.8,.5) both" }} />
        <div className={`v ${s.rwBurstW}`} style={{ animation: "dRwBurst 560ms 615ms cubic-bezier(.34,1.5,.64,1) both, dRwBurstOut 480ms 1535ms cubic-bezier(.6,0,.8,.5) both" }} />
        <div className={`v ${s.rwBurst}`} style={{ animation: "dRwBurst 560ms 650ms cubic-bezier(.34,1.5,.64,1) both, dRwBurstOut 480ms 1570ms cubic-bezier(.6,0,.8,.5) both" }} />
        <div className={`t ${s.rwKicker}`} style={{ color: "#FCEE21", animation: "dNumSlam 360ms 480ms cubic-bezier(.2,1,.3,1) both" }}>NEXT</div>
        {p5Letters("ROUND", 700, 56, "#000")}
        <div className={`v ${s.rwNumWrap}`}>
          <div className={`t ${s.rwNum}`} style={{ color: accent, animation: "dRwNumSlam 520ms 760ms cubic-bezier(.2,1,.3,1) both, dRwNumGone 60ms 1480ms both" }}>
            {n}
          </div>
          <div className={`t ${s.rwNumHalf} ${s.rwNumHalfA}`} style={{ color: accent, animation: "dRwHalfA 640ms 1520ms cubic-bezier(.3,0,.6,1) both" }}>{n}</div>
          <div className={`t ${s.rwNumHalf} ${s.rwNumHalfB}`} style={{ color: accent, animation: "dRwHalfB 640ms 1520ms cubic-bezier(.3,0,.6,1) both" }}>{n}</div>
          <div className={`v ${s.rwCutLine}`} style={{ animation: "dTkCutFlash 320ms 1480ms ease-out both" }} />
        </div>
        <div className={`v ${s.rwOfRow}`} style={{ animation: "dStampIn 420ms 980ms cubic-bezier(.2,1,.3,1) both" }}>
          <div className={`t ${s.rwOfTxt}`}>{n} / {total}{climax ? " — CLIMAX ×2" : ""}</div>
        </div>
      </div>
    </div>
  );
}

/* ECHO — two-part beat, kept deliberately small (echo only voids the clash):
   1) rings emit from the echo card while a compact "CLASH VOIDED" stamp pops;
   2) the ×2 chip pops OUT of the echo card and curves into its corner-rack
   slot — the exact coordinates where the real chip renders next round, so
   the hand-off reads as the chip staying there. slotIdx comes from the rack:
   if another chip got there first, the lob simply lands one pitch further. */
export function EchoLoad({ youPlayed, slotIdx }: { youPlayed: boolean; slotIdx: number }) {
  const slotTop = youPlayed ? "38%" : "4%";
  return (
    // NOTE: no end-fade — the chip holds until unmount, then the persistent
    // standby chip (same spot, same look) takes over in the same frame.
    <div className={`v ${s.esWrap}`} style={{ pointerEvents: "none" }}>
      <div className={`v ${s.fx3d}`}>
        <div className={`v ${s.echoShockfield}`} style={{ animation: "dEchoShockfield 1500ms ease-out both" }} />
        {[0, 1, 2].map((i) => (
          <div key={`shock-${i}`} className={`v ${s.echoShockRing}`} style={{ top: slotTop, marginTop: 76, animation: `dEchoShock 900ms ${120 + i * 130}ms cubic-bezier(.1,.7,.2,1) both` }} />
        ))}
        {[0, 1].map((i) => (
          <div key={`ghost-${i}`} className={`v ${s.echoGhost}`} style={{ top: slotTop, marginTop: 40, animation: `dEchoAfterimage 1100ms ${420 + i * 100}ms ease-out both` }}>
            <div className={`t ${s.echoGhostTxt}`}>×2</div>
          </div>
        ))}
      </div>
      {/* the clash dissolves — rings emit from the echo card */}
      <div className={`v ${s.esWave}`} style={{ top: slotTop, marginTop: 31, animation: "dEsWave 700ms 150ms ease-out both" }} />
      <div className={`v ${s.esWave}`} style={{ top: slotTop, marginTop: 31, animation: "dEsWave 700ms 320ms ease-out both" }} />
      {/* compact verdict — small plaque, same family as ROUND VOIDED */}
      <div className={`v ${s.esStampWrap}`} style={{ animation: "dStampIn 380ms 400ms cubic-bezier(.2,1,.3,1) both, dVdFadeOut 300ms 1900ms ease-in both" }}>
        <div className={`v ${s.esStamp}`}>
          <div className={`t ${s.esStampTxt}`}>CLASH VOIDED</div>
          <div className={`t ${s.echoNextTxt}`}>NEXT ROUND ×2</div>
        </div>
      </div>
      {/* the ×2 chip: pops from the echo card, curves to its rack slot */}
      <div
        className={`v ${s.esChip}`}
        style={{ left: "50%", top: slotTop, marginLeft: -36, marginTop: 40, offsetPath: lobPath(youPlayed, slotIdx), animation: `dEsChipPop 340ms 800ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 1200ms 900ms cubic-bezier(.4,.1,.4,1) both` } as any}
      >
        <div className={`v ${s.multChipBurstB}`} />
        <div className={`v ${s.multChipBurstW}`} />
        <div className={`v ${s.multChipLive}`} style={{ transform: "rotate(-4deg)", animation: "dMultWobble 900ms 2050ms ease-in-out both" }}>
          <div className={`v ${s.multChipFace}`} style={{ backgroundColor: "#FCEE21" }} />
          <div className={`t ${s.multChipTxt}`} style={{ color: "#111" }}>×2</div>
        </div>
      </div>
    </div>
  );
}

/* ECLIPSE — the echo activation with the shield chip: rings emit from the eclipse
   card while a compact "SHIELDS DOWN" stamp pops, then the broken-shield chip
   (with the 2-rounds badge) pops out and curves into its corner-rack slot —
   first free slot, exactly where the persistent chip will stand. */
export function EclipseLoad({ youPlayed, slotIdx }: { youPlayed: boolean; slotIdx: number }) {
  const slotTop = youPlayed ? "38%" : "4%";
  return (
    <div className={`v ${s.esWrap}`} style={{ pointerEvents: "none" }}>
      <div className={`v ${s.fx3d}`}>
        <div className={`v ${s.eclipseNight}`} style={{ animation: "dEclipseNight 3600ms ease-in-out both" }} />
        <div className={`v ${s.eclipseCorona}`} style={{ animation: "dEclipseCorona 1700ms cubic-bezier(.2,1,.3,1) both" }}>
          <div className={`v ${s.eclipseCore}`} />
          <div className={`v ${s.eclipseCrack} ${s.eclipseCrackA}`} />
          <div className={`v ${s.eclipseCrack} ${s.eclipseCrackB}`} />
        </div>
        {[0, 1].map((i) => (
          <div key={`eclipse-shield-${i}`} className={`v ${s.eclipseShield}`} style={{ left: `calc(50% + ${i ? 78 : -142}px)`, animation: `dEclipseShield 1500ms ${1450 + i * 90}ms cubic-bezier(.5,0,.8,.4) both` }}>
            <BrokenShieldMark w={66} h={74} />
          </div>
        ))}
      </div>
      <div className={`v ${s.esWave}`} style={{ top: slotTop, marginTop: 31, animation: "dEsWave 700ms 150ms ease-out both" }} />
      <div className={`v ${s.esWave}`} style={{ top: slotTop, marginTop: 31, animation: "dEsWave 700ms 320ms ease-out both" }} />
      <div className={`v ${s.esStampWrap}`} style={{ animation: "dStampIn 380ms 400ms cubic-bezier(.2,1,.3,1) both, dVdFadeOut 300ms 2400ms ease-in both" }}>
        <div className={`v ${s.esStamp}`}>
          <div className={`t ${s.esStampTxt}`}>ROUND VOIDED</div>
          <div className={`t ${s.echoNextTxt}`}>SHIELDS DOWN // 2 ROUNDS</div>
        </div>
      </div>
      <div
        className={`v ${s.esChip}`}
        style={{ left: "50%", top: slotTop, marginLeft: -36, marginTop: 40, alignItems: "center", justifyContent: "center", offsetPath: lobPath(youPlayed, slotIdx), animation: "dEsChipPop 340ms 800ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 1200ms 1900ms cubic-bezier(.4,.1,.4,1) both" } as any}
      >
        {/* INTACT at first — halves sit flush (no breathing), holds a beat,
            then the CRACK: halves jolt apart with a white flash down the seam,
            and only then does the broken shield fly to its slot. */}
        <div className={`v ${s.shieldChipArt}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.shieldChipBack}`} />
          <div className={`v ${s.shieldHalfL}`} style={{ animation: "dEsCrackL 380ms 1600ms cubic-bezier(.34,1.5,.64,1) both" }} />
          <div className={`v ${s.shieldHalfR}`} style={{ animation: "dEsCrackR 380ms 1600ms cubic-bezier(.34,1.5,.64,1) both" }} />
          <div className={`v ${s.esCrackFlash}`} style={{ animation: "dEsCrackFlash 280ms 1600ms ease-out both" }} />
          <div className={`v ${s.shieldChipCount}`}>
            <div className={`t ${s.shieldChipCountTxt}`}>2</div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* VOID — the maw, hand-drawn on canvas (the same procedural family as the ward
   fire and the oracle star chart): matter spirals along a tilted accretion
   disc into a pure-black horizon, burning hotter as it approaches (doppler);
   the far side of the disc LENSES over the top of the sphere; a thin photon
   ring hugs the edge; a shock rings out the instant the card is devoured. */
function VoidCanvas() {
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const hostEl = host.current;
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
  return <div ref={host} style={{ pointerEvents: "none", width: 420, height: 420 }} />;
}

/* VOID — the void card mutates IN PLACE into the maw and the opposing card is
   stretched off its slot and devoured. The hole itself is the canvas above;
   the verdict is a black plaque with the maw glyph, hard crimson shadow. */
export function VoidMaw({ atTop }: { atTop: boolean }) {
  return (
    <>
      {/* soft focus vignette — dims the felt edges, zero stripes */}
      <div className={`v ${s.vnVignette}`} style={{ pointerEvents: "none", animation: "dVdFadeIn 600ms 250ms ease-out both, dVdFadeOut 350ms 4250ms ease-in both" }} />
      <div className={`v ${s.fx3d}`}>
        <div className={`v ${s.vnRealityRing}`} style={{ pointerEvents: "none", animation: "dVoidReality 2400ms 500ms cubic-bezier(.4,0,.8,.4) both" }} />
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={`void-mote-${i}`}
            className={`v ${s.vnMote}`}
            style={{ "--angle": `${i * 18}deg`, pointerEvents: "none", animation: `dVoidImplode ${900 + (i % 5) * 90}ms ${900 + (i % 4) * 80}ms cubic-bezier(.6,0,.9,.5) both` } as any}
          />
        ))}
      </div>

      {/* the maw — the hand-drawn black hole, anchored exactly over the void
          card's felt slot (420×420 canvas centered on the 300×300 portal box) */}
      <div
        className={`v ${s.vnPortal} ${atTop ? s.vnPortalTop : s.vnPortalBottom}`}
        style={{ pointerEvents: "none", animation: "dVdIris 620ms 350ms cubic-bezier(.2,1,.3,1) both, dVdPortalOut 340ms 4300ms cubic-bezier(.6,0,.8,.5) both" }}
      >
        <div style={{ position: "absolute", left: -60, top: -60 }}>
          <VoidCanvas />
        </div>
      </div>

      {/* verdict plaque — black, hard crimson shadow, maw glyph. NO spiky burst. */}
      <div className={`v ${s.vnPlaque} ${atTop ? s.vnPlaqueLow : s.vnPlaqueHigh}`} style={{ animation: "dStampIn 420ms 2600ms cubic-bezier(.2,1,.3,1) both, dVdPlaqueOut 280ms 4300ms ease-in both" }}>
        <div className={`v ${s.vnPlaqueInner}`}>
          <div className={`v ${s.vnPlaqueAccent}`} />
          <div className={`v ${s.vnGlyph}`}>
            <div className={`v ${s.vnGlyphSlit}`} />
          </div>
          <div className={`t ${s.vnPlaqueTitle}`}>ROUND VOIDED</div>
        </div>
      </div>
    </>
  );
}

/* WARD — the watcher: a golden eye opens right on the ward card and darts its
   slit-pupil gaze onto the opposing card — then the gaze IGNITES it. A canvas
   particle-fire burns it from base to tip: the card chars, wobbles in 3D and
   collapses while embers rise, leaving ash and ward's flat +5. All fire is
   procedural (additive-blended particles). */
function FireCanvas() {
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const hostEl = host.current;
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
  return <div ref={host} style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0, width: 150, height: 262 }} />;
}

/* The watcher eye — an SVG asset injected as raw markup (crisp linework:
   almond, gold iris, slit pupil, glint, lash arc). The iris DARTS toward the
   offending card on the gaze lock and is CLIPPED by the almond — nothing
   pokes past the lids. */
function TheEye({ gazeDown }: { gazeDown: boolean }) {
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = host.current;
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
  return <div ref={host} style={{ pointerEvents: "none", width: 260, height: 156 }} />;
}

/* REVERSAL — a procedural vortex (same approach as the ward fire): both totals
   spiral into a core at the middle of the table as two chasing streams — gold
   for yours, crimson for Klein's — then the burst REVERSES the spin and the
   streams tear back through each other's paths. The tables turn. */
export function RevVortex() {
  const host = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const hostEl = host.current;
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
  return <div ref={host} style={{ pointerEvents: "none", width: 640, height: 640 }} />;
}

/* Four-point star glyph — two crossed sparkle polygons. Used by the oracle
   beat's docking glints and the persistent peek markers. Both layers anchor
   dead-center explicitly (no reliance on flex-centering of absolute children),
   so the star reads perfectly centered inside its circle plate. */
function Sparkle({ size, color }: { size: number; color: string }) {
  const clip = "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)";
  const s2 = size * 0.62;
  return (
    <div className="v" style={{ width: size, height: size, alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, backgroundColor: color, clipPath: clip }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: s2, height: s2, marginLeft: -s2 / 2, marginTop: -s2 / 2, backgroundColor: color, clipPath: clip, transform: "rotate(45deg)", opacity: 0.85 }} />
    </div>
  );
}

/* ORACLE — THE STAR CHART: the felt dims to night, stars ignite and string
   themselves into card-shaped constellations; the real faces burn through
   (yours) — or the frames stay hollow (Klein's peek: you never see what he
   saw). Then the constellations collapse into glints that fly off and dock:
   the peek star at the lower right (yours — clickable all match) or the
   hand-seen chip at the top left (his). Same procedural-canvas family as the
   ward fire and the reversal vortex. */
export function StarChart({ mine, cards, count, slotIdx }: { mine: boolean; cards: Card[]; count: number; slotIdx: number }) {
  const host = useRef<HTMLDivElement | null>(null);
  const n = Math.max(1, Math.min(2, count || cards.length || 2));
  const W = 720, H = 500;
  // constellation frame centers, canvas-local, then in esWrap design coords.
  // The esWrap spans the full stage width (origin x=0), so felt-based values
  // get +63.75 — the same correction the dock glints carry.
  const fc = n === 2 ? [[237, 250], [483, 250]] : [[360, 250]];
  const fcEs = fc.map(([x, y]) => [736.25 + (x - W / 2) + 63.75, 310.6 + (y - H / 2)]);
  // dock = the persistent marker's chip center: yours lives lower right; Klein's
  // SEEN chip claims its corner-rack slot (72px chip frame → center +36/+36)
  const dock = mine ? [1484, 417] : [272 + slotIdx * RACK_PITCH + 36, 79];
  useEffect(() => {
    const hostEl = host.current;
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
      for (const st of stars) {
        const a = (0.35 + Math.sin(t * 0.004 + st.ph) * 0.3) * fade;
        ctx.fillStyle = `rgba(255,244,214,${Math.max(0, a)})`;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.s, 0, 6.29); ctx.fill();
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
    <div className={`v ${s.esWrap}`} style={{ zIndex: 30, pointerEvents: "none" }}>
      {/* the night falls over the table */}
      <div className={`v`} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(3,3,14,0.82)", animation: "dVdFadeIn 500ms ease-out both, dVdFadeOut 500ms 4100ms ease-in both" }} />
      <div className={`v ${s.fx3d}`}>
        <div className={`v ${s.oracleLens}`} style={{ animation: "dOracleLens 1450ms cubic-bezier(.2,1,.3,1) both" }}>
          <TheEye gazeDown={mine} />
          <div className={`v ${s.oracleLensRing}`} />
        </div>
        <div className={`v ${s.oracleScanFrame}`}>
          <div className={`v ${s.oracleScanBeam}`} style={{ animation: "dOracleScan 1350ms 350ms cubic-bezier(.4,0,.6,1) both" }} />
          <div className={`t ${s.oracleScanText}`}>{mine ? "ORACLE // ENEMY HAND ACQUIRED" : "ORACLE // YOUR HAND EXPOSED"}</div>
          {[0, 1, 2, 3].map((i) => <div key={i} className={`v ${s.oracleCorner}`} style={{ left: i % 2 ? undefined : 0, right: i % 2 ? 0 : undefined, top: i < 2 ? 0 : undefined, bottom: i < 2 ? undefined : 0, transform: `scaleX(${i % 2 ? -1 : 1}) scaleY(${i < 2 ? 1 : -1})` }} />)}
        </div>
      </div>
      <div style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -360, marginTop: -250 }}>
        <div ref={host} style={{ pointerEvents: "none", width: W, height: H }} />
      </div>
      {/* the faces burn through — only when YOUR oracle did the peeking.
          The playCard box pins them to 114×152 so they center on the frame. */}
      {mine && cards.slice(0, n).map((c, i) => (
        <div
          key={c.id}
          className={`v`}
          style={{ position: "absolute", left: fcEs[i][0] - 57, top: fcEs[i][1] - 76, animation: `dOcFace 700ms ${2100 + i * 240}ms cubic-bezier(.2,1,.3,1) both, dVdFadeOut 400ms 3250ms ease-in both`, filter: "drop-shadow(0 0 22px rgba(252,238,33,0.45))" }}
        >
          <div className={`v ${s.playCard}`}>
            <CardFace card={c} />
          </div>
        </div>
      ))}

      {/* the collapse glints fly off and dock at their plate (fcEs already
          carries the +63.75 anchor shift) */}
      {fcEs.map(([x, y], i) => {
        const dx = dock[0] - x, dy = dock[1] - y;
        const path = `path('M 0 0 C ${dx * 0.3} ${dy / 2 - 110}, ${dx * 0.72} ${dy / 2 + 100}, ${dx} ${dy}')`;
        const popAt = 3000 + i * 200, flyAt = 3450 + i * 200;
        return (
          <div
            key={`glint-${i}`}
            className={`v`}
            style={{ position: "absolute", left: x, top: y, width: 46, height: 46, alignItems: "center", justifyContent: "center", offsetRotate: "0deg", offsetPath: path, animation: `dOcPop 320ms ${popAt}ms cubic-bezier(.34,1.5,.64,1) both, dEsChipFly 950ms ${flyAt}ms cubic-bezier(.4,.1,.4,1) both` } as any}
          >
            <Sparkle size={46} color={mine ? "#ffe98a" : "#ff9a9a"} />
          </div>
        );
      })}
      <div className={`v ${s.esStamp}`} style={{ position: "absolute", left: "50%", top: "72%", marginLeft: -80, width: 160, alignItems: "center", animation: "dStampIn 340ms 2100ms cubic-bezier(.2,1,.3,1) both" }}>
        <div className={`t ${s.esStampTxt}`}>{mine ? "PEEKED" : "HAND SEEN"}</div>
      </div>
    </div>
  );
}

/* WARD — the watcher: the trick charges while a golden eye SNAPS open right on
   top of the ward card and locks its slit-pupil gaze on the opposing card —
   the gaze sets it ALIGHT: canvas fire climbs it, the burnt part crumbles into
   falling ash, and the card collapses. The victim stays burned for the round;
   +5 goes to the award beat like every other score. */
export function WardBlock({ victimTop }: { victimTop: boolean }) {
  const wardTop = !victimTop;          // which slot the ward card sits in
  const slotTop = victimTop ? "4%" : "38%"; // the victim card's top edge (esWrap %)
  const [fireOn, setFireOn] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setFireOn(true), 2400);
    const b = setTimeout(() => setFireOn(false), 6100); // let the die-out ramp play under the beat's fade
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  return (
    <div className={`v ${s.esWrap}`} style={{ pointerEvents: "none", animation: "dVdFadeOut 300ms 5850ms ease-in both" }}>
      {/* the trick charging — crimson aura ring around the victim card */}
      <div className={`v ${s.wdActRing}`} style={{ left: "50%", top: slotTop, marginLeft: -75, marginTop: -19, animation: "dWdActRing 6200ms linear both" }} />
      <div className={`v ${s.fx3d}`}>
        <div className={`v ${s.wardSeal}`} style={{ left: "50%", top: wardTop ? "4%" : "38%", marginLeft: -94, marginTop: -18, animation: "dWardSealSlam 720ms 180ms cubic-bezier(.2,1,.3,1) both" }}>
          <div className={`v ${s.wardSealInner}`} />
          <div className={`v ${s.wardSealBar} ${s.wardSealBarA}`} />
          <div className={`v ${s.wardSealBar} ${s.wardSealBarB}`} />
        </div>
        <div className={`v ${s.wardProjectile}`} style={{ left: "50%", top: victimTop ? "12%" : "46%", marginLeft: -13, animation: `${victimTop ? "dWardProjectileDown" : "dWardProjectileUp"} 620ms 650ms cubic-bezier(.5,0,.9,.4) both` }} />
        <div className={`v ${s.wardImpact}`} style={{ left: "50%", top: wardTop ? "8%" : "42%", marginLeft: -100, marginTop: -100, animation: "dWardImpact 620ms 1100ms ease-out both" }} />
      </div>
      {/* opening flare — a burst of gold the instant the lids snap apart */}
      <div className={`v ${s.wdEyeFlare}`} style={{ left: "50%", top: wardTop ? "4%" : "38%", marginLeft: -170, marginTop: -32, animation: "dWdEyeFlare 700ms 800ms ease-out both" }} />
      {/* THE WATCHER — snaps open directly on the ward card */}
      <div className={`v ${s.wdEyeWrap}`} style={{ left: "50%", top: wardTop ? "4%" : "38%", marginLeft: -130, marginTop: -2, animation: "dWdEyeOpen 620ms 500ms cubic-bezier(.2,1,.3,1) both, dWdEyeFloat 5s ease-in-out 1500ms infinite" }}>
        <TheEye gazeDown={!victimTop} />
      </div>
      {/* THE BURN — canvas particle fire; the card erodes bottom-up under it */}
      {fireOn && (
        <div style={{ position: "absolute", left: "50%", marginLeft: -75, top: victimTop ? -30 : 181, animation: "dVdFadeIn 400ms both" }}>
          <FireCanvas />
        </div>
      )}
      {/* the ash settles + the verdict lands beside it */}
      <div className={`v ${s.wdAsh}`} style={{ left: "50%", marginLeft: -55, top: victimTop ? 165 : 376, animation: "dWdAshIn 500ms 4700ms cubic-bezier(.2,1,.3,1) both", pointerEvents: "none" }} />
      <div className={`v ${s.esStamp}`} style={{ position: "absolute", left: "50%", top: victimTop ? 190 : 402, marginLeft: -80, width: 160, alignItems: "center", animation: "dStampIn 340ms 4900ms cubic-bezier(.2,1,.3,1) both" }}>
        <div className={`t ${s.esStampTxt}`}>BURNED</div>
      </div>
    </div>
  );
}

/* Mini broken-shield glyph — two cracked crimson halves on a black backing.
   Used in the shields-off chip and the info modal badge. */
function BrokenShieldMark({ w, h }: { w: number; h: number }) {
  return (
    <div className="v" style={{ width: w, height: h }}>
      <div className={`v ${s.shieldMiniBack}`} style={{ left: -3, right: -3, top: -3, bottom: -3 }} />
      <div className={`v ${s.shieldHalfL}`} />
      <div className={`v ${s.shieldHalfR}`} />
    </div>
  );
}

/* Card back — crimson with diagonal banding + PACIFY crest. */
export function CardBack({ opp }: { opp?: boolean }) {
  return (
    <div className={`v ${s.back}`} style={opp ? { borderColor: "rgba(255,255,255,0.72)" } : undefined}>
      <div className={`v ${s.backStripeA}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.backStripeB}`} style={{ pointerEvents: "none" }} />
      <P5Image src="/emblems/back-crest.png" resizeMode="contain" style={{ width: 62, height: 72 }} />
    </div>
  );
}

/* Card face — corner index (power + alignment pip) over a center emblem, name
   and tag below. Emblem art lives only in the middle zone: every game-readable
   fact stays typographic, and the zone letterboxes the bitmap at any face size
   (hand 114×156, play 114×152, oracle peek 92×122). */
export function CardFace({ card }: { card: Card }) {
  const trick = card.kind === "trick";
  const good = card.kind === "number" && card.align === "good";
  const bg = trick ? "#101010" : good ? "#F5EFE1" : "#FEF2F2";
  const col = trick ? "#F5EFE1" : "#111111";
  const accent = trick ? "#E60012" : good ? "#16a34a" : "#E60012";
  const hint = trick ? TRICK_HINT[card.name] ?? "TRICK" : card.align.toUpperCase();
  return (
    <div className={`v ${s.face}`} style={{ backgroundColor: bg, borderColor: trick ? "#000" : accent }}>
      {trick && <div className={`v ${s.faceCornerA}`} style={{ pointerEvents: "none" }} />}
      {trick && <div className={`v ${s.faceCornerB}`} style={{ pointerEvents: "none" }} />}
      <div className={`v ${s.faceTop}`}>
        <div className={`t ${s.facePower}`} style={trick ? { color: "#FCEE21", fontSize: 24, lineHeight: "26px" } : { color: col }}>{card.power ?? "—"}</div>
        {!trick && <div className={`v ${s.facePip}`} style={{ backgroundColor: accent }} />}
      </div>
      <div className={`v ${s.faceEmblem}`}>
        <P5Image src={`/emblems/${card.id}.png`} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
      </div>
      <div className={`v ${s.faceBottom}`}>
        <div className={`t ${s.faceName}`} style={{ color: col }}>{card.name.toUpperCase()}</div>
        <div className={`v ${s.faceTag}`} style={{ backgroundColor: accent }}>
          <div className={`t ${s.faceTagTxt}`}>{hint}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PAUSE MENU — icon bus rows + mini slider (real-px overlay) ---------- */
function IcoBus({ bus, muted }: { bus: string; muted: boolean }) {
  return (
    <svg className={`t ${s.pIco}`} viewBox="0 0 24 24">
      {bus === "main" && (
        <>
          <path d="M4 9 H8 L13 4.5 V19.5 L8 15 H4 Z" className="fl" />
          {!muted && <path d="M16 8.5 Q18.6 12 16 15.5 M18.6 6 Q22.4 12 18.6 18" className="st" />}
          {muted && <path d="M16.5 9 L21.5 15 M21.5 9 L16.5 15" className="st slash" />}
        </>
      )}
      {bus === "sfx" && (
        <>
          <path d="M13 2.5 L5.5 13.5 H10.5 L9 21.5 L18.5 9.5 H13 Z" className="fl" />
          {muted && <path d="M4 4 L20 20" className="st slash" />}
        </>
      )}
      {bus === "bgm" && (
        <>
          <path d="M9 18.5 V5.5 L19 3.5 V16" className="st" />
          <circle cx="6.6" cy="18.5" r="2.6" className="fl" />
          <circle cx="16.6" cy="16" r="2.6" className="fl" />
          {muted && <path d="M4 4 L20 20" className="st slash" />}
        </>
      )}
      {bus === "voice" && (
        <>
          <path d="M4 5 H20 V15 H11 L6.5 19.5 V15 H4 Z" className="fl" />
          {muted && <path d="M4 4 L20 20" className="st slash" />}
        </>
      )}
    </svg>
  );
}

function IcoFs() {
  return (
    <svg className={`t ${s.pIco}`} viewBox="0 0 24 24">
      <path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15" className="st" />
    </svg>
  );
}

function PauseSlider({ value, label, onPick }: { value: number; label: string; onPick: (value: number) => void }) {
  return (
    <input
      className={s.pRange}
      type="range"
      min="0"
      max="100"
      step="1"
      value={value}
      aria-label={`${label} volume`}
      style={{ "--fill": `${value}%` } as CSSProperties}
      onChange={(event) => onPick(Number(event.currentTarget.value))}
    />
  );
}
