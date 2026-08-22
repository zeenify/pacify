import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

const web = Platform.OS === "web";

const NAV = [
  { n: "01", label: "CAMPAIGN", to: "/campaign" },
  { n: "02", label: "DOSSIER", to: "/dossier" },
  { n: "03", label: "HALL OF SHAME", to: "/shame" },
  { n: "04", label: "MULTIPLAYER", to: null },
];

const UTIL = [
  { label: "PROFILE", to: "/profile" },
  { label: "HOW TO PLAY", to: "/howto" },
  { label: "OPTIONS", to: "/options" },
];

export default function Menu() {
  return (
    <View style={s.stage as any}>
      {/* ---- accents ---- */}
      <View style={s.bRed as any} pointerEvents="none" />
      <View style={s.cBand as any} pointerEvents="none" />
      <Text
        style={[s.cGhost as any, web && ({ animation: "p5-float 5s ease-in-out infinite" } as any)]}
        pointerEvents="none"
      >
        P
      </Text>
      <Text style={s.watermark as any} pointerEvents="none">
        PACIFY
      </Text>
      <View style={[s.beam as any, web && ({ animation: "p5-beamV 3.6s linear infinite" } as any)]} pointerEvents="none" />
      <View style={[s.scan as any, web && ({ animation: "p5-beamV 6s linear infinite" } as any)]} pointerEvents="none" />
      <View style={[s.cornerTL as any, s.corner as any]} pointerEvents="none" />
      <View style={[s.cornerTR as any, s.corner as any]} pointerEvents="none" />
      <View style={[s.cornerBL as any, s.corner as any]} pointerEvents="none" />
      <View style={[s.cornerBR as any, s.corner as any]} pointerEvents="none" />

      {/* ---- content ---- */}
      <View style={s.frame as any}>
        <View style={s.head as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={s.list as any}>
          {NAV.map((it, i) => (
            <Pressable
              key={it.label}
              disabled={!it.to}
              onPress={it.to ? () => router.push(it.to) : undefined}
              style={({ hovered }) => [
                s.word as any,
                hovered && it.to && (s.wordHover as any),
                web && ({ animation: `rowIn 600ms ${140 + i * 90}ms both` } as any),
              ]}
            >
              {({ hovered }) => (
                <View style={s.wordInner as any}>
                  <Text style={[s.idx as any, hovered && (s.idxOn as any)]}>{it.n}</Text>
                  <Text
                    style={[
                      s.wordText as any,
                      hovered && it.to && { color: theme.color.crimson } as any,
                      !it.to && { opacity: 0.4 } as any,
                    ]}
                  >
                    {it.label}
                  </Text>
                  {!it.to && <Text style={s.soon as any}>SOON</Text>}
                  {hovered && it.to && <View style={s.underline as any} />}
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <View style={s.utilRow as any}>
          {UTIL.map((u) => (
            <Pressable
              key={u.label}
              onPress={() => router.push(u.to)}
              style={({ hovered }) => [s.util as any, hovered && (s.utilHover as any)]}
            >
              {({ hovered }) => (
                <>
                  <Text style={[s.utilText as any, hovered && { color: theme.color.crimson } as any]}>{u.label}</Text>
                  <Text style={[s.utilArrow as any, hovered && { color: theme.color.yellow, opacity: 1 } as any]}>›</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* ---- status strip ---- */}
      <View style={s.status as any} pointerEvents="none">
        <Text style={s.statusL as any}>PACIFY // REBELLION OS</Text>
        <View style={s.statusR as any}>
          <View style={s.dot as any} />
          <Text style={s.statusR2 as any}>SYSTEM ONLINE — BUILD 0.1</Text>
        </View>
      </View>
    </View>
  );
}

const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,

  // accents
  bRed: { position: "absolute", top: 0, bottom: 0, left: 0, width: "42%", backgroundColor: "rgba(230,0,18,0.16)", transform: [{ skewX: "-10deg" }], marginLeft: "-6%" } as any,
  cBand: { position: "absolute", top: "32%", left: "-10%", width: "120%", height: 220, backgroundColor: theme.color.yellow, opacity: 0.07, transform: [{ rotate: "-12deg" }] } as any,
  cGhost: { position: "absolute", top: "5%", right: "3%", fontFamily: theme.font.display, fontSize: 380, color: theme.color.paper, opacity: 0.05, transform: [{ skewX: "-8deg" }] } as any,
  watermark: { position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", fontFamily: theme.font.display, fontSize: 240, color: theme.color.paper, opacity: 0.04, letterSpacing: 20, transform: [{ skewX: "-8deg" }] } as any,
  beam: { position: "absolute", top: 0, bottom: 0, left: "38%", width: 130, backgroundColor: "rgba(230,0,18,0.12)", transform: [{ skewX: "-12deg" }] } as any,
  scan: { position: "absolute", left: 0, right: 0, top: 0, height: 2, backgroundColor: "rgba(252,238,33,0.10)" } as any,
  corner: { position: "absolute", width: 30, height: 30, borderColor: theme.color.yellow, borderWidth: 3 } as any,
  cornerTL: { top: 18, left: 18, borderRightWidth: 0, borderBottomWidth: 0 } as any,
  cornerTR: { top: 18, right: 18, borderLeftWidth: 0, borderBottomWidth: 0 } as any,
  cornerBL: { bottom: 18, left: 18, borderRightWidth: 0, borderTopWidth: 0 } as any,
  cornerBR: { bottom: 18, right: 18, borderLeftWidth: 0, borderTopWidth: 0 } as any,

  // content
  frame: { flex: 1, paddingHorizontal: 56, paddingTop: 56, paddingBottom: 64, zIndex: 2, justifyContent: "center" } as any,
  head: { flexDirection: "row", alignItems: "flex-end", gap: 20, marginBottom: 18 } as any,
  logo: { fontFamily: theme.font.display, fontSize: 76, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, paddingBottom: 12 } as any,

  list: { gap: 6 } as any,
  word: { paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.08)" } as any,
  wordHover: { borderBottomColor: theme.color.yellow } as any,
  wordInner: { flexDirection: "row", alignItems: "center", gap: 20, position: "relative" } as any,
  idx: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.crimson, letterSpacing: 1, minWidth: 44 } as any,
  idxOn: { color: theme.color.yellow } as any,
  wordText: { fontFamily: theme.font.display, fontSize: 62, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,
  soon: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.paper, opacity: 0.5, marginLeft: 14 } as any,
  underline: { position: "absolute", bottom: -2, left: 64, right: 0, height: 4, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,

  utilRow: { flexDirection: "row", gap: 26, marginTop: 26 } as any,
  util: { flexDirection: "row", alignItems: "center", gap: 6 } as any,
  utilHover: {} as any,
  utilText: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 3, color: theme.color.paper, fontWeight: "600" } as any,
  utilArrow: { fontFamily: theme.font.body, fontSize: 18, color: theme.color.paper, opacity: 0.45 } as any,

  status: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", zIndex: 3 } as any,
  statusL: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.5)" } as any,
  statusR: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  statusR2: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.5)" } as any,
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.color.yellow, ...(web ? { animation: "p5-blinkHard 1.2s steps(1) infinite" } as any : {}) } as any,
});
