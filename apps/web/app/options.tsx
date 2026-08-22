import { View, Text, StyleSheet } from "react-native";
import { ScreenShell, SectionTitle, BentoTile, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

export default function Options() {
  return (
    <ScreenShell>
      <SectionTitle eyebrow="CONFIG" title="Options" />
      <View style={s.grid}>
        <BentoTile span={1} tone="dark">
          <Text style={s.label}>BGM</Text>
          <Text style={s.value}>80%</Text>
        </BentoTile>
        <BentoTile span={1} tone="dark">
          <Text style={s.label}>SFX (select.mp3)</Text>
          <Text style={s.value}>On</Text>
        </BentoTile>
        <BentoTile span={1} tone="dark">
          <Text style={s.label}>TEXT SPEED</Text>
          <Text style={s.value}>Fast</Text>
        </BentoTile>
        <BentoTile span={1} tone="paper">
          <Text style={[s.label, { color: theme.color.black }]}>REDUCED MOTION</Text>
          <Text style={[s.value, { color: theme.color.black }]}>Off</Text>
        </BentoTile>
      </View>
      <NavBar items={[{ key: "menu", label: "MENU" }]} active="options" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  label: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 2 },
  value: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 16, marginTop: 6 },
});
