import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { ScreenShell, theme } from "@pacify/ui-kit";

export default function Multiplayer() {
  return (
    <ScreenShell>
      <View style={s.topbar as any}>
        <Pressable onPress={() => router.replace("/menu")} hitSlop={10}>
          <Text style={s.back as any}>‹ MENU</Text>
        </Pressable>
        <Text style={s.mark as any}>MULTIPLAYER</Text>
        <View style={s.lock as any}>
          <Text style={s.lockText}>LOCKED</Text>
        </View>
      </View>

      <View style={s.stage as any}>
        <View style={s.cabinet as any}>
          <View style={s.marquee as any}>
            <Text style={s.marqueeText}>1V1 • SAME ENGINE • SAME TRICKS</Text>
          </View>
          <View style={s.screen as any}>
            <Text style={s.big as any}>COMING SOON</Text>
            <Text style={s.sub as any}>Human vs human — hidden hands, same 5-card singleton, same 5 tricks. No AI tells to farm.</Text>
          </View>
          <View style={s.controls as any}>
            <View style={s.stick as any} />
            <View style={s.buttons as any}>
              <View style={s.btnRed as any} />
              <View style={s.btnWhite as any} />
              <View style={s.btnBlack as any} />
            </View>
          </View>
        </View>
        <Pressable onPress={() => router.replace("/menu")} style={({ hovered }) => [s.cta as any, hovered && { transform: [{ skewX: "-8deg" }, { translateX: -2 }] } as any]}>
          <Text style={s.ctaText}>BACK TO MENU</Text>
        </Pressable>
        <Text style={s.foot as any}>Leave your email in Profile — we'll ping when the cabinet opens.</Text>
      </View>
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
  lock: { marginLeft: "auto", backgroundColor: theme.color.yellow, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  lockText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2, color: theme.color.black, fontWeight: "700", transform: [{ skewX: "8deg" }] } as any,
  stage: { gap: 16, alignItems: "center", paddingTop: 12 } as any,
  cabinet: {
    width: 420,
    backgroundColor: theme.color.paper,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    overflow: "hidden",
    transform: [{ skewX: "-3deg" }],
  } as any,
  marquee: { backgroundColor: theme.color.black, paddingVertical: 8, alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  marqueeText: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.yellow } as any,
  screen: { margin: 14, backgroundColor: theme.color.black, padding: 18, gap: 10, alignItems: "center", transform: [{ skewX: "3deg" }] } as any,
  big: { fontFamily: theme.font.display, fontSize: 28, letterSpacing: 2, color: theme.color.paper } as any,
  sub: { fontFamily: theme.font.body, fontSize: 12, lineHeight: 16 as any, color: "#CCC", textAlign: "center" } as any,
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#111", borderTopWidth: 1, borderTopColor: "#2A2A2A", transform: [{ skewX: "3deg" }] } as any,
  stick: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.paper } as any,
  buttons: { flexDirection: "row", gap: 8 } as any,
  btnRed: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.black } as any,
  btnWhite: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black } as any,
  btnBlack: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.black, borderWidth: 2, borderColor: theme.color.paper } as any,
  cta: {
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: theme.color.paper,
    paddingHorizontal: 20,
    paddingVertical: 10,
    transform: [{ skewX: "-8deg" }],
  } as any,
  ctaText: { fontFamily: theme.font.display, fontSize: 14, letterSpacing: 2, color: theme.color.paper, transform: [{ skewX: "8deg" }] } as any,
  foot: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 1, color: "#888" } as any,
});
