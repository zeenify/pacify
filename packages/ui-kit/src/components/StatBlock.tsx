import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * P5 stat — mono label over giant display value with hard shadow, inside a slashed box.
 */
export function StatBlock({ label, value, tone = "paper" }: { label: string; value: string | number; tone?: "paper" | "crimson" }) {
  return (
    <View style={styles.wrap as any}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueBox as any}>
        <Text style={[styles.value, tone === "crimson" && { color: theme.color.crimson } as any]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-start", minWidth: 72 } as any,
  label: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: "800",
    marginBottom: 3,
  } as any,
  valueBox: {
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    paddingHorizontal: 8,
    paddingVertical: 2,
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  value: {
    color: theme.color.black,
    fontFamily: theme.font.display,
    fontSize: 18,
    letterSpacing: 1,
    transform: [{ skewX: `${-theme.skew}deg` }],
  } as any,
});
