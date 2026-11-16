/* OPTIONS — LOCKED design (A, system panel). Four-bus sound mixer
   (MAIN / SFX / BGM / VOICE), fullscreen, REDUCE MOTION with a live demo right on
   this page, and LOG OUT. Everything applies instantly and persists. */
import { IonPage } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { playHover, playSliderTick } from "../lib/sfx";
import { router } from "../lib/nav";
import {
  GameOptions,
  DEFAULT_OPTIONS,
  loadOptions,
  saveOptions,
  applyOptions,
} from "../lib/options";
import { api } from "../lib/api";
import { useGame } from "../state/game";
import { P5Back } from "../components/P5Back";
import s from "./options.module.css";

/* ---- slider: hover highlight, drag anywhere on the track, knob swells ----
   (the Expo build used RN PanResponder; this is the same drag with Pointer
   Events + setPointerCapture so drags leaving the track keep working) */
function P5Slider({
  value,
  onChange,
  onCommit,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const domRef = useRef<HTMLDivElement | null>(null);
  const geom = useRef({ x: 0, w: 1 });

  function measureSync() {
    const n = domRef.current;
    if (!n) return false;
    const r = n.getBoundingClientRect();
    geom.current = { x: r.left, w: r.width || 1 };
    return true;
  }

  function pick(clientX: number) {
    const ratio = Math.max(0, Math.min(1, (clientX - geom.current.x) / geom.current.w));
    onChange(Math.round(ratio * 100));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setDragging(true);
    if (measureSync()) pick(e.clientX);
  }
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || !dragging) return;
    measureSync(); // keep fresh through scrolls/layout shifts mid-drag
    pick(e.clientX);
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    onCommit?.();
  }

  const hot = (hover || dragging) && !disabled;

  return (
    <div className={`v ${s.slOuter}`}>
      <div
        ref={domRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`v ${s.slTrack} ${disabled ? s.slDisabled : ""} ${hot ? s.slHot : ""}`}
        style={{ touchAction: "none" }}
      >
        {/* segment ticks */}
        {[25, 50, 75].map((t) => (
          <div key={t} className={`v ${s.slTick}`} style={{ pointerEvents: "none", left: `${t}%` }} />
        ))}
        <div
          className={`v ${s.slFill}`}
          style={{
            pointerEvents: "none",
            width: `${value}%`,
            backgroundColor: disabled ? "#3a3a3a" : "#E60012",
            transition: disabled ? undefined : "width 60ms linear",
          }}
        />
        <div className={`v ${s.slKnobWrap}`} style={{ pointerEvents: "none", left: `${value}%` }}>
          <div
            className={`v ${s.slKnob} ${hot ? s.slKnobHot : ""} ${dragging ? s.slKnobDrag : ""} ${
              disabled ? s.slKnobDisabled : ""
            }`}
            style={{ transition: "transform 130ms cubic-bezier(0.16,1,0.3,1), box-shadow 130ms" }}
          />
        </div>
      </div>
      <div className={`t ${s.slPct} ${disabled ? s.slPctDim : ""} ${hot ? s.slPctHot : ""}`}>
        {String(value).padStart(2, "0")}
        <span className={`ti ${s.slPctSign}`}>%</span>
      </div>
    </div>
  );
}

/* mini speaker for a single bus row — click to mute/unmute that bus */
function RowSpeaker({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <div className={`press ${s.rsChip} ${!muted ? s.rsOn : ""}`} onClick={onToggle}>
      <div className={`v ${s.rsIcon}`}>
        <div className={`v ${s.rsBox} ${!muted ? s.rsInk : ""}`} />
        <div className={`v ${s.rsCone} ${!muted ? s.rsInk : ""}`} />
        {!muted && (
          <>
            <div className={`v ${s.rsWave}`} style={{ right: 6, width: 4, height: 9 }} />
            <div className={`v ${s.rsWave}`} style={{ right: 2, width: 4, height: 14 }} />
          </>
        )}
        {muted && <div className={`v ${s.rsSlash}`} />}
      </div>
    </div>
  );
}

async function toggleFullscreen() {
  if (typeof document === "undefined") return;
  try {
    if ((document as any).fullscreenElement) await (document as any).exitFullscreen();
    else await (document.documentElement as any).requestFullscreen();
  } catch {}
}

export default function Options() {
  const { clearProfile } = useGame();
  const [opts, setOpts] = useState<GameOptions>(DEFAULT_OPTIONS);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const o = loadOptions();
    setOpts(o);
    applyOptions(o);
    const syncFs = () => setFs(!!(document as any).fullscreenElement);
    document.addEventListener("fullscreenchange", syncFs);
    return () => document.removeEventListener("fullscreenchange", syncFs);
  }, []);

  const update = (patch: Partial<GameOptions>) => {
    setOpts((prev) => {
      const next = { ...prev, ...patch };
      saveOptions(next);
      applyOptions(next);
      return next;
    });
  };

  async function logout() {
    try {
      await api("/auth/logout", {});
    } catch {}
    clearProfile();
    router.replace("/");
  }

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        {/* ---- environment ---- */}
        <div className={`v ${s.envSlashL}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.envSlashLIn}`} style={{ animation: "p5-slashA 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>
        <div className={`v ${s.envSlashR}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.envSlashRIn}`} style={{ animation: "p5-slashB 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>
        <div className={`v ${s.ringW}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.ring}`} />
          {/* crosshair ticks rotating opposite the ring */}
          <div className={`v ${s.ringTicks}`}>
            {[0, 90, 180, 270].map((d) => (
              <div key={d} className={`v ${s.ringTick}`} style={{ transform: `rotate(${d}deg) translateY(-150px)` }} />
            ))}
          </div>
          <div className={`t ${s.ringStar}`}>✦</div>
        </div>
        <div className={`v ${s.burst}`} style={{ pointerEvents: "none" }} />

        {/* drifting ransom letters */}
        <div className={`v ${s.driftWrap}`} style={{ pointerEvents: "none" }}>
          {[
            { ch: "P", t: "16%", l: "30%", sz: 64, rot: -14, dur: "5.2s", d: "0s", o: 0.05, c: "#FFFFFF" },
            { ch: "✕", t: "58%", l: "26%", sz: 34, rot: 18, dur: "4.4s", d: "0.7s", o: 0.09, c: "#E60012" },
            { ch: "V", t: "80%", l: "52%", sz: 52, rot: -8, dur: "6s", d: "1.3s", o: 0.045, c: "#FFFFFF" },
            { ch: "!", t: "12%", l: "70%", sz: 46, rot: 22, dur: "4.8s", d: "1.9s", o: 0.07, c: "#FCEE21" },
            { ch: "A", t: "64%", l: "78%", sz: 70, rot: -16, dur: "5.7s", d: "0.4s", o: 0.04, c: "#FFFFFF" },
            { ch: "?", t: "38%", l: "94%", sz: 40, rot: 10, dur: "5s", d: "2.4s", o: 0.06, c: "#E60012" },
          ].map((g, i) => (
            <div
              key={i}
              className={`t ${s.driftGlyph}`}
              style={{
                top: g.t,
                left: g.l,
                fontSize: g.sz,
                opacity: g.o,
                color: g.c,
                transform: `rotate(${g.rot}deg)`,
                animationDuration: g.dur,
                animationDelay: g.d,
              }}
            >
              {g.ch}
            </div>
          ))}
        </div>

        {/* speed-line strips sweeping the background */}
        <div className={`v ${s.linesWrap}`} style={{ pointerEvents: "none" }}>
          {[
            { top: "24%", h: 5, dur: "9s", dir: "p5-marquee", col: "rgba(252,238,33,0.10)", d: "0s" },
            { top: "49%", h: 3, dur: "13s", dir: "p5-marquee reverse", col: "rgba(255,255,255,0.07)", d: "1.2s" },
            { top: "73%", h: 6, dur: "11s", dir: "p5-marquee", col: "rgba(230,0,18,0.10)", d: "0.6s" },
          ].map((L, i) => (
            <div key={i} className={`v ${s.lineStrip}`} style={{ top: L.top, height: L.h }}>
              <div className={`v ${s.lineInner}`}>
                <div className={`v`} style={{ width: "100%", animation: `${L.dir} ${L.dur} linear infinite`, animationDelay: L.d }}>
                  <div
                    className={`v`}
                    style={{
                      width: "100%",
                      backgroundImage: `repeating-linear-gradient(90deg, ${L.col} 0 46px, transparent 46px 110px)`,
                      height: L.h,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* orbiting spike pair around a fixed point */}
        <div className={`v ${s.orbitPt}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.orbitSpin}`}>
            <div className={`t ${s.orbitGlyph}`} style={{ top: -11 }}>◆</div>
            <div className={`t ${s.orbitGlyph}`} style={{ top: "auto", bottom: -11, color: "#FFFFFF" }}>◆</div>
          </div>
        </div>

        {/* four-point spike spinner near the account block */}
        <div className={`v ${s.spike}`} style={{ pointerEvents: "none" }} />

        <div className={`v ${s.diamonds}`} style={{ pointerEvents: "none" }}>
          {[
            { t: "14%", l: "38%", sz: 14, d: "0s" },
            { t: "72%", l: "34%", sz: 10, d: "1.1s" },
            { t: "26%", l: "92%", sz: 15, d: "0.6s" },
            { t: "80%", l: "88%", sz: 11, d: "1.7s" },
          ].map((dm, i) => (
            <div
              key={i}
              className={`t ${s.diamond}`}
              style={{ top: dm.t, left: dm.l, fontSize: dm.sz, animationDelay: dm.d }}
            >
              ◆
            </div>
          ))}
        </div>

        <P5Back style={{ position: "absolute", top: 20, left: 20 }} />

        {/* ---- panel ---- */}
        <div className={`v ${s.wrap}`}>
          {/* title column */}
          <div className={`v ${s.titleCol}`}>
            {["O", "P", "T", "I", "O", "N", "S"].map((ch, i) => (
              <div
                key={i}
                className={`t ${s.aLetter} ${i % 3 === 0 ? s.aLetterC : ""} ${i % 3 === 2 ? s.aLetterY : ""}`}
                style={{ animation: `heroIn 450ms ${i * 55}ms both` }}
              >
                {ch}
              </div>
            ))}
          </div>

          <div className={`v ${s.panelCol}`}>
            {/* SOUND */}
            <div className={`t ${s.secTag}`} style={{ animation: "rowIn 350ms 150ms both" }}>
              — SOUND
            </div>
            {[
              {
                key: "main",
                name: "MAIN VOLUME",
                desc: "MASTER DIAL — DUCKS EVERY BUS AT ONCE",
                slider: (
                  <P5Slider
                    value={opts.mainVol}
                    onChange={(v) => {
                      update({ mainVol: v });
                      playSliderTick();
                    }}
                    onCommit={() => playHover()}
                  />
                ),
                speaker: <RowSpeaker muted={opts.mutedMain} onToggle={() => update({ mutedMain: !opts.mutedMain })} />,
                anim: 220,
              },
              {
                key: "sfx",
                name: "SFX",
                desc: "UI BLIPS — RELEASE THE SLIDER TO HEAR IT",
                slider: (
                  <P5Slider
                    value={opts.sfxVol}
                    onChange={(v) => {
                      update({ sfxVol: v });
                      playSliderTick();
                    }}
                    onCommit={() => playHover()}
                  />
                ),
                speaker: <RowSpeaker muted={opts.mutedSfx} onToggle={() => update({ mutedSfx: !opts.mutedSfx })} />,
                anim: 300,
              },
              {
                key: "bgm",
                name: "BGM",
                desc: "PAGE MUSIC — DRAG TO HEAR THE CURRENT TRACK FADE",
                slider: (
                  <P5Slider
                    value={opts.bgmVol}
                    onChange={(v) => {
                      update({ bgmVol: v });
                      playSliderTick();
                    }}
                  />
                ),
                speaker: <RowSpeaker muted={opts.mutedBgm} onToggle={() => update({ mutedBgm: !opts.mutedBgm })} />,
                anim: 380,
              },
              {
                key: "voice",
                name: "VOICE",
                desc: "KLEIN'S SPOKEN LINES — MAIN MUTE DUCKS IT, THIS MUTE STOPS IT",
                slider: (
                  <P5Slider
                    value={opts.voiceVol}
                    onChange={(v) => {
                      update({ voiceVol: v });
                      playSliderTick();
                    }}
                  />
                ),
                speaker: <RowSpeaker muted={opts.mutedVoice} onToggle={() => update({ mutedVoice: !opts.mutedVoice })} />,
                anim: 460,
              },
            ].map((r) => (
              <div key={r.key} className={`v ${s.rowCard}`} style={{ animation: `jokerIn 450ms ${r.anim}ms both` }}>
                <div className={`v`} style={{ flex: 1 }}>
                  <div className={`t ${s.rowName}`}>{r.name}</div>
                  <div className={`t ${s.rowDesc}`}>{r.desc}</div>
                </div>
                <div className={`v`} style={{ width: 280 }}>
                  {r.slider}
                </div>
                {r.speaker}
              </div>
            ))}

            {/* DISPLAY */}
            <div className={`t ${s.secTag}`} style={{ animation: "rowIn 350ms 540ms both" }}>
              — DISPLAY
            </div>
            <div className={`v ${s.rowCard}`} style={{ animation: "jokerIn 450ms 600ms both" }}>
              <div className={`v`} style={{ flex: 1 }}>
                <div className={`t ${s.rowName}`}>{fs ? "EXIT FULLSCREEN" : "FULLSCREEN"}</div>
                <div className={`t ${s.rowDesc}`}>CLAIM THE WHOLE SCREEN FOR PACIFY</div>
              </div>
              <div className={`press ${s.fsBtn}`} onClick={toggleFullscreen}>
                <div className={`t ${s.fsTxt}`}>{fs ? "WINDOW □" : "EXPAND ⛶"}</div>
              </div>
            </div>

            {/* ACCOUNT */}
            <div className={`t ${s.secTag}`} style={{ animation: "rowIn 350ms 760ms both" }}>
              — ACCOUNT
            </div>
            <div className={`press ${s.logoutBtn}`} style={{ animation: "jokerIn 450ms 820ms both" }} onClick={logout}>
              <div className={`t ${s.logoutTxt}`}>LOG OUT</div>
              <div className={`t ${s.logoutArr}`}>◀</div>
              <div className={`v ${s.logoutBar}`} style={{ pointerEvents: "none", opacity: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </IonPage>
  );
}
