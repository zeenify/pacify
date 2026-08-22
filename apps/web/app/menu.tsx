import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

const web = Platform.OS === "web";

const NAV = [
  { n: "01", label: "CAMPAIGN", sub: "face all 13 • ladder", to: "/campaign" },
  { n: "02", label: "DOSSIER", sub: "psych profiles • tells", to: "/dossier" },
  { n: "03", label: "HALL OF SHAME", sub: "worst losses, framed", to: "/shame" },
  { n: "04", label: "MULTIPLAYER", sub: "coming soon", to: null },
];
const UTIL = [
  { label: "PROFILE", to: "/profile" },
  { label: "HOW TO PLAY", to: "/howto" },
  { label: "OPTIONS", to: "/options" },
];

/* ransom-note typography: every letter tilted its own way, one letter inverted */
function Ransom({ text, size }: { text: string; size: number }) {
  return (
    <>
      {text.split("").map((ch, i) => {
        const flip = i === Math.floor(text.length / 2);
        const tilt = (i % 3) - 1;
        return (
          <Text
            key={i}
            style={[
              s.ransomLetter as any,
              {
                fontSize: i % 2 ? size * 1.08 : size,
                transform: [{ rotate: tilt * 3 }, { translateY: tilt * size * 0.05 }],
              } as any,
              flip && { backgroundColor: theme.color.paper, color: theme.color.black, paddingHorizontal: 2 },
            ]}
          >
            {ch}
          </Text>
        );
      })}
    </>
  );
}

function UtilItem({ label, to }: { label: string; to: string }) {
  return (
    <Pressable onPress={() => router.push(to)} style={({ hovered }) => [s.util as any, hovered && (s.utilHover as any)]}>
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
  { key: 1, label: "J" },
  { key: 2, label: "K" },
  { key: 3, label: "L" },
];

export default function Menu() {
  const [v, setV] = useState<number>(1);
  return (
    <View style={s.stage as any}>
      {v === 1 && <DesignJ />}
      {v === 2 && <DesignK />}
      {v === 3 && <DesignL />}
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

/* ========== DESIGN J — GAZE LINE (authentic P5: white central line guides the eye) ========== */
function DesignJ() {
  return (
    <View style={s.stage as any}>
      <View style={s.jLine as any} pointerEvents="none" />
      <View style={s.bRed as any} pointerEvents="none" />

      <View style={s.frame as any}>
        <View style={s.head as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        {NAV.map((it, i) => (
          <Pressable
            key={it.label}
            disabled={!it.to}
            onPress={it.to ? () => router.push(it.to) : undefined}
            style={({ hovered }) => [s.jRow as any, hovered && it.to && (s.jRowHover as any), web && ({ animation: `rowIn 600ms ${140 + i * 90}ms both` } as any)]}
          >
            {({ hovered }) => (
              <>
                <View style={s.jLeft as any}>
                  <Text style={[s.idx as any, hovered && (s.idxOn as any)]}>{it.n}</Text>
                  <View style={s.ransomWrap as any}>
                    <Ransom text={it.label} size={52} />
                  </View>
                </View>
                <View style={s.jRight as any}>
                  <Text style={[s.jSub as any, hovered && it.to && { color: theme.color.yellow } as any]}>{it.sub}</Text>
                  {it.to && <Text style={[s.jArrow as any, hovered && { opacity: 1 } as any]}>▶</Text>}
                </View>
              </>
            )}
          </Pressable>
        ))}

        <View style={s.utilRow as any}>
          {UTIL.map((u) => (
            <UtilItem key={u.label} {...u} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ========== DESIGN K — ALTERNATING STRIPS (items cross the line, P5 system-menu style) ========== */
function DesignK() {
  return (
    <View style={s.stage as any}>
      <View style={s.kLine as any} pointerEvents="none" />
      <Text style={[s.cGhost as any, web && ({ animation: "p5-float 5s ease-in-out infinite" } as any)]} pointerEvents="none">
        P
      </Text>

      <View style={s.frame as any}>
        <View style={s.head as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={s.kList as any}>
          {NAV.map((it, i) => {
            const right = i % 2 === 1;
            return (
              <Pressable
                key={it.label}
                disabled={!it.to}
                onPress={it.to ? () => router.push(it.to) : undefined}
                style={({ hovered }) => [
                  s.kStrip as any,
                  right ? (s.kStripR as any) : (s.kStripL as any),
                  hovered && it.to && (s.kStripHover as any),
                  web && ({ animation: `rowIn 600ms ${140 + i * 100}ms both` } as any),
                ]}
              >
                {({ hovered }) => (
                  <>
                    <Text style={[s.idx as any, { minWidth: 34 } as any, hovered && (s.idxOn as any)]}>{it.n}</Text>
                    <Text style={[s.kLabel as any, !it.to && { opacity: 0.4 } as any]}>{it.label}</Text>
                    {!it.to && <Text style={s.soon as any}>SOON</Text>}
                    <Text style={[s.kArrow as any, hovered && it.to && { opacity: 1, transform: [{ translateX: 4 }] } as any]}>▶</Text>
                  </>
                )}
              </Pressable>
            );
          })}
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

/* ========== DESIGN L — WEDGE PERSPECTIVE (triangles point at a target, one-point depth) ========== */
function DesignL() {
  return (
    <View style={s.stage as any}>
      <View style={s.bRed as any} pointerEvents="none" />
      <View style={s.cBand as any} pointerEvents="none" />

      {/* focal target on the right */}
      <View style={s.lTarget as any} pointerEvents="none">
        <View style={[s.lRingDash as any, web && ({ animation: "p5-spin 14s linear infinite" } as any)]} />
        <View style={s.lRingSolid as any} />
        <View style={s.lDot as any} />
      </View>

      <View style={s.frame as any}>
        <View style={s.head as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        <View style={s.lList as any}>
          {NAV.map((it, i) => (
            <Pressable
              key={it.label}
              disabled={!it.to}
              onPress={it.to ? () => router.push(it.to) : undefined}
              style={({ hovered }) => [
                s.lWedge as any,
                { width: `${100 - i * 9}%` } as any,
                hovered && it.to && (s.lWedgeHover as any),
                web && ({ animation: `rowIn 600ms ${140 + i * 90}ms both` } as any),
              ]}
            >
              {({ hovered }) => (
                <>
                  <Text style={[s.idx as any, { minWidth: 34 } as any, hovered && (s.idxOn as any)]}>{it.n}</Text>
                  <Text style={[s.kLabel as any, !it.to && { opacity: 0.4 } as any]}>{it.label}</Text>
                  {!it.to && <Text style={s.soon as any}>SOON</Text>}
                  <Text style={[s.lTip as any, hovered && it.to && { color: theme.color.yellow, opacity: 1 } as any]}>▶</Text>
                </>
              )}
            </Pressable>
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

  // shared
  bRed: { position: "absolute", top: 0, bottom: 0, left: 0, width: "42%", backgroundColor: "rgba(230,0,18,0.13)", transform: [{ skewX: "-10deg" }], marginLeft: "-6%" } as any,
  cBand: { position: "absolute", top: "32%", left: "-10%", width: "120%", height: 220, backgroundColor: theme.color.yellow, opacity: 0.07, transform: [{ rotate: "-12deg" }] } as any,
  cGhost: { position: "absolute", top: "6%", right: "2%", fontFamily: theme.font.display, fontSize: 360, color: theme.color.paper, opacity: 0.05, transform: [{ skewX: "-8deg" }] } as any,
  frame: { flex: 1, paddingHorizontal: 56, paddingTop: 52, paddingBottom: 40, zIndex: 2, justifyContent: "center" } as any,
  head: { flexDirection: "row", alignItems: "flex-end", gap: 20, marginBottom: 20 } as any,
  logo: { fontFamily: theme.font.display, fontSize: 72, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, paddingBottom: 12 } as any,
  idx: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.crimson, letterSpacing: 1 } as any,
  idxOn: { color: theme.color.yellow } as any,
  soon: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.paper, opacity: 0.5, marginLeft: 10 } as any,

  // ransom typography
  ransomLetter: { fontFamily: theme.font.display, color: theme.color.paper, display: "inline-block" } as any,
  ransomWrap: { flexDirection: "row", alignItems: "center" } as any,

  // J � gaze line
  jLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 3, backgroundColor: "rgba(255,255,255,0.75)", zIndex: 1 } as any,
  jRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" } as any,
  jRowHover: { backgroundColor: "rgba(230,0,18,0.08)" } as any,
  jLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "flex-end", paddingRight: 34 } as any,
  jRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 34 } as any,
  jSub: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 2, color: "rgba(255,255,255,0.55)" } as any,
  jArrow: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow, opacity: 0 } as any,

  // K � alternating strips
  kLine: { position: "absolute", top: "-5%", bottom: "-5%", left: "50%", width: 7, backgroundColor: "rgba(255,255,255,0.85)", transform: [{ rotate: "4deg" }], zIndex: 1 } as any,
  kList: { gap: 14, marginTop: 8 } as any,
  kStripL: { alignSelf: "flex-start", marginRight: "30%" } as any,
  kStripR: { alignSelf: "flex-end", marginLeft: "30%" } as any,
  kStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "rgba(10,10,10,0.95)",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    transform: [{ skewX: "-10deg" }],
    minWidth: 300,
  } as any,
  kStripR: { borderLeftWidth: 1, borderRightWidth: 6, borderRightColor: theme.color.crimson } as any,
  kStripHover: { backgroundColor: theme.color.crimson, borderTopColor: theme.color.paper, borderBottomColor: theme.color.paper } as any,
  kLabel: { fontFamily: theme.font.display, fontSize: 26, color: theme.color.paper, letterSpacing: 1.5 } as any,
  kArrow: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.paper, opacity: 0, marginLeft: "auto" } as any,

  // L � wedge perspective
  lTarget: { position: "absolute", top: "38%", right: "4%", width: 260, height: 260, alignItems: "center", justifyContent: "center", zIndex: 1 } as any,
  lRingDash: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", borderStyle: "dashed" } as any,
  lRingSolid: { position: "absolute", width: 170, height: 170, borderRadius: 85, borderWidth: 5, borderColor: theme.color.crimson } as any,
  lDot: { width: 46, height: 46, borderRadius: 23, backgroundColor: theme.color.yellow } as any,
  lList: { gap: 12, marginTop: 8 } as any,
  lWedge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
    backgroundColor: "rgba(10,10,10,0.92)",
    borderRightWidth: 6,
    borderRightColor: theme.color.crimson,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    transform: [{ skewX: "-16deg" }],
  } as any,
  lWedgeHover: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper, translate: [{ translateX: 10 }] } as any,
  lTip: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.paper, opacity: 0.35, marginLeft: "auto" } as any,
  kLabelReuse: {} as any,

  // util
  utilRow: { flexDirection: "row", gap: 26, marginTop: 28 } as any,
  util: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  utilHover: {} as any,
  utilBullet: { width: 8, height: 8, backgroundColor: theme.color.crimson, transform: [{ skewX: "-20deg" }] } as any,
  utilBulletOn: { backgroundColor: theme.color.yellow } as any,
  utilText: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, color: theme.color.paper, fontWeight: "600" } as any,
  utilArrow: { fontFamily: theme.font.body, fontSize: 18, color: theme.color.paper, opacity: 0.45 } as any,

  // picker (TEMP)
  picker: { position: "absolute", top: 14, right: 14, zIndex: 99, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", padding: 6, borderWidth: 1, borderColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  pickerLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.yellow, marginRight: 4 } as any,
  pickBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(10,10,10,0.9)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 14, color: theme.color.paper } as any,
});
