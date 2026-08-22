import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, BentoTile, LabelChip, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

const NAV = [
  { key: "campaign", label: "CAMPAIGN" },
  { key: "dossier", label: "DOSSIER" },
  { key: "shame", label: "HALL OF SHAME" },
  { key: "profile", label: "PROFILE" },
];

export default function Dossier() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <SectionTitle eyebrow="INTEL" title="Dossier" />
        <View style={s.grid}>
          {Array.from({ length: 13 }, (_, i) => (
            <BentoTile key={i} span={1} tone="dark" locked={i > 1}>
              <LabelChip label={`STUDENT ${i + 1}`} />
              <Text style={s.name}>{`Seat ${i + 1}`}</Text>
              <Text style={s.meta}>Attempts 0 · Best 0</Text>
              <Text style={s.lore} numberOfLines={2}>
                {i === 0 ? "Baseline brutal. Holds tricks for Round 5." : "Intel unlocks after you fight."}
              </Text>
            </BentoTile>
          ))}
        </View>
      </ScrollView>
      <NavBar
        items={[
          { key: "menu", label: "MENU" },
          { key: "campaign", label: "CAMPAIGN" },
          { key: "dossier", label: "DOSSIER" },
        ]}
        active="dossier"
        onSelect={(k) => router.push(`/${k}`)}
      />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  name: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 14, marginTop: 8 },
  meta: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, marginTop: 4 },
  lore: { color: theme.color.paperDim, fontFamily: theme.font.body as any, fontSize: 11, marginTop: 8, lineHeight: 16 },
});
