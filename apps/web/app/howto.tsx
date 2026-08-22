import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

const TRICKS = [
  { name: "VOID", power: "NULL", desc: "Voids everything — even opponent trick.", note: "TOP" },
  { name: "ORACLE", power: "3", desc: "Peek 2 random hidden cards.", note: "INFO" },
  { name: "REVERSAL", power: "4", desc: "Swap totals AFTER scoring.", note: "SWAP" },
  { name: "WARD", power: "3", desc: "Blocks trick + flat 3 pts.", note: "GUARD" },
  { name: "ECHO", power: "NULL", desc: "Voids this, doubles next.", note: "ECHO" },
];

export default function HowTo() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>HOW TO PLAY</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
        <View style={s.header as any}>
          <Text style={s.kicker as any}>RULES • READ OR LOSE</Text>
          <Text style={s.title as any}>LEARN THE LIE</Text>
        </View>

        <View style={s.stripRow as any}>
          <View style={s.stripCard as any}>
            <Text style={s.stripNum as any}>01</Text>
            <Text style={s.stripTitle as any}>5 ROUNDS — SIMULTANEOUS</Text>
            <Text style={s.stripBody as any}>Hidden hands. One card each. Singleton: no duplicate card in a match.</Text>
            <View style={s.tag as any}>
              <Text style={s.tagText}>30% TRICK DRAW</Text>
            </View>
          </View>
          <View style={s.stripCard as any}>
            <Text style={s.stripNum as any}>02</Text>
            <Text style={s.stripTitle as any}>SCORE THE DIFF</Text>
            <Text style={s.stripBody as any}>Higher wins winner − loser only if good vs bad. Same side → 0. Tricks neutral always score. Tie 0. R5 ×2.</Text>
          </View>
          <View style={[s.stripCard as any, { backgroundColor: theme.color.paper, borderColor: theme.color.crimson } as any]}>
            <Text style={[s.stripNum as any, { color: theme.color.crimson } as any]}>03</Text>
            <Text style={[s.stripTitle as any, { color: theme.color.black } as any]}>TRICKS — 5 WAYS TO LIE</Text>
            <Text style={[s.stripBody as any, { color: "#333" } as any]}>Void → Ward → rest (both fire). See below.</Text>
          </View>
        </View>

        <View style={s.trickGrid as any}>
          {TRICKS.map((t) => (
            <View key={t.name} style={s.trick as any}>
              <View style={s.trickTop as any}>
                <Text style={s.trickName as any}>{t.name}</Text>
                <View style={s.power as any}>
                  <Text style={s.powerText}>{t.power}</Text>
                </View>
              </View>
              <Text style={s.trickDesc as any}>{t.desc}</Text>
              <View style={s.note as any}>
                <Text style={s.noteText}>{t.note}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.footer as any}>
          <Text style={s.footerTitle as any}>PRIORITY & CAPS</Text>
          <Text style={s.footerBody as any}>Void top voids even opponent. Ward blocks + flat 3. Reversal 4 swaps after scoring even on tie. Echo voids current 0 then doubles next — Echo on 4 + R5 capped ×3 not ×4.</Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: theme.color.crimson,
    backgroundColor: "rgba(10,10,10,0.85)",
    marginHorizontal: -28,
    marginTop: -22,
    paddingHorizontal: 28,
    marginBottom: 18,
  } as any,
  back: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.yellow, borderWidth: 1, borderColor: theme.color.yellow, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  mark: { fontFamily: theme.font.display, fontSize: 18, letterSpacing: 1, color: theme.color.paper, transform: [{ skewX: "-8deg" }] } as any,
  header: { gap: 6 } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 5, color: theme.color.yellow } as any,
  title: {
    fontFamily: theme.font.display,
    fontSize: 42,
    color: theme.color.paper,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 6, height: 6 },
    textShadowRadius: 0,
  } as any,
  stripRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" } as any,
  stripCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "rgba(16,16,16,0.96)",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 14,
    gap: 6,
    transform: [{ skewX: "-3deg" }],
  } as any,
  stripNum: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.crimson, fontWeight: "700", transform: [{ skewX: "3deg" }] } as any,
  stripTitle: { fontFamily: theme.font.display, fontSize: 13, color: theme.color.paper, transform: [{ skewX: "3deg" }] } as any,
  stripBody: { fontFamily: theme.font.body, fontSize: 11, lineHeight: 14 as any, color: "#CCC", transform: [{ skewX: "3deg" }] } as any,
  tag: { backgroundColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", borderWidth: 1, borderColor: theme.color.paper, transform: [{ skewX: "3deg" }] } as any,
  tagText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.paper } as any,
  trickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 } as any,
  trick: {
    width: 148,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#DDD",
    borderLeftWidth: 4,
    borderLeftColor: theme.color.black,
    padding: 12,
    gap: 6,
    transform: [{ skewX: "-3deg" }],
  } as any,
  trickTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  trickName: { fontFamily: theme.font.display, fontSize: 13, color: theme.color.black } as any,
  power: { backgroundColor: theme.color.black, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: theme.color.crimson } as any,
  powerText: { fontFamily: theme.font.body, fontSize: 10, color: theme.color.paper, fontWeight: "700" } as any,
  trickDesc: { fontFamily: theme.font.body, fontSize: 10, lineHeight: 12 as any, color: "#333", transform: [{ skewX: "3deg" }] } as any,
  note: { backgroundColor: theme.color.black, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", transform: [{ skewX: "3deg" }] } as any,
  noteText: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 1, color: theme.color.yellow } as any,
  footer: { backgroundColor: "rgba(16,16,16,0.96)", borderWidth: 1, borderColor: "#2A2A2A", borderLeftWidth: 6, borderLeftColor: theme.color.yellow, padding: 14, gap: 6, transform: [{ skewX: "-3deg" }] } as any,
  footerTitle: { fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2, color: theme.color.paper, transform: [{ skewX: "3deg" }] } as any,
  footerBody: { fontFamily: theme.font.body, fontSize: 11, lineHeight: 14 as any, color: "#CCC", transform: [{ skewX: "3deg" }] } as any,
});
