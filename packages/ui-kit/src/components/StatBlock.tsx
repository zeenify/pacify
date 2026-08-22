import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

export function StatBlock({ label, value, tone = "paper" }: { label: string; value: string | number; tone?: "paper" | "crimson" }) {
  return (
    <View style={styles.wrap as any}>
      <Text style={styles.label as any}>{label}</Text>
      <Text style={[styles.value as any, tone === "crimson" && ({ color: theme.color.crimson } as any)]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", minWidth: 64 } as any,
  label: {
    fontFamily: theme.font.body,
    fontSize: 9,
    letterSpacing: 2,
    color: theme.color.yellow,
    fontWeight: "600",
    transform: [{ skewX: "-6deg" }],
    textShadow: "1px 1px 0 #000",
  } as any,
  value: {
    fontFamily: theme.font.display,
    fontSize: 32,
    color: theme.color.paper,
    letterSpacing: 1,
    WebkitTextStrokeWidth: 1,
    WebkitTextStrokeColor: "#000",
    textShadow: "3px 3px 0 #000",
  } as any,
});