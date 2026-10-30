/* LOAD SCREEN — the ONE combined loader: buffers SFX AND pulls student records
   from the DB exactly once into the client store. Runs right after Login (or a
   returning session), then hands off to the title screen. */
import { IonPage } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/game";
import { initSfx, initBgm, unlockSfx, unlockBgm } from "../lib/sfx";
import { router } from "../lib/nav";
import s from "./load.module.css";

export default function Load() {
  const { refreshProfile } = useGame();
  const [pct, setPct] = useState(0);
  const [steps, setSteps] = useState([false, false, false]);
  const doneRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const t0 = Date.now();

    const finish = () => {
      if (!alive || doneRef.current) return;
      doneRef.current = true;
      setPct(100);
      const wait = Math.max(0, 1500 - (Date.now() - t0));
      setTimeout(() => {
        if (alive) router.replace("/start");
      }, wait);
    };

    // single calls — reused for step flags AND the finish gate
    const sfxP = initSfx();
    const bgmP = initBgm();
    const profP = refreshProfile();

    // step 1 — sfx bank
    sfxP.then(() => {
      if (!alive) return;
      setSteps((st) => [true, st[1], st[2]]);
    });

    // step 2 — bgm bank (non-blocking for finish, but shows tick)
    bgmP.then(() => {
      if (!alive) return;
      setSteps((st) => [st[0], true, st[2]]);
    });

    // step 3 — THE one-time DB read
    profP
      .then(() => {
        if (!alive) return;
        setSteps((st) => [st[0], st[1], true]);
      })
      .catch(() => {
        if (alive) router.replace("/login");
      });

    // BGM preload does NOT gate navigation — keep loading snappy (4s timeout inside initBgm)
    Promise.all([sfxP, profP.catch(() => null)]).then(finish);

    // fake-tick so the bar always feels alive
    const tick = setInterval(() => {
      setPct((p) => Math.min(p + Math.random() * 7 + 3, 96));
    }, 90);
    const stop = setTimeout(() => clearInterval(tick), 6000);

    return () => {
      alive = false;
      clearInterval(tick);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pctI = Math.floor(pct);
  const SEG = 28;
  const filled = Math.round((pctI / 100) * SEG);

  return (
    <IonPage>
      <div
        className={`press ${s.stage}`}
        onClick={() => {
          unlockSfx();
          unlockBgm();
        }}
      >
        <div className={`v ${s.loadStar}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.loadGhost}`} style={{ pointerEvents: "none" }}>
          <div className={`t ${s.loadGhostText}`}>PACIFY</div>
        </div>
        <div className={`v ${s.loadSlash}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.loadScan}`} style={{ pointerEvents: "none" }} />

        <div className={`v ${s.loadWrap}`}>
          <div className={`t ${s.loadKicker}`}>ACQUIRING RECORDS</div>
          <div
            className={`t ${s.loadTitle}`}
            style={{
              ...(pct >= 96 ? { color: "#FCEE21" } : null),
              animation: "p5-blinkHard 1.1s steps(1) infinite",
            }}
          >
            NOW LOADING
          </div>

          <div className={`v ${s.loadSegTrack}`}>
            {Array.from({ length: SEG }).map((_, i) => (
              <div
                key={i}
                className={`v ${s.loadSeg} ${i < filled ? s.loadSegOn : ""} ${i === filled - 1 ? s.loadSegHead : ""}`}
              />
            ))}
          </div>

          <div className={`v ${s.stepCol}`}>
            {["SFX BANK", "BGM BANK", "STUDENT RECORDS"].map((label, i) => (
              <div key={label} className={`t ${s.stepTxt} ${steps[i] ? s.stepOn : ""}`}>
                [{steps[i] ? "OK" : ".."}] {label}
              </div>
            ))}
          </div>

          <div className={`v ${s.loadMeta}`}>
            <div className={`t ${s.loadPct}`}>{String(pctI).padStart(3, "0")}%</div>
          </div>
        </div>
      </div>
    </IonPage>
  );
}
