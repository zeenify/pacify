import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * P5 tag — skewed, hard border, hachure bite.
 */
export function LabelChip({ label, tone = "crimson" }: { label: string; tone?: "crimson" | "paper" | "black" }) {
  const bg =
    tone === "crimson" ? theme.color.crimson : tone === "paper" ? theme.color.paper : theme.color.black;
  const fg = tone === "paper" ? theme.color.black : theme.color.paper;
  return (
    <View style={[styles.chip, { backgroundColor: bg } as any]}>
      <View style={styles.hach as any} />
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: theme.color.paper,
    transform: [{ skewX: `${theme.skew}deg` }],
    overflow: "hidden",
  } as any,
  hach: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(250,250,245,0.18)",
  } as any,
  text: {
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "800",
    transform: [{ skewX: `${-theme.skew}deg` }],
  } as any,
});
