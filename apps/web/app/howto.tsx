import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, BentoTile, LabelChip, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

export default function HowTo() {
  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <SectionTitle eyebrow="RULES" title="How to Play" />
        <View style={s.grid}>
          <BentoTile span={1} tone="dark">
            <LabelChip label="5 ROUNDS" />
            <Text style={s.h}>One card per round, simultaneous reveal.</Text>
            <Text style={s.p}>
              5-card hands, singleton (no duplicate card in a match). Tricks at 30% draw (≈1–2 per hand).
              Hidden hands — count what’s still unseen.
            </Text>
          </BentoTile>
          <BentoTile span={1} tone="dark">
            <LabelChip label="SCORING" />
            <Text style={s.h}>Higher power wins the diff — unless…</Text>
            <Text style={s.p}>
              Winner gets <Text style={s.mono}>winner − loser</Text> pts only if alignments differ (good vs bad). Same
              good/bad → 0 even if higher. Tricks are neutral, always score. Tie → 0. Round 5 ×2 (Echo on 4 → next is
              ×3 cap, not ×4).
            </Text>
          </BentoTile>
          <BentoTile span={1} tone="crimson">
            <LabelChip label="TRICKS" tone="paper" />
            <Text style={[s.h, { color: theme.color.paper }]}>5 tricks, 5 powers</Text>
            <Text style={[s.p, { color: theme.color.paper, opacity: 0.9 }]}>
              Void null — voids everything (top prio){"\n"}Oracle 3 — peek 2{"\n"}Reversal 4 — swap totals after
              scoring{"\n"}Ward 3 — blocks trick + flat 3{"\n"}Echo null — voids this, doubles next
            </Text>
          </BentoTile>
          <BentoTile span={1} tone="paper">
            <Text style={[s.h, { color: theme.color.black }]}>Priority</Text>
            <Text style={[s.p, { color: theme.color.black }]}>Void → Ward → rest (both fire). See SPEC §2.1.</Text>
          </BentoTile>
        </View>
      </ScrollView>
      <NavBar items={[{ key: "menu", label: "MENU" }]} active="howto" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  h: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 14, marginTop: 10 },
  p: {
    color: theme.color.paperDim,
    fontFamily: theme.font.body as any,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  mono: { fontFamily: theme.font.mono, color: theme.color.paper },
});
