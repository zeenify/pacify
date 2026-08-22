/* OPTIONS — LOCKED design (A, system panel). Three-bus sound mixer
   (MAIN / SFX / BGM), fullscreen, REDUCE MOTION with a live demo right on
   this page, and LOG OUT. Everything applies instantly and persists. */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { PanResponder } from "react-native";
import { theme } from "@pacify/ui-kit";
import { playHover } from "../lib/sfx";
import { GameOptions, DEFAULT_OPTIONS, loadOptions, saveOptions, applyOptions } from "../lib/options";
import { api } from "../lib/api";
import { useGame } from "../lib/game";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

/* ---- slider: drag anywhere on the track; knob swells while dragging ---- */
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
  const [w, setW] = useState(0);
  const [dragging, setDragging] = useState(false);
  /* RNW reports locationX against the touched CHILD, not the handler view.
     Track the track's window position ourselves and use pageX. */
  const winX = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e) => {
        setDragging(true);
        pick(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => pick(e.nativeEvent.pageX),
      onPanResponderRelease: () => {
        setDragging(false);
        onCommit?.();
      },
      onPanResponderTerminate: () => setDragging(false),
    })
  ).current;

  function syncOrigin() {
    const v: any = trackRef.current;
    if (!v?.measureInWindow) return;
    v.measureInWindow((x: number, _y: number, width: number) => {
      winX.current = x;
      setW(width);
    });
  }

  function pick(pageX: number) {
    if (disabled) return;
    const ratio = Math.max(0, Math.min(1, (pageX - winX.current) / (w || 1)));
    onChange(Math.round(ratio * 100));
  }

  const trackRef = useRef<any>(null);

  return (
    <View style={s.slOuter as any}>
      <View
        ref={trackRef}
        {...pan.panHandlers}
        onLayout={syncOrigin}
        style={[s.slTrack as any, disabled && (s.slDisabled as any), !disabled && ({ cursor: "pointer" } as any)]}
      >
        {/* segment ticks */}
        {[25, 50, 75].map((t) => (
          <View key={t} style={[s.slTick as any, { left: `${t}%` } as any]} pointerEvents="none" />
        ))}
        <View
          style={[
            s.slFill as any,
            { width: `${value}%`, backgroundColor: disabled ? "#3a3a3a" : theme.color.crimson },
            web && !disabled && ({ transition: "width 60ms linear" } as any),
          ]}
          pointerEvents="none"
        />
        <View style={[{ left: `${value}%` } as any, s.slKnobWrap as any]} pointerEvents="none">
          <View
            style={[
              s.slKnob as any,
              dragging && (s.slKnobDrag as any),
              disabled && (s.slKnobDisabled as any),
              web && ({ transition: "transform 130ms cubic-bezier(0.16,1,0.3,1), box-shadow 130ms" } as any),
            ]}
          />
        </View>
      </View>
      <Text style={[s.slPct as any, disabled && (s.slPctDim as any)]}>
        {String(value).padStart(2, "0")}
        <Text style={s.slPctSign as any}>%</Text>
      </Text>
    </View>
  );
}

/* ---- slanted toggle ---- */
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

async function toggleFullscreen() {
  if (!web || typeof document === "undefined") return;
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
    if (web) {
      const syncFs = () => setFs(!!(document as any).fullscreenElement);
      document.addEventListener("fullscreenchange", syncFs);
      return () => document.removeEventListener("fullscreenchange", syncFs);
    }
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
    <View style={s.stage as any}>
      {/* ---- environment ---- */}
      <View style={s.envSlashL as any} pointerEvents="none">
        <View style={[s.envSlashLIn as any, web && ({ animation: "p5-slashA 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>
      <View style={s.envSlashR as any} pointerEvents="none">
        <View style={[s.envSlashRIn as any, web && ({ animation: "p5-slashB 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both" } as any)]} />
      </View>
      {web && (
        <View style={s.ringW as any} pointerEvents="none">
          <View style={s.ring as any} />
          <Text style={s.ringStar as any}>✦</Text>
        </View>
      )}
      {web && <View style={s.burst as any} pointerEvents="none" />}
      {web && (
        <View style={s.diamonds as any} pointerEvents="none">
          {[
            { t: "14%", l: "38%", s: 14, d: "0s" },
            { t: "72%", l: "34%", s: 10, d: "1.1s" },
            { t: "26%", l: "92%", s: 15, d: "0.6s" },
            { t: "80%", l: "88%", s: 11, d: "1.7s" },
          ].map((dm, i) => (
            <Text key={i} style={[s.diamond as any, { top: dm.t, left: dm.l, fontSize: dm.s }, { animationDelay: dm.d } as any]}>
              ◆
            </Text>
          ))}
        </View>
      )}

      <P5Back style={{ position: "absolute", top: 20, left: 20 } as any} />

      {/* ---- panel ---- */}
      <View style={s.wrap as any}>
        {/* title column */}
        <View style={s.titleCol as any}>
          {["O", "P", "T", "I", "O", "N", "S"].map((ch, i) => (
            <Text
              key={i}
              style={[
                s.aLetter as any,
                i % 3 === 0 && (s.aLetterC as any),
                i % 3 === 2 && (s.aLetterY as any),
                web && ({ animation: `heroIn 450ms ${i * 55}ms both` } as any),
              ]}
            >
              {ch}
            </Text>
          ))}
        </View>

        <View style={s.panelCol as any}>
          {/* SOUND */}
          <Text style={[s.secTag as any, web && ({ animation: "rowIn 350ms 150ms both" } as any)]}>— SOUND</Text>
          {[
            {
              key: "main",
              name: "MAIN VOLUME",
              desc: "MASTER DIAL — DUCKS EVERY BUS AT ONCE",
              node: <P5Slider value={opts.mainVol} onChange={(v) => update({ mainVol: v })} onCommit={() => playHover()} />,
              anim: 220,
            },
            {
              key: "sfx",
              name: "SFX",
              desc: "UI BLIPS — RELEASE THE SLIDER TO HEAR IT",
              node: <P5Slider value={opts.sfxVol} onChange={(v) => update({ sfxVol: v })} onCommit={() => playHover()} />,
              anim: 300,
            },
          ].map((r) => (
            <View key={r.key} style={[s.rowCard as any, web && ({ animation: `jokerIn 450ms ${r.anim}ms both` } as any)]}>
              <View style={{ flex: 1 } as any}>
                <Text style={s.rowName as any}>{r.name}</Text>
                <Text style={s.rowDesc as any}>{r.desc}</Text>
              </View>
              <View style={{ width: 280 } as any}>{r.node}</View>
            </View>
          ))}
          {/* BGM — greyed until music exists (research rule: grey out + explain) */}
          <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 380ms both" } as any)]}>
            <View style={{ flex: 1 } as any}>
              <Text style={[s.rowName as any, { opacity: 0.45 }] as any}>BGM</Text>
              <Text style={s.rowDesc as any}>PAGE MUSIC — NO TRACKS RECORDED YET, DIAL WAITS READY</Text>
            </View>
            <View style={{ width: 280, opacity: 0.4 } as any}>
              <P5Slider value={opts.bgmVol} onChange={() => {}} disabled />
            </View>
            <View style={s.soonTag as any} pointerEvents="none">
              <Text style={s.soonTxt as any}>SOON</Text>
            </View>
          </View>

          {/* DISPLAY */}
          <Text style={[s.secTag as any, web && ({ animation: "rowIn 350ms 460ms both" } as any)]}>— DISPLAY</Text>
          <View style={[s.rowCard as any, web && ({ animation: "jokerIn 450ms 520ms both" } as any)]}>
            <View style={{ flex: 1 } as any}>
              <Text style={s.rowName as any}>{fs ? "EXIT FULLSCREEN" : "FULLSCREEN"}</Text>
              <Text style={s.rowDesc as any}>CLAIM THE WHOLE SCREEN FOR PACIFY</Text>
            </View>
            <Pressable onPress={toggleFullscreen} style={({ hovered }) => [s.fsBtn as any, hovered && (s.fsBtnHov as any)]}>
              <Text style={s.fsTxt as any}>{fs ? "WINDOW □" : "EXPAND ⛶"}</Text>
            </Pressable>
          </View>

          {/* ACCOUNT */}
          <Text style={[s.secTag as any, web && ({ animation: "rowIn 350ms 680ms both" } as any)]}>— ACCOUNT</Text>
          <Pressable
            onPress={logout}
            style={({ hovered, pressed }) => [
              s.logoutBtn as any,
              hovered && !pressed && (s.logoutHover as any),
              pressed && (s.logoutDown as any),
              web && ({ animation: "jokerIn 450ms 740ms both", transition: "transform 150ms cubic-bezier(0.175,0.885,0.32,1.275)" } as any),
            ]}
          >
            {({ hovered }) => (
              <>
                <Text style={s.logoutTxt as any}>LOG OUT</Text>
                <Text style={[s.logoutArr as any, hovered && { transform: [{ translateX: -6 }] } as any]}>◀</Text>
                {hovered && web ? <View style={s.logoutBar as any} pointerEvents="none" /> : null}
              </>
            )}
          </Pressable>
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

  /* environment */
  envSlashL: { position: "absolute", top: "-10%", left: "-5%", width: "30%", height: "120%", transform: [{ skewX: "-18deg" }], overflow: "hidden" } as any,
  envSlashLIn: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimson, opacity: 0.1 } as any,
  envSlashR: { position: "absolute", top: "-10%", right: "-6%", width: "24%", height: "120%", transform: [{ skewX: "16deg" }], overflow: "hidden" } as any,
  envSlashRIn: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.color.crimsonDeep, opacity: 0.09 } as any,
  ringW: { position: "absolute", right: "-6%", top: "-12%", width: 340, height: 340, alignItems: "center", justifyContent: "center" } as any,
  ring: { width: 300, height: 300, borderRadius: 150, borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(252,238,33,0.35)", animation: "p5-spin 28s linear infinite" } as any,
  ringStar: { position: "absolute", top: -14, fontFamily: theme.font.display, fontSize: 26, color: theme.color.yellow, textShadow: "2px 2px 0 rgba(0,0,0,0.6)" } as any,
  burst: { position: "absolute", left: "-10%", bottom: "-16%", width: 440, height: 440, opacity: 0.12, backgroundColor: theme.color.crimson, borderRadius: 18, transform: [{ rotate: "45deg" }], backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.55) 0deg 5deg, transparent 5deg 11deg)", animation: "p5-spinRev 24s linear infinite" } as any,
  diamonds: { ...StyleSheet.absoluteFillObject, zIndex: 1 } as any,
  diamond: { position: "absolute", color: theme.color.yellow, textShadow: "2px 2px 0 rgba(0,0,0,0.55)", animation: "p5-float 3.4s ease-in-out infinite" } as any,

  /* layout */
  wrap: { flex: 1, flexDirection: "row", paddingHorizontal: "5%", paddingTop: 84, paddingBottom: 40, gap: 36, zIndex: 2 } as any,
  titleCol: { width: 118 } as any,
  aLetter: { fontFamily: theme.font.display, fontSize: 84, lineHeight: 88, color: theme.color.paper, textShadow: `4px 4px 0 ${theme.color.crimson}` } as any,
  aLetterC: { color: theme.color.crimson, textShadow: `4px 4px 0 ${theme.color.paper}`, maxWidth: 100, textAlign: "center" } as any,
  aLetterY: { color: theme.color.yellow, textShadow: `4px 4px 0 ${theme.color.black}` } as any,
  panelCol: { flex: 1, gap: 11, justifyContent: "center" } as any,

  secTag: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 6, color: theme.color.yellow, fontWeight: "800", marginTop: 8 } as any,
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
    backgroundColor: "#141414",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2b2b2b",
    paddingVertical: 15,
    paddingHorizontal: 20,
    transform: [{ skewX: "-2deg" }],
  } as any,
  rowName: { fontFamily: theme.font.display, fontSize: 21, color: theme.color.paper, letterSpacing: 1.5 } as any,
  rowDesc: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.42)", marginTop: 4, lineHeight: 17 } as any,

  /* slider */
  slOuter: { flexDirection: "row", alignItems: "center", gap: 14 } as any,
  slTrack: { flex: 1, height: 30, justifyContent: "center", transform: [{ skewX: "-10deg" }] } as any,
  slDisabled: { opacity: 0.7 } as any,
  slTick: { position: "absolute", top: 4, bottom: 4, width: 2, backgroundColor: "rgba(255,255,255,0.09)" } as any,
  slFill: { position: "absolute", left: 0, top: 7, bottom: 7, borderWidth: 2, borderColor: theme.color.black } as any,
  slKnobWrap: { position: "absolute", marginLeft: -13 } as any,
  slKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.color.yellow, borderWidth: 3, borderColor: theme.color.black } as any,
  slKnobDrag: { transform: [{ scale: 1.3 }], shadowColor: theme.color.yellow, shadowOpacity: 0.95, shadowRadius: 14 } as any,
  slKnobDisabled: { backgroundColor: "#444", borderColor: "#222" } as any,
  slPct: { width: 64, fontFamily: theme.font.display, fontSize: 22, color: theme.color.yellow, textAlign: "right", transform: [{ skewX: "-8deg" }] } as any,
  slPctDim: { color: "#666" } as any,
  slPctSign: { fontSize: 14, color: "rgba(252,238,33,0.6)" } as any,

  soonTag: { position: "absolute", right: 96, top: -9, backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 2, transform: [{ rotate: "4deg" }] } as any,
  soonTxt: { fontFamily: theme.font.body, fontSize: 10.5, letterSpacing: 3, color: theme.color.crimson, fontWeight: "800" } as any,

  /* toggle */
  tgWrap: { flexDirection: "row", alignItems: "center", gap: 12 } as any,
  rowHov: { opacity: 0.92 } as any,
  tgTrack: { width: 74, height: 32, borderWidth: 3, borderColor: theme.color.black, backgroundColor: "#1c1c1c", padding: 2, transform: [{ skewX: "-10deg" }] } as any,
  tgTrackOn: { backgroundColor: theme.color.crimson } as any,
  tgKnob: { width: 24, height: 24, backgroundColor: "#555", web: undefined as any } as any,
  tgKnobOn: { backgroundColor: theme.color.yellow, transform: [{ translateX: 42 }] } as any,
  tgTxt: { fontFamily: theme.font.body, fontSize: 15, letterSpacing: 2.5, fontWeight: "800" } as any,
  tgOn: { color: theme.color.yellow } as any,
  tgOff: { color: "rgba(255,255,255,0.45)" } as any,

  fsBtn: { backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black, paddingVertical: 9, paddingHorizontal: 16, transform: [{ skewX: "-10deg" }] } as any,
  fsBtnHov: { backgroundColor: theme.color.yellow } as any,
  fsTxt: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.black } as any,

  /* logout */
  logoutBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    backgroundColor: theme.color.crimson,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingVertical: 12,
    paddingHorizontal: 24,
    transform: [{ skewX: "-8deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowOffset: { width: 6, height: 6 },
  } as any,
  logoutHover: { transform: [{ skewX: "-8deg" }, { translateX: -4 }, { translateY: -4 }], shadowOffset: { width: 10, height: 10 }, shadowOpacity: 0.6 } as any,
  logoutDown: { transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }], shadowOpacity: 0.3, shadowOffset: { width: 3, height: 3 } } as any,
  logoutTxt: { fontFamily: theme.font.display, fontSize: 19, letterSpacing: 2.5, color: theme.color.paper } as any,
  logoutArr: { fontFamily: theme.font.body, fontSize: 17, color: theme.color.yellow, fontWeight: "800" } as any,
  logoutBar: { position: "absolute", bottom: 0, left: "8%", right: "8%", height: 4, backgroundColor: theme.color.yellow } as any,
});
