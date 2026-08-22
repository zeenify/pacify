import { View, Text, StyleSheet } from "react-native";
import { ScreenShell, SectionTitle, NavBar, WedgeButton, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

export default function Multiplayer() {
  return (
    <ScreenShell>
      <SectionTitle eyebrow="LOCKED" title="Multiplayer" />
      <View style={s.card}>
        <Text style={s.big}>COMING SOON</Text>
        <Text style={s.sub}>1v1 vs humans — same engine, same tricks. Leave your email and we’ll ping you.</Text>
        <View style={s.row}>
          <WedgeButton label="NOTIFY ME" variant="ghost" size="md" />
          <WedgeButton label="BACK TO MENU" onPress={() => router.replace("/menu")} size="md" />
        </View>
      </View>
      <NavBar items={[{ key: "menu", label: "MENU" }]} active="multiplayer" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.color.surface1,
    borderWidth: theme.border.thick,
    borderColor: theme.color.border,
    padding: 24,
    gap: 16,
  },
  big: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 28, letterSpacing: 2 },
  sub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: "row", gap: 12 },
});
