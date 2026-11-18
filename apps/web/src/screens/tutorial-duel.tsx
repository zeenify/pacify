/* TUTORIAL DUEL — THE GUIDED TABLE. The real duel stage, table, hand and
   reveal cinematics, but with no opponent and a fully authored script. Victor
   stands at the right edge and coaches through two hands:
     1) Seraph (10, good) vs Vampire (7, bad)  → win by difference (+3)
     2) Angel (12, good) vs Paladin (2, good)  → same alignment, nullified (0)
   The player may only click the card Victor highlights. */

import { IonPage, useIonViewWillLeave } from "@ionic/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cardById, type Card } from "@pacify/engine";
import { DUEL_KEYFRAMES } from "./duel-keyframes";
import { navigationInProgress, router } from "../lib/nav";
import { initSfx, play, playAt, playClick, playHover, unlockSfx } from "../lib/sfx";
import { playVictorClip, type VictorPlayHandle } from "../lib/victor-voice";
import { appendTutorialLog, loadTutorialLog, type TutorialLogEntry } from "../lib/tutorial-log";
import { VICTOR_DUEL, VICTOR_PORTRAITS, type VictorLine, type VictorPose } from "../data/victor";
import { P5Image } from "../components/P5Image";
import d from "./duel.module.css";
import t from "./tutorial.module.css";
import s from "./tutorial-duel.module.css";

const DESIGN_W = 1600;
const DESIGN_H = 900;
const TYPE_MS = 26;
const TOTAL_ROUNDS = 7;

type Phase =
  | "d01" | "d02" | "d03" | "d04" | "d05" | "d06" | "reveal1"
  | "d07" | "d08" | "d09" | "d10" | "d11" | "reveal2"
  | "d12" | "d13" | "d14";

type LogEntry = TutorialLogEntry;
type FocusTarget = "hands" | "round" | "placement" | "cards" | "target" | "score" | "alignments" | "revealed";
type SpotRect = { x: number; y: number; w: number; h: number; rx: number };

const LINE_BY_PHASE: Partial<Record<Phase, string>> = {
  d01: "d01-tutorial-match",
  d02: "d02-draw-cards",
  d03: "d03-seven-rounds",
  d04: "d04-place-cards",
  d05: "d05-reveal-cards",
  d06: "d06-select-card",
  d07: "d07-round-result",
  d08: "d08-score-display",
  d09: "d09-card-alignment",
  d10: "d10-alignment-colors",
  d11: "d11-play-twelve",
  d12: "d12-nullified-result",
  d13: "d13-nullified-explanation",
  d14: "d14-foundation",
};

/** Which part of the table each explanation points at. The spotlight dims the
 *  rest of the stage with holes around these targets. */
const FOCUS_BY_PHASE: Partial<Record<Phase, FocusTarget>> = {
  d02: "hands",
  d03: "round",
  d04: "placement",
  d05: "cards",
  d06: "target",
  d08: "score",
  d09: "alignments",
  d10: "alignments",
  d11: "target",
  d13: "revealed",
};

const DUEL_LINES = new Map(VICTOR_DUEL.map((l) => [l.id, l]));
const lineFor = (phase: Phase): VictorLine | null => {
  const id = LINE_BY_PHASE[phase];
  return id ? DUEL_LINES.get(id) ?? null : null;
};

/* The exact hands used by the demonstration. No duplicates across the table
   (the real game's singleton rule), and both lesson cards sit near the middle
   of the fan so the spotlight is easy to follow. */
const DEMO_CARDS = [cardById("vampire"), cardById("paladin")] as const; // 7 bad, 2 good
const PLAYER_HAND: Card[] = [
  cardById("ogre"),
  cardById("knight"),
  cardById("wizard"),
  cardById("seraph"), // 10 good — lesson 1
  cardById("angel"),  // 12 good — lesson 2
  cardById("demon"),
  cardById("leviathan"),
];
const TEN = cardById("seraph");
const TWELVE = cardById("angel");
/* The reveal explanation uses an illustrative pair that is in neither hand,
   so the preview can flip without spoiling the real 10/7 or 12/2 lesson. */
const PREVIEW_TOP = cardById("witch");    // 5 bad
const PREVIEW_BOTTOM = cardById("valkyrie"); // 8 good

const fanAngleOf = (i: number, n: number) => (i - (n - 1) / 2) * 5;

function useWindowDimensions() {
  const [dims, setDims] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const on = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return dims;
}

/* ---------- card art (the real duel's face/back, number cards only) ---------- */
function TutCardFace({ card }: { card: Card }) {
  const num = card.kind === "number" ? card : null;
  const good = num?.align === "good";
  const bg = good ? "#F5EFE1" : "#FEF2F2";
  const accent = good ? "#16a34a" : "#E60012";
  return (
    <div className={`v ${d.face}`} style={{ backgroundColor: bg, borderColor: accent }}>
      <div className={`v ${d.faceTop}`}>
        <div className={`t ${d.facePower}`} style={{ color: "#111" }}>{num?.power ?? "—"}</div>
        <div className={`v ${d.facePip}`} style={{ backgroundColor: accent }} />
      </div>
      <div className={`v ${d.faceEmblem}`}>
        <P5Image src={`/emblems/${card.id}.png`} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
      </div>
      <div className={`v ${d.faceBottom}`}>
        <div className={`t ${d.faceName}`} style={{ color: "#111" }}>{card.name.toUpperCase()}</div>
        <div className={`v ${d.faceTag}`} style={{ backgroundColor: accent }}>
          <div className={`t ${d.faceTagTxt}`}>{num ? num.align.toUpperCase() : "TRICK"}</div>
        </div>
      </div>
    </div>
  );
}

function TutCardBack({ opp }: { opp?: boolean }) {
  return (
    <div className={`v ${d.back}`} style={opp ? { borderColor: "rgba(255,255,255,0.72)" } : undefined}>
      <div className={`v ${d.backStripeA}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${d.backStripeB}`} style={{ pointerEvents: "none" }} />
      <P5Image src="/emblems/back-crest.png" resizeMode="contain" style={{ width: 62, height: 72 }} />
    </div>
  );
}

function TutPlayCard({ card, revealed, opp }: { card: Card; revealed: boolean; opp?: boolean }) {
  if (revealed) {
    return (
      <div className={`v ${d.playCard}`}>
        <div className="v" style={{ width: "100%", height: "100%", animation: "dFlipFace 380ms 210ms cubic-bezier(.2,1,.3,1) both" }}>
          <TutCardFace card={card} />
        </div>
        <div className="v" style={{ pointerEvents: "none", position: "absolute", inset: 0, animation: "dFlipBack 260ms cubic-bezier(.55,0,.85,.4) both" }}>
          <TutCardBack opp={opp} />
        </div>
      </div>
    );
  }
  return (
    <div className={`v ${d.playCard}`}>
      <TutCardBack opp={opp} />
    </div>
  );
}

function TutHandCard({
  card, i, total, target, dim, onPick,
}: {
  card: Card; i: number; total: number; target: boolean; dim: boolean;
  onPick: (card: Card) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const rot = fanAngleOf(i, total);
  const hot = target && hovered;
  return (
    <div className="v" style={{ animation: `dHandIn 420ms ${i * 55}ms cubic-bezier(.2,1,.3,1) both` }}>
      <div
        className={`press ${d.cardBtn} ${dim ? d.cardDim : ""} ${hot ? d.cardHover : ""} ${target ? s.target : ""}`}
        onMouseEnter={() => { if (target) { setHovered(true); playHover(); } }}
        onMouseLeave={() => setHovered(false)}
        style={{
          pointerEvents: target ? "auto" : "none",
          transform: hot
            ? "rotate(0deg) translateY(-26px) scale(1.1)"
            : `rotate(${target ? 0 : rot}deg) translateY(${target ? -2 : -Math.abs(rot) * 1.6}px) scale(${target ? 1.02 : 1})`,
        }}
        onClick={(e) => { if (target) { e.stopPropagation(); onPick(card); } }}
        data-card-id={card.id}
        role={target ? "button" : undefined}
        tabIndex={target ? 0 : -1}
        aria-label={target ? `Play ${card.name}` : undefined}
        onKeyDown={(e) => {
          if (target && (e.code === "Enter" || e.code === "Space")) {
            e.preventDefault();
            e.stopPropagation();
            onPick(card);
          }
        }}
      >
        <TutCardFace card={card} />
        {target && <div className={s.playRibbon}><div className={`t ${s.playRibbonTxt}`}>PLAY</div></div>}
      </div>
    </div>
  );
}

function TallyPlate({ side, left, finish, winner }: { side: "you" | "demo"; left: number; finish: boolean; winner: boolean }) {
  const you = side === "you";
  const color = you ? "#FCEE21" : "#FF4D5E";
  const border = finish ? (winner ? (you ? "#FCEE21" : "#E60012") : "#3a3a3a") : "#fff";
  return (
    <div className={`v ${d.tallyPlate}`} style={{ borderColor: border, opacity: finish && !winner ? 0.5 : 1 }}>
      <div className={`t ${d.tallyLbl}`}>{you ? "YOU" : "DEMO"}</div>
      <div
        key={`${side}-${left}-${finish}`}
        className={`t ${d.tallyNum}`}
        style={{
          color,
          ...(finish && winner
            ? { animation: "dLockIn 480ms cubic-bezier(.34,1.4,.64,1) both", textShadow: `0 0 26px ${you ? "rgba(252,238,33,0.9)" : "rgba(255,77,94,0.9)"}, 3px 3px 0 #000` }
            : finish
              ? { animation: "dLockOut 450ms ease-out both" }
              : { animation: "dTickPulse 280ms ease-out both" }),
        }}
      >
        {left}
      </div>
    </div>
  );
}

/* The real duel's same-alignment cinematic, fixed to 12 vs 2 (good). */
function ShieldNullify() {
  return (
    <div className={`v ${d.shieldWrap}`} style={{ pointerEvents: "none" }}>
      <div className={`v ${d.nullFlash}`} style={{ animation: "dNullFlash 850ms 1500ms ease-out both" }} />
      <div className={`v ${d.shieldWave}`} style={{ animation: "dShieldWave 950ms 1900ms ease-out both" }} />
      <div style={{ animation: "dNullSmash 650ms 1500ms cubic-bezier(.6,0,.8,.4) both" }}>
        <div className={`v ${d.shieldRow}`}>
          <div className={`v ${d.shieldPlate}`} style={{ borderColor: "#16a34a", animation: "dShieldPop 450ms 100ms cubic-bezier(.2,1,.3,1) both" }}>
            <div className={`t ${d.shieldPlateNum}`} style={{ color: "#16a34a" }}>12</div>
            <div className={`t ${d.shieldPlateLbl}`}>YOU</div>
          </div>
          <div className={`t ${d.shieldVs}`} style={{ animation: "dNumSlam 400ms 380ms cubic-bezier(.2,1,.3,1) both" }}>VS</div>
          <div className={`v ${d.shieldPlate}`} style={{ borderColor: "#16a34a", animation: "dShieldPop 450ms 220ms cubic-bezier(.2,1,.3,1) both" }}>
            <div className={`t ${d.shieldPlateNum}`} style={{ color: "#16a34a" }}>2</div>
            <div className={`t ${d.shieldPlateLbl}`}>DEMO</div>
          </div>
        </div>
      </div>
      <div className={`t ${d.shieldBanner}`} style={{ animation: "dShieldPop 450ms 850ms cubic-bezier(.2,1,.3,1) both" }}>SAME TYPE!</div>
      <div className={`v ${d.nullStamp}`} style={{ animation: "dStampIn 650ms 1800ms cubic-bezier(.2,1,.3,1) both" }}>
        <div className={`t ${d.nullStampTxt}`}>NULLIFIED</div>
      </div>
      <div className={`t ${d.shieldSub}`} style={{ animation: "dNumSlam 400ms 2300ms cubic-bezier(.2,1,.3,1) both" }}>0 POINTS EACH</div>
    </div>
  );
}

export default function TutorialDuel() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);

  const [phase, setPhase] = useState<Phase>("d01");
  const [chars, setChars] = useState(0);
  const [navReady, setNavReady] = useState(!navigationInProgress());
  const arrivedMidNav = useRef(navigationInProgress());
  const [hand, setHand] = useState<Card[]>(PLAYER_HAND);
  const [demoHandCount, setDemoHandCount] = useState(7);
  const [youCard, setYouCard] = useState<Card | null>(null);
  const [demoCard, setDemoCard] = useState<Card | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showdown, setShowdown] = useState<number | null>(null);
  const [pow, setPow] = useState<{ youLeft: number; demoLeft: number; finish: boolean } | null>(null);
  const [award, setAward] = useState<number | null>(null);
  const [shield, setShield] = useState(false);
  const [youScore, setYouScore] = useState(0);
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<LogEntry[]>(() => loadTutorialLog());
  const [preview, setPreview] = useState<{ top: Card; bottom: Card; revealed: boolean } | null>(null);
  const [spots, setSpots] = useState<SpotRect[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lineVoiceRef = useRef<VictorPlayHandle | null>(null);
  const exitingRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const line = lineFor(phase);
  const full = line?.text ?? "";
  const done = chars >= full.length;
  const revealing = phase === "reveal1" || phase === "reveal2";
  const awaitingPick = phase === "d06" || phase === "d11";
  const targetId = phase === "d06" ? TEN.id : phase === "d11" ? TWELVE.id : null;
  const focus = FOCUS_BY_PHASE[phase] ?? null;
  const pose: VictorPose = line?.pose ?? "composed";

  const clearTimers = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current = [];
  }, []);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // SFX must be decoded + unlocked even on a direct visit to this route
  useEffect(() => {
    void initSfx();
    const unlock = () => {
      unlockSfx();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // match-open sting + the seven-card deal sweep, exactly like the real table
  useEffect(() => {
    play("duel.intro.slam");
    for (let i = 0; i < 7; i++) playAt("duel.deal", 55 * i, { pitch: 0.95 + i * 0.02 });
  }, []);

  // nav bridge: never speak under the heist overlay
  useEffect(() => {
    const leaving = () => setNavReady(false);
    const settled = () => setNavReady(true);
    window.addEventListener("pacify:nav-start", leaving);
    window.addEventListener("pacify:nav-settled", settled);
    return () => {
      window.removeEventListener("pacify:nav-start", leaving);
      window.removeEventListener("pacify:nav-settled", settled);
    };
  }, []);

  // one spoken line: type it, play the pre-baked clip, reveal full text on audio
  useEffect(() => {
    if (!navReady || !line || logOpen) { setChars(0); return; }
    setChars(0);
    play("duel.bubble");
    setHistory(appendTutorialLog({ id: line.id, speaker: "VICTOR", text: line.text }));
    let alive = true;
    const voice = playVictorClip(line.audio, {
      onPlaying: () => { if (alive) setChars(line.text.length); },
    });
    lineVoiceRef.current = voice;
    const iv = setInterval(() => setChars((c) => Math.min(c + 1, line.text.length)), TYPE_MS);
    return () => {
      alive = false;
      clearInterval(iv);
      voice.cancel();
      if (lineVoiceRef.current === voice) lineVoiceRef.current = null;
    };
  }, [navReady, line, logOpen]);

  // d05 is an illustrative reveal: two cards that are in neither hand flip in
  // the placement slots, then clear when the real lesson prompt starts.
  useEffect(() => {
    if (phase !== "d05") { setPreview(null); return; }
    setPreview({ top: PREVIEW_TOP, bottom: PREVIEW_BOTTOM, revealed: false });
    play("duel.deal");
    const flip = setTimeout(() => {
      setPreview((p) => (p ? { ...p, revealed: true } : p));
      play("duel.flip.whoosh");
      setTimeout(() => play("duel.flip.snap"), 180);
    }, 1400);
    return () => clearTimeout(flip);
  }, [phase]);

  // measure the focus targets in stage coordinates and punch holes in the dim
  useEffect(() => {
    if (!focus) { setSpots([]); return; }
    const raf = requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const sr = stage.getBoundingClientRect();
      if (!sr.width) return;
      const sc = sr.width / DESIGN_W;
      const q = (sel: string) => stage.querySelector<HTMLElement>(sel);
      let targets: (HTMLElement | null)[] = [];
      let pad = 10;
      let rx = 12;
      switch (focus) {
        case "hands":
          targets = [q('[data-focus="demo-hand"]'), q('[data-focus="hand"]')];
          pad = 16; rx = 18;
          break;
        case "round":
          targets = [q('[data-focus="round"]')];
          pad = 8; rx = 8;
          break;
        case "placement":
        case "cards":
        case "revealed":
          targets = [q('[data-focus="slot-top"]'), q('[data-focus="slot-bottom"]')];
          pad = 8; rx = 12;
          break;
        case "target":
          targets = [targetId ? q(`[data-card-id="${targetId}"]`) : null];
          pad = 10; rx = 14;
          break;
        case "score":
          targets = [q('[data-focus="score"]')];
          pad = 8; rx = 999;
          break;
        case "alignments":
          targets = [q('[data-card-id="angel"]'), q('[data-card-id="demon"]')];
          pad = 10; rx = 14;
          break;
      }
      const next: SpotRect[] = [];
      for (const el of targets) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const x = Math.max(0, (r.left - sr.left) / sc - pad);
        const y = Math.max(0, (r.top - sr.top) / sc - pad);
        const w = Math.min(DESIGN_W - x, r.width / sc + pad * 2);
        const h = Math.min(DESIGN_H - y, r.height / sc + pad * 2);
        next.push({ x, y, w, h, rx });
      }
      setSpots(next);
    });
    return () => cancelAnimationFrame(raf);
  }, [focus, phase, targetId, hand, youScore, width, height]);

  useIonViewWillLeave(() => {
    clearTimers();
    lineVoiceRef.current?.cancel();
    lineVoiceRef.current = null;
  }, [clearTimers]);
  useEffect(() => () => { clearTimers(); lineVoiceRef.current?.cancel(); }, [clearTimers]);

  const startTricks = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    clearTimers();
    lineVoiceRef.current?.cancel();
    lineVoiceRef.current = null;
    playClick();
    router.replace("/duel?tutorial=tricks");
  }, [clearTimers]);

  const advance = useCallback(() => {
    if (!navReady || logOpen || exitingRef.current || revealing || !line) return;
    if (!done) { setChars(full.length); return; }
    if (awaitingPick) return; // the highlighted card is the only way forward
    playClick();
    switch (phase) {
      case "d01": setPhase("d02"); break;
      case "d02": setPhase("d03"); break;
      case "d03": setPhase("d04"); break;
      case "d04": setPhase("d05"); break;
      case "d05": setPreview(null); setPhase("d06"); break;
      case "d07": setPhase("d08"); break;
      case "d08": setPhase("d09"); break;
      case "d09": setPhase("d10"); break;
      case "d10":
        // next round — clear the finished felt and reset the round marker
        play("round.panelIn");
        setPow(null);
        setAward(null);
        setShowdown(null);
        setYouCard(null);
        setDemoCard(null);
        setRevealed(false);
        setRound(2);
        setPhase("d11");
        break;
      case "d12": setPhase("d13"); break;
      case "d13": setPhase("d14"); break;
      case "d14": startTricks(); break;
      default: break;
    }
  }, [navReady, logOpen, revealing, awaitingPick, line, done, full.length, phase, startTricks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (logOpen) {
        if (e.code === "Escape") { e.preventDefault(); setLogOpen(false); }
        return;
      }
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); advance(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, logOpen]);

  // keep the one legal card keyboard-ready when a pick is requested
  useEffect(() => {
    if (!awaitingPick) return;
    const el = document.querySelector<HTMLElement>('[class*="target_"]');
    el?.focus({ preventScroll: true });
  }, [awaitingPick, phase]);

  const openLog = useCallback(() => {
    if (logOpen || exitingRef.current) return;
    playClick();
    lineVoiceRef.current?.cancel();
    lineVoiceRef.current = null;
    setLogOpen(true);
  }, [logOpen]);

  /** Rewind the demo table to the state the target beat expects, then play it. */
  const jumpTo = useCallback((target: Phase) => {
    clearTimers();
    lineVoiceRef.current?.cancel();
    lineVoiceRef.current = null;
    setLogOpen(false);
    setPreview(null);
    setYouCard(null); setDemoCard(null); setRevealed(false);
    setShowdown(null); setPow(null); setAward(null); setShield(false);
    if (target === "d07" || target === "d08" || target === "d09" || target === "d10") {
      // the felt holds the finished 10 vs 7 — three points banked
      setHand(PLAYER_HAND.filter((c) => c.id !== TEN.id));
      setDemoHandCount(6);
      setYouCard(TEN); setDemoCard(DEMO_CARDS[0]); setRevealed(true);
      setPow({ youLeft: 3, demoLeft: 0, finish: true });
      setYouScore(3); setRound(1);
    } else if (target === "d11") {
      // clean second round, the ten already spent
      setHand(PLAYER_HAND.filter((c) => c.id !== TEN.id));
      setDemoHandCount(6);
      setYouScore(3); setRound(2);
    } else if (target === "d12" || target === "d13" || target === "d14") {
      // the felt holds the nullified 12 vs 2
      setHand(PLAYER_HAND.filter((c) => c.id !== TEN.id && c.id !== TWELVE.id));
      setDemoHandCount(5);
      setYouCard(TWELVE); setDemoCard(DEMO_CARDS[1]); setRevealed(true);
      setYouScore(3); setRound(2);
    } else {
      // d01–d06 — fresh table
      setHand(PLAYER_HAND); setDemoHandCount(7); setYouScore(0); setRound(1);
    }
    setPhase(target);
  }, [clearTimers]);

  /** Clicking a log entry rewinds the guided match to that beat. */
  const rewindDuel = useCallback((id: string) => {
    setLogOpen(false);
    playClick();
    if (id === `play-${TEN.id}`) { jumpTo("d06"); return; }
    if (id === `play-${TWELVE.id}`) { jumpTo("d11"); return; }
    const m = /^(d\d{2})/.exec(id);
    if (m) jumpTo(m[1] as Phase);
  }, [jumpTo]);

  const pickCard = useCallback((card: Card) => {
    if (logOpen || exitingRef.current) return;
    if (phase !== "d06" && phase !== "d11") return;
    if (card.id !== (phase === "d06" ? TEN.id : TWELVE.id)) return;
    playClick();
    play("duel.pick");
    lineVoiceRef.current?.cancel();
    lineVoiceRef.current = null;
    clearTimers();

    const first = card.id === TEN.id;
    const demo = first ? DEMO_CARDS[0] : DEMO_CARDS[1];
    const youPow = card.kind === "number" ? card.power : 0;
    const demoPow = demo.kind === "number" ? demo.power : 0;

    setHistory(appendTutorialLog({ id: `play-${card.id}`, speaker: "YOU", text: `PLAYED ${card.name.toUpperCase()} · ${youPow}` }));
    setHand((h) => h.filter((c) => c.id !== card.id));
    setDemoHandCount((n) => Math.max(0, n - 1));
    setYouCard(card);
    setDemoCard(demo);
    setRevealed(false);
    setShowdown(null);
    setPow(null);
    setAward(null);
    setShield(false);
    setPhase(first ? "reveal1" : "reveal2");

    // showdown 3·2·1 → flip → clash → award / nullify
    later(120, () => play("duel.deal"));
    later(300, () => { setShowdown(3); play("duel.showdown.tick", { pitch: 1.0 }); });
    later(800, () => { setShowdown(2); play("duel.showdown.tick", { pitch: 1.12 }); });
    later(1300, () => { setShowdown(1); play("duel.showdown.tick", { pitch: 1.26 }); });
    later(1800, () => {
      setShowdown(null);
      setRevealed(true);
      play("duel.flip.whoosh");
      later(180, () => play("duel.flip.snap"));
    });

    if (first) {
      const diff = youPow - demoPow;
      later(2300, () => {
        setPow({ youLeft: youPow, demoLeft: demoPow, finish: false });
        play("duel.table.impact");
      });
      for (let i = 0; i < demoPow; i++) {
        later(2600 + i * 500, () => {
          setPow({ youLeft: youPow - i - 1, demoLeft: demoPow - i - 1, finish: false });
          play("duel.clash.tick", { pitch: Math.min(1.5, 1 + (i + 1) * 0.035) });
        });
      }
      const finishAt = 2600 + demoPow * 500 + 120;
      later(finishAt, () => {
        setPow({ youLeft: diff, demoLeft: 0, finish: true });
        play("duel.clash.lockIn");
        play("duel.clash.lockOut");
        play("duel.card.win");
      });
      later(finishAt + 250, () => { setAward(diff); play("score.award.fly"); });
      later(finishAt + 1150, () => { setYouScore(diff); play("score.award.land"); });
      later(finishAt + 1550, () => { setAward(null); setPhase("d07"); });
    } else {
      later(2300, () => {
        setShield(true);
        play("duel.shield.pop");
        playAt("duel.shield.pop", 120, { pitch: 1.06 });
        playAt("duel.clash.vs", 380);
        playAt("duel.shield.banner", 850);
        playAt("duel.nullify.smash", 1500);
        playAt("duel.stamp", 1800);
        playAt("duel.nullify.ring", 1900);
      });
      later(5300, () => { setShield(false); setPhase("d12"); });
    }
  }, [logOpen, phase, later, clearTimers]);

  return (
    <IonPage>
      <div className={`v ${s.viewport}`} onClick={advance}>
        <div className={`v ${d.stage}`} ref={stageRef} style={{ transform: `scale(${scale})` }}>
          <style>{DUEL_KEYFRAMES}</style>
          <div className={`v ${d.backStripes}`} style={{ pointerEvents: "none" }} />
          <div className={`v ${d.backDots}`} style={{ pointerEvents: "none" }} />

          {/* the opponent zone is empty on purpose — only the demo hand hangs here */}
          <div className={`v ${s.topSpacer}`} />
          <div className={`v ${s.demoFan}`} data-focus="demo-hand">
            <div className={`t ${s.demoFanLbl}`}>DEMO HAND</div>
            <div className={`v ${s.demoFanRow}`}>
              {Array.from({ length: demoHandCount }).map((_, i, arr) => (
                <div
                  key={i}
                  className={`v ${d.oppFanCard}`}
                  style={{ transform: `rotate(${(i - (arr.length - 1) / 2) * 7}deg) translateY(${Math.abs(i - (arr.length - 1) / 2) * 3}px)` }}
                />
              ))}
            </div>
          </div>

          <div className={`v ${d.roundMarker}`} data-focus="round" style={{ pointerEvents: "none" }}>
            <div className={`t ${d.roundLbl}`}>ROUND</div>
            <div className={`t ${d.roundNum}`}>{Math.min(round, TOTAL_ROUNDS)}<span className={`ti ${d.roundDim}`}>/{TOTAL_ROUNDS}</span></div>
          </div>
          <div className={`v ${d.chip} ${d.chipOpp}`} style={{ pointerEvents: "none" }}>
            <div className={`t ${d.chipLbl}`}>DEMO</div>
            <div className={`t ${d.chipNum}`} style={{ color: "#FF4D5E" }}>{0}</div>
          </div>
          <div className={`v ${d.chip} ${d.chipYou}`} data-focus="score" style={{ pointerEvents: "none" }}>
            <div className={`t ${d.chipLbl}`}>YOU</div>
            <div
              key={`you-${youScore}`}
              className={`t ${d.chipNum}`}
              style={{ color: "#FCEE21", ...(youScore > 0 ? { animation: "dChipTick 380ms cubic-bezier(.2,1,.3,1) both" } : {}) }}
            >
              {youScore}
            </div>
          </div>

          <div className={`v ${d.tableZone}`}>
            <div className={`v ${d.tableRim}`}>
              <div className={`v ${d.tableFelt}`} style={{ pointerEvents: "none" }}>
                <div className={`v ${d.feltLine}`} />
              </div>

              <div className={`v ${d.feltSlot} ${d.feltSlotTop} ${s.cardSlot}`} data-focus="slot-top">
                <div className={s.slotFrame} aria-hidden />
                {preview ? (
                  <div key="preview-top" className={s.dropInTop}>
                    <TutPlayCard card={preview.top} revealed={preview.revealed} opp />
                  </div>
                ) : demoCard ? (
                  <div key={`demo-${demoCard.id}`} className={s.dropInTop}>
                    <TutPlayCard card={demoCard} revealed={revealed} opp />
                  </div>
                ) : null}
                {pow && <TallyPlate side="demo" left={pow.demoLeft} finish={pow.finish} winner={false} />}
              </div>

              <div className={`v ${d.feltSlot} ${d.feltSlotBottom} ${s.cardSlot}`} data-focus="slot-bottom">
                <div className={s.slotFrame} aria-hidden />
                {preview ? (
                  <div key="preview-bottom" className={s.dropInBottom}>
                    <TutPlayCard card={preview.bottom} revealed={preview.revealed} />
                  </div>
                ) : youCard ? (
                  <div key={`you-${youCard.id}`} className={s.dropInBottom}>
                    <TutPlayCard card={youCard} revealed={revealed} />
                  </div>
                ) : null}
                {pow && <TallyPlate side="you" left={pow.youLeft} finish={pow.finish} winner />}
              </div>

              {showdown !== null && (
                <div className={`v ${d.showdownWrap}`} style={{ pointerEvents: "none" }}>
                  <div className={`t ${d.showdownLbl}`}>SHOWDOWN</div>
                  <div key={showdown} className={`t ${d.showdownNum}`} style={{ animation: "dNumSlam 0.5s cubic-bezier(.2,1,.3,1) both" }}>{showdown}</div>
                </div>
              )}

              {shield && <ShieldNullify />}

              {award !== null && (
                <div
                  className={`v ${d.flyBadge} ${d.flyYou}`}
                  style={{ pointerEvents: "none", animation: "dFlyYou 1.3s cubic-bezier(.45,0,.6,.5) both" }}
                >
                  <div className={`t ${d.flyTxt}`} style={{ color: "#FCEE21" }}>+{award}</div>
                </div>
              )}
            </div>
          </div>

          <div className={`v ${d.playerZone}`}>
            <div className={`v ${d.handCol}`}>
              {awaitingPick && (
                <div className={`v ${d.moveBanner}`} style={{ animation: "dPulse 1.6s ease-in-out infinite" }}>
                  <div className={`t ${d.moveTxt}`}>YOUR MOVE</div>
                </div>
              )}
              <div className={`v ${d.handRow}`} data-focus="hand">
                {hand.map((c, i) => (
                  <TutHandCard
                    key={c.id}
                    card={c}
                    i={i}
                    total={hand.length}
                    target={c.id === targetId}
                    dim={revealing || (awaitingPick && c.id !== targetId)}
                    onPick={pickCard}
                  />
                ))}
              </div>
            </div>
          </div>

          {focus && !revealing && spots.length > 0 && (
            <svg
              key={focus}
              className={s.spotlight}
              viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <mask id="tutorial-spot-mask" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
                  <rect width={DESIGN_W} height={DESIGN_H} fill="white" />
                  {spots.map((r, i) => (
                    <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} fill="black" />
                  ))}
                </mask>
                <filter id="tutorial-spot-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
              </defs>
              <rect width={DESIGN_W} height={DESIGN_H} fill="rgba(0,0,0,0.56)" mask="url(#tutorial-spot-mask)" />
              {/* the dim alone reads as "nothing changed" on small HUD chips —
                  each hole gets a hot pulsing ring plus a soft light bloom */}
              {spots.map((r, i) => (
                <g key={`ring-${i}`}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} fill="none" stroke="#FCEE21" strokeWidth={12} opacity={0.5} filter="url(#tutorial-spot-glow)" />
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx} fill="none" stroke="#FCEE21" strokeWidth={4} className={s.spotRing} />
                </g>
              ))}
            </svg>
          )}

          {/* Victor at the right edge — cropped, never over the hand or cards */}
          <div className={`v ${s.victorDock} ${revealing ? s.victorAway : ""}`}>
            {(Object.keys(VICTOR_PORTRAITS) as VictorPose[]).map((p) => (
              <div
                key={p}
                className={`v ${s.victorImg}`}
                style={{ backgroundImage: `url("${VICTOR_PORTRAITS[p]}")`, opacity: p === pose ? 1 : 0 }}
              />
            ))}
          </div>

          {line && (
            <div className={`v ${s.coachBubble}`} style={{ pointerEvents: "none" }}>
              <div className={`v ${d.bubblePanel}`}>
                <div className={`v ${d.bubbleFace}`}>
                  <div className={`t ${d.bubbleTxt}`} data-testid="tutorial-duel-line">
                    {full.slice(0, chars)}
                    {!done && <span className={s.caret}>▍</span>}
                  </div>
                  {done && (
                    <div className={`t ${s.coachHint} ${awaitingPick ? s.coachHintPick : ""}`} data-testid="tutorial-duel-hint">
                      {awaitingPick ? "CLICK THE HIGHLIGHTED CARD" : "TAP ANYWHERE"}
                    </div>
                  )}
                </div>
              </div>
              <div className={`v ${d.bubbleTag}`}><div className={`t ${d.bubbleTagTxt}`}>VICTOR</div></div>
              <div className={s.coachTail} aria-hidden />
            </div>
          )}

          {logOpen && (
            <div className={`v ${t.logOverlay}`} onClick={(e) => { e.stopPropagation(); setLogOpen(false); }}>
              <div className={`v ${t.logPanel}`} onClick={(e) => e.stopPropagation()} data-testid="tutorial-duel-log-panel">
                <div className={`v ${t.logHead}`}>
                  <div className={`t ${t.logKicker}`}>ORIENTATION RECORD // VX—00</div>
                  <div className={`v ${t.logTitleRow}`}>
                    <div className={`t ${t.logTitle}`}>WHAT WAS SAID</div>
                    <div
                      className={`v ${t.logCloseBtn} press`}
                      onMouseEnter={playHover}
                      onClick={() => setLogOpen(false)}
                      role="button"
                      tabIndex={0}
                      aria-label="Close orientation log"
                      data-testid="tutorial-duel-log-close"
                      onKeyDown={(e) => {
                        if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); setLogOpen(false); }
                      }}
                    >
                      <div className={`t ${t.logCloseTxt}`}>CLOSE ✕</div>
                    </div>
                  </div>
                </div>
                <div className={`v ${t.logScroll}`}>
                  {history.length === 0 ? (
                    <div className={`t ${t.logEmpty}`}>NOTHING ON RECORD YET.</div>
                  ) : history.map((entry) => (
                    <div
                      key={entry.id}
                      className={`v ${t.logEntry} ${entry.speaker === "YOU" ? t.logEntryYou : ""} press`}
                      onClick={() => rewindDuel(entry.id)}
                      role="button"
                      tabIndex={0}
                      aria-label="Replay this part of the orientation"
                      onKeyDown={(e) => {
                        if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); rewindDuel(entry.id); }
                      }}
                    >
                      <div className={`v ${t.logWho}`}>
                        <div className={`t ${t.logWhoTxt} ${entry.speaker === "YOU" ? t.logWhoYou : ""}`}>{entry.speaker}</div>
                      </div>
                      <div className={`t ${t.logLine}`}>{entry.text}</div>
                    </div>
                  ))}
                </div>
                <div className={`v ${t.logFoot}`}>
                  <div className={`t ${t.logFootTxt}`}>
                    ORIENTATION RECORD — {String(history.filter((e) => e.speaker === "VICTOR").length).padStart(2, "0")} ENTRIES
                  </div>
                  <div className={`t ${t.logFootHint}`}>CLICK AN ENTRY TO JUMP BACK</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!logOpen && (
          <>
            <div className={s.logDock}>
              <div
                className={`v ${t.logBtn} press`}
                onMouseEnter={playHover}
                onClick={(e) => { e.stopPropagation(); openLog(); }}
                role="button"
                tabIndex={0}
                aria-label="Open orientation log"
                data-testid="tutorial-duel-log"
                onKeyDown={(e) => {
                  if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); openLog(); }
                }}
              >
                <div className={`t ${t.logBtnTxt}`}>▤ LOG</div>
              </div>
            </div>
            <div className={s.skipDock}>
              <div
                className={`v ${t.skipBtn} press`}
                onMouseEnter={playHover}
                onClick={(e) => { e.stopPropagation(); startTricks(); }}
                role="button"
                tabIndex={0}
                aria-label="Skip to the next part"
                data-testid="tutorial-duel-skip"
                onKeyDown={(e) => {
                  if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); startTricks(); }
                }}
              >
                <div className={`t ${t.logBtnTxt}`}>SKIP ▶</div>
              </div>
            </div>
          </>
        )}

        <div className={`v ${t.rotate}`} aria-hidden>
          <b>↻</b> ROTATE FOR FULLSCREEN
        </div>
      </div>
    </IonPage>
  );
}
