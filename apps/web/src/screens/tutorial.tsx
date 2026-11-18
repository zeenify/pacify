/* TUTORIAL — THE ORIENTATION. Victor, the Institute's registrar, receives a
   new enrollee at the table. The first chunk is deterministic: authored lines,
   pre-baked voice clips, no LLM and no network wait. He offers the orientation;
   declining gets the nose-bridge pinch and leaves the flag untouched. */
import { IonPage, useIonViewWillLeave } from "@ionic/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { navigationInProgress, router } from "../lib/nav";
import { playClick, playHover } from "../lib/sfx";
import { playVictorClip, type VictorPlayHandle } from "../lib/victor-voice";
import {
  VICTOR_ACCEPT,
  VICTOR_DECLINE,
  VICTOR_INTRO,
  VICTOR_OFFER,
  VICTOR_PORTRAITS,
  type VictorLine,
  type VictorPose,
} from "../data/victor";
import s from "./tutorial.module.css";

const DESIGN_W = 1600;
const DESIGN_H = 900;
const TYPE_MS = 32;

type Phase = "intro" | "offer" | "decline" | "accept";

function bubblePath(w: number, h: number) {
  const rnd = (i: number) => {
    let x = (i * 668265263 + 987654321) | 0;
    x = (x ^ (x >>> 13)) * 1274126177;
    return (((x ^ (x >>> 16)) >>> 0) % 1000) / 1000;
  };
  const j = (i: number, amp: number) => (rnd(i) - 0.5) * amp;
  const pts: string[] = [];
  const P = (x: number, y: number) => pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  // top edge, left → right
  P(26, 10 + j(0, 6));
  for (let x = 96, i = 1; x < w - 40; x += 72, i++) P(x, 8 + j(i, 7));
  P(w - 14, 22 + j(20, 5));
  // right edge down to the tail
  for (let y = 58, i = 21; y < h - 110; y += 44, i++) P(w - 10 + j(i, 6), y);
  // tail, pointing right at Victor
  P(w + 34, h - 84);
  P(w + 10, h - 62);
  P(w + 30, h - 54);
  P(w + 4, h - 44);
  P(w - 14, h - 26);
  // bottom edge, right → left
  P(w - 26, h - 12 + j(30, 5));
  for (let x = w - 98, i = 31; x > 40; x -= 72, i++) P(x, h - 9 + j(i, 7));
  P(14, h - 26 + j(40, 5));
  // left edge, bottom → top
  for (let y = h - 110, i = 41; y > 30; y -= 44, i++) P(10 + j(i, 6), y);
  P(18, 18 + j(50, 5));
  return `M ${pts.join(" L ")} Z`;
}

function BubbleArt() {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 940, h: 184 });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = size;
  return (
    <div ref={host} className={s.bubbleArtHost} aria-hidden>
      <svg className={s.bubbleArt} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={bubblePath(w, h)} fill="#050505" stroke="#fff" strokeWidth={6} strokeLinejoin="miter" />
      </svg>
    </div>
  );
}

function useWindowDimensions() {
  const [d, setD] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const on = () => setD({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return d;
}

function linesFor(phase: Phase): VictorLine[] {
  switch (phase) {
    case "intro": return VICTOR_INTRO;
    case "offer": return [VICTOR_OFFER];
    case "decline": return VICTOR_DECLINE;
    case "accept": return VICTOR_ACCEPT;
  }
}

export default function Tutorial() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);

  const [phase, setPhase] = useState<Phase>("intro");
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [booted, setBooted] = useState(false);
  // The heist overlay owns the screen for ~1.4s; never start a line (or its
  // voice) underneath it. Mounted mid-transition => wait for the settled beat.
  const arrivedMidNav = useRef(navigationInProgress());
  const [navReady, setNavReady] = useState(!arrivedMidNav.current);
  const exitingRef = useRef(false);
  const lineVoiceRef = useRef<VictorPlayHandle | null>(null);

  const lines = linesFor(phase);
  const line = lines[Math.min(lineIdx, lines.length - 1)];
  const full = line?.text ?? "";
  const done = chars >= full.length;
  const last = lineIdx >= lines.length - 1;
  const atOffer = phase === "offer" && done;

  // the nav bridge announces cover/reveal — audio and typing hold until then
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

  // entrance beat: portrait and bubble land before the first line starts typing.
  // A screen mounted under the heist already had its entrance covered, so it
  // starts the moment the overlay clears instead of waiting again.
  useEffect(() => {
    if (!navReady) { setBooted(false); return; }
    const t = setTimeout(() => setBooted(true), arrivedMidNav.current ? 0 : 520);
    return () => clearTimeout(t);
  }, [navReady]);

  // one line on screen at a time: type it, and start its pre-baked voice clip.
  // The clip reveals the full line the moment audio is actually playing (the
  // pre-duel contract); with voice off the typewriter carries the pacing.
  useEffect(() => {
    if (!booted || !navReady || !line) return;
    setChars(0);
    let alive = true;
    const play = playVictorClip(line.audio, {
      onPlaying: () => { if (alive) setChars(line.text.length); },
    });
    lineVoiceRef.current = play;
    const iv = setInterval(() => setChars((c) => Math.min(c + 1, line.text.length)), TYPE_MS);
    return () => {
      alive = false;
      clearInterval(iv);
      play.cancel();
      if (lineVoiceRef.current === play) lineVoiceRef.current = null;
    };
  }, [booted, navReady, line]);

  useIonViewWillLeave(() => {
    lineVoiceRef.current?.cancel();
    lineVoiceRef.current = null;
  }, []);

  const exit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    playClick();
    router.replace("/menu", { back: true });
  }, []);

  const advance = useCallback(() => {
    if (!booted || !navReady || exitingRef.current) return;
    if (phase === "offer") return; // the offer is answered with the two cards
    if (!done) { setChars(full.length); return; }
    if (phase === "intro") {
      playClick();
      if (!last) {
        setLineIdx((i) => i + 1);
        setChars(0);
        return;
      }
      setPhase("offer");
      setLineIdx(0);
      setChars(0);
      return;
    }
    if ((phase === "decline" || phase === "accept") && !last) {
      playClick();
      setLineIdx((i) => i + 1);
      setChars(0);
    }
  }, [booted, navReady, phase, done, full.length, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); advance(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  const choose = useCallback((next: "teach" | "decline") => {
    if (!booted || !navReady || exitingRef.current) return;
    playClick();
    setPhase(next === "teach" ? "accept" : "decline");
    setLineIdx(0);
    setChars(0);
  }, [booted, navReady]);

  const pose: VictorPose = line?.pose ?? "stern";
  const showChoices = atOffer && navReady;
  const showExit = !showChoices && done && last && (phase === "decline" || phase === "accept");

  return (
    <IonPage>
      <div className={`v ${s.viewport} ${s.viewportReady}`} onClick={advance}>
        <div className={`v ${s.stage}`} style={{ transform: `scale(${scale})` }}>
          <div className={`v ${s.stripes}`} />
          <div className={`v ${s.dots}`} />
          <div className={`v ${s.redWedge}`} aria-hidden />
          <div className={`v ${s.spot}`} aria-hidden />
          <div className={`v ${s.vignette}`} />

          <div className={`v ${s.chapterWrap}`}>
            <div className={`v ${s.chapterBar}`} />
            <div className={`t ${s.chapterTxt}`}>ORIENTATION — THE REGISTRAR</div>
          </div>
          <div className={`t ${s.registration}`} aria-hidden>VX—00<br />FIRST YEAR</div>

          <div className={`v ${s.portraitWrap}`}>
            {(Object.keys(VICTOR_PORTRAITS) as VictorPose[]).map((p) => (
              <div
                key={p}
                className={`v ${s.portrait}`}
                style={{ backgroundImage: `url("${VICTOR_PORTRAITS[p]}")`, opacity: p === pose ? 1 : 0 }}
              />
            ))}
          </div>

          <div className={`v ${s.dialogueHit} press`} data-testid="tutorial-advance">
            {showChoices && (
              <div className={`v ${s.choices}`} data-testid="tutorial-choices" onClick={(e) => e.stopPropagation()}>
                <div className={`v ${s.choicesLabel}`}><div className={`t ${s.choicesLabelTxt}`}>YOUR ANSWER</div></div>
                <div
                  className={`v ${s.choiceBtn} ${s.choicePrimary} press`}
                  onMouseEnter={playHover}
                  onClick={() => choose("teach")}
                  role="button"
                  tabIndex={0}
                  aria-label="Accept the orientation"
                  data-testid="tutorial-teach"
                  onKeyDown={(e) => {
                    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); choose("teach"); }
                  }}
                >
                  <div className={`v ${s.choiceEdge}`} aria-hidden />
                  <div className={`v ${s.choiceInner}`}>
                    <div className={`t ${s.choiceMark}`} aria-hidden>▶</div>
                    <div className={`t ${s.choiceTxt}`}>TEACH ME THE TABLE</div>
                  </div>
                </div>
                <div
                  className={`v ${s.choiceBtn} ${s.choiceSecondary} press`}
                  onMouseEnter={playHover}
                  onClick={() => choose("decline")}
                  role="button"
                  tabIndex={0}
                  aria-label="Decline the orientation"
                  data-testid="tutorial-decline"
                  onKeyDown={(e) => {
                    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); e.stopPropagation(); choose("decline"); }
                  }}
                >
                  <div className={`v ${s.choiceEdge}`} aria-hidden />
                  <div className={`v ${s.choiceInner}`}>
                    <div className={`t ${s.choiceMark}`} aria-hidden>▶</div>
                    <div className={`t ${s.choiceTxt}`}>I&apos;LL TAKE MY CHANCES</div>
                  </div>
                </div>
              </div>
            )}

            <BubbleArt />
            <div className={`v ${s.dialogueContent}`}>
              <div className={`t ${s.dialogueTxt}`} data-testid="tutorial-text">
                {full.slice(0, chars)}
                {!done && <span className={s.caret}>▍</span>}
              </div>
            </div>
            <div className={`v ${s.nameTag}`}>
              <div className={`t ${s.nameTxt}`}>VICTOR</div>
            </div>
            {lines.length > 1 && (
              <div className={`t ${s.lineCount}`}>
                {String(lineIdx + 1).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}
              </div>
            )}
            {done && !showChoices && !showExit && <div className={`t ${s.nextArrow}`}>▶</div>}
          </div>

          <div className={`v ${s.controls}`} onClick={(e) => e.stopPropagation()}>
            {showExit && (
              <div
                className={`v ${s.exitBtn} press`}
                onMouseEnter={playHover}
                onClick={exit}
                data-testid={phase === "decline" ? "tutorial-leave" : "tutorial-begin"}
              >
                <div className={`t ${s.exitTxt}`}>{phase === "decline" ? "LEAVE ▶" : "BEGIN ▶"}</div>
              </div>
            )}
            <div className={`t ${s.hintTxt}`}>CLICK ANYWHERE / SPACE</div>
          </div>
        </div>

        <div className={`v ${s.rotate}`} aria-hidden>
          <b>↻</b> ROTATE FOR FULLSCREEN
        </div>
      </div>
    </IonPage>
  );
}
