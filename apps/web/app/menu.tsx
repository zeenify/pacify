import { View, Text, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenShell, WedgeButton, NavBar, theme } from "@pacify/ui-kit";

const NAV = [
  { key: "menu", label: "MENU" },
  { key: "campaign", label: "CAMPAIGN" },
  { key: "dossier", label: "DOSSIER" },
  { key: "shame", label: "HALL OF SHAME" },
  { key: "profile", label: "PROFILE" },
  { key: "howto", label: "HOW TO PLAY" },
  { key: "multiplayer", label: "MULTIPLAYER", locked: true },
  { key: "options", label: "OPTIONS" },
];

export default function Menu() {
  return (
    <ScreenShell>
      <View style={s.root as any}>
        {/* LEFT — slashed P5 menu stack */}
        <View style={s.left as any}>
          <View style={s.leftHeader as any}>
            <View style={s.chipRow as any}>
              <View style={s.crimsonChip as any}>
                <Text style={s.crimsonChipText}>REBELLION</Text>
              </View>
              <Text style={s.version}>PACIFY // BUILD 0.1 • HARD FROM 01</Text>
            </View>
            <Text style={s.title}>SELECT</Text>
            <Text style={s.titleOutline}>SELECT</Text>
            <View style={s.slashRow as any}>
              <View style={s.slash as any} />
              <Text style={s.slashText}>CHOOSE YOUR POISON</Text>
            </View>
          </View>

          <View style={s.stack as any}>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 60ms both" } as any) : undefined}>
              <WedgeButton indexLabel="01" label="CAMPAIGN" sub="face all 13 • hard from the start" size="hero" onPress={() => router.push("/campaign")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 120ms both" } as any) : undefined}>
              <WedgeButton indexLabel="02" label="DOSSIER" sub="psych profiles • trick tells" variant="ghost" onPress={() => router.push("/dossier")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 180ms both" } as any) : undefined}>
              <WedgeButton indexLabel="03" label="HALL OF SHAME" sub="your worst losses, framed" variant="ghost" onPress={() => router.push("/shame")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 240ms both" } as any) : undefined}>
              <WedgeButton label="MULTIPLAYER" variant="locked" />
            </View>
          </View>

          <View style={s.utilRow as any}>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 300ms both" } as any) : undefined}>
              <WedgeButton label="PROFILE" size="md" variant="ghost" onPress={() => router.push("/profile")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 360ms both" } as any) : undefined}>
              <WedgeButton label="HOW TO PLAY" size="md" variant="ghost" onPress={() => router.push("/howto")} />
            </View>
            <View style={Platform.OS === "web" ? ({ animation: "p5-entrance 380ms 420ms both" } as any) : undefined}>
              <WedgeButton label="OPTIONS" size="md" variant="ghost" onPress={() => router.push("/options")} />
            </View>
          </View>
        </View>

        {/* RIGHT — preview comic card, not bento hero */}
        <View style={s.right as any}>
          <View style={s.previewFrame as any}>
            <View style={s.previewHach as any} />
            <View style={s.tape as any} />
            <View style={s.tape2 as any} />
            {/* polaroid */}
            <View style={s.polaroid as any}>
              <View style={s.polaroidImg as any}>
                <Text style={s.polaroidPlaceholder}>CONFRONT</Text>
                <Text style={s.polaroidSub}>STUDENT FILE // CLASSIFIED</Text>
              </View>
              <View style={s.polaroidFoot as any}>
                <Text style={s.polaroidCaption}>13 SEATS • ONE ROOM • NO MERCY</Text>
                <View style={s.stamp as any}>
                  <Text style={s.stampText}>TOP SECRET</Text>
                </View>
              </View>
            </View>

            <View style={s.previewCopy as any}>
              <Text style={s.previewEyebrow}>SLOW-BURN PSYCHOLOGICAL WAR</Text>
              <Text style={s.previewTitle}>PACIFY</Text>
              <Text style={s.previewBody}>
                5 rounds. one card each. tricks void, peek, swap, ward, echo. learn them faster than they learn you.
              </Text>
              <View style={s.statRow as any}>
                <View style={s.statBox as any}>
                  <Text style={s.statLabel}>STUDENTS</Text>
                  <Text style={s.statValue}>13</Text>
                </View>
                <View style={s.statBox as any}>
                  <Text style={s.statLabel}>COINS</Text>
                  <Text style={s.statValue}>—</Text>
                </View>
                <View style={[s.statBox as any, { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any]}>
                  <Text style={[s.statLabel as any, { color: theme.color.paper } as any]}>DIFFICULTY</Text>
                  <Text style={[s.statValue as any, { color: theme.color.paper } as any]}>HARD</Text>
                </View>
              </View>
            </View>
          </View>

          {/* bottom tape tag */}
          <View style={s.rightFoot as any}>
            <Text style={s.rightFootText}>TIP: SAVE TRICKS FOR ROUND 5 — IT'S DOUBLE. ECHO MAKES IT TRIPLE.</Text>
          </View>
        </View>
      </View>

      <NavBar items={NAV} active="menu" onSelect={(k) => k !== "menu" && router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", gap: 18 } as any,
  left: { flex: 9, gap: 16, justifyContent: "center" } as any,
  leftHeader: { gap: 6, marginBottom: 4 } as any,
  chipRow: { flexDirection: "row", alignItems: "center", gap: 10 } as any,
  crimsonChip: {
    backgroundColor: theme.color.crimson,
    borderWidth: 2,
    borderColor: theme.color.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  crimsonChipText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2, fontWeight: "800", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  version: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.4 } as any,
  title: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 46,
    letterSpacing: 3,
    lineHeight: 44 as any,
  } as any,
  titleOutline: {
    color: "transparent",
    position: "absolute",
    top: 24,
    left: 3,
    fontFamily: theme.font.display,
    fontSize: 46,
    letterSpacing: 3,
    // outline via webkit text stroke on web fallback
  } as any,
  slashRow: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  slash: { width: 72, height: 5, backgroundColor: theme.color.crimson, transform: [{ skewX: `${theme.skew}deg` }] } as any,
  slashText: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2, fontWeight: "800" } as any,
  stack: { gap: 10 } as any,
  utilRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" } as any,

  right: { flex: 11, gap: 10, justifyContent: "center" } as any,
  previewFrame: {
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    padding: 12,
    gap: 12,
    transform: [{ rotate: "0.4deg" }],
    // hard shadow via outer margin
    marginRight: 6,
    marginBottom: 6,
  } as any,
  previewHach: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: theme.color.crimson,
    opacity: 0.9,
  } as any,
  tape: { position: "absolute", top: -8, left: 18, width: 56, height: 14, backgroundColor: "rgba(17,17,17,0.85)", transform: [{ rotate: "-6deg" }], zIndex: 2 } as any,
  tape2: { position: "absolute", top: -8, right: 22, width: 44, height: 12, backgroundColor: "rgba(212,0,0,0.9)", transform: [{ rotate: "5deg" }], zIndex: 2 } as any,
  polaroid: { backgroundColor: theme.color.black, borderWidth: 2, borderColor: theme.color.black, padding: 8, paddingBottom: 12, transform: [{ rotate: "-0.6deg" }] } as any,
  polaroidImg: {
    height: 148,
    backgroundColor: theme.color.surface2,
    borderWidth: 2,
    borderColor: theme.color.paper,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  } as any,
  polaroidPlaceholder: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 22, letterSpacing: 4 } as any,
  polaroidSub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2 } as any,
  polaroidFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 } as any,
  polaroidCaption: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.5 } as any,
  stamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: "3deg" }] } as any,
  stampText: { color: theme.color.crimson, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 2, fontWeight: "800" } as any,
  previewCopy: { gap: 6 } as any,
  previewEyebrow: { color: theme.color.crimson, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 3, fontWeight: "800" } as any,
  previewTitle: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 26, letterSpacing: 2, lineHeight: 26 as any } as any,
  previewBody: { color: "#333", fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 0.6, lineHeight: 15 as any } as any,
  statRow: { flexDirection: "row", gap: 8, marginTop: 4 } as any,
  statBox: {
    flex: 1,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 8,
    paddingVertical: 6,
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  statLabel: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1.5, fontWeight: "800", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  statValue: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 16, letterSpacing: 1, transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  rightFoot: { backgroundColor: theme.color.black, borderWidth: 1.5, borderColor: theme.color.borderStrong, paddingHorizontal: 10, paddingVertical: 6, transform: [{ skewX: `${theme.skew}deg` }] } as any,
  rightFootText: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1.5, transform: [{ skewX: `${-theme.skew}deg` }] } as any,
});
