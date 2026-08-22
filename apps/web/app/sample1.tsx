import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

/**
 * SAMPLE 1 — CENTER STAGE
 * No top header. No stats. Just PACIFY + one line + one CTA. Clean hero like wix hero but without junk.
 */
export default function Sample1() {
  return (
    <View style={s.stage as any}>
      <View style={s.slash as any} pointerEvents="none" />
      <View style={s.slash2 as any} pointerEvents="none" />

      <View style={s.center as any}>
        <Text style={[s.kicker as any, Platform.OS === "web" && ({ animation: "heroIn 560ms 120ms both" } as any)]}>13 SEATS • ONE ROOM</Text>

        <Text style={[s.logo as any, Platform.OS === "web" && ({ animation: "heroIn 620ms 200ms both" } as any)]}>PACIFY</Text>

        <View style={[s.underline as any, Platform.OS === "web" && ({ animation: "heroIn 520ms 320ms both" } as any)]} />

        <Text style={[s.tagline as any, Platform.OS === "web" && ({ animation: "heroIn 600ms 420ms both" } as any)]}>HARD FROM SEAT 01</Text>

        <Pressable
          onPress={() => router.replace("/menu")}
          style={({ hovered, pressed }) => [
            s.cta as any,
            hovered && !pressed && { transform: [{ skewX: "-8deg" }, { translateX: -2 }, { translateY: -2 }] } as any,
            pressed && { transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }] } as any,
            Platform.OS === "web" && ({ transition: "transform 150ms" } as any),
            Platform.OS === "web" && ({ animation: "heroIn 520ms 580ms both" } as any),
          ]}
        >
          <Text style={s.ctaText}>ENTER</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/")} style={s.back as any}>
          <Text style={s.backText}>← BACK TO CHOOSER</Text>
        </Pressable>
      </View>

      <Text style={s.foot as any}>SAMPLE 1 — CENTER STAGE • Tell me “1” if this is the one</Text>
    </View>
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
          background: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          animation: "bgShift 1.8s linear infinite",
        } as any)
      : {}),
  } as any,
  slash: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", backgroundColor: theme.color.crimson, opacity: 0.1, transform: [{ skewX: "-18deg" }] } as any,
  slash2: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", backgroundColor: theme.color.crimsonDeep, opacity: 0.08, transform: [{ skewX: "16deg" }] } as any,
  center: { alignItems: "center", gap: 14, zIndex: 2 } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 6, color: theme.color.yellow } as any,
  logo: {
    fontFamily: theme.font.display,
    fontSize: 96,
    lineHeight: 90 as any,
    color: theme.color.paper,
    letterSpacing: 2,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 8, height: 8 },
    textShadowRadius: 0,
  } as any,
  underline: { width: 140, height: 6, backgroundColor: theme.color.crimson, transform: [{ skewX: "-8deg" }] } as any,
  tagline: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 5, color: theme.color.paper, opacity: 0.9 } as any,
  cta: {
    marginTop: 18,
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: theme.color.paper,
    paddingHorizontal: 36,
    paddingVertical: 14,
    transform: [{ skewX: "-8deg" }],
  } as any,
  ctaText: { fontFamily: theme.font.display, fontSize: 18, letterSpacing: 4, color: theme.color.paper, transform: [{ skewX: "8deg" }] } as any,
  back: { marginTop: 18, opacity: 0.6 } as any,
  backText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.paper } as any,
  foot: { position: "absolute", bottom: 16, fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: "#666" } as any,
});
