import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { playHover } from "../lib/sfx";

const web = Platform.OS === "web";

const NAV = [
  { n: "01", label: "CAMPAIGN", sub: "13 students to beat", to: "/campaign" },
  { n: "02", label: "DOSSIER", sub: "13 Seats Secret Files", to: "/dossier" },
  { n: "03", label: "HALL OF SHAME", sub: "Dont be listed here", to: "/shame" },
  { n: "04", label: "MULTIPLAYER", sub: "", to: null },
  { n: "05", label: "PROFILE", sub: "stats • records", to: "/profile" },
  { n: "06", label: "HOW TO PLAY", sub: "Read me PLEASE!!!", to: "/howto" },
  { n: "07", label: "OPTIONS", sub: "sound • display", to: "/options" },
];

/* hidden lore word — the boxed letter on each row reads top-to-bottom */
const HIDDEN_WORD = "PISTOLS";
const BOX_INDEX: Record<string, number> = {
  CAMPAIGN: 3, // P
  DOSSIER: 4, // I
  "HALL OF SHAME": 8, // S
  MULTIPLAYER: 3, // T
  PROFILE: 2, // O
  "HOW TO PLAY": 8, // L
  OPTIONS: 6, // S
};

/* ransom-note typography: every letter tilted its own way, one letter inverted */
function Ransom({ text, size, dim, box }: { text: string; size: number; dim?: boolean; box?: number }) {
  return (
    <>
      {text.split("").map((ch, i) => {
        const flip = box !== undefined && i === box;
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
              dim && !flip && { color: "#8f8f8f" },
              flip && {
                backgroundColor: dim ? "#5a5a5a" : theme.color.crimson,
                color: theme.color.paper,
                paddingHorizontal: 4,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.55)",
                marginHorizontal: 2,
              },
            ]}
          >
            {ch}
          </Text>
        );
      })}
    </>
  );
}

export default function Menu() {
  return <DesignJ />;
}

/* ========== DESIGN J — GAZE LINE (authentic P5: white central line guides the eye) ========== */
function DesignJ() {
  return (
    <View style={s.stage as any}>
      <View style={s.halftone as any} pointerEvents="none" />
      <View style={s.jLine as any} pointerEvents="none" />
      <View style={s.echoLine as any} pointerEvents="none" />
      <View style={s.bRed as any} pointerEvents="none" />
      <Text style={s.watermark as any} pointerEvents="none">
        PACIFY
      </Text>
      <Text style={[s.starA as any, web && ({ animation: "p5-spin 22s linear infinite" } as any)]} pointerEvents="none">
        ✦
      </Text>
      <Text style={s.starB as any} pointerEvents="none">
        ✦
      </Text>

      {/* rotating target ring — top right */}
      <View style={s.lTarget as any} pointerEvents="none">
        <View style={[s.lRingDash as any, web && ({ animation: "p5-spin 14s linear infinite" } as any)]} />
        <View style={s.lRingSolid as any} />
        <View style={s.lDot as any} />
      </View>

      {/* floating suit diamonds */}
      <View style={[s.diamond as any, s.diamondA as any, web && ({ animation: "p5-float 4.5s ease-in-out infinite" } as any)]} pointerEvents="none" />
      <View style={[s.diamond as any, s.diamondB as any, web && ({ animation: "p5-float 6s 1.2s ease-in-out infinite" } as any)]} pointerEvents="none" />

      <View style={s.frame as any}>
        <View style={s.headAbs as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
          <Text style={s.kicker as any}>SELECT YOUR POISON</Text>
        </View>

        {NAV.map((it, i) => (
          <Pressable
            key={it.label}
            disabled={!it.to}
            onHoverIn={playHover}
            onPress={it.to ? () => router.push(it.to) : undefined}
            style={({ hovered }) => [
              s.jRow as any,
              !it.to && (s.jRowLocked as any),
              hovered && it.to && (s.jRowHover as any),
              web && ({ animation: `rowIn 600ms ${120 + i * 70}ms both` } as any),
            ]}
          >
            {({ hovered }) => (
              <>
                <View style={[s.jInner as any, { transform: [{ translateX: (3 - i) * 18 }] } as any]}>
                <View style={s.jLeft as any}>
                  <Text style={[s.idx as any, it.to && hovered && (s.idxOn as any)]}>{it.n}</Text>
                  <View
                    style={[
                      s.ransomWrap as any,
                      hovered && it.to && web && ({ animation: "p5-shiver 0.28s linear", transform: [{ translateX: -6 }, { scale: 1.05 }] } as any),
                    ]}
                  >
                    <Ransom text={it.label} size={48} dim={!it.to} box={BOX_INDEX[it.label]} />
                  </View>
                </View>
                <View style={s.jRight as any}>
                  {it.to ? (
                    <>
                      <Text style={[s.jSub as any, hovered && { color: theme.color.yellow, letterSpacing: 3.5 } as any]}>{it.sub}</Text>
                      <Text style={[s.jArrow as any, hovered && { opacity: 1, transform: [{ translateX: 6 }] } as any]}>▶</Text>
                    </>
                  ) : (
                    <View style={s.soonStamp as any}>
                      <Text style={s.soonStampTxt as any}>COMING SOON</Text>
                    </View>
                  )}
                </View>
                </View>
                {hovered && it.to && <View style={s.sweepBar as any} pointerEvents="none" />}
              </>
            )}
          </Pressable>
        ))}
      </View>

      {/* hazard tape floor */}
      <View style={s.hazard as any} pointerEvents="none" />
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
  frame: { flex: 1, paddingHorizontal: 56, paddingVertical: 24, zIndex: 2, justifyContent: "center" } as any,
  headAbs: { position: "absolute", top: 36, left: 56, flexDirection: "row", alignItems: "flex-end", gap: 20, zIndex: 3 } as any,
  head: { flexDirection: "row", alignItems: "flex-end", gap: 20, marginBottom: 20 } as any,
  logo: { fontFamily: theme.font.display, fontSize: 84, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `9px 9px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 6, color: theme.color.yellow, paddingBottom: 14 } as any,
  idx: { fontFamily: theme.font.display, fontSize: 28, color: theme.color.crimson, letterSpacing: 1 } as any,
  idxOn: { color: theme.color.yellow } as any,

  // ransom typography
  ransomLetter: { fontFamily: theme.font.display, color: theme.color.paper, display: "inline-block" } as any,
  ransomWrap: { flexDirection: "row", alignItems: "center" } as any,

  // J � gaze line
  jLine: { position: "absolute", top: "-12%", bottom: "-12%", left: "50%", width: 4, backgroundColor: "rgba(255,255,255,0.78)", transform: [{ rotate: "9deg" }], zIndex: 1 } as any,
  jInner: { flex: 1, flexDirection: "row", alignItems: "center" } as any,
  jRow: { position: "relative", flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" } as any,
  jRowHover: { backgroundColor: "rgba(230,0,18,0.1)", borderBottomColor: theme.color.yellow } as any,
  jRowLocked: { opacity: 0.55 } as any,
  jLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "flex-end", paddingRight: 34 } as any,
  jRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 34 } as any,
  jSub: { fontFamily: theme.font.body, fontSize: 15, letterSpacing: 2.5, color: "rgba(255,255,255,0.55)", fontWeight: "600" } as any,
  jArrow: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.yellow, opacity: 0 } as any,
  sweepBar: { position: "absolute", left: 0, right: 0, bottom: -1, height: 3, backgroundColor: theme.color.crimson, ...(web ? ({ animation: "p5-sweep 220ms ease-out both" } as any) : {}) } as any,
  soonStamp: { borderWidth: 2, borderColor: theme.color.yellow, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "-3deg" }, { skewX: "-6deg" }] } as any,
  soonStampTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.yellow, fontWeight: "700" } as any,

  // extra assets
  watermark: { position: "absolute", top: "24%", left: 0, right: 0, textAlign: "center", fontFamily: theme.font.display, fontSize: 230, color: theme.color.paper, opacity: 0.035, letterSpacing: 18, transform: [{ skewX: "-8deg" }] } as any,
  hazard: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 14,
    opacity: 0.35,
    zIndex: 3,
    ...(web ? { backgroundImage: "repeating-linear-gradient(45deg, #FCEE21 0 16px, #111 16px 32px)" } as any : {}),
  } as any,
  diamond: { position: "absolute", width: 22, height: 22, transform: [{ rotate: "45deg" }], zIndex: 1 } as any,
  diamondA: { top: "20%", left: "7%", backgroundColor: theme.color.crimson, opacity: 0.5 } as any,
  diamondB: { bottom: "14%", right: "10%", backgroundColor: theme.color.yellow, opacity: 0.4 } as any,

  // more accents
  echoLine: { position: "absolute", top: "-12%", bottom: "-12%", left: "50%", width: 2, marginLeft: 18, backgroundColor: "rgba(230,0,18,0.45)", transform: [{ rotate: "9deg" }], zIndex: 1 } as any,
  halftone: {
    position: "absolute",
    top: "-6%",
    left: "-4%",
    width: 360,
    height: 280,
    opacity: 0.14,
    transform: [{ rotate: "-12deg" }],
    zIndex: 0,
    ...(web ? { backgroundImage: "radial-gradient(circle, #FCEE21 1.6px, transparent 1.8px)", backgroundSize: "15px 15px" } as any : {}),
  } as any,
  starA: { position: "absolute", bottom: "12%", left: "30%", fontFamily: theme.font.body, fontSize: 72, color: theme.color.crimson, opacity: 0.45, zIndex: 1 } as any,
  starB: { position: "absolute", top: "11%", left: "25%", fontFamily: theme.font.body, fontSize: 26, color: theme.color.yellow, opacity: 0.7, transform: [{ rotate: "18deg" }], zIndex: 1 } as any,

  // rotating target ring (top-right, partially cropped)
  lTarget: { position: "absolute", top: "-9%", right: "-7%", width: 300, height: 300, alignItems: "center", justifyContent: "center", zIndex: 1, opacity: 0.85 } as any,
  lRingDash: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 3, borderColor: "rgba(255,255,255,0.3)", borderStyle: "dashed" } as any,
  lRingSolid: { position: "absolute", width: 195, height: 195, borderRadius: 98, borderWidth: 5, borderColor: theme.color.crimson } as any,
  lDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.yellow } as any,
});
