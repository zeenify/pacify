import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { ScreenShell, SectionTitle, LabelChip, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

const NAV = [
  { key: "menu", label: "MENU" },
  { key: "campaign", label: "CAMPAIGN" },
  { key: "dossier", label: "DOSSIER" },
  { key: "shame", label: "HALL OF SHAME" },
];

export default function Dossier() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <SectionTitle eyebrow="INTEL • EYES ONLY" title="Dossier" />
        <Text style={s.hint}>13 psych profiles. tells, trick habits, and the line they cross when they talk.</Text>

        <View style={s.grid as any}>
          {Array.from({ length: 13 }, (_, i) => {
            const locked = i > 2;
            const rot = (i % 2 === 0 ? -0.6 : 0.5);
            return (
              <View
                key={i}
                style={[
                  s.cardWrap as any,
                  { transform: [{ rotate: `${rot}deg` }] } as any,
                  Platform.OS === "web" && ({ animation: `p5-entrance-unskew 380ms ${i * 35}ms both` } as any),
                ]}
              >
                <View style={[s.card as any, locked && s.cardLocked as any]}>
                  <View style={s.cardHach as any} />
                  <View style={[s.tape as any, { transform: [{ rotate: i % 2 === 0 ? "-6deg" : "5deg" }] } as any]} />
                  {/* polaroid image block */}
                  <View style={s.imgBlock as any}>
                    <Text style={s.imgPlaceholder}>{locked ? "CLASSIFIED" : `STUDENT ${String(i + 1).padStart(2, "0")}`}</Text>
                    <View style={s.scanline as any} />
                    <View style={[s.stamp as any, locked && { opacity: 0.45 } as any]}>
                      <Text style={s.stampText}>{locked ? "LOCKED" : i === 0 ? "CLEARED" : "NEXT"}</Text>
                    </View>
                  </View>

                  <View style={s.cardBody as any}>
                    <LabelChip label={`SEAT ${i + 1}`} tone={locked ? "black" : "crimson"} />
                    <Text style={[s.name as any, locked && { color: theme.color.paperDim } as any]}>{locked ? "— — —" : `Student ${i + 1}`}</Text>
                    <Text style={s.meta as any}>{locked ? "Fight to unlock" : `Trick bias: ${["Void","Oracle","Reversal","Ward","Echo"][i % 5]} • ${i === 0 ? "saves tricks late" : "unknown"}`}</Text>
                    <Text style={s.lore as any} numberOfLines={2}>
                      {locked ? "Intel redacted. Beat prior seats." : i === 0 ? "Baseline brutal. Plays safe early, slams Round 5. Talks when you hesitate." : "Profile unlocked after first confrontation."}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <NavBar items={NAV} active="dossier" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  hint: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 1, marginTop: -10, marginBottom: 14 } as any,
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as any,
  cardWrap: { width: 168 } as any,
  card: {
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    overflow: "hidden",
    paddingBottom: 10,
  } as any,
  cardLocked: { opacity: 0.62 } as any,
  cardHach: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: theme.color.crimson } as any,
  tape: { position: "absolute", top: -6, left: 14, width: 42, height: 10, backgroundColor: "rgba(17,17,17,0.85)", zIndex: 2 } as any,
  imgBlock: {
    height: 116,
    backgroundColor: theme.color.ink,
    borderBottomWidth: 2,
    borderBottomColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    overflow: "hidden",
  } as any,
  imgPlaceholder: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 13, letterSpacing: 2 } as any,
  scanline: { position: "absolute", top: 44, left: 0, right: 0, height: 2, backgroundColor: "rgba(250,250,245,0.12)" } as any,
  stamp: {
    position: "absolute",
    bottom: 8,
    right: 8,
    borderWidth: 2,
    borderColor: theme.color.paper,
    backgroundColor: theme.color.crimson,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ rotate: "4deg" }],
  } as any,
  stampText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 2, fontWeight: "800" } as any,
  cardBody: { padding: 10, gap: 4 } as any,
  name: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 14, letterSpacing: 0.5 } as any,
  meta: { color: "#666", fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1 } as any,
  lore: { color: "#333", fontFamily: theme.font.mono, fontSize: 9, lineHeight: 13 as any, marginTop: 4 } as any,
});
