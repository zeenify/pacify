import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useState } from "react";
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

function Word({ n, label, to, i, align }: { n: string; label: string; to: string | null; i: number; align?: "right" }) {
  return (
    <Pressable
      disabled={!to}
      onPress={to ? () => router.push(to) : undefined}
      style={({ hovered }) => [
        s.word as any,
        align === "right" && (s.wordR as any),
        hovered && to && (s.wordHover as any),
        web && ({ animation: `rowIn 600ms ${140 + i * 90}ms both` } as any),
      ]}
    >
      {({ hovered }) => (
        <View style={[s.wordInner as any, align === "right" && (s.wordInnerR as any)]}>
          <Text style={[s.idx as any, hovered && (s.idxOn as any)]}>{n}</Text>
          <Text style={[s.wordText as any, hovered && to && { color: theme.color.crimson } as any, !to && { opacity: 0.4 } as any]}>{label}</Text>
          {!to && <Text style={s.soon as any}>SOON</Text>}
          {hovered && to && <View style={[s.underline as any, align === "right" && (s.underlineR as any)]} />}
        </View>
      )}
    </Pressable>
  );
}

function UtilItem({ label, to }: { label: string; to: string }) {
  return (
    <Pressable
      onPress={() => router.push(to)}
      style={({ hovered }) => [s.util as any, hovered && (s.utilHover as any)]}
    >
      {({ hovered }) => (
        <>
          <View style={[s.utilBullet as any, hovered && (s.utilBulletOn as any)]} />
          <Text style={[s.utilText as any, hovered && { color: theme.color.crimson } as any]}>{label}</Text>
          <Text style={[s.utilArrow as any, hovered && { color: theme.color.yellow, opacity: 1 } as any]}>›</Text>
        </>
      )}
    </Pressable>
  );
}

const DESIGNS = [
  { key: 1, label: "G" },
  { key: 2, label: "H" },
  { key: 3, label: "I" },
];

export default function Menu() {
  const [v, setV] = useState<number>(1);
  return (
    <View style={s.stage as any}>
      {v === 1 && <DesignG />}
      {v === 2 && <DesignH />}
      {v === 3 && <DesignI />}
      <View style={s.picker as any}>
        <Text style={s.pickerLabel as any}>PICK DESIGN</Text>
        {DESIGNS.map((d) => (
          <Pressable key={d.key} onPress={() => setV(d.key)} style={[s.pickBtn as any, v === d.key && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ====================== DESIGN G — CENTERED STACK ====================== */
function DesignG() {
  return (
    <View style={s.stage as any}>
      <View style={s.bRed as any} pointerEvents="none" />
      <View style={s.cBand as any} pointerEvents="none" />
      <Text style={[s.watermark as any, { textAlign: "center" } as any]} pointerEvents="none">
        PACIFY
      </Text>
      <View style={[s.beam as any, web && ({ animation: "p5-beamV 3.6s linear infinite" } as any)]} pointerEvents="none" />
      <Text style={[s.cGhost as any, web && ({ animation: "p5-float 5s ease-in-out infinite" } as any)]} pointerEvents="none">
        P
      </Text>

      <View style={[s.frame as any, s.center as any]}>
        <View style={s.head as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={[s.list as any, s.listC as any]}>
          {NAV.map((it, i) => (
            <Word key={it.label} {...it} i={i} />
          ))}
        </View>

        <View style={[s.utilRow as any, s.utilRowC as any]}>
          {UTIL.map((u) => (
            <UtilItem key={u.label} {...u} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ====================== DESIGN H — SPLIT (left visual / right words) ====================== */
function DesignH() {
  return (
    <View style={s.stage as any}>
      <View style={s.bRed as any} pointerEvents="none" />
      <View style={s.cBand as any} pointerEvents="none" />
      <Text style={[s.cGhost as any, web && ({ animation: "p5-float 5s ease-in-out infinite" } as any)]} pointerEvents="none">
        P
      </Text>
      <View style={[s.beam as any, web && ({ animation: "p5-beamV 3.6s linear infinite" } as any)]} pointerEvents="none" />

      <View style={[s.frame as any, s.split as any]}>
        <View style={s.hLeft as any}>
          <Text style={[s.hNum as any, web && ({ animation: "heroIn 600ms 120ms both" } as any)]}>01</Text>
          <View style={s.hBar as any} />
          <Text style={s.hTag as any}>SEAT ONE.{`\n`}THE REBELLION{`\n`}BEGINS HERE.</Text>
          <Text style={s.hSub as any}>13 STUDENTS. ONE ROOM. NO MERCY.</Text>
        </View>

        <View style={s.hRight as any}>
          <View style={s.head as any}>
            <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
            <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
          </View>

          <View style={[s.list as any, s.listR as any]}>
            {NAV.map((it, i) => (
              <Word key={it.label} {...it} i={i} align="right" />
            ))}
          </View>

          <View style={s.utilRow as any}>
            {UTIL.map((u) => (
              <UtilItem key={u.label} {...u} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

/* ====================== DESIGN I — STAIRCASE EDITORIAL ====================== */
function DesignI() {
  return (
    <View style={s.stage as any}>
      <View style={s.cBand as any} pointerEvents="none" />
      <View style={s.bRed as any} pointerEvents="none" />
      <Text style={[s.watermark as any, { textAlign: "center", top: "26%" } as any]} pointerEvents="none">
        PACIFY
      </Text>
      <View style={[s.beam as any, web && ({ animation: "p5-beamV 3.6s linear infinite" } as any)]} pointerEvents="none" />

      <View style={[s.frame as any, s.editorial as any]}>
        <View style={s.head as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={s.list as any}>
          {NAV.map((it, i) => (
            <View key={it.label} style={[s.iRow as any, { marginLeft: i * 48 } as any]}>
              <Text style={s.iGhostNum as any} pointerEvents="none">
                {it.n}
              </Text>
              <Word {...it} i={i} />
            </View>
          ))}
        </View>

        <View style={s.utilRow as any}>
          {UTIL.map((u) => (
            <UtilItem key={u.label} {...u} />
          ))}
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
  bRed: { position: "absolute", top: 0, bottom: 0, left: 0, width: "42%", backgroundColor: "rgba(230,0,18,0.14)", transform: [{ skewX: "-10deg" }], marginLeft: "-6%" } as any,
  cBand: { position: "absolute", top: "32%", left: "-10%", width: "120%", height: 220, backgroundColor: theme.color.yellow, opacity: 0.07, transform: [{ rotate: "-12deg" }] } as any,
  cGhost: { position: "absolute", top: "6%", right: "2%", fontFamily: theme.font.display, fontSize: 360, color: theme.color.paper, opacity: 0.05, transform: [{ skewX: "-8deg" }] } as any,
  watermark: { position: "absolute", top: "30%", left: 0, right: 0, fontFamily: theme.font.display, fontSize: 220, color: theme.color.paper, opacity: 0.04, letterSpacing: 20, transform: [{ skewX: "-8deg" }] } as any,
  beam: { position: "absolute", top: 0, bottom: 0, left: "40%", width: 130, backgroundColor: "rgba(230,0,18,0.12)", transform: [{ skewX: "-12deg" }] } as any,

  // shared frame
  frame: { flex: 1, paddingHorizontal: 56, paddingTop: 56, paddingBottom: 48, zIndex: 2, justifyContent: "center" } as any,
  center: { alignItems: "center" } as any,
  head: { flexDirection: "row", alignItems: "flex-end", gap: 20, marginBottom: 18 } as any,
  logo: { fontFamily: theme.font.display, fontSize: 76, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, paddingBottom: 12 } as any,

  // words
  list: { gap: 6 } as any,
  listC: { alignItems: "center" } as any,
  listR: { alignItems: "flex-end" } as any,
  word: { paddingVertical: 6, borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.08)" } as any,
  wordR: { borderBottomColor: "rgba(255,255,255,0.08)" } as any,
  wordHover: { borderBottomColor: theme.color.yellow } as any,
  wordInner: { flexDirection: "row", alignItems: "center", gap: 20, position: "relative" } as any,
  wordInnerR: { flexDirection: "row-reverse", justifyContent: "flex-end" } as any,
  idx: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.crimson, letterSpacing: 1, minWidth: 44 } as any,
  idxOn: { color: theme.color.yellow } as any,
  wordText: { fontFamily: theme.font.display, fontSize: 60, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,
  soon: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.paper, opacity: 0.5, marginLeft: 14 } as any,
  underline: { position: "absolute", bottom: -2, left: 64, right: 0, height: 4, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  underlineR: { position: "absolute", bottom: -2, left: 0, right: 64, height: 4, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,

  // util
  utilRow: { flexDirection: "row", gap: 26, marginTop: 26 } as any,
  utilRowC: { justifyContent: "center" } as any,
  util: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  utilHover: {} as any,
  utilBullet: { width: 8, height: 8, backgroundColor: theme.color.crimson, transform: [{ skewX: "-20deg" }] } as any,
  utilBulletOn: { backgroundColor: theme.color.yellow } as any,
  utilText: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, color: theme.color.paper, fontWeight: "600" } as any,
  utilArrow: { fontFamily: theme.font.body, fontSize: 18, color: theme.color.paper, opacity: 0.45 } as any,

  // H split
  split: { flexDirection: "row", gap: 56, alignItems: "center" } as any,
  hLeft: { flex: 0.85, gap: 14 } as any,
  hNum: { fontFamily: theme.font.display, fontSize: 200, color: theme.color.crimson, lineHeight: 180, transform: [{ skewX: "-8deg" }], textShadow: `10px 10px 0 rgba(0,0,0,0.6)` } as any,
  hBar: { width: 160, height: 8, backgroundColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  hTag: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.paper, lineHeight: 36, transform: [{ skewX: "-8deg" }] } as any,
  hSub: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.6)", marginTop: 6 } as any,
  hRight: { flex: 1.15, gap: 14 } as any,

  // I editorial
  editorial: { paddingTop: 40 } as any,
  iRow: { position: "relative", alignItems: "flex-start" } as any,
  iGhostNum: { position: "absolute", top: -28, left: -10, fontFamily: theme.font.display, fontSize: 90, color: theme.color.paper, opacity: 0.05, letterSpacing: 2 } as any,

  // picker (TEMP)
  picker: { position: "absolute", top: 14, right: 14, zIndex: 99, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", padding: 6, borderWidth: 1, borderColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  pickerLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.yellow, marginRight: 4 } as any,
  pickBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(10,10,10,0.9)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 14, color: theme.color.paper } as any,
});
