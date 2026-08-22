import { View, Text, StyleSheet } from "react-native";
import { ScreenShell, SectionTitle, NavBar, WedgeButton, theme } from "@pacify/ui-kit";
import { router } from "expo-router";

export default function Multiplayer() {
  return (
    <ScreenShell>
      <SectionTitle eyebrow="LOCKED • ARCADE CABINET" title="Multiplayer" />
      <View style={s.stage as any}>
        <View style={s.cabinet as any}>
          <View style={s.cabinetTop as any}>
            <View style={s.marquee as any}><Text style={s.marqueeText}>1V1  •  SAME ENGINE  •  SAME TRICKS</Text></View>
          </View>
          <View style={s.screen as any}>
            <Text style={s.big}>COMING SOON</Text>
            <Text style={s.sub}>Human vs human — hidden hands, same 5-card singleton, same 5 tricks. No AI tells to farm.</Text>
            <View style={s.tape as any} />
          </View>
          <View style={s.controls as any}>
            <View style={s.stick as any} />
            <View style={s.buttons as any}><View style={s.btnRed as any} /><View style={s.btnWhite as any} /><View style={s.btnBlack as any} /></View>
          </View>
        </View>

        <View style={s.actionRow as any}>
          <WedgeButton label="NOTIFY ME" variant="ghost" size="md" onPress={() => router.push("/menu")} />
          <WedgeButton label="BACK TO MENU" size="md" onPress={() => router.replace("/menu")} />
        </View>
        <Text style={s.foot}>Leave your email in Profile — we'll ping when the cabinet opens.</Text>
      </View>
      <NavBar items={[{ key: "menu", label: "MENU" }]} active="multiplayer" onSelect={(k) => router.push(`/${k}`)} />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  stage: { gap: 14, alignItems: "center" } as any,
  cabinet: {
    width: 420,
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.thick,
    borderColor: theme.color.black,
    overflow: "hidden",
  } as any,
  cabinetTop: { backgroundColor: theme.color.crimson, padding: 8, borderBottomWidth: 3, borderBottomColor: theme.color.black } as any,
  marquee: { backgroundColor: theme.color.black, paddingHorizontal: 8, paddingVertical: 4, transform: [{ skewX: `${theme.skew}deg` }] } as any,
  marqueeText: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 3, textAlign: "center", transform: [{ skewX: `${-theme.skew}deg` }] } as any,
  screen: {
    margin: 12,
    backgroundColor: theme.color.black,
    borderWidth: 3,
    borderColor: theme.color.black,
    padding: 18,
    gap: 10,
    alignItems: "center",
  } as any,
  big: { color: theme.color.paper, fontFamily: theme.font.display, fontSize: 26, letterSpacing: 3 } as any,
  sub: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 10, lineHeight: 14 as any, textAlign: "center" } as any,
  tape: { width: 72, height: 10, backgroundColor: "rgba(250,250,245,0.85)", transform: [{ rotate: "-4deg" }], marginTop: 6 } as any,
  controls: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: theme.color.surface2, borderTopWidth: 3, borderTopColor: theme.color.black } as any,
  stick: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.paper } as any,
  buttons: { flexDirection: "row", gap: 8 } as any,
  btnRed: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.black } as any,
  btnWhite: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black } as any,
  btnBlack: { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.color.black, borderWidth: 2, borderColor: theme.color.paper } as any,
  actionRow: { flexDirection: "row", gap: 10 } as any,
  foot: { color: theme.color.paperDim, fontFamily: theme.font.mono, fontSize: 9, letterSpacing: 1 } as any,
});
