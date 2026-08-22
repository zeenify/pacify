import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

export function LabelChip({ label, tone = "crimson" }: { label: string; tone?: "crimson" | "paper" | "black" }) {
  const bg = tone === "crimson" ? theme.color.crimson : tone === "paper" ? theme.color.paper : theme.color.black;
  const fg = tone === "paper" ? theme.color.black : theme.color.paper;
  return (
    <View style={[styles.chip as any, { backgroundColor: bg }]}>
      <Text style={[styles.text as any, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.color.paper,
    transform: [{ skewX: "-8deg" }],
  } as any,
  text: {
    fontFamily: theme.font.body,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    transform: [{ skewX: "8deg" }],
  } as any,
});
