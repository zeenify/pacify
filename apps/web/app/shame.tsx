import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={s.headerRow as any}>
          <SectionTitle eyebrow="BADGE OF DISHONOR" title="Hall of Shame" />
          <View style={s.hardBadge as any}>
            <Text style={s.hardBadgeText}>MOST LOSSES WINS</Text>
          </View>
        </View>
        <Text style={s.sub}>In Pacify, losing is the credential. Framed, stamped, hung.</Text>

        <View style={s.wall as any}>
          <View style={s.wallHach as any} />
          {MOCK.map((row) => (
            <View key={row.rank} style={[s.poster as any, row.isYou && s.posterYou as any, { transform: [{ rotate: `${(row.rank % 2 === 0 ? 0.6 : -0.5)}deg` }] } as any]}>
              <View style={s.tape as any} />
              <View style={s.posterTop as any}>
                <Text style={s.rank}>#{String(row.rank).padStart(2, "0")}</Text>
                <View style={[s.stamp as any, row.rank === 1 && { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any]}>
                  <Text style={s.stampText}>{row.rank === 1 ? "SHAME KING" : row.isYou ? "YOU" : "WANTED"}</Text>
                </View>
              </View>
              <Text style={[s.name as any, row.isYou && { color: theme.color.crimson } as any]}>{row.name}</Text>
              <View style={s.metaRow as any}>
                <View style={s.metaBox as any}>
                  <Text style={s.metaLabel}>LOSSES</Text>
                  <Text style={s.metaValue}>{row.losses}</Text>
                </View>
                <View style={s.metaBox as any}>
                  <Text style={s.metaLabel}>WINS</Text>
                  <Text style={s.metaValue}>{row.wins}</Text>
                </View>
                <View style={[s.metaBox as any, { backgroundColor: theme.color.black, borderColor: theme.color.black } as any]}>
                  <Text style={[s.metaLabel as any, { color: theme.color.paper } as any]}>RATIO</Text>
                  <Text style={[s.metaValue as any, { color: theme.color.paper } as any]}>{(row.losses / Math.max(1, row.wins)).toFixed(1)}</Text>
                </View>
              </View>
            </View>
          ))}
          <Text style={s.footNote}>* School record updates at midnight. Keep losing.</Text>
        </View>
      </ScrollView>
      <NavBar items={[{ key: "menu", label: "MENU" }, { key: "shame", label: "HALL OF SHAME" }]} active="shame" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" } as any,
  hardBadge: { backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: `${theme.skew}deg` }, { rotate: "1deg" }], marginBottom: 18 } as any,
  hardBadgeText: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2, fontWeight: "800", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  sub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 11, marginTop: -10, marginBottom: 14 } as any,
  wall: { backgroundColor: "rgba(250,250,245,0.06)", borderWidth: 2, borderColor: "rgba(250,250,245,0.18)", padding: 12, gap: 12 } as any,
  wallHach: { position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: theme.color.paper, opacity: 0.08 } as any,
  poster: {
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    padding: 12,
    gap: 6,
  } as any,
  posterYou: { backgroundColor: theme.color.paper, borderColor: theme.color.crimson } as any,
  tape: { position: "absolute", top: -8, left: 18, width: 52, height: 11, backgroundColor: "rgba(17,17,17,0.85)", transform: [{ rotate: "-5deg" }] } as any,
  posterTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as any,
  rank: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 20, letterSpacing: 1 } as any,
  stamp: { borderWidth: 2, borderColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "2deg" }] } as any,
  stampText: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 2, fontWeight: "800" } as any,
  name: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 18, letterSpacing: 1, marginTop: 2 } as any,
  metaRow: { flexDirection: "row", gap: 8, marginTop: 6 } as any,
  metaBox: {
    flex: 1,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: "center",
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  metaLabel: { color: theme.color.black, fontFamily: theme.font.mono, fontSize: 8, letterSpacing: 1.5, fontWeight: "800", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  metaValue: { color: theme.color.black, fontFamily: theme.font.display, fontSize: 16, transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  footNote: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1, textAlign: "center", marginTop: 4 } as any,
});
