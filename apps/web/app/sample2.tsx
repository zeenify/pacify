import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

export default function Sample2() {
  return (
    <View style={s.stage as any}>
      <View style={[s.burst as any, { pointerEvents: "none" } as any]} />
      <View style={[s.burst2 as any, { pointerEvents: "none" } as any]} />

      <View style={[s.poster as any, Platform.OS === "web" && ({ animation: "jokerIn 680ms 200ms both" } as any)]}>
        <View style={s.posterTop as any}>
          <Text style={s.posterKicker as any}>CLASSIFIED • 13 SEATS</Text>
          <View style={s.stamp as any}>
            <Text style={s.stampText}>HARD</Text>
          </View>
        </View>

        <Text style={s.logo as any}>PACIFY</Text>
        <View style={s.slash as any} />

        <Text style={s.desc as any}>A classroom. 5 rounds. The last seat sees everything.</Text>

        <Pressable
          onPress={() => router.replace("/menu")}
          style={({ hovered, pressed }) => [
            s.cta as any,
            hovered && !pressed && { transform: [{ translateX: -2 }] } as any,
            pressed && { transform: [{ translateX: 2 }], opacity: 0.9 } as any,
            Platform.OS === "web" && ({ transition: "transform 120ms" } as any),
          ]}
        >
          <Text style={s.ctaText}>ENTER →</Text>
        </Pressable>

        <View style={s.tape as any} />
        <View style={s.tape2 as any} />
      </View>

      <Pressable onPress={() => router.replace("/")} style={s.back as any}>
        <Text style={s.backText}>← BACK</Text>
      </Pressable>
      <Text style={s.foot as any}>SAMPLE 2 — WANTED POSTER • Tell me "2"</Text>
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
          backgroundColor: theme.color.black,
          backgroundImage: "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)",
          backgroundSize: "44px 44px",
          backgroundPosition: "0 0",
        } as any)
      : {}),
  } as any,
  burst: {
    position: "absolute",
    width: 720,
    height: 720,
    borderRadius: 360,
    top: -260,
    right: -200,
    backgroundColor: "rgba(230,0,18,0.08)",
    borderWidth: 28,
    borderColor: "rgba(230,0,18,0.12)",
  } as any,
  burst2: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    bottom: -120,
    left: -120,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 16,
    borderColor: "rgba(255,255,255,0.06)",
  } as any,
  poster: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    paddingHorizontal: 26,
    paddingVertical: 22,
    gap: 10,
    transform: [{ skewX: "-3deg" }],
  } as any,
  posterTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  posterKicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.crimson, fontWeight: "700" } as any,
  stamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "3deg" }] } as any,
  stampText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.crimson, fontWeight: "700" } as any,
  logo: {
    fontFamily: theme.font.display,
    fontSize: 64,
    lineHeight: 60 as any,
    color: theme.color.black,
    letterSpacing: 2,
    transform: [{ skewX: "3deg" }],
  } as any,
  slash: { width: 90, height: 6, backgroundColor: theme.color.crimson, transform: [{ skewX: "3deg" }] } as any,
  desc: { fontFamily: theme.font.body, fontSize: 12, lineHeight: 16 as any, color: "#333", transform: [{ skewX: "3deg" }], marginTop: 4 } as any,
  cta: {
    marginTop: 8,
    backgroundColor: theme.color.black,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.color.crimson,
    transform: [{ skewX: "3deg" }],
  } as any,
  ctaText: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.paper, fontWeight: "700" } as any,
  tape: { position: "absolute", top: -10, left: 18, width: 56, height: 12, backgroundColor: "rgba(10,10,10,0.85)", transform: [{ rotate: "-6deg" }] } as any,
  tape2: { position: "absolute", top: -10, right: 18, width: 44, height: 10, backgroundColor: theme.color.yellow, transform: [{ rotate: "5deg" }] } as any,
  back: { position: "absolute", bottom: 36, opacity: 0.6 } as any,
  backText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.paper } as any,
  foot: { position: "absolute", bottom: 16, fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: "#666" } as any,
});