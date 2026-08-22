import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

const TRICKS = [
  { name: "VOID", power: "NULL", desc: "Voids everything — even opponent trick.", note: "Top priority" },
  { name: "ORACLE", power: "3", desc: "Peek 2 random hidden cards.", note: "Info, not void" },
  { name: "REVERSAL", power: "4", desc: "Swap totals AFTER scoring.", note: "Fires even on tie" },
  { name: "WARD", power: "3", desc: "Blocks trick + flat 3 pts.", note: "Loses to Void" },
  { name: "ECHO", power: "NULL", desc: "Voids this round, doubles next.", note: "R5 cap ×3" },
];

export default function HowTo() {
  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16, gap: 14 }}>
        <SectionTitle eyebrow="RULES • READ OR LOSE" title="How to Play" />

        {/* comic strip top */}
        <View style={s.strip as any}>
          <View style={s.stripPanel as any}>
            <Text style={s.stripNum}>01</Text>
            <Text style={s.stripTitle}>5 ROUNDS — SIMULTANEOUS</Text>
            <Text style={s.stripBody}>Hidden hands. One card each. Count what's unseen. Singleton: no duplicate card in a match.</Text>
            <View style={s.tagRow as any}><View style={s.tag as any}><Text style={s.tagText}>30% TRICK DRAW</Text></View></View>
          </View>
          <View style={s.stripPanel as any}>
            <Text style={s.stripNum}>02</Text>
            <Text style={s.stripTitle}>SCORE THE DIFF — IF IT COUNTS</Text>
            <Text style={s.stripBody}>Higher power wins <Text style={s.mono}>winner − loser</Text> only if alignments differ (good vs bad). Same side → 0. Tricks neutral, always score. Tie 0. Round 5 ×2.</Text>
          </View>
          <View style={[s.stripPanel as any, { backgroundColor: theme.color.paper, borderColor: theme.color.crimson } as any]}>
            <Text style={[s.stripNum as any, { color: theme.color.crimson } as any]}>03</Text>
            <Text style={[s.stripTitle as any, { color: theme.color.black } as any]}>TRICKS — 5 WAYS TO LIE</Text>
            <Text style={[s.stripBody as any, { color: "#333" } as any]}>Priority: Void → Ward → rest (both fire). See below — this is the whole game.</Text>
          </View>
        </View>

        {/* tricks as collectible cards */}
        <View style={s.trickGrid as any}>
          {TRICKS.map((t) => (
            <View key={t.name} style={s.trickCard as any}>
              <View style={s.trickHeader as any}>
                <Text style={s.trickName}>{t.name}</Text>
                <View style={s.powerBox as any}><Text style={s.powerText}>{t.power}</Text></View>
              </View>
              <Text style={s.trickDesc}>{t.desc}</Text>
              <View style={s.trickNote as any}><Text style={s.trickNoteText}>{t.note}</Text></View>
            </View>
          ))}
        </View>

        <View style={s.footer as any}>
          <Text style={s.footerTitle}>PRIORITY & CAPS</Text>
          <Text style={s.footerBody}>Void null top void even beats opponent trick. Ward blocks trick + flat 3. Reversal 4 swaps totals after scoring (even on tie). Echo null voids current 0 pts then doubles next — if Echo on Round 4 and R5, capped ×3 not ×4.</Text>
        </View>
      </ScrollView>
      <NavBar items={[{ key: "menu", label: "MENU" }, { key: "howto", label: "HOW TO PLAY" }]} active="howto" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: "row", gap: 10, flexWrap: "wrap" } as any,
  stripPanel: {
    flex: 1,
    minWidth: 180,
    backgroundColor: theme.color.ink,
    borderWidth: 2,
    borderColor: theme.color.paper,
    padding: 12,
    gap: 6,
    transform: [{ skewX: `${theme.skew * 0.4}deg` }],
  } as any,
  stripNum: { color: theme.color.crimson, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 2, fontWeight: "800", transform: [{ skewX: `${-theme.skew * 0.4}deg` }] } as any,
  stripTitle: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 12, letterSpacing: 1, transform: [{ skewX: `${-theme.skew * 0.4}deg` }] } as any,
  stripBody: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, lineHeight: 14 as any, transform: [{ skewX: `${-theme.skew * 0.4}deg` }] } as any,
  mono: { fontFamily: theme.font.mono, color: theme.color.paper } as any,
  tagRow: { marginTop: 6 } as any,
  tag: { backgroundColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", borderWidth: 1, borderColor: theme.color.paper } as any,
  tagText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1.5 } as any,

  trickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 } as any,
  trickCard: {
    width: 150,
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    padding: 10,
    gap: 6,
  } as any,
  trickHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any,
  trickName: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 13, letterSpacing: 1 } as any,
  powerBox: { backgroundColor: theme.color.black, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: theme.color.crimson } as any,
  powerText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 10, fontWeight: "800" } as any,
  trickDesc: { color: "#222", fontFamily: theme.font.mono, fontSize: 10, lineHeight: 13 as any } as any,
  trickNote: { backgroundColor: theme.color.black, paddingHorizontal: 6, paddingVertical: 3, alignSelf: "flex-start" } as any,
  trickNoteText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1 } as any,

  footer: { backgroundColor: theme.color.black, borderWidth: 2, borderColor: theme.color.paper, padding: 12, gap: 6 } as any,
  footerTitle: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2 } as any,
  footerBody: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, lineHeight: 14 as any } as any,
});
