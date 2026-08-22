import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import {
  ScreenShell,
  WedgeButton,
  NavBar,
  LabelChip,
  StatBlock,
  theme,
} from "@pacify/ui-kit";

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
      <View style={s.root}>
        {/* Hero panel — crimson, left 55% */}
        <View style={s.hero}>
          <View style={s.heroInner}>
            <LabelChip label="SLOW-BURN PSYCHOLOGICAL WAR" />
            <Text style={s.logo}>PACIFY</Text>
            <View style={s.slash} />
            <Text style={s.heroSub}>13 students. one card each round.{"\n"}mind the tricks.</Text>
          </View>
          <View style={s.halftone} />
        </View>

        {/* Menu stack — right */}
        <View style={s.stack}>
          <WedgeButton label="CAMPAIGN" sub="face all 13" size="hero" onPress={() => router.push("/campaign")} />
          <WedgeButton label="DOSSIER" variant="ghost" onPress={() => router.push("/dossier")} />
          <WedgeButton label="HALL OF SHAME" variant="ghost" onPress={() => router.push("/shame")} />
          <WedgeButton label="MULTIPLAYER" variant="locked" />
          <View style={s.row}>
            <WedgeButton label="PROFILE" size="md" onPress={() => router.push("/profile")} />
            <WedgeButton label="HOW TO PLAY" size="md" onPress={() => router.push("/howto")} />
            <WedgeButton label="OPTIONS" size="md" onPress={() => router.push("/options")} />
          </View>
          <View style={s.userRow}>
            <StatBlock label="PLAYER" value="GUEST" />
            <StatBlock label="COINS" value="0" tone="crimson" />
          </View>
        </View>
      </View>
      <NavBar items={NAV} active="menu" onSelect={(k) => k !== "menu" && router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", gap: theme.space.xl },
  hero: {
    flex: 11,
    backgroundColor: theme.color.crimson,
    borderWidth: theme.border.thick,
    borderColor: theme.color.paper,
    justifyContent: "center",
    overflow: "hidden",
  },
  heroInner: { paddingHorizontal: theme.space.xl, gap: 10 },
  logo: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 72,
    letterSpacing: 4,
  },
  slash: { width: 160, height: 5, backgroundColor: theme.color.paper, transform: [{ rotate: "-2deg" }] },
  heroSub: {
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    opacity: 0.85,
    lineHeight: 18,
  },
  halftone: {
    position: "absolute",
    right: -60,
    bottom: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 24,
    borderColor: "rgba(17,17,17,0.25)",
  },
  stack: {
    flex: 9,
    gap: 10,
    justifyContent: "center",
  },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  userRow: {
    flexDirection: "row",
    gap: 32,
    marginTop: theme.space.md,
    paddingTop: theme.space.md,
    borderTopWidth: theme.border.thin,
    borderTopColor: theme.color.border,
  },
});
