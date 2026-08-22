import { View, Text, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { RansomTitle, PressStartHint } from "@pacify/ui-kit";

export default function Title() {
  return (
    <View style={s.root}>
      {/* diagonal crimson slash band */}
      <View style={s.slashBand as any} pointerEvents="none" />
      <View style={s.slashBand2 as any} pointerEvents="none" />
      {/* halftone phantom starbursts */}
      <View style={s.burst as any} pointerEvents="none" />
      <View style={s.burst2 as any} pointerEvents="none" />
      <View style={s.halftone as any} pointerEvents="none" />
      {/* grain */}
      {Platform.OS === "web" ? <View style={s.grain as any} pointerEvents="none" /> : null}

      {/* top HUD */}
      <View style={s.topBar as any}>
        <View style={s.topChip as any}>
          <Text style={s.topChipText}>REBELLION // VER 0.1</Text>
        </View>
        <View style={s.topRight as any}>
          <Text style={s.topMeta}>13 SEATS • 5 ROUNDS • 1 LIAR</Text>
        </View>
      </View>

      {/* center stack */}
      <View style={s.center as any}>
        <View
          style={
            Platform.OS === "web"
              ? ({ animation: "p5-entrance-unskew 520ms cubic-bezier(0.16,1,0.3,1)" } as any)
              : undefined
          }
        >
          <RansomTitle text="PACIFY" size={96} />
        </View>

        <View style={s.slashRow as any}>
          <View style={s.slash as any} />
          <View style={s.diamond as any} />
          <Text style={s.subtitle}>SLOW-BURN PSYCHOLOGICAL WAR</Text>
        </View>

        <Text style={s.tagline}>a class war · 13 students await · mind the tricks</Text>

        <View style={{ marginTop: 26 }}>
          <PressStartHint label="PRESS START" onPress={() => router.replace("/menu")} />
        </View>
      </View>

      {/* bottom tape + credit */}
      <View style={s.bottom as any}>
        <View style={s.tape as any} />
        <Text style={s.credit}>PACIFY — PSYCHOLOGICAL CARD WAR · NO SAVE CORRUPTION · HARD FROM SEAT 01</Text>
      </View>

      {/* corner hachure */}
      <View style={s.cornerHach as any} pointerEvents="none" />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 24,
  } as any,
  slashBand: {
    position: "absolute",
    top: 88,
    left: -80,
    right: -80,
    height: 92,
    backgroundColor: theme.color.crimson,
    transform: [{ rotate: "-6deg" }],
    opacity: 0.92,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderColor: theme.color.paper,
  } as any,
  slashBand2: {
    position: "absolute",
    top: 196,
    left: -80,
    right: -80,
    height: 14,
    backgroundColor: theme.color.paper,
    transform: [{ rotate: "-6deg" }],
    opacity: 0.95,
  } as any,
  burst: {
    position: "absolute",
    width: 680,
    height: 680,
    borderRadius: 340,
    top: -260,
    right: -240,
    backgroundColor: "rgba(212,0,0,0.10)",
    borderWidth: 26,
    borderColor: "rgba(212,0,0,0.14)",
    opacity: 0.9,
  } as any,
  burst2: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    bottom: -140,
    left: -120,
    backgroundColor: "rgba(250,250,245,0.06)",
    borderWidth: 16,
    borderColor: "rgba(250,250,245,0.08)",
  } as any,
  halftone: {
    position: "absolute",
    inset: 0,
    opacity: 0.18,
    // web gets CSS radial halftone via ThemeProvider, native fallback is faint
  } as any,
  grain: { position: "absolute", inset: 0, opacity: 0.06 } as any,
  topBar: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as any,
  topChip: {
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  topChipText: {
    color: theme.color.black,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "800",
    transform: [{ skewX: `${-theme.skew}deg` }],
  } as any,
  topRight: {
    backgroundColor: theme.color.black,
    borderWidth: 1.5,
    borderColor: theme.color.borderStrong,
    paddingHorizontal: 8,
    paddingVertical: 3,
  } as any,
  topMeta: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.5 } as any,
  center: { alignItems: "center", gap: 14, zIndex: 1, marginTop: 24 } as any,
  slashRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 } as any,
  slash: { width: 84, height: 6, backgroundColor: theme.color.paper, transform: [{ skewX: `${theme.skew}deg` }] } as any,
  diamond: { width: 10, height: 10, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
  subtitle: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 11, letterSpacing: 5, fontWeight: "800" } as any,
  tagline: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 2,
  } as any,
  bottom: { position: "absolute", bottom: 22, left: 18, right: 18, alignItems: "center", gap: 8 } as any,
  tape: { width: 120, height: 10, backgroundColor: "rgba(250,250,245,0.85)", transform: [{ rotate: "-2deg" }], borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" } as any,
  credit: {
    color: "rgba(250,250,245,0.42)",
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
    textAlign: "center",
  } as any,
  cornerHach: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 180,
    height: 18,
    backgroundColor: "rgba(250,250,245,0.08)",
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
});
