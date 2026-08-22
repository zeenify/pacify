import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

const web = Platform.OS === "web";

/* hover blaster sound — same cue as the title screen */
const hoverSound: HTMLAudioElement | null =
  web && typeof Audio !== "undefined" ? new Audio("/hover.wav") : null;
if (hoverSound) hoverSound.volume = 0.12;
const playHover = () => {
  if (!hoverSound) return;
  try {
    hoverSound.currentTime = 0;
    void hoverSound.play();
  } catch {}
};

const NAV = [
  { n: "01", label: "CAMPAIGN", sub: "face all 13 • ladder", to: "/campaign" },
  { n: "02", label: "DOSSIER", sub: "psych profiles • tells", to: "/dossier" },
  { n: "03", label: "HALL OF SHAME", sub: "worst losses, framed", to: "/shame" },
  { n: "04", label: "MULTIPLAYER", sub: "", to: null },
  { n: "05", label: "PROFILE", sub: "stats • records", to: "/profile" },
  { n: "06", label: "HOW TO PLAY", sub: "rules • the 5 tricks", to: "/howto" },
  { n: "07", label: "OPTIONS", sub: "sound • display", to: "/options" },
];

/* ransom-note typography: every letter tilted its own way, one letter inverted */
function Ransom({ text, size, dim }: { text: string; size: number; dim?: boolean }) {
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
              dim && !flip && { color: "#8f8f8f" },
              flip && { backgroundColor: dim ? "#6a6a6a" : theme.color.paper, color: theme.color.black, paddingHorizontal: 2 },
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
      <View style={s.jLine as any} pointerEvents="none" />
      <View style={s.bRed as any} pointerEvents="none" />
      <Text style={s.watermark as any} pointerEvents="none">
        PACIFY
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
        <View style={s.head as any}>
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
                <View style={s.jLeft as any}>
                  <Text style={[s.idx as any, it.to && hovered && (s.idxOn as any)]}>{it.n}</Text>
                  <View style={s.ransomWrap as any}>
                    <Ransom text={it.label} size={38} dim={!it.to} />
                  </View>
                </View>
                <View style={s.jRight as any}>
                  {it.to ? (
                    <>
                      <Text style={[s.jSub as any, hovered && { color: theme.color.yellow } as any]}>{it.sub}</Text>
                      <Text style={[s.jArrow as any, hovered && { opacity: 1 } as any]}>▶</Text>
                    </>
                  ) : (
                    <View style={s.soonStamp as any}>
                      <Text style={s.soonStampTxt as any}>COMING SOON</Text>
                    </View>
                  )}
                </View>
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
  frame: { flex: 1, paddingHorizontal: 56, paddingTop: 52, paddingBottom: 40, zIndex: 2, justifyContent: "center" } as any,
  head: { flexDirection: "row", alignItems: "flex-end", gap: 20, marginBottom: 20 } as any,
  logo: { fontFamily: theme.font.display, fontSize: 72, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, paddingBottom: 12 } as any,
  idx: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.crimson, letterSpacing: 1 } as any,
  idxOn: { color: theme.color.yellow } as any,

  // ransom typography
  ransomLetter: { fontFamily: theme.font.display, color: theme.color.paper, display: "inline-block" } as any,
  ransomWrap: { flexDirection: "row", alignItems: "center" } as any,

  // J � gaze line
  jLine: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 3, backgroundColor: "rgba(255,255,255,0.75)", zIndex: 1 } as any,
  jRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" } as any,
  jRowHover: { backgroundColor: "rgba(230,0,18,0.1)" } as any,
  jRowLocked: { opacity: 0.55 } as any,
  jLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 16, justifyContent: "flex-end", paddingRight: 34 } as any,
  jRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 34 } as any,
  jSub: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 2, color: "rgba(255,255,255,0.55)" } as any,
  jArrow: { fontFamily: theme.font.display, fontSize: 16, color: theme.color.yellow, opacity: 0 } as any,
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

  // rotating target ring (top-right, partially cropped)
  lTarget: { position: "absolute", top: "-9%", right: "-7%", width: 300, height: 300, alignItems: "center", justifyContent: "center", zIndex: 1, opacity: 0.85 } as any,
  lRingDash: { position: "absolute", width: 300, height: 300, borderRadius: 150, borderWidth: 3, borderColor: "rgba(255,255,255,0.3)", borderStyle: "dashed" } as any,
  lRingSolid: { position: "absolute", width: 195, height: 195, borderRadius: 98, borderWidth: 5, borderColor: theme.color.crimson } as any,
  lDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.color.yellow } as any,
});
