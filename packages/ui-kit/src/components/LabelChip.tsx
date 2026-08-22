import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * Skewed tag label — ninjaruss "NOW"/"JOURNAL" chip equivalent.
 * Black text on crimson wedge.
 */
export function LabelChip({ label, tone = "crimson" }: { label: string; tone?: "crimson" | "paper" }) {
  const bg = tone === "crimson" ? theme.color.crimson : theme.color.paper;
  return (
    <View style={[styles.chip, { backgroundColor: bg, transform: [{ skewX: `${theme.skew}deg` }] }]}>
      <Text style={[styles.text, tone === "paper" && { color: theme.color.black }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 11,
    letterSpacing: 1.5,
    transform: [{ skewX: `${-theme.skew}deg` }],
  },
});
