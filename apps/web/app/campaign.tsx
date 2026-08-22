import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenShell, SectionTitle, BentoTile, LabelChip, NavBar, theme } from "@pacify/ui-kit";

const NAV = [
  { key: "campaign", label: "CAMPAIGN" },
  { key: "dossier", label: "DOSSIER" },
  { key: "shame", label: "HALL OF SHAME" },
  { key: "profile", label: "PROFILE" },
  { key: "howto", label: "HOW TO PLAY" },
  { key: "multiplayer", label: "MULTIPLAYER", locked: true },
  { key: "options", label: "OPTIONS" },
];

const STUDENTS = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  name: `STUDENT ${String(i + 1).padStart(2, "0")}`,
  subtitle: i === 0 ? "The Freshman — learns fast" : i === 12 ? "The Last Seat — sees everything" : `Seat ${i + 1} • trick: ${["Void","Oracle","Reversal","Ward","Echo"][i % 5]}`,
  locked: i > 2,
  cleared: i === 0,
}));

export default function Campaign() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow as any}>
          <SectionTitle eyebrow="LADDER" title="Campaign" />
          <View style={s.progressWrap as any}>
            <Text style={s.progressLabel}>PROGRESS</Text>
            <View style={s.progressBar as any}>
              <View style={[s.progressFill as any, { width: `${(1 / 13) * 100}%` }]} />
            </View>
            <Text style={s.progressText}>01 / 13</Text>
          </View>
        </View>

        <View style={s.board as any}>
          <View style={s.boardTape as any} />
          <View style={s.boardTape2 as any} />
          <Text style={s.boardTitle}>CLASSROOM DESK — PIN YOUR TARGET</Text>

          <View style={s.grid as any}>
            {STUDENTS.map((st, idx) => {
              const isNext = !st.locked && !st.cleared;
              const rot = (idx % 3) * 0.7 - 0.7;
              return (
                <View
                  key={st.id}
                  style={[
                    s.cardWrap as any,
                    { transform: [{ rotate: `${rot}deg` }] } as any,
                    Platform.OS === "web" && ({ animation: `p5-entrance-unskew 420ms ${idx * 40}ms both` } as any),
                  ]}
                >
                  <BentoTile
                    tone={st.cleared ? "paper" : isNext ? "crimson" : "dark"}
                    locked={st.locked}
                    ribbon={st.cleared ? "CLEARED" : isNext ? "NEXT" : st.locked ? "LOCKED" : undefined}
                    onPress={() => !st.locked && router.push("/dossier")}
                    style={{ minHeight: 148 } as any}
                  >
                    <View style={s.cardTop as any}>
                      <LabelChip label={`NO. ${String(st.id).padStart(2, "0")}`} tone={st.cleared ? "paper" : "crimson"} />
                      <Text style={s.cardId}>#{st.id}</Text>
                    </View>

                    <Text style={[s.cardName, st.cleared && { color: theme.color.black } as any, isNext && { color: theme.color.paper } as any]}>
                      {st.name}
                    </Text>
                    <Text style={[s.cardSub, st.cleared && { color: "#666" } as any]} numberOfLines={2}>
                      {st.subtitle}
                    </Text>

                    <View style={s.cardFoot as any}>
                      <View style={[s.badge as any, isNext && { backgroundColor: theme.color.paper } as any, st.locked && { backgroundColor: theme.color.surface3 } as any]}>
                        <Text style={[s.badgeText as any, isNext && { color: theme.color.crimson } as any]}>{st.locked ? "???" : st.cleared ? "1-0" : "FIGHT →"}</Text>
                      </View>
                      <Text style={s.cardIcon}>{st.locked ? "✕" : st.cleared ? "★" : "▶"}</Text>
                    </View>

                    {/* polaroid shine */}
                    <View style={s.shine as any} pointerEvents="none" />
                  </BentoTile>
                </View>
              );
            })}
          </View>

          <View style={s.tip as any}>
            <Text style={s.tipDot}>●</Text>
            <Text style={s.tipText}>STAGE 13 ONLY UNLOCKS AFTER YOU'VE TASTED SHAME. ROUND 5 IS DOUBLE — ECHO MAKES IT TRIPLE.</Text>
          </View>
        </View>
      </ScrollView>
      <NavBar items={NAV} active="campaign" onSelect={(k) => router.push(k === "campaign" ? "/menu" : `/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 16, gap: 12 } as any,
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 16 } as any,
  progressWrap: { alignItems: "flex-end", gap: 4, marginBottom: 18 } as any,
  progressLabel: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 2, fontWeight: "800" } as any,
  progressBar: { width: 140, height: 8, backgroundColor: theme.color.surface3, borderWidth: 2, borderColor: theme.color.paper, overflow: "hidden" } as any,
  progressFill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  progressText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 1 } as any,
  board: {
    backgroundColor: "rgba(250,250,245,0.06)",
    borderWidth: 2,
    borderColor: "rgba(250,250,245,0.18)",
    padding: 12,
    gap: 12,
  } as any,
  boardTape: { position: "absolute", top: -8, left: 24, width: 64, height: 14, backgroundColor: "rgba(250,250,245,0.85)", transform: [{ rotate: "-7deg" }] } as any,
  boardTape2: { position: "absolute", top: -8, right: 28, width: 52, height: 12, backgroundColor: "rgba(212,0,0,0.85)", transform: [{ rotate: "6deg" }] } as any,
  boardTitle: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2.5, textAlign: "center" } as any,
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as any,
  cardWrap: { width: 176 } as any,
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any,
  cardId: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 1 } as any,
  cardName: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 14, letterSpacing: 1, marginTop: 8 } as any,
  cardSub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 0.8, marginTop: 4, lineHeight: 12 as any } as any,
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 } as any,
  badge: {
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  badgeText: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 1, fontWeight: "800", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  cardIcon: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 18, opacity: 0.7 } as any,
  shine: { position: "absolute", top: 8, right: 8, width: 28, height: 28, backgroundColor: "rgba(250,250,245,0.08)", transform: [{ rotate: "18deg" }] } as any,
  tip: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: theme.color.black, borderWidth: 1.5, borderColor: theme.color.crimson, paddingHorizontal: 10, paddingVertical: 7 } as any,
  tipDot: { color: theme.color.crimson, fontSize: 10 } as any,
  tipText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.2, flex: 1 } as any,
});
