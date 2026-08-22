import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";

/**
 * SAMPLE 3 — DESK TAPE (rich, not bland)
 * Pinned paper + desk clutter: scattered cards, ruler, stamp, coffee, class list.
 * Still no header/stats — but desk feels alive.
 */
export default function Sample3() {
  return (
    <View style={s.stage as any}>
      {/* desk texture */}
      <View style={s.desk as any} pointerEvents="none" />
      <View style={s.ruler as any} pointerEvents="none">
        <Text style={s.rulerText}>1  2  3  4  5  6  7  8  9  10  11  12  13</Text>
      </View>

      {/* scattered cards behind */}
      <View style={s.scatter as any} pointerEvents="none">
        <View style={[s.miniCard, { transform: [{ rotate: "-12deg" }] } as any]}>
          <Text style={s.miniText}>VOID</Text>
        </View>
        <View style={[s.miniCard, { transform: [{ rotate: "8deg" }] } as any]}>
          <Text style={s.miniText}>ECHO</Text>
        </View>
        <View style={[s.miniCard, { transform: [{ rotate: "-4deg" }] } as any]}>
          <Text style={s.miniText}>WARD</Text>
        </View>
      </View>

      {/* coffee stain */}
      <View style={s.stain as any} pointerEvents="none" />

      <View style={[s.paper as any, Platform.OS === "web" && ({ animation: "rowIn 620ms 120ms both" } as any)]}>
        <View style={s.tape as any} />
        <View style={s.tape2 as any} />
        <View style={s.topRow as any}>
          <Text style={s.kicker as any}>PACIFY — CLASSROOM CARD WAR</Text>
          <View style={s.stamp as any}>
            <Text style={s.stampText}>HARD 01</Text>
          </View>
        </View>

        <Text style={s.logo as any}>PACIFY</Text>
        <Text style={s.oneLiner as any}>Hidden hands. One card. No mercy.</Text>

        <View style={s.divider as any} />

        <View style={s.trickRow as any}>
          {["VOID", "ORACLE", "REVERSAL", "WARD", "ECHO"].map((t) => (
            <View key={t} style={s.trickChip as any}>
              <Text style={s.trickText as any}>{t}</Text>
            </View>
          ))}
        </View>

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

        <Text style={s.fine as any}>5 rounds • round 5 ×2 • echo on 4 → ×3 • no duplicate card</Text>

        {/* class list footer */}
        <View style={s.classList as any}>
          <Text style={s.classTitle}>SEATS 01—13</Text>
          <Text style={s.classDots}>● ● ● ● ● ● ● ● ● ● ● ● ●</Text>
        </View>
      </View>

      <Pressable onPress={() => router.replace("/")} style={s.back as any}>
        <Text style={s.backText}>← BACK</Text>
      </Pressable>
      <Text style={s.foot as any}>SAMPLE 3 — DESK TAPE (rich) • Tell me “3”</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: "#0F0F0F",
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
  desk: { position: "absolute", inset: 0, opacity: 0.06 } as any,
  ruler: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    height: 18,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#DDD",
    justifyContent: "center",
    paddingHorizontal: 10,
    opacity: 0.12,
    transform: [{ skewX: "-8deg" }],
  } as any,
  rulerText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 4, color: theme.color.black } as any,
  scatter: { position: "absolute", top: "22%", left: "50%", width: 300, height: 100, marginLeft: -150, flexDirection: "row", justifyContent: "center", gap: 16, opacity: 0.18 } as any,
  miniCard: {
    width: 62,
    height: 88,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: theme.color.black,
    borderLeftWidth: 4,
    borderLeftColor: theme.color.crimson,
    alignItems: "center",
    justifyContent: "center",
  } as any,
  miniText: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 1, color: theme.color.black, fontWeight: "700" } as any,
  stain: {
    position: "absolute",
    bottom: 80,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(120,80,30,0.08)",
    borderWidth: 1,
    borderColor: "rgba(120,80,30,0.1)",
  } as any,
  paper: {
    width: "100%",
    maxWidth: 440,
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
    zIndex: 2,
  } as any,
  tape: { position: "absolute", top: -10, left: 22, width: 64, height: 12, backgroundColor: "rgba(10,10,10,0.85)", transform: [{ rotate: "-5deg" }] } as any,
  tape2: { position: "absolute", top: -10, right: 26, width: 48, height: 10, backgroundColor: theme.color.yellow, transform: [{ rotate: "4deg" }] } as any,
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", transform: [{ skewX: "3deg" }] } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2.5, color: theme.color.crimson, fontWeight: "700" } as any,
  stamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "2deg" }] } as any,
  stampText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "800" } as any,
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
  trickRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center", transform: [{ skewX: "3deg" }] } as any,
  trickChip: { backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#333" } as any,
  trickText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.yellow, fontWeight: "700" } as any,
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
  classList: { marginTop: 6, width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EAEAEA", paddingTop: 8, transform: [{ skewX: "3deg" }] } as any,
  classTitle: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.black, fontWeight: "700" } as any,
  classDots: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 3, color: theme.color.crimson } as any,
  back: { position: "absolute", bottom: 36, opacity: 0.6, zIndex: 3 } as any,
  backText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.paper } as any,
  foot: { position: "absolute", bottom: 16, fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: "#666" } as any,
});
