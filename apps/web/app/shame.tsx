import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

const MOCK = [
  { rank: 1, name: "guest_7f3", losses: 142, wins: 3 },
  { rank: 2, name: "you", losses: 44, wins: 6, isYou: true },
  { rank: 3, name: "anon_9a2", losses: 38, wins: 12 },
  { rank: 4, name: "anon_k11", losses: 31, wins: 8 },
  { rank: 5, name: "guest_001", losses: 27, wins: 5 },
];

export default function Shame() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>HALL OF SHAME</Text>
      </View>

      <View style={s.header as any}>
        <Text style={s.kicker as any}>BADGE OF DISHONOR</Text>
        <Text style={s.title as any}>MOST LOSSES WINS</Text>
        <Text style={s.intro as any}>In Pacify, losing is the credential. Framed, stamped, hung.</Text>
      </View>

      <ScrollView contentContainerStyle={s.list as any} showsVerticalScrollIndicator={false}>
        {MOCK.map((row) => (
          <View key={row.rank} style={[s.row as any, row.isYou && s.rowYou as any]}>
            <Text style={s.rank as any}>{String(row.rank).padStart(2, "0")}</Text>
            <View style={s.main as any}>
              <Text style={[s.name as any, row.isYou && { color: theme.color.crimson } as any]}>{row.name}</Text>
              <Text style={s.meta as any}>{row.losses} losses • {row.wins} wins • ratio {(row.losses / Math.max(1, row.wins)).toFixed(1)}</Text>
            </View>
            <View style={[s.badge as any, row.rank === 1 && { backgroundColor: theme.color.crimson, borderColor: theme.color.crimson } as any, row.isYou && { backgroundColor: theme.color.black } as any]}>
              <Text style={[s.badgeText as any, (row.rank === 1 || row.isYou) && { color: theme.color.paper } as any]}>{row.rank === 1 ? "SHAME KING" : row.isYou ? "YOU" : "WANTED"}</Text>
            </View>
          </View>
        ))}
        <Text style={s.foot as any}>* Updates at midnight. Keep losing.</Text>
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
  intro: { fontFamily: theme.font.body, fontSize: 13, lineHeight: 18 as any, color: "#E0E0E0" } as any,
  list: { gap: 10, paddingBottom: 16 } as any,
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#DDD",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.black,
    paddingVertical: 14,
    paddingHorizontal: 16,
    transform: [{ skewX: "-3deg" }],
  } as any,
  rowYou: { borderLeftColor: theme.color.crimson, backgroundColor: theme.color.paper } as any,
  rank: { fontFamily: theme.font.display, fontSize: 26, color: theme.color.black, transform: [{ skewX: "3deg" }], minWidth: 40 } as any,
  main: { flex: 1, gap: 2, transform: [{ skewX: "3deg" }] } as any,
  name: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.black } as any,
  meta: { fontFamily: theme.font.body, fontSize: 11, color: "#666" } as any,
  badge: { borderWidth: 2, borderColor: theme.color.black, paddingHorizontal: 10, paddingVertical: 5, transform: [{ skewX: "3deg" }, { rotate: "1deg" }] } as any,
  badgeText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1.5, color: theme.color.black, fontWeight: "700" } as any,
  foot: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: theme.color.paper, opacity: 0.6, textAlign: "center", marginTop: 6 } as any,
});
