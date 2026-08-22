import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, StatBlock, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

export default function Profile() {
  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16, gap: 16 }}>
        <SectionTitle eyebrow="YOU" title="Profile" />

        {/* top ID card */}
        <View style={s.idCard as any}>
          <View style={s.idHach as any} />
          <View style={s.idLeft as any}>
            <View style={s.avatar as any}>
              <Text style={s.avatarText}>GUEST</Text>
              <Text style={s.avatarSub}>UNREGISTERED</Text>
            </View>
          </View>
          <View style={s.idRight as any}>
            <Text style={s.idName}>GUEST_042</Text>
            <Text style={s.idMeta}>REPORT CARD • HARD MODE • 13 SEATS</Text>
            <View style={s.idStats as any}>
              <StatBlock label="WINS" value="6" />
              <StatBlock label="LOSSES" value="44" />
              <StatBlock label="DRAWS" value="1" />
              <View style={[s.streakBox as any]}>
                <Text style={s.streakLabel}>STREAK</Text>
                <Text style={s.streakValue}>W2</Text>
              </View>
            </View>
          </View>
        </View>

        {/* playstyle comic */}
        <View style={s.comic as any}>
          <View style={s.comicHeader as any}>
            <Text style={s.comicTitle}>PLAYSTYLE — AS THEY SEE YOU</Text>
            <View style={s.dot as any} />
          </View>
          <Text style={s.playstyle}>saves tricks late • risky • high-early 22% • avg score 4.1</Text>
          <View style={s.barRow as any}>
            <View style={s.barLabelWrap as any}><Text style={s.barLabel}>SAFE → RISKY</Text></View>
            <View style={s.barTrack as any}><View style={[s.barFill as any, { width: "68%" }]} /></View>
          </View>
        </View>

        {/* per-student */}
        <View style={s.perStudentWrap as any}>
          <Text style={s.perTitle}>PER-STUDENT RECORD</Text>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={s.row as any}>
              <View style={s.rowLeft as any}>
                <Text style={s.rowNum}>{String(i + 1).padStart(2, "0")}</Text>
                <Text style={s.rowName}>STUDENT {i + 1}</Text>
              </View>
              <Text style={s.rowMeta}>attempts {i === 0 ? 5 : 0} • wins {i === 0 ? 1 : 0} • best 0</Text>
            </View>
          ))}
          <Text style={s.more}>+ 7 more seats locked</Text>
        </View>
      </ScrollView>
      <NavBar items={[{ key: "menu", label: "MENU" }, { key: "profile", label: "PROFILE" }]} active="profile" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  idCard: {
    flexDirection: "row",
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    padding: 12,
    gap: 14,
  } as any,
  idHach: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: theme.color.crimson } as any,
  idLeft: { width: 120 } as any,
  avatar: {
    height: 120,
    backgroundColor: theme.color.black,
    borderWidth: 2,
    borderColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  } as any,
  avatarText: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 14, letterSpacing: 3 } as any,
  avatarSub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 2 } as any,
  idRight: { flex: 1, gap: 6, justifyContent: "center" } as any,
  idName: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 22, letterSpacing: 1 } as any,
  idMeta: { color: "#666", fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.5 } as any,
  idStats: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" } as any,
  streakBox: {
    backgroundColor: theme.color.crimson,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  streakLabel: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 2, fontWeight: "800", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  streakValue: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 16, transform: [{ skewX: `${-theme.skew}deg` }] } as any,

  comic: { backgroundColor: theme.color.black, borderWidth: 2, borderColor: theme.color.paper, padding: 12, gap: 8 } as any,
  comicHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any,
  comicTitle: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2, fontWeight: "800" } as any,
  dot: { width: 8, height: 8, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
  playstyle: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 11, letterSpacing: 0.6 } as any,
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 } as any,
  barLabelWrap: { width: 90 } as any,
  barLabel: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1 } as any,
  barTrack: { flex: 1, height: 10, backgroundColor: theme.color.surface3, borderWidth: 1.5, borderColor: theme.color.paper } as any,
  barFill: { height: "100%", backgroundColor: theme.color.crimson } as any,

  perStudentWrap: { backgroundColor: "rgba(250,250,245,0.06)", borderWidth: 1.5, borderColor: "rgba(250,250,245,0.18)", padding: 12, gap: 0 } as any,
  perTitle: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2, marginBottom: 8 } as any,
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(250,250,245,0.12)",
  } as any,
  rowLeft: { flexDirection: "row", gap: 10, alignItems: "center" } as any,
  rowNum: { color: theme.color.crimson, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 1, fontWeight: "800" } as any,
  rowName: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 13 } as any,
  rowMeta: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10 } as any,
  more: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1.5, textAlign: "center", marginTop: 8 } as any,
});
