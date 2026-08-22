import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { ScreenShell, SectionTitle, BentoTile, LabelChip, StatBlock, NavBar, theme } from "@pacify/ui-kit";

const NAV = [
  { key: "campaign", label: "CAMPAIGN" },
  { key: "dossier", label: "DOSSIER" },
  { key: "shame", label: "HALL OF SHAME" },
  { key: "profile", label: "PROFILE" },
  { key: "howto", label: "HOW TO PLAY" },
  { key: "multiplayer", label: "MULTIPLAYER", locked: true },
  { key: "options", label: "OPTIONS" },
];

const STUDENTS: { id: number; name: string; subtitle: string; locked: boolean; cleared?: boolean }[] = Array.from(
  { length: 13 },
  (_, i) => ({
    id: i + 1,
    name: `STUDENT ${i + 1}`,
    subtitle: i === 0 ? "The Freshman" : i === 12 ? "The Last Seat" : `Seat ${i + 1}`,
    locked: i > 1,
    cleared: i === 0,
  }),
);

export default function Campaign() {
  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <SectionTitle eyebrow="LADDER" title="Campaign Map" />
        <Text style={s.hint}>13 students. face them in order. the last two only unlock after shame fuels you.</Text>

        <View style={s.grid}>
          {STUDENTS.map((st, idx) => {
            const isNext = !st.locked && !st.cleared;
            const span = idx === 12 ? 2 : idx % 5 === 0 ? 1.4 : 1; // last one spans
            return (
              <BentoTile
                key={st.id}
                span={span}
                tone={st.cleared ? "paper" : isNext ? "crimson" : "dark"}
                locked={st.locked}
                ribbon={st.cleared ? "CLEARED" : isNext ? "NEXT" : undefined}
                onPress={() => !st.locked && router.push("/dossier")}
              >
                <LabelChip label={`NO. ${String(st.id).padStart(2, "0")}`} tone={st.cleared ? "paper" : "crimson"} />
                <Text
                  style={[
                    s.tileName,
                    st.cleared && { color: theme.color.black },
                    isNext && { color: theme.color.paper },
                  ]}
                >
                  {st.name}
                </Text>
                <Text
                  style={[s.tileSub, st.cleared && { color: theme.color.borderStrong }]}
                  numberOfLines={1}
                >
                  {st.subtitle}
                </Text>
                <View style={s.tileFoot}>
                  <StatBlock
                    label={st.locked ? "LOCKED" : st.cleared ? "W-L" : "FIGHT"}
                    value={st.locked ? "—" : st.cleared ? "1-0" : "GO"}
                    tone={isNext ? "crimson" : "paper"}
                  />
                  <Text style={s.eyeIcon}>{st.locked ? "?" : "›"}</Text>
                </View>
              </BentoTile>
            );
          })}
        </View>
      </ScrollView>
      <NavBar items={NAV} active="campaign" onSelect={(k) => router.push(`/${k === "campaign" ? "menu" : k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 16 },
  hint: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: -10,
    marginBottom: theme.space.lg,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tileName: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 16,
    letterSpacing: 1,
    marginTop: 8,
  },
  tileSub: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
  tileFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 },
  eyeIcon: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 22, opacity: 0.7 },
});
