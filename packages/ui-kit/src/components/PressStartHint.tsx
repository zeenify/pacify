import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * Pulsing "PRESS TO START" mono hint.
 */
export function PressStartHint({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={20}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: theme.color.crimson,
    fontFamily: theme.font.mono,
    fontSize: 13,
    letterSpacing: 6,
    borderWidth: theme.border.thin,
    borderColor: theme.color.crimson,
    paddingHorizontal: 22,
    paddingVertical: 10,
    overflow: "hidden",
  },
});
