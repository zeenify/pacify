import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ScreenShell, SectionTitle, BentoTile, NavBar, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

const MOCK = [
  { rank: 1, name: "guest_7f3", losses: 142, wins: 3 },
  { rank: 2, name: "you", losses: 44, wins: 6, isYou: true },
  { rank: 3, name: "anon_9a2", losses: 38, wins: 12 },
];

export default function Shame() {
  return (
    <ScreenShell>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle eyebrow="BADGE OF DISHONOR" title="Hall of Shame" />
        <Text style={s.sub}>Most losses. In Pacify, losing is the credential.</Text>
        <View style={s.list}>
          {MOCK.map((row) => (
            <BentoTile
              key={row.rank}
              span={1}
              tone={row.isYou ? "crimson" : "dark"}
              style={{ flexBasis: "100%" } as any}
            >
              <View style={s.row}>
                <Text style={s.rank}>#{row.rank}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.name, row.isYou && { color: theme.color.paper }]}>{row.name}</Text>
                  <Text style={s.meta}>
                    {row.losses} losses · {row.wins} wins
                  </Text>
                </View>
                <Text style={s.shameTag}>{row.rank === 1 ? "SHAME KING" : row.isYou ? "YOU" : ""}</Text>
              </View>
            </BentoTile>
          ))}
        </View>
      </ScrollView>
      <NavBar
        items={[{ key: "menu", label: "MENU" }]}
        active="shame"
        onSelect={(k) => router.push(`/${k}`)}
      />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  sub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 11, marginTop: -10, marginBottom: 16 },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  rank: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 22 },
  name: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 14 },
  meta: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, marginTop: 2 },
  shameTag: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 2 },
});
