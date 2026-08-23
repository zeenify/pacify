import { View, Text, Pressable, StyleSheet } from "react-native";
import { useEffect } from "react";
import { initSfx, unlockSfx, playHover, playClick, playSliderTick, playCardPop } from "../lib/sfx";

export default function SfxTest() {
  useEffect(() => {
    initSfx();
  }, []);
  const wrapUnlockAnd = (fn: () => void) => () => {
    unlockSfx();
    fn();
  };
  return (
    <View style={s.stage}>
      <Text style={s.title}>SFX TEST — tap to unlock then listen</Text>
      <Text style={s.hint}>If you hear nothing, check MAIN/SFX volume in Options and device volume. Files: public/sfx/</Text>
      <View style={s.row}>
        <Pressable onPress={wrapUnlockAnd(playHover)} style={s.btn}><Text style={s.btnTxt}>HOVER (old)</Text></Pressable>
        <Pressable onPress={wrapUnlockAnd(playClick)} style={[s.btn, { backgroundColor: "#E60012" }]}><Text style={s.btnTxt}>CLICK — button confirm</Text></Pressable>
        <Pressable onPress={wrapUnlockAnd(playSliderTick)} style={[s.btn, { backgroundColor: "#FCEE21" }]}><Text style={[s.btnTxt, { color: "#000" }]}>SLIDER tick</Text></Pressable>
        <Pressable onPress={wrapUnlockAnd(playCardPop)} style={[s.btn, { backgroundColor: "#111", borderColor: "#E60012", borderWidth: 2 }]}><Text style={s.btnTxt}>CARD pop — ticket</Text></Pressable>
      </View>
      <Text style={s.note}>Direct files: /hover.wav, /sfx/click.wav, /sfx/slider.wav, /sfx/card.wav</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center", gap: 18, padding: 24 } as any,
  title: { fontFamily: "Anton", fontSize: 28, color: "#fff", letterSpacing: 2 } as any,
  hint: { color: "rgba(255,255,255,0.6)", textAlign: "center", maxWidth: 520 } as any,
  row: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" } as any,
  btn: { backgroundColor: "#222", paddingVertical: 14, paddingHorizontal: 18, borderWidth: 2, borderColor: "#fff", minWidth: 160, alignItems: "center" } as any,
  btnTxt: { color: "#fff", fontWeight: "900", letterSpacing: 1 } as any,
  note: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8 } as any,
});
