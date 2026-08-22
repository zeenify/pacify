import { View, Text, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenShell, WedgeButton, theme } from "@pacify/ui-kit";

export default function Menu() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Text style={s.mark as any}>PAC<Text style={{ color: theme.color.crimson } as any}>I</Text>FY</Text>
        <View style={s.tag as any}>
          <Text style={s.tagText}>SELECT // CHOOSE YOUR POISON</Text>
        </View>
      </View>

      <View style={s.hero as any}>
        <View style={s.heroLeft as any}>
          <Text style={[s.kicker as any, Platform.OS === "web" && ({ animation: "heroIn 560ms 120ms both" } as any)]}>REBELLION // BUILD 0.1</Text>
          <Text style={[s.title as any, Platform.OS === "web" && ({ animation: "heroIn 620ms 200ms both" } as any)]}>SELECT</Text>
          <Text style={s.subtitle as any}>13 seats. hard from 01. no tutorials.</Text>

          <View style={s.stack as any}>
            <View style={Platform.OS === "web" ? ({ animation: "rowIn 620ms 90ms both" } as any) : undefined}>
              <WedgeButton indexLabel="01" label="CAMPAIGN" sub="face all 13 • ladder" size="hero" onPress={() => router.push("/campaign")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "rowIn 620ms 180ms both" } as any) : undefined}>
              <WedgeButton indexLabel="02" label="DOSSIER" sub="psych profiles • tells" variant="ghost" onPress={() => router.push("/dossier")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "rowIn 620ms 270ms both" } as any) : undefined}>
              <WedgeButton indexLabel="03" label="HALL OF SHAME" sub="your worst losses, framed" variant="ghost" onPress={() => router.push("/shame")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "rowIn 620ms 360ms both" } as any) : undefined}>
              <WedgeButton label="MULTIPLAYER" variant="locked" />
            </View>
          </View>

          <View style={s.utilRow as any}>
            <WedgeButton label="PROFILE" size="md" variant="ghost" onPress={() => router.push("/profile")} />
            <WedgeButton label="HOW TO PLAY" size="md" variant="ghost" onPress={() => router.push("/howto")} />
            <WedgeButton label="OPTIONS" size="md" variant="ghost" onPress={() => router.push("/options")} />
          </View>
        </View>

        <View style={s.heroRight as any}>
          <View style={[s.preview as any, Platform.OS === "web" && ({ animation: "jokerIn 680ms 380ms both" } as any)]}>
            <View style={s.previewTop as any}>
              <Text style={s.previewKicker}>CLASSIFIED</Text>
              <View style={s.previewStamp as any}>
                <Text style={s.previewStampText}>TOP SECRET</Text>
              </View>
            </View>
            <Text style={s.previewTitle}>PACIFY</Text>
            <Text style={s.previewBody}>5 rounds. one card each. tricks void, peek, swap, ward, echo. learn them faster than they learn you.</Text>
            <View style={s.previewStats as any}>
              <View style={s.pStat as any}>
                <Text style={s.pStatVal}>13</Text>
                <Text style={s.pStatLabel}>STUDENTS</Text>
              </View>
              <View style={s.pStat as any}>
                <Text style={s.pStatVal}>HARD</Text>
                <Text style={s.pStatLabel}>FROM 01</Text>
              </View>
              <View style={s.pStat as any}>
                <Text style={s.pStatVal}>×2</Text>
                <Text style={s.pStatLabel}>ROUND 5</Text>
              </View>
            </View>
          </View>
          <Text style={s.tip as any}>TIP: SAVE TRICKS FOR ROUND 5 — ECHO MAKES IT TRIPLE.</Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: theme.color.crimson,
    backgroundColor: "rgba(10,10,10,0.85)",
    marginHorizontal: -28,
    marginTop: -22,
    marginBottom: 18,
  } as any,
  mark: { fontFamily: theme.font.display, fontSize: 24, color: theme.color.paper, letterSpacing: 1, transform: [{ skewX: "-8deg" }] } as any,
  tag: { marginLeft: "auto", borderWidth: 1, borderColor: theme.color.yellow, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  tagText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.yellow } as any,
  hero: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 24, alignItems: "center" } as any,
  heroLeft: { flex: 1, minWidth: 340, gap: 12 } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 5, color: theme.color.yellow } as any,
  title: {
    fontFamily: theme.font.display,
    fontSize: 56,
    color: theme.color.paper,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 6, height: 6 },
    textShadowRadius: 0,
    lineHeight: 52 as any,
  } as any,
  subtitle: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 1, color: theme.color.paperDim, marginTop: -6 } as any,
  stack: { gap: 10, marginTop: 8 } as any,
  utilRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 } as any,
  heroRight: { flex: 1, minWidth: 320, gap: 12, alignItems: "flex-end" } as any,
  preview: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 18,
    gap: 8,
    transform: [{ skewX: "-3deg" }],
  } as any,
  previewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  previewKicker: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.crimson, fontWeight: "700" } as any,
  previewStamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: "3deg" }] } as any,
  previewStampText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.crimson, fontWeight: "700" } as any,
  previewTitle: { fontFamily: theme.font.display, fontSize: 28, color: theme.color.black, transform: [{ skewX: "3deg" }] } as any,
  previewBody: { fontFamily: theme.font.body, fontSize: 13, lineHeight: 18 as any, color: "#333", transform: [{ skewX: "3deg" }] } as any,
  previewStats: { flexDirection: "row", gap: 12, marginTop: 8, transform: [{ skewX: "3deg" }] } as any,
  pStat: { flex: 1, backgroundColor: theme.color.black, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: theme.color.crimson } as any,
  pStatVal: { fontFamily: theme.font.display, fontSize: 16, color: theme.color.paper } as any,
  pStatLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.yellow } as any,
  tip: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: theme.color.paperDim, textAlign: "right" } as any,
});
