import { View, Text, StyleSheet, ScrollView, Platform, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

const STUDENTS = Array.from({ length: 13 }, (_, i) => ({
  id: i + 1,
  name: `STUDENT ${String(i + 1).padStart(2, "0")}`,
  subtitle: i === 0 ? "The Freshman" : i === 12 ? "The Last Seat" : `Seat ${i + 1}`,
  desc: i === 0 ? "Baseline brutal. Plays safe early, slams Round 5." : i === 1 ? "Trick hoarder. Waits for your mistake." : "Intel locked. Beat prior seats to reveal.",
  locked: i > 2,
  cleared: i === 0,
  trick: ["Void", "Oracle", "Reversal", "Ward", "Echo"][i % 5],
}));

export default function Campaign() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>CAMPAIGN</Text>
        <View style={s.progress as any}>
          <Text style={s.progressText}>01 / 13</Text>
        </View>
      </View>

      <View style={s.header as any}>
        <Text style={s.kicker as any}>LADDER • 13 SEATS</Text>
        <Text style={s.title as any}>CHOOSE YOUR SEAT</Text>
        <Text style={s.intro as any}>Hard from 01. Last two only unlock after shame fuels you. Round 5 is double — Echo makes it triple.</Text>
      </View>

      <ScrollView contentContainerStyle={s.list as any} showsVerticalScrollIndicator={false}>
        {STUDENTS.map((st, idx) => (
          <Pressable
            key={st.id}
            onPress={() => !st.locked && router.push("/dossier")}
            style={({ hovered, pressed }) => [
              s.row as any,
              st.locked && s.rowLocked as any,
              st.cleared && s.rowCleared as any,
              hovered && !st.locked && !pressed && s.rowHover as any,
              Platform.OS === "web" && ({ animation: `rowIn 620ms ${90 + idx * 60}ms both` } as any),
            ]}
          >
            <View style={s.numWrap as any}>
              <Text style={[s.num as any, st.locked && { color: "#555" } as any]}>{String(st.id).padStart(2, "0")}</Text>
            </View>
            <View style={s.main as any}>
              <View style={s.nameRow as any}>
                <Text style={[s.name as any, st.locked && { color: "#777" } as any]}>{st.name}</Text>
                <View style={[s.tag as any, st.cleared && { backgroundColor: theme.color.paper, borderColor: theme.color.paper } as any, st.locked && { backgroundColor: "#222" } as any]}>
                  <Text style={[s.tagText as any, st.cleared && { color: theme.color.black } as any]}>{st.cleared ? "CLEARED" : st.locked ? "LOCKED" : "NEXT"}</Text>
                </View>
                {!st.locked ? (
                  <View style={s.trickTag as any}>
                    <Text style={s.trickText}>{st.trick}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.subtitle as any}>{st.subtitle}</Text>
              <Text style={s.desc as any}>{st.desc}</Text>
            </View>
            <View style={s.right as any}>
              <Text style={s.arrow as any}>{st.locked ? "✕" : "›"}</Text>
            </View>
          </Pressable>
        ))}
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
  progress: { marginLeft: "auto", backgroundColor: theme.color.crimson, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  progressText: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 1, color: theme.color.paper, fontWeight: "700", transform: [{ skewX: "8deg" }] } as any,
  header: { gap: 6, marginBottom: 14 } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 5, color: theme.color.yellow } as any,
  title: {
    fontFamily: theme.font.display,
    fontSize: 48,
    color: theme.color.paper,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 6, height: 6 },
    textShadowRadius: 0,
  } as any,
  intro: { fontFamily: theme.font.body, fontSize: 14, lineHeight: 20 as any, color: "#E0E0E0", maxWidth: 640 } as any,
  list: { gap: 10, paddingBottom: 16 } as any,
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(16,16,16,0.96)",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    paddingVertical: 16,
    paddingHorizontal: 18,
    transform: [{ skewX: "-3deg" }],
  } as any,
  rowLocked: { borderLeftColor: "#333", opacity: 0.6 } as any,
  rowCleared: { backgroundColor: theme.color.paper, borderColor: "#DDD", borderLeftColor: theme.color.black } as any,
  rowHover: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper, transform: [{ skewX: "-3deg" }, { translateX: 6 }] } as any,
  numWrap: { width: 56, alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  num: { fontFamily: theme.font.display, fontSize: 32, color: theme.color.crimson, letterSpacing: 1, textShadowColor: "#000", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 } as any,
  main: { flex: 1, gap: 4, transform: [{ skewX: "3deg" }] } as any,
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" } as any,
  name: { fontFamily: theme.font.display, fontSize: 16, color: theme.color.paper, letterSpacing: 0.5 } as any,
  tag: { backgroundColor: theme.color.crimson, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: theme.color.paper } as any,
  tagText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.paper, fontWeight: "700" } as any,
  trickTag: { backgroundColor: theme.color.black, borderWidth: 1, borderColor: "#333", paddingHorizontal: 6, paddingVertical: 2 } as any,
  trickText: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1, color: theme.color.yellow } as any,
  subtitle: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 0.5, color: "#AAA" } as any,
  desc: { fontFamily: theme.font.body, fontSize: 12, lineHeight: 16 as any, color: "#CCC" } as any,
  right: { width: 32, alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  arrow: { fontFamily: theme.font.display, fontSize: 20, color: theme.color.paper, opacity: 0.7 } as any,
});
