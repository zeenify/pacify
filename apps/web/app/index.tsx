import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { RansomTitle, PressStartHint } from "@pacify/ui-kit";

export default function Title() {
  return (
    <View style={s.root}>
      <View style={s.burst} />
      <RansomTitle text="PACIFY" size={96} />
      <Text style={s.tagline}>SLOW-BURN PSYCHOLOGICAL WAR</Text>
      <PressStartHint label="TAP TO START" onPress={() => router.replace("/menu")} />
      <Text style={s.credit}>a class war · 13 students await</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  burst: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: theme.color.crimson,
    opacity: 0.12,
  },
  tagline: {
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 12,
    letterSpacing: 6,
    opacity: 0.7,
  },
  credit: {
    position: "absolute",
    bottom: 24,
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 10,
    opacity: 0.35,
    letterSpacing: 2,
  },
});
