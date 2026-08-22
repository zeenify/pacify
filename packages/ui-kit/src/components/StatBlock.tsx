import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * Mono stat display — label above, big mono number below.
 */
export function StatBlock({ label, value, tone = "paper" }: { label: string; value: string | number; tone?: "paper" | "crimson" }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === "crimson" && { color: theme.color.crimson }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start" },
  label: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 2,
  },
  value: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 22,
    letterSpacing: 1,
  },
});
