import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

const ROWS = [
  { label: "BGM", value: "80%", desc: "Classroom hum" },
  { label: "SFX — select.mp3", value: "ON", desc: "Hover : personadle" },
  { label: "TEXT SPEED", value: "FAST", desc: "P5 snap" },
  { label: "REDUCED MOTION", value: "OFF", desc: "Keep the slam" },
];

export default function Options() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>OPTIONS</Text>
      </View>

      <View style={s.header as any}>
        <Text style={s.kicker as any}>CONFIG • DESK DRAWER</Text>
        <Text style={s.title as any}>SETTINGS</Text>
      </View>

      <View style={s.grid as any}>
        {ROWS.map((r) => (
          <View key={r.label} style={s.card as any}>
            <View style={s.cardTop as any}>
              <Text style={s.label as any}>{r.label}</Text>
              <View style={s.valueBox as any}>
                <Text style={s.value as any}>{r.value}</Text>
              </View>
            </View>
            <Text style={s.desc as any}>{r.desc}</Text>
            <View style={s.track as any}>
              <View style={[s.fill as any, { width: r.value.includes("%") ? r.value : "45%" }]} />
            </View>
          </View>
        ))}
      </View>
      <Text style={s.foot as any}>* Saves to device. No cloud yet — don't wipe.</Text>
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
    textShadow: `6px 6px 0 ${theme.color.crimson}`,
  } as any,
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as any,
  card: {
    width: 170,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#DDD",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 12,
    gap: 6,
    transform: [{ skewX: "-3deg" }],
  } as any,
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  label: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: theme.color.black, fontWeight: "700" } as any,
  valueBox: { backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.color.crimson } as any,
  value: { fontFamily: theme.font.body, fontSize: 10, color: theme.color.paper, fontWeight: "700" } as any,
  desc: { fontFamily: theme.font.body, fontSize: 10, color: "#666", transform: [{ skewX: "3deg" }] } as any,
  track: { height: 6, backgroundColor: "#EAEAEA", borderWidth: 1, borderColor: "#DDD", transform: [{ skewX: "3deg" }] } as any,
  fill: { height: "100%", backgroundColor: theme.color.crimson } as any,
  foot: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "#888", textAlign: "center", marginTop: 12 } as any,
});