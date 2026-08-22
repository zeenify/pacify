import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

export default function Profile() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>PROFILE</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 16 }}>
        <View style={s.idCard as any}>
          <View style={s.avatar as any}>
            <Text style={s.avatarText}>GUEST</Text>
            <Text style={s.avatarSub}>UNREGISTERED</Text>
          </View>
          <View style={s.idMain as any}>
            <Text style={s.idName as any}>GUEST_042</Text>
            <Text style={s.idMeta as any}>HARD MODE • 13 SEATS • REPORT CARD</Text>
            <View style={s.stats as any}>
              <View style={s.stat as any}>
                <Text style={s.statVal}>6</Text>
                <Text style={s.statLabel}>WINS</Text>
              </View>
              <View style={s.stat as any}>
                <Text style={s.statVal}>44</Text>
                <Text style={s.statLabel}>LOSSES</Text>
              </View>
              <View style={s.stat as any}>
                <Text style={s.statVal}>1</Text>
                <Text style={s.statLabel}>DRAWS</Text>
              </View>
              <View style={[s.stat as any, { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any]}>
                <Text style={[s.statVal as any, { color: theme.color.paper } as any]}>W2</Text>
                <Text style={[s.statLabel as any, { color: theme.color.paper } as any]}>STREAK</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.card as any}>
          <Text style={s.cardTitle as any}>PLAYSTYLE — AS THEY SEE YOU</Text>
          <Text style={s.playstyle as any}>saves tricks late • risky • high-early 22% • avg score 4.1</Text>
          <View style={s.barRow as any}>
            <Text style={s.barLabel as any}>SAFE → RISKY</Text>
            <View style={s.track as any}>
              <View style={[s.fill as any, { width: "68%" }]} />
            </View>
          </View>
        </View>

        <View style={s.list as any}>
          <Text style={s.listTitle as any}>PER-STUDENT</Text>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={s.row as any}>
              <Text style={s.rowNum as any}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.rowName as any}>STUDENT {i + 1}</Text>
              <Text style={s.rowMeta as any}>attempts {i === 0 ? 5 : 0} • wins {i === 0 ? 1 : 0}</Text>
            </View>
          ))}
          <Text style={s.more as any}>+ 7 more seats locked</Text>
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
  idCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#DDD",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 14,
    transform: [{ skewX: "-3deg" }],
  } as any,
  avatar: {
    width: 110,
    height: 110,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    transform: [{ skewX: "3deg" }],
  } as any,
  avatarText: { fontFamily: theme.font.display, fontSize: 14, letterSpacing: 3, color: theme.color.paper } as any,
  avatarSub: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 2, color: theme.color.yellow } as any,
  idMain: { flex: 1, gap: 6, transform: [{ skewX: "3deg" }] } as any,
  idName: { fontFamily: theme.font.display, fontSize: 20, color: theme.color.black } as any,
  idMeta: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1.5, color: "#666" } as any,
  stats: { flexDirection: "row", gap: 8, marginTop: 8 } as any,
  stat: { flex: 1, backgroundColor: theme.color.paper, borderWidth: 1, borderColor: "#DDD", paddingVertical: 8, alignItems: "center", gap: 2 } as any,
  statVal: { fontFamily: theme.font.display, fontSize: 18, color: theme.color.black } as any,
  statLabel: { fontFamily: theme.font.body, fontSize: 8, letterSpacing: 1.5, color: "#666" } as any,
  card: {
    backgroundColor: "rgba(16,16,16,0.96)",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.yellow,
    padding: 14,
    gap: 8,
    transform: [{ skewX: "-3deg" }],
  } as any,
  cardTitle: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2, color: theme.color.yellow, transform: [{ skewX: "3deg" }] } as any,
  playstyle: { fontFamily: theme.font.body, fontSize: 12, color: theme.color.paper, transform: [{ skewX: "3deg" }] } as any,
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, transform: [{ skewX: "3deg" }] } as any,
  barLabel: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: "#AAA", width: 90 } as any,
  track: { flex: 1, height: 10, backgroundColor: "#222", borderWidth: 1, borderColor: "#333", transform: [{ skewX: "-8deg" }] } as any,
  fill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  list: { backgroundColor: "rgba(16,16,16,0.96)", borderWidth: 1, borderColor: "#2A2A2A", padding: 14, gap: 0, transform: [{ skewX: "-3deg" }] } as any,
  listTitle: { fontFamily: theme.font.display, fontSize: 12, letterSpacing: 2, color: theme.color.paper, marginBottom: 8, transform: [{ skewX: "3deg" }] } as any,
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#222", transform: [{ skewX: "3deg" }] } as any,
  rowNum: { fontFamily: theme.font.body, fontSize: 11, color: theme.color.crimson, width: 28, fontWeight: "700" } as any,
  rowName: { fontFamily: theme.font.display, fontSize: 13, color: theme.color.paper, flex: 1 } as any,
  rowMeta: { fontFamily: theme.font.body, fontSize: 11, color: "#888" } as any,
  more: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "#666", textAlign: "center", marginTop: 8, transform: [{ skewX: "3deg" }] } as any,
});
