import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

export default function Dossier() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>DOSSIER</Text>
        <Text style={s.tag as any}>EYES ONLY</Text>
      </View>

      <View style={s.header as any}>
        <Text style={s.kicker as any}>INTEL • 13 FILES</Text>
        <Text style={s.title as any}>WHO THEY ARE</Text>
        <Text style={s.intro as any}>Tells, trick bias, and the line they cross when they talk. Beat them to unlock.</Text>
      </View>

      <ScrollView contentContainerStyle={s.grid as any} showsVerticalScrollIndicator={false}>
        {Array.from({ length: 13 }, (_, i) => {
          const locked = i > 2;
          return (
            <View
              key={i}
              style={[
                s.card as any,
                locked && s.cardLocked as any,
                Platform.OS === "web" && ({ animation: `rowIn 620ms ${90 + i * 40}ms both` } as any),
              ]}
            >
              <View style={s.cardTop as any}>
                <Text style={s.cardNum as any}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={[s.stamp as any, locked && { borderColor: "#555" } as any]}>
                  <Text style={[s.stampText as any, locked && { color: "#777" } as any]}>{locked ? "LOCKED" : i === 0 ? "CLEARED" : "NEXT"}</Text>
                </View>
              </View>
              <Text style={[s.cardName as any, locked && { color: "#666" } as any]}>{locked ? "— — —" : `STUDENT ${i + 1}`}</Text>
              <Text style={s.cardMeta as any}>{locked ? "Defeat prior seats" : `Trick: ${["Void", "Oracle", "Reversal", "Ward", "Echo"][i % 5]} • ${i === 0 ? "saves late" : "unknown"}`}</Text>
              <Text style={s.cardLore as any} numberOfLines={2}>
                {locked ? "Intel redacted." : i === 0 ? "Baseline brutal. Plays safe early, slams Round 5. Talks when you hesitate." : "Profile unlocks after first confrontation."}
              </Text>
              <View style={s.bar as any}>
                <View style={[s.barFill as any, { width: locked ? "12%" : `${22 + i * 6}%` }]} />
              </View>
            </View>
          );
        })}
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
  tag: { marginLeft: "auto", fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.yellow, borderWidth: 1, borderColor: theme.color.yellow, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  header: { gap: 6, marginBottom: 14 } as any,
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
  intro: { fontFamily: theme.font.body, fontSize: 13, lineHeight: 18 as any, color: "#E0E0E0", maxWidth: 560 } as any,
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 16 } as any,
  card: {
    width: 168,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 14,
    gap: 6,
    transform: [{ skewX: "-3deg" }],
  } as any,
  cardLocked: { opacity: 0.6, borderLeftColor: "#333" } as any,
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  cardNum: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.crimson } as any,
  stamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, transform: [{ rotate: "2deg" }] } as any,
  stampText: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 1.5, color: theme.color.crimson, fontWeight: "700" } as any,
  cardName: { fontFamily: theme.font.display, fontSize: 14, color: theme.color.black, transform: [{ skewX: "3deg" }] } as any,
  cardMeta: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: "#666", transform: [{ skewX: "3deg" }] } as any,
  cardLore: { fontFamily: theme.font.body, fontSize: 10, lineHeight: 13 as any, color: "#333", transform: [{ skewX: "3deg" }] } as any,
  bar: { height: 6, backgroundColor: "#EAEAEA", borderWidth: 1, borderColor: "#DDD", marginTop: 6, transform: [{ skewX: "3deg" }] } as any,
  barFill: { height: "100%", backgroundColor: theme.color.crimson } as any,
});
