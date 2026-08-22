/* LOAD SCREEN — the ONE combined loader: buffers SFX AND pulls student records
   from the DB exactly once into the client store. Runs right after Login (or a
   returning session), then hands off to the title screen. */
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../lib/game";
import { initSfx, unlockSfx } from "../lib/sfx";

export default function Load() {
  const { refreshProfile } = useGame();
  const [pct, setPct] = useState(0);
  const [steps, setSteps] = useState([false, false]);
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
    const profP = refreshProfile();

    // step 1 — sfx bank
    sfxP.then(() => {
      if (!alive) return;
      setSteps((st) => [true, st[1]]);
    });

    // step 2 — THE one-time DB read
    profP
      .then(() => {
        if (!alive) return;
        setSteps((st) => [st[0], true]);
      })
      .catch(() => {
        if (alive) router.replace("/login"); // session died — back to enrollment
      });

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
    <Pressable onPress={unlockSfx} style={s.stage as any}>
      <View style={s.loadStar as any} pointerEvents="none" />
      <View style={s.loadGhost as any} pointerEvents="none">
        <Text style={s.loadGhostText as any}>PACIFY</Text>
      </View>
      <View style={s.loadSlash as any} pointerEvents="none" />
      <View style={s.loadScan as any} pointerEvents="none" />

      <View style={s.loadWrap as any}>
        <Text style={s.loadKicker as any}>ACQUIRING RECORDS</Text>
        <Text
          style={[
            s.loadTitle as any,
            pct >= 96 && ({ color: theme.color.yellow } as any),
            Platform.OS === "web" && ({ animation: "p5-blinkHard 1.1s steps(1) infinite" } as any),
          ]}
        >
          NOW LOADING
        </Text>

        <View style={s.loadSegTrack as any}>
          {Array.from({ length: SEG }).map((_, i) => (
            <View key={i} style={[s.loadSeg as any, i < filled && s.loadSegOn as any, i === filled - 1 && s.loadSegHead as any]} />
          ))}
        </View>

        <View style={s.stepCol as any}>
          {["SFX BANK", "STUDENT RECORDS"].map((label, i) => (
            <Text key={label} style={[s.stepTxt as any, steps[i] && (s.stepOn as any)]}>
              [{steps[i] ? "OK" : ".."}] {label}
            </Text>
          ))}
        </View>

        <View style={s.loadMeta as any}>
          <Text style={s.loadPct as any}>{String(pctI).padStart(3, "0")}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          backgroundImage: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  loadStar: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 620,
    height: 620,
    marginLeft: -310,
    marginTop: -310,
    opacity: 0.16,
    backgroundColor: theme.color.crimson,
    borderRadius: 14,
    transform: [{ rotate: "45deg" }],
    ...(Platform.OS === "web"
      ? ({
          backgroundImage: "repeating-conic-gradient(from 0deg, rgba(230,0,18,0.5) 0deg 6deg, transparent 6deg 12deg)",
          animation: "p5-spin 12s linear infinite",
        } as any)
      : {}),
  } as any,
  loadGhost: { position: "absolute", top: "8%", left: 0, right: 0, alignItems: "center", opacity: 0.05 } as any,
  loadGhostText: { fontFamily: theme.font.display, fontSize: 200, color: theme.color.paper, letterSpacing: 10, transform: [{ skewX: "-8deg" }] } as any,
  loadSlash: { position: "absolute", top: "-20%", left: "-10%", width: "70%", height: "140%", backgroundColor: theme.color.crimson, opacity: 0.12, transform: [{ skewX: "-14deg" }] } as any,
  loadScan: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "40%",
    left: 0,
    opacity: 0.08,
    backgroundColor: theme.color.yellow,
    ...(Platform.OS === "web" ? ({ animation: "p5-scan 2.4s ease-in-out infinite" } as any) : {}),
  } as any,
  loadWrap: { alignItems: "center", gap: 20, transform: [{ skewX: "-8deg" }], zIndex: 3 } as any,
  loadKicker: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 12, color: theme.color.crimson, fontWeight: "700", transform: [{ skewX: "8deg" }] } as any,
  loadTitle: { fontFamily: theme.font.display, fontSize: 60, letterSpacing: 3, color: theme.color.paper, transform: [{ skewX: "8deg" }] } as any,
  loadSegTrack: { flexDirection: "row", gap: 4, alignItems: "center" } as any,
  loadSeg: { width: 11, height: 26, backgroundColor: "#161616", borderWidth: 1, borderColor: "#2A2A2A", transform: [{ skewX: "-12deg" }] } as any,
  loadSegOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any,
  loadSegHead: { backgroundColor: theme.color.yellow, borderColor: theme.color.yellow, shadowColor: theme.color.yellow, shadowOpacity: 0.9, shadowRadius: 10 } as any,
  stepCol: { alignItems: "flex-start", gap: 4, marginTop: 6, transform: [{ skewX: "8deg" }] } as any,
  stepTxt: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 4, color: "rgba(255,255,255,0.35)", fontWeight: "800" } as any,
  stepOn: { color: theme.color.yellow } as any,
  loadMeta: { flexDirection: "row", alignItems: "center", gap: 16, transform: [{ skewX: "8deg" }] } as any,
  loadPct: { fontFamily: theme.font.display, fontSize: 30, letterSpacing: 2, color: theme.color.yellow } as any,
});
