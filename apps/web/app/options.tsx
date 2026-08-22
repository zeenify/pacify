import { View, Text, StyleSheet } from "react-native";
import { ScreenShell, SectionTitle, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

const ROWS = [
  { label: "BGM", value: "80%", desc: "Classroom hum" },
  { label: "SFX — select.mp3", value: "ON", desc: "Hover : personadle" },
  { label: "TEXT SPEED", value: "FAST", desc: "P5 snap" },
  { label: "REDUCED MOTION", value: "OFF", desc: "Keep the slam" },
];

export default function Options() {
  return (
    <ScreenShell>
      <SectionTitle eyebrow="CONFIG • DESK DRAWER" title="Options" />
      <View style={s.board as any}>
        <View style={s.boardHach as any} />
        <View style={s.grid as any}>
          {ROWS.map((r) => (
            <View key={r.label} style={s.card as any}>
              <View style={s.cardTop as any}>
                <Text style={s.label as any}>{r.label}</Text>
                <View style={s.valueBox as any}><Text style={s.value as any}>{r.value}</Text></View>
              </View>
              <Text style={s.desc as any}>{r.desc}</Text>
              <View style={s.slider as any}><View style={[s.sliderFill as any, { width: r.value.includes("%") ? r.value : "45%" }]} /></View>
            </View>
          ))}
        </View>
        <Text style={s.foot as any}>* Changes save to device. No cloud yet — don't wipe.</Text>
      </View>
      <NavBar items={[{ key: "menu", label: "MENU" }, { key: "options", label: "OPTIONS" }]} active="options" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  board: { backgroundColor: "rgba(250,250,245,0.06)", borderWidth: 2, borderColor: "rgba(250,250,245,0.18)", padding: 12, gap: 12 } as any,
  boardHach: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: theme.color.paper, opacity: 0.08 } as any,
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as any,
  card: {
    width: 170,
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    padding: 11,
    gap: 6,
  } as any,
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any,
  label: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.5, fontWeight: "800" } as any,
  valueBox: { backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.color.crimson } as any,
  value: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 10, fontWeight: "800" } as any,
  desc: { color: "#555", fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 0.6 } as any,
  slider: { height: 6, backgroundColor: theme.color.surface3, borderWidth: 1, borderColor: theme.color.black, overflow: "hidden" } as any,
  sliderFill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  foot: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1, textAlign: "center" } as any,
});
