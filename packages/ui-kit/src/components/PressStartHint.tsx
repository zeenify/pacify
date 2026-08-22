import React from "react";
import { Pressable, Text, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

export function PressStartHint({ label, onPress }: { label: string; onPress?: () => void }) {
  const isWeb = Platform.OS === "web";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={20}
      style={({ hovered, pressed }) => [
        styles.wrap as any,
        hovered && !pressed && { transform: [{ skewX: "-8deg" }, { translateX: -2 }, { translateY: -2 }] } as any,
        pressed && { transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }] } as any,
        isWeb && ({ transition: "transform 150ms" } as any),
      ]}
    >
      <Text style={[styles.text as any, isWeb && ({ animation: "p5-blink 900ms step-end infinite" } as any)]}>{`▶  ${label}  ◀`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.color.crimson,
    borderWidth: 4,
    borderColor: theme.color.paper,
    paddingHorizontal: 28,
    paddingVertical: 12,
    transform: [{ skewX: "-8deg" }],
    // 8px hard shadow via margin
    marginRight: 8,
    marginBottom: 8,
  } as any,
  text: {
    fontFamily: theme.font.display,
    fontSize: 16,
    letterSpacing: 4,
    color: theme.color.paper,
    transform: [{ skewX: "8deg" }],
    textAlign: "center",
  } as any,
});
