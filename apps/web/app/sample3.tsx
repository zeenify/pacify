import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

/**
 * SAMPLE 3 — DESK TAPE
 * Pinned paper on a desk. Minimal, no header, no stats, just the game.
 */
export default function Sample3() {
  return (
    <View style={s.stage as any}>
      <View style={s.deskHach as any} pointerEvents="none" />

      <View style={[s.paper as any, Platform.OS === "web" && ({ animation: "rowIn 620ms 120ms both" } as any)]}>
        <View style={s.tape as any} />
        <Text style={s.kicker as any}>PACIFY — CLASSROOM CARD WAR</Text>
        <Text style={s.logo as any}>PACIFY</Text>
        <Text style={s.oneLiner as any}>Hidden hands. One card. No mercy.</Text>

        <View style={s.divider as any} />

        <Pressable
          onPress={() => router.replace("/menu")}
          style={({ hovered, pressed }) => [
            s.cta as any,
            hovered && !pressed && { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any,
            pressed && { opacity: 0.9 } as any,
            Platform.OS === "web" && ({ transition: "all 120ms" } as any),
          ]}
        >
          <Text style={s.ctaText}>PRESS ○ TO ENTER</Text>
        </Pressable>

        <Text style={s.fine as any}>5 rounds • tricks void peek swap ward echo • hard from 01</Text>
      </View>

      <Pressable onPress={() => router.replace("/")} style={s.back as any}>
        <Text style={s.backText}>← BACK</Text>
      </Pressable>
      <Text style={s.foot as any}>SAMPLE 3 — DESK TAPE • Tell me “3”</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          background: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  deskHach: { position: "absolute", inset: 0, opacity: 0.04, backgroundColor: "transparent" } as any,
  paper: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#DDD",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.black,
    paddingHorizontal: 24,
    paddingVertical: 22,
    gap: 8,
    alignItems: "center",
    transform: [{ skewX: "-3deg" }],
  } as any,
  tape: { position: "absolute", top: -10, left: 22, width: 64, height: 12, backgroundColor: "rgba(10,10,10,0.85)", transform: [{ rotate: "-5deg" }] } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.crimson, fontWeight: "700", transform: [{ skewX: "3deg" }] } as any,
  logo: {
    fontFamily: theme.font.display,
    fontSize: 56,
    lineHeight: 52 as any,
    color: theme.color.black,
    letterSpacing: 1,
    transform: [{ skewX: "3deg" }],
  } as any,
  oneLiner: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1, color: "#333", transform: [{ skewX: "3deg" }] } as any,
  divider: { width: "100%", height: 1, backgroundColor: "#EAEAEA", marginVertical: 6, transform: [{ skewX: "3deg" }] } as any,
  cta: {
    marginTop: 6,
    backgroundColor: theme.color.black,
    borderWidth: 1,
    borderColor: theme.color.black,
    paddingHorizontal: 22,
    paddingVertical: 10,
    transform: [{ skewX: "3deg" }],
  } as any,
  ctaText: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.paper, fontWeight: "700" } as any,
  fine: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: "#888", transform: [{ skewX: "3deg" }], textAlign: "center" } as any,
  back: { position: "absolute", bottom: 36, opacity: 0.6 } as any,
  backText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.paper } as any,
  foot: { position: "absolute", bottom: 16, fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: "#666" } as any,
});
