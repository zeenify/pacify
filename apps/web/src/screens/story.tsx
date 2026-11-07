import { IonPage } from "@ionic/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { playClick, playHover } from "../lib/sfx";
import { KLEIN_PORTRAITS, type EncounterScene, type KleinPose } from "../lib/encounter";
import s from "./story.module.css";

const DESIGN_W = 1600;
const DESIGN_H = 900;
const TYPE_MS = 26;
const POSES = Object.keys(KLEIN_PORTRAITS) as KleinPose[];
const JAGGED = "polygon(0% 6%, 4% 0%, 12% 4%, 22% 1%, 34% 5%, 47% 0%, 60% 4%, 73% 1%, 86% 5%, 96% 0%, 100% 8%, 98% 22%, 100% 40%, 97% 58%, 100% 76%, 98% 92%, 100% 100%, 90% 96%, 78% 100%, 64% 95%, 50% 100%, 36% 96%, 22% 100%, 10% 95%, 2% 100%, 0% 88%, 2% 70%, 0% 52%, 3% 34%, 0% 18%)";

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
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / DESIGN_W, height / DESIGN_H);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");
  const [scene, setScene] = useState<EncounterScene["scene"] | null>(null);
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [starting, setStarting] = useState(false);
  const alive = useRef(true);
  const readSent = useRef(0);

  useEffect(() => {
    alive.current = true;
    for (const pose of POSES) { const img = new window.Image(); img.src = KLEIN_PORTRAITS[pose]; }
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!encounterId) { router.replace("/campaign"); return; }
    setStatus("loading");
    try {
      const data = await api<EncounterScene>("/campaign/encounters", { id: encounterId, studentId: 1 });
      if (!alive.current) return;
      if (data.completed) { router.replace("/campaign"); return; }
      if (data.started) { router.replace(`/duel?encounter=${encounterId}`); return; }
      setScene(data.scene);
      setLineIdx(0);
      setChars(0);
      readSent.current = 0;
      setStatus("ready");
    } catch (e: any) {
      if (!alive.current) return;
      if (String(e?.message).includes("NOT LOGGED IN")) { router.replace("/login"); return; }
      setErrMsg(e?.message ?? "REQUEST FAILED");
      setStatus("error");
    }
  }, [encounterId]);

  useEffect(() => { void load(); }, [load]);

  const line = scene?.lines[lineIdx];
  const full = line?.text ?? "";
  const done = chars >= full.length;

  useEffect(() => {
    if (status !== "ready" || !line || done) return;
    const iv = setInterval(() => setChars((c) => Math.min(c + 1, full.length)), TYPE_MS);
    return () => clearInterval(iv);
  }, [status, lineIdx, done, full.length, line]);

  const acknowledge = useCallback((count: number) => {
    if (count <= readSent.current) return;
    readSent.current = count;
    void api(`/campaign/encounters/${encounterId}/read`, { readCount: count }).catch(() => {});
  }, [encounterId]);

  useEffect(() => {
    if (status === "ready" && done && line) acknowledge(lineIdx + 1);
  }, [status, done, line, lineIdx, acknowledge]);

  const startDuel = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    playClick();
    try {
      await api(`/campaign/encounters/${encounterId}/start`, { readCount: readSent.current });
      if (alive.current) router.replace(`/duel?encounter=${encounterId}`);
    } catch (e: any) {
      if (!alive.current) return;
      setStarting(false);
      setErrMsg(e?.message ?? "REQUEST FAILED");
      setStatus("error");
    }
  }, [encounterId, starting]);

  const advance = useCallback(() => {
    if (status !== "ready" || !scene || starting) return;
    if (!done) { setChars(full.length); return; }
    playClick();
    if (lineIdx + 1 >= scene.lines.length) { void startDuel(); return; }
    setLineIdx((i) => i + 1);
    setChars(0);
  }, [status, scene, starting, done, full.length, lineIdx, startDuel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); advance(); }
      else if (e.code === "Escape" && status === "ready") { e.preventDefault(); void startDuel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, startDuel, status]);

  const pose: KleinPose = line?.pose ?? "neutral";

  return (
    <IonPage>
      <div className={`v ${s.viewport}`}>
        <div className={`v ${s.stage}`} style={{ transform: `scale(${scale})` }}>
          <div className={`v ${s.stripes}`} />
          <div className={`v ${s.dots}`} />
          <div className={`v ${s.vignette}`} />

          {status === "ready" && scene && (
            <>
              <div className={`v ${s.chapterWrap}`}>
                <div className={`v ${s.chapterBar}`} />
                <div className={`t ${s.chapterTxt}`}>CH.01 — {scene.chapter.toUpperCase()}</div>
              </div>

              <div className={`v ${s.portraitWrap}`}>
                {POSES.map((p) => (
                  <div key={p} className={`v ${s.portrait}`} style={{ backgroundImage: `url("${KLEIN_PORTRAITS[p]}")`, opacity: p === pose ? 1 : 0 }} />
                ))}
              </div>

              <div className={`v ${s.skipBtn} press`} onMouseEnter={playHover} onClick={() => void startDuel()} data-testid="story-skip">
                <div className={`t ${s.skipTxt}`}>SKIP ▶▶</div>
              </div>
              <div className={`t ${s.hintTxt}`}>CLICK / SPACE</div>

              <div className={`v ${s.dialogueHit} press`} onClick={advance} data-testid="story-advance">
                <div className={`v ${s.dialogueKey}`} style={{ clipPath: JAGGED }} />
                <div className={`v ${s.dialogueFace}`} style={{ clipPath: JAGGED }}>
                  <div className={`t ${s.dialogueTxt}`} data-testid="story-text">{full.slice(0, chars)}</div>
                  {done && <div className={`v ${s.advanceTri}`} />}
                </div>
                <div className={`v ${s.nameTag}`}>
                  <div className={`t ${s.nameTxt}`}>KLEIN</div>
                </div>
              </div>
            </>
          )}

          {status === "loading" && (
            <div className={`v ${s.centerWrap}`}>
              <div className={`t ${s.loadingTxt}`} style={{ animation: "p5-blinkHard 1.1s ease-in-out infinite" }}>KLEIN IS SETTING THE TABLE…</div>
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
