import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, StatBlock, BentoTile, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

export default function Profile() {
  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle eyebrow="YOU" title="Profile" />
        <View style={s.statsRow}>
          <BentoTile span={1} tone="dark">
            <StatBlock label="WINS" value="6" />
            <StatBlock label="LOSSES" value="44" />
            <StatBlock label="DRAWS" value="1" />
          </BentoTile>
          <BentoTile span={1} tone="dark">
            <Text style={s.label}>PLAYSTYLE</Text>
            <Text style={s.playstyle}>saves tricks late · risky · high-early 22%</Text>
          </BentoTile>
          <BentoTile span={1} tone="paper">
            <Text style={[s.label, { color: theme.color.black }]}>STREAK</Text>
            <Text style={[s.big, { color: theme.color.black }]}>W2</Text>
          </BentoTile>
        </View>
        <View style={s.perStudent}>
          <Text style={s.sectionLabel}>PER-STUDENT</Text>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={s.row}>
              <Text style={s.rowName}>STUDENT {i + 1}</Text>
              <Text style={s.rowMeta}>attempts {i === 0 ? 5 : 0} · wins {i === 0 ? 1 : 0}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <NavBar items={[{ key: "menu", label: "MENU" }]} active="profile" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 12 },
  label: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2 },
  big: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 28, marginTop: 4 },
  playstyle: {
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  perStudent: { marginTop: 24 },
  sectionLabel: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  rowName: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 13 },
  rowMeta: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 11 },
});
