import { IonPage } from "@ionic/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { playClick, playHover } from "../lib/sfx";
import { KLEIN_PORTRAITS, type EncounterScene, type EpilogueScene, type KleinPose, type KleinReplyChoice, type SceneLine } from "../lib/encounter";
import s from "./story.module.css";

const DESIGN_W = 1600;
const DESIGN_H = 900;
const TYPE_MS = 32;
const POSES = Object.keys(KLEIN_PORTRAITS) as KleinPose[];

function bubblePath(w: number, h: number) {
  const rnd = (i: number) => {
    let x = (i * 668265263 + 987654321) | 0;
    x = (x ^ (x >>> 13)) * 1274126177;
    return (((x ^ (x >>> 16)) >>> 0) % 1000) / 1000;
  };
  const j = (i: number, amp: number) => (rnd(i) - 0.5) * amp;
  const pts: string[] = [];
  const P = (x: number, y: number) => pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  P(26, 10 + j(0, 6));
  for (let x = 96, i = 1; x < w - 40; x += 72, i++) P(x, 8 + j(i, 7));
  P(w - 14, 22 + j(20, 5));
  for (let y = 58, i = 21; y < h - 34; y += 44, i++) P(w - 10 + j(i, 6), y);
  P(w - 26, h - 12 + j(30, 5));
  for (let x = w - 98, i = 31; x > 40; x -= 72, i++) P(x, h - 9 + j(i, 7));
  P(14, h - 26 + j(40, 5));
  P(12, h - 44);
  P(-34, h - 54);
  P(-10, h - 62);
  P(-30, h - 78);
  P(14, h - 84);
  for (let y = h - 110, i = 41; y > 30; y -= 44, i++) P(10 + j(i, 6), y);
  P(18, 18 + j(50, 5));
  return `M ${pts.join(" L ")} Z`;
}

function BubbleArt() {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 840, h: 132 });
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

export default function Story() {
  const [sp] = useSearchParams();
  const encounterId = sp.get("encounter") ?? "";
  const epilogueMode = sp.get("after") === "1";
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [scene, setScene] = useState<{ chapter: string; lines: SceneLine[]; exchange?: { choices: KleinReplyChoice[] } } | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [starting, setStarting] = useState(false);
  const [reply, setReply] = useState<{ choice: KleinReplyChoice } | null>(null);
  const [replying, setReplying] = useState(false);
  const alive = useRef(true);
  const readSent = useRef(0);
  const startingRef = useRef(false);
  const replyingRef = useRef(false);

  useEffect(() => {
    alive.current = true;
    for (const pose of POSES) { const img = new window.Image(); img.src = KLEIN_PORTRAITS[pose]; }
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!encounterId) { router.replace("/campaign"); return; }
    setStatus("loading");
    try {
      if (epilogueMode) {
        const data = await api<EpilogueScene>(`/campaign/encounters/${encounterId}/epilogue`);
        if (!alive.current) return;
        if (!data.epilogue) { router.replace("/campaign"); return; }
        setScene(data.epilogue);
        setLineIdx(0);
        setChars(0);
        readSent.current = 0;
        setStatus("ready");
        return;
      }
      const data = await api<EncounterScene>("/campaign/encounters", { id: encounterId, studentId: 1 });
      if (!alive.current) return;
      if (data.completed) { router.replace("/campaign"); return; }
      if (data.started) { router.replace(`/duel?encounter=${encounterId}`); return; }
      if (!data.scene) { setErrMsg("SCENE MISSING"); setStatus("error"); return; }
      setScene(data.scene);
      setLineIdx(0);
      setChars(0);
      setReply(null);
      readSent.current = 0;
      setStatus("ready");
    } catch (e: any) {
      if (!alive.current) return;
      if (String(e?.message).includes("NOT LOGGED IN")) { router.replace("/login"); return; }
      setErrMsg(e?.message ?? "REQUEST FAILED");
      setStatus("error");
    }
  }, [encounterId, epilogueMode]);

  useEffect(() => { void load(); }, [load]);

  // Lines on screen = the authored scene, plus Klein's scripted reply once the
  // player has answered the exchange.
  const lines: SceneLine[] = [...(scene?.lines ?? [])];
  if (reply) lines.push({ text: reply.choice.response.text, pose: reply.choice.response.pose });
  const exchange = epilogueMode || reply ? undefined : scene?.exchange?.choices;
  const line = lines[lineIdx];
  const full = line?.text ?? "";
  const done = chars >= full.length;
  const atLastLine = lineIdx + 1 >= lines.length;

  useEffect(() => {
    if (status !== "ready" || !line || done) return;
    const iv = setInterval(() => setChars((c) => Math.min(c + 1, full.length)), TYPE_MS);
    return () => clearInterval(iv);
  }, [status, lineIdx, done, full.length, line]);

  const acknowledge = useCallback((count: number) => {
    if (count <= readSent.current) return;
    readSent.current = count;
    void api(epilogueMode
      ? `/campaign/encounters/${encounterId}/epilogue/read`
      : `/campaign/encounters/${encounterId}/read`, { readCount: count }).catch(() => {});
  }, [encounterId, epilogueMode]);

  useEffect(() => {
    // Klein's scripted reply-exchange response is display-only flavor: it never
    // counts toward the server-validated readCount (authored scene lines only).
    if (status === "ready" && done && line) acknowledge(Math.min(lineIdx + 1, scene?.lines.length ?? 0));
  }, [status, done, line, lineIdx, acknowledge, scene]);

  const pickReply = useCallback(async (choice: KleinReplyChoice) => {
    if (replyingRef.current) return;
    replyingRef.current = true;
    setReplying(true);
    playClick();
    try {
      await api(`/campaign/encounters/${encounterId}/reply`, { choiceId: choice.id });
      if (alive.current) setReply({ choice });
    } catch {
      // A failed reply must never trap the player: continue without the exchange.
    } finally {
      replyingRef.current = false;
      setReplying(false);
    }
  }, [encounterId]);

  const startDuel = useCallback(async () => {
    if (startingRef.current || epilogueMode) return;
    startingRef.current = true;
    setStarting(true);
    playClick();
    try {
      await api(`/campaign/encounters/${encounterId}/start`, { readCount: readSent.current });
      if (alive.current) router.replace(`/duel?encounter=${encounterId}`);
    } catch (e: any) {
      if (!alive.current) return;
      startingRef.current = false;
      setStarting(false);
      setErrMsg(e?.message ?? "REQUEST FAILED");
      setStatus("error");
    }
  }, [encounterId, epilogueMode]);

  const advance = useCallback(() => {
    if (status !== "ready" || !scene || starting || startingRef.current || replying || replyingRef.current) return;
    if (!done) { setChars(full.length); return; }
    if (atLastLine && exchange) return; // the player must answer the exchange
    playClick();
    if (atLastLine) {
      if (epilogueMode) { router.replace("/campaign"); return; }
      void startDuel();
      return;
    }
    setLineIdx((i) => i + 1);
    setChars(0);
  }, [status, scene, starting, replying, done, full.length, atLastLine, exchange, lineIdx, epilogueMode, startDuel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); advance(); }
      else if (e.code === "Escape" && status === "ready" && !epilogueMode) { e.preventDefault(); void startDuel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, startDuel, status, epilogueMode]);

  const pose: KleinPose = line?.pose ?? "neutral";
  const chapterLabel = epilogueMode ? "AFTER THE DUEL" : scene?.chapter ?? "";

  return (
    <IonPage>
      <div className={`v ${s.viewport} ${status === "ready" ? s.viewportReady : ""}`} onClick={advance}>
        <div className={`v ${s.stage}`} style={{ transform: `scale(${scale})` }}>
          <div className={`v ${s.stripes}`} />
          <div className={`v ${s.dots}`} />
          <div className={`v ${s.vignette}`} />

          {status === "ready" && scene && (
            <>
              <div className={`v ${s.chapterWrap}`}>
                <div className={`v ${s.chapterBar}`} />
                <div className={`t ${s.chapterTxt}`}>{epilogueMode ? chapterLabel : `CH.01 — ${chapterLabel.toUpperCase()}`}</div>
              </div>

              <div className={`v ${s.portraitWrap}`}>
                {POSES.map((p) => (
                  <div key={p} className={`v ${s.portrait}`} style={{ backgroundImage: `url("${KLEIN_PORTRAITS[p]}")`, opacity: p === pose ? 1 : 0 }} />
                ))}
              </div>

              <div className={`v ${s.dialogueHit} press`} data-testid="story-advance">
                <BubbleArt />
                <div className={`v ${s.dialogueContent}`}>
                  {line && line.text === reply?.choice.text ? (
                    <div className={`t ${s.dialogueTxt}`} data-testid="story-text" style={{ color: "#7fd4ff" }}>
                      {full.slice(0, chars)}
                      {!done && <span className={s.caret}>▍</span>}
                    </div>
                  ) : (
                    <div className={`t ${s.dialogueTxt}`} data-testid="story-text">
                      {full.slice(0, chars)}
                      {!done && <span className={s.caret}>▍</span>}
                    </div>
                  )}
                  {exchange && done && atLastLine && (
                    <div className={`v ${s.choices}`} onClick={(e) => e.stopPropagation()}>
                      {exchange.map((choice) => (
                        <div key={choice.id} className={`v ${s.choiceBtn} press`} onMouseEnter={playHover}
                          onClick={() => void pickReply(choice)} data-testid={`reply-${choice.id}`}>
                          <div className={`t ${s.choiceTxt}`}>“{choice.text}”</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`v ${s.nameTag}`}>
                  <div className={`t ${s.nameTxt}`}>{reply && line?.text === reply.choice.text ? "YOU" : "KLEIN"}</div>
                </div>
                {lines.length > 1 && (
                  <div className={`t ${s.lineCount}`}>
                    {String(lineIdx + 1).padStart(2, "0")} / {String(lines.length).padStart(2, "0")}
                  </div>
                )}
                {done && !exchange && <div className={`t ${s.nextArrow}`}>▶</div>}
              </div>

              <div className={`v ${s.controls}`} onClick={(e) => e.stopPropagation()}>
                {!epilogueMode && (
                  <div className={`v ${s.skipBtn} press`} onMouseEnter={playHover} onClick={() => void startDuel()} data-testid="story-skip">
                    <div className={`t ${s.skipTxt}`}>SKIP ▶▶</div>
                  </div>
                )}
                <div className={`t ${s.hintTxt}`}>CLICK ANYWHERE / SPACE</div>
              </div>
            </>
          )}

          {status === "loading" && (
            <div className={`v ${s.centerWrap}`}>
              <div className={`t ${s.loadingTxt}`} style={{ animation: "p5-blinkHard 1.1s ease-in-out infinite" }}>
                {epilogueMode ? "KLEIN IS PUTTING THE TABLE AWAY…" : "KLEIN IS SETTING THE TABLE…"}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className={`v ${s.centerWrap}`}>
              <div className={`t ${s.errorTxt}`}>SIGNAL LOST — {errMsg}</div>
              <div className={`v ${s.errorBtns}`}>
                <div className={`v ${s.retryBtn} press`} onMouseEnter={playHover} onClick={() => void load()}>
                  <div className={`t ${s.retryTxt}`}>RETRY ▶</div>
                </div>
                <div className={`v ${s.backBtn} press`} onMouseEnter={playHover} onClick={() => { playClick(); router.replace("/campaign"); }}>
                  <div className={`t ${s.backTxt}`}>CAMPAIGN</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </IonPage>
  );
}
