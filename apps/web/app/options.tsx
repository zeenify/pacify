/* OPTIONS — settings that ACTUALLY work. Changes apply live (research rule:
   instant preview beats an Apply button) and persist to localStorage.
   Three samples: A system panel, B paper form, C category slash. */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { PanResponder } from "react-native";
import { theme } from "@pacify/ui-kit";
import { playHover } from "../lib/sfx";
import { GameOptions, TextSpeed, DEFAULT_OPTIONS, loadOptions, saveOptions, applyOptions } from "../lib/options";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

type Cat = "sound" | "display" | "text";

/* ---- shared control: draggable slider (pointer-based, works on web) ---- */
function P5Slider({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  const [w, setW] = useState(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderRelease: () => onCommit?.(),
    })
  ).current;

  function pick(x: number) {
    if (!w) return;
    onChange(Math.max(0, Math.min(100, Math.round((x / w) * 100))));
  }

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={s.slTrack as any}
    >
      <View style={[s.slFill as any, { width: `${value}%` } as any]} />
      <View style={[slKnobPos(value, w)] as any}>
        <View style={s.slKnob as any} />
      </View>
      <Text style={s.slPct as any}>{String(value).padStart(2, "0")}%</Text>
    </View>
  );
}

function slKnobPos(value: number, w: number) {
  return [s.slKnobWrap as any, { left: `${value}%` } as any];
}

/* ---- shared control: slanted toggle ---- */
function P5Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={({ hovered }) => [s.tgWrap as any, hovered && (s.rowHov as any)]}>
      <View style={[s.tgTrack as any, on && (s.tgTrackOn as any)]}>
        <View style={[s.tgKnob as any, on && (s.tgKnobOn as any)]} />
      </View>
      <Text style={[s.tgTxt as any, on ? (s.tgOn as any) : (s.tgOff as any)]}>{on ? "ON" : "OFF"}</Text>
    </Pressable>
  );
}

/* ---- shared control: segmented choices ---- */
function P5Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <View style={s.segRow as any}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={({ hovered }) => [(o === value ? s.segOn : s.segOff) as any, hovered && o !== value && (s.segHov as any)]}>
          <Text style={[(o === value ? s.segTxtOn : s.segTxtOff) as any]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

async function toggleFullscreen() {
  if (!web || !document) return;
  try {
    if ((document as any).fullscreenElement) await (document as any).exitFullscreen();
    else await (document.documentElement as any).requestFullscreen();
  } catch {}
}

export default function Options() {
  const [sample, setSample] = useState<any>("a");
  const [opts, setOpts] = useState<GameOptions>(DEFAULT_OPTIONS);

  // hydrate once — options are device-local, not DB data
  useEffect(() => {
    const o = loadOptions();
    setOpts(o);
    applyOptions(o);
  }, []);

  const update = (patch: Partial<GameOptions>) => {
    setOpts((prev) => {
      const next = { ...prev, ...patch };
      saveOptions(next);
      applyOptions(next);
      return next;
    });
  };

  const commitVolume = () => playHover(); // live preview blip

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20 } as any} />
      <View style={s.picker as any}>
        {["a", "b", "c"].map((k) => (
          <Pressable key={k} onPress={() => setSample(k)} style={[s.pickBtn as any, sample === k && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{k.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {sample === "a" && <SampleA opts={opts} update={update} commitVolume={commitVolume} />}
      {sample === "b" && <SampleB opts={opts} update={update} commitVolume={commitVolume} />}
      {sample === "c" && <SampleC opts={opts} update={update} commitVolume={commitVolume} />}
    </View>
  );
}

/* ============ A — SYSTEM PANEL: giant vertical title + control rows ============ */
function SampleA({
  opts,
  update,
  commitVolume,
}: {
  opts: GameOptions;
  update: (p: Partial<GameOptions>) => void;
  commitVolume: () => void;
}) {
  const fs = web && typeof document !== "undefined" && (document as any).fullscreenElement;
  return (
    <View style={s.aWrap as any}>
      <View style={s.aTitleCol as any}>
        {["O", "P", "T", "I", "O", "N", "S"].map((ch, i) => (
          <Text
            key={i}
            style={[
              s.aLetter as any,
              i % 3 === 0 && (s.aLetterC as any),
              i % 3 === 2 && (s.aLetterY as any),
              web && ({ animation: `heroIn 450ms ${i * 60}ms both` } as any),
            ]}
          >
            {ch}
          </Text>
        ))}
      </View>

      <View style={s.aPanelCol as any}>
        <Text style={[s.secTag as any, web && ({ animation: "rowIn 350ms 150ms both" } as any)]}>— SOUND</Text>
        <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 200ms both" } as any)]}>
          <View style={{ flex: 1 } as any}>
            <Text style={s.rowName as any}>SFX VOLUME</Text>
            <Text style={s.rowDesc as any}>HOVER BLASTER LOUDNESS — DRAG, RELEASE TO HEAR IT</Text>
          </View>
          <View style={{ width: 260 } as any}>
            <P5Slider value={opts.sfxVol} onChange={(v) => update({ sfxVol: v })} onCommit={commitVolume} />
          </View>
        </View>
        <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 280ms both" } as any)]}>
          <View style={{ flex: 1 } as any}>
            <Text style={s.rowName as any}>HOVER SFX</Text>
            <Text style={s.rowDesc as any}>BLIP EVERY TIME YOU TOUCH THE UI</Text>
          </View>
          <P5Toggle on={opts.sfxOn} onToggle={() => update({ sfxOn: !opts.sfxOn })} />
        </View>

        <Text style={[s.secTag as any, web && ({ animation: "rowIn 350ms 360ms both" } as any)]}>— DISPLAY</Text>
        <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 420ms both" } as any)]}>
          <View style={{ flex: 1 } as any}>
            <Text style={s.rowName as any}>REDUCE MOTION</Text>
            <Text style={s.rowDesc as any}>FREEZES BACKGROUND MOVEMENT — EYES FIRST</Text>
          </View>
          <P5Toggle on={opts.reduceMotion} onToggle={() => update({ reduceMotion: !opts.reduceMotion })} />
        </View>
        <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 500ms both" } as any)]}>
          <View style={{ flex: 1 } as any}>
            <Text style={s.rowName as any}>{fs ? "EXIT FULLSCREEN" : "FULLSCREEN"}</Text>
            <Text style={s.rowDesc as any}>TAKES OVER THE WHOLE SCREEN</Text>
          </View>
          <Pressable onPress={toggleFullscreen} style={({ hovered }) => [s.fsBtn as any, hovered && (s.fsBtnHov as any)]}>
            <Text style={s.fsTxt as any}>{fs ? "WINDOW □" : "EXPAND ⛶"}</Text>
          </Pressable>
        </View>

        <Text style={[s.secTag as any, web && ({ animation: "rowIn 350ms 580ms both" } as any)]}>— TEXT</Text>
        <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 640ms both" } as any)]}>
          <View style={{ flex: 1 } as any}>
            <Text style={s.rowName as any}>TEXT SPEED</Text>
            <Text style={s.rowDesc as any}>DIALOGUE PACE FOR FUTURE CONVERSATIONS</Text>
          </View>
          <P5Segmented<TextSpeed> value={opts.textSpeed} options={["SLOW", "NORMAL", "FAST"] as const} onChange={(v) => update({ textSpeed: v })} />
        </View>
      </View>
    </View>
  );
}

/* ============ B — FORM 07-B: paper config sheet, ink controls ============ */
function SampleB({
  opts,
  update,
  commitVolume,
}: {
  opts: GameOptions;
  update: (p: Partial<GameOptions>) => void;
  commitVolume: () => void;
}) {
  const fs = web && typeof document !== "undefined" && (document as any).fullscreenElement;
  return (
    <View style={s.bWrap as any}>
      {/* ghost + slashes */}
      <View style={s.bGhost as any} pointerEvents="none">
        <Text style={s.bGhostTxt as any}>SETTINGS</Text>
      </View>

      <View style={[s.bCard as any, web && ({ animation: "jokerIn 550ms 100ms both" } as any)]}>
        <View style={s.stampIdleW as any} pointerEvents="none">
          <View style={[s.bStamp as any, web && ({ animation: "p5-slam 450ms 600ms both" } as any)]}>
            <Text style={s.bStampTxt as any}>SAVES INSTANTLY</Text>
          </View>
        </View>

        <Text style={s.bKicker as any}>VERTEX INSTITUTE — DESK DRAWER</Text>
        <Text style={s.bTitle as any}>FORM 07-B</Text>

        {/* volume — ink line slider */}
        <View style={[s.bRow as any, web && ({ animation: "rowIn 350ms 250ms both" } as any)]}>
          <Text style={s.bRowName as any}>SFX VOLUME</Text>
          <P5Slider value={opts.sfxVol} onChange={(v) => update({ sfxVol: v })} onCommit={commitVolume} />
        </View>

        {/* checkboxes */}
        {[
          { k: "sfxOn", label: "HOVER SFX", note: "BLIP EVERY UI TOUCH", val: opts.sfxOn },
          { k: "reduceMotion", label: "REDUCE MOTION", note: "FREEZES BACKGROUND MOVEMENT", val: opts.reduceMotion },
          { k: "fs", label: fs ? "FULLSCREEN — ON" : "FULLSCREEN", note: "TAKES OVER THE WHOLE SCREEN", val: !!fs },
        ].map((r, i) => (
          <Pressable
            key={r.k}
            onPress={() => (r.k === "fs" ? toggleFullscreen() : update({ [r.k]: !r.val } as Partial<GameOptions>))}
            style={({ hovered }) => [s.bCheckRow as any, hovered && (s.bCheckHov as any), web && ({ animation: `rowIn 350ms ${320 + i * 90}ms both` } as any)]}
          >
            <View style={[s.bBoxMark as any, r.val && (s.bBoxMarkOn as any)]}>
              <Text style={s.bX as any}>{r.val ? "✕" : ""}</Text>
            </View>
            <View style={{ flex: 1 } as any}>
              <Text style={s.bRowNameSm as any}>{r.label}</Text>
              <Text style={s.bNote as any}>{r.note}</Text>
            </View>
          </Pressable>
        ))}

        {/* text speed — red-circled radios */}
        <View style={[s.bRow as any, web && ({ animation: "rowIn 350ms 620ms both" } as any)]}>
          <Text style={s.bRowName as any}>TEXT SPEED</Text>
          <View style={{ flexDirection: "row", gap: 14 } as any}>
            {(["SLOW", "NORMAL", "FAST"] as const).map((t) => (
              <Pressable key={t} onPress={() => update({ textSpeed: t })} style={s.bRadioWrap as any}>
                <View style={[s.bRadio as any, opts.textSpeed === t && (s.bRadioOn as any)]} />
                <Text style={[s.bRadioTxt as any, opts.textSpeed === t && (s.bRadioTxtOn as any)]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============ C — CATEGORY SLASH: slanted tabs swap a live panel ============ */
function SampleC({
  opts,
  update,
  commitVolume,
}: {
  opts: GameOptions;
  update: (p: Partial<GameOptions>) => void;
  commitVolume: () => void;
}) {
  const [cat, setCat] = useState<Cat>("sound");
  const fs = web && typeof document !== "undefined" && (document as any).fullscreenElement;

  return (
    <View style={s.cWrap as any}>
      {web && <View style={s.cBurst as any} pointerEvents="none" />}
      {web && (
        <View style={s.cRingW as any} pointerEvents="none">
          <View style={s.cRing as any} />
        </View>
      )}

      {/* category tabs — huge slanted slabs */}
      <View style={s.cTabs as any}>
        {(["sound", "display", "text"] as const).map((c, i) => (
          <Pressable
            key={c}
            onPress={() => setCat(c)}
            style={({ hovered }) => [
              s.cTab as any,
              cat === c && (s.cTabOn as any),
              hovered && cat !== c && (s.cTabHov as any),
              web && ({ animation: `p5-entrance 450ms ${i * 110}ms both` } as any),
            ]}
          >
            <Text style={[s.cTabNum as any]}>{`0${i + 1}`}</Text>
            <Text style={s.cTabTxt as any}>{c.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {/* panel — keyed remount slides with the tab direction */}
      <View style={{ flex: 1 } as any}>
        <View
          key={cat}
          style={[{ width: "100%", maxWidth: 640 } as any, web && ({ animation: `${cat === "sound" ? "p5-tabL" : "p5-tabR"} 340ms cubic-bezier(0.16,1,0.3,1) both` } as any)]
        }
        >
          {cat === "sound" && (
            <>
              <Text style={s.cHead as any}>SOUND</Text>
              <View style={s.cRowCard as any}>
                <Text style={s.cRowName as any}>SFX VOLUME</Text>
                <P5Slider value={opts.sfxVol} onChange={(v) => update({ sfxVol: v })} onCommit={commitVolume} />
                <Text style={s.cRowDesc as any}>RELEASE TO HEAR THE BLIP</Text>
              </View>
              <View style={s.cRowCard as any}>
                <Text style={s.cRowName as any}>HOVER SFX</Text>
                <P5Toggle on={opts.sfxOn} onToggle={() => update({ sfxOn: !opts.sfxOn })} />
              </View>
            </>
          )}
          {cat === "display" && (
            <>
              <Text style={s.cHead as any}>DISPLAY</Text>
              <View style={s.cRowCard as any}>
                <Text style={s.cRowName as any}>REDUCE MOTION</Text>
                <P5Toggle on={opts.reduceMotion} onToggle={() => update({ reduceMotion: !opts.reduceMotion })} />
              </View>
              <View style={s.cRowCard as any}>
                <Text style={s.cRowName as any}>{fs ? "EXIT FULLSCREEN" : "FULLSCREEN"}</Text>
                <Pressable onPress={toggleFullscreen} style={({ hovered }) => [s.fsBtn as any, hovered && (s.fsBtnHov as any)]}>
                  <Text style={s.fsTxt as any}>{fs ? "WINDOW □" : "EXPAND ⛶"}</Text>
                </Pressable>
              </View>
            </>
          )}
          {cat === "text" && (
            <>
              <Text style={s.cHead as any}>TEXT</Text>
              <View style={s.cRowCard as any}>
                <Text style={s.cRowName as any}>TEXT SPEED</Text>
                <P5Segmented<TextSpeed> value={opts.textSpeed} options={["SLOW", "NORMAL", "FAST"] as const} onChange={(v) => update({ textSpeed: v })} />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,

  picker: { position: "absolute", top: 20, right: 20, zIndex: 99, flexDirection: "row", gap: 6 } as any,
  pickBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(0,0,0,0.55)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.paper } as any,

  /* shared controls */
  slTrack: { position: "relative", height: 30, justifyContent: "center", transform: [{ skewX: "-10deg" }] } as any,
  slFill: { position: "absolute", left: 0, top: 7, bottom: 7, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.black } as any,
  slKnobWrap: { position: "absolute", marginLeft: -11 } as any,
  slKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.color.yellow, borderWidth: 3, borderColor: theme.color.black } as any,
  slPct: { position: "absolute", right: -6, top: -18, fontFamily: theme.font.display, fontSize: 15, color: theme.color.yellow, transform: [{ skewX: "10deg" }] } as any,

  tgWrap: { flexDirection: "row", alignItems: "center", gap: 12 } as any,
  rowHov: { opacity: 0.92 } as any,
  tgTrack: { width: 74, height: 32, borderWidth: 3, borderColor: theme.color.black, backgroundColor: "#1c1c1c", padding: 2, transform: [{ skewX: "-10deg" }] } as any,
  tgTrackOn: { backgroundColor: theme.color.crimson } as any,
  tgKnob: { width: 24, height: 24, backgroundColor: "#555", transform: [{ translateX: 0 }] } as any,
  tgKnobOn: { backgroundColor: theme.color.yellow, transform: [{ translateX: 42 }] } as any,
  tgTxt: { fontFamily: theme.font.body, fontSize: 15, letterSpacing: 2.5, fontWeight: "800" } as any,
  tgOn: { color: theme.color.yellow } as any,
  tgOff: { color: "rgba(255,255,255,0.45)" } as any,

  segRow: { flexDirection: "row", gap: 4 } as any,
  segOff: { paddingVertical: 8, paddingHorizontal: 13, borderWidth: 2, borderColor: "#333", backgroundColor: "#141414", transform: [{ skewX: "-10deg" }] } as any,
  segHov: { borderColor: theme.color.paper } as any,
  segOn: { paddingVertical: 8, paddingHorizontal: 13, borderWidth: 3, borderColor: theme.color.black, backgroundColor: theme.color.yellow, transform: [{ skewX: "-10deg" }] } as any,
  segTxtOff: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 2, fontWeight: "800", color: "rgba(255,255,255,0.5)" } as any,
  segTxtOn: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 2, fontWeight: "800", color: theme.color.black } as any,

  fsBtn: { backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black, paddingVertical: 9, paddingHorizontal: 16, transform: [{ skewX: "-10deg" }] } as any,
  fsBtnHov: { backgroundColor: theme.color.yellow } as any,
  fsTxt: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.black } as any,

  /* A */
  aWrap: { flex: 1, flexDirection: "row", paddingHorizontal: "5%", paddingTop: 84, paddingBottom: 40, gap: 36, zIndex: 2 } as any,
  aTitleCol: { width: 120 } as any,
  aLetter: { fontFamily: theme.font.display, fontSize: 86, lineHeight: 90, color: theme.color.paper, textShadow: `4px 4px 0 ${theme.color.crimson}` } as any,
  aLetterC: { color: theme.color.crimson, textShadow: `4px 4px 0 ${theme.color.paper}`, maxWidth: 100, textAlign: "center" } as any,
  aLetterY: { color: theme.color.yellow, textShadow: `4px 4px 0 ${theme.color.black}` } as any,
  aPanelCol: { flex: 1, gap: 12, justifyContent: "center" } as any,
  secTag: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 6, color: theme.color.yellow, fontWeight: "800", marginTop: 8 } as any,
  rowCard: { flexDirection: "row", alignItems: "center", gap: 22, backgroundColor: "#141414", borderLeftWidth: 6, borderLeftColor: theme.color.crimson, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#2b2b2b", paddingVertical: 16, paddingHorizontal: 20, transform: [{ skewX: "-2deg" }] } as any,
  rowName: { fontFamily: theme.font.display, fontSize: 21, color: theme.color.paper, letterSpacing: 1.5 } as any,
  rowDesc: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.42)", marginTop: 4, lineHeight: 17 } as any,

  /* B */
  bWrap: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 2 } as any,
  bGhost: { position: "absolute", top: "7%", right: "6%", opacity: 0.06, transform: [{ skewX: "-6deg" }] } as any,
  bGhostTxt: { fontFamily: theme.font.display, fontSize: 150, color: theme.color.paper, letterSpacing: 8 } as any,
  bCard: { width: "min(94%, 640px)", maxHeight: "88%", backgroundColor: theme.color.paper, borderWidth: 4, borderColor: theme.color.black, outlineStyle: "solid", outlineWidth: 2, outlineOffset: 6, outlineColor: theme.color.black, paddingVertical: 26, paddingHorizontal: 34, transform: [{ rotate: "1deg" }, { skewX: "-1deg" }], shadowColor: "#000", shadowOpacity: 0.65, shadowRadius: 0, shadowOffset: { width: 14, height: 14 }, gap: 6 } as any,
  stampIdleW: { position: "absolute", top: -14, right: -18, zIndex: 7, ...(web ? ({ animation: "p5-stampIdle 6s ease-in-out infinite" } as any) : {}) } as any,
  bStamp: { backgroundColor: "#fffdf5", borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "6deg" }] } as any,
  bStampTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: theme.color.crimson, fontWeight: "800" } as any,
  bKicker: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 5, color: "#888", fontWeight: "800" } as any,
  bTitle: { fontFamily: theme.font.display, fontSize: 54, lineHeight: 60, color: theme.color.black, marginBottom: 10 } as any,
  bRow: { flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "#e2ddd2" } as any,
  bRowName: { width: 130, fontFamily: theme.font.body, fontSize: 14.5, letterSpacing: 2.5, color: "#222", fontWeight: "800" } as any,
  bCheckRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "#e2ddd2" } as any,
  bCheckHov: { backgroundColor: "#faf6ec" } as any,
  bBoxMark: { width: 38, height: 38, borderWidth: 3, borderColor: theme.color.black, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" } as any,
  bBoxMarkOn: { backgroundColor: theme.color.crimson } as any,
  bX: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.paper } as any,
  bRowNameSm: { fontFamily: theme.font.body, fontSize: 14.5, letterSpacing: 2.5, color: "#222", fontWeight: "800" } as any,
  bNote: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 1.5, color: "#999", marginTop: 2 } as any,
  bRadioWrap: { alignItems: "center", gap: 6 } as any,
  bRadio: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: "#c9c1b4", backgroundColor: "#fff" } as any,
  bRadioOn: { borderColor: theme.color.crimson, borderWidth: 3, backgroundColor: "#ffe9ea" } as any,
  bRadioTxt: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 2, color: "#aaa", fontWeight: "800" } as any,
  bRadioTxtOn: { color: theme.color.crimson } as any,

  /* C */
  cWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 44, paddingHorizontal: "7%", zIndex: 2 } as any,
  cBurst: { position: "absolute", left: "-12%", bottom: "-18%", width: 480, height: 480, opacity: 0.12, backgroundColor: theme.color.crimson, borderRadius: 18, transform: [{ rotate: "45deg" }], backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.55) 0deg 5deg, transparent 5deg 11deg)", animation: "p5-spinRev 24s linear infinite" } as any,
  cRingW: { position: "absolute", right: "-6%", top: "-14%", width: 340, height: 340, alignItems: "center", justifyContent: "center" } as any,
  cRing: { width: 300, height: 300, borderRadius: 150, borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(252,238,33,0.35)", animation: "p5-spin 28s linear infinite" } as any,
  cTabs: { gap: 14, zIndex: 3 } as any,
  cTab: { width: 250, paddingVertical: 20, paddingLeft: 26, paddingRight: 18, backgroundColor: "#161616", borderWidth: 2, borderColor: "#2d2d2d", borderLeftWidth: 7, borderLeftColor: "#3a3a3a", transform: [{ skewX: "-8deg" }, { rotate: "-2deg" }] } as any,
  cTabHov: { borderColor: theme.color.paper, transform: [{ skewX: "-8deg" }, { rotate: "-2deg" }, { translateX: 8 }] } as any,
  cTabOn: { backgroundColor: theme.color.yellow, borderColor: theme.color.black, borderLeftColor: theme.color.crimson, transform: [{ skewX: "-8deg" }, { rotate: "-2deg" }, { translateX: 14 }] } as any,
  cTabNum: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 4, color: theme.color.crimson, fontWeight: "800" } as any,
  cTabTxt: { fontFamily: theme.font.display, fontSize: 30, letterSpacing: 2, color: theme.color.paper } as any,
  cHead: { fontFamily: theme.font.display, fontSize: 46, color: theme.color.paper, letterSpacing: 2, marginBottom: 16, transform: [{ skewX: "-8deg" }], textShadow: `5px 5px 0 ${theme.color.crimson}` } as any,
  cRowCard: { flexDirection: "row", alignItems: "center", gap: 20, backgroundColor: "#141414", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#2b2b2b", borderRightWidth: 6, borderRightColor: theme.color.crimson, paddingVertical: 18, paddingHorizontal: 22, marginBottom: 12, transform: [{ skewX: "-2deg" }] } as any,
  cRowName: { flex: 1, fontFamily: theme.font.display, fontSize: 20, color: theme.color.paper, letterSpacing: 1.5 } as any,
  cRowDesc: { fontFamily: theme.font.body, fontSize: 11.5, letterSpacing: 2, color: "rgba(255,255,255,0.4)" } as any,
});
