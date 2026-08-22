import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { theme } from "../tokens";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "ghost" | "locked";
  size?: "md" | "lg" | "hero";
  sub?: string;
};

/**
 * Slanted wedge button — the core interactive primitive.
 * Hard crimson offset shadow that grows on hover and collapses on press.
 */
export function WedgeButton({ label, onPress, variant = "primary", size = "lg", sub }: Props) {
  const padV = size === "hero" ? 18 : size === "lg" ? 14 : 10;
  const fontS = size === "hero" ? 28 : size === "lg" ? 18 : 13;

  if (variant === "locked") {
    return (
      <View style={[styles.base, styles.locked, { paddingVertical: padV }]}>
        <Text style={[styles.label, { fontSize: fontS, color: theme.color.paperDim }]}>{label}</Text>
        <Text style={styles.lockedTag}>COMING SOON</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" ? styles.primary : styles.ghost,
        {
          paddingVertical: padV,
          transform: [{ skewX: `${theme.skew}deg` }, { translateX: pressed ? 2 : 0 }],
        },
        variant === "primary" && (pressed ? styles.primaryPressed : styles.primaryShadow),
      ]}
    >
      <View style={{ transform: [{ skewX: `${-theme.skew}deg` }] }}>
        <Text
          style={[
            styles.label,
            { fontSize: fontS },
            variant === "ghost" && { color: theme.color.paper },
          ]}
        >
          {label}
        </Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    minWidth: 220,
  },
  primary: {
    backgroundColor: theme.color.crimson,
    borderWidth: theme.border.medium,
    borderColor: theme.color.black,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: theme.border.medium,
    borderColor: theme.color.borderStrong,
  },
  primaryShadow: {
    boxShadow: "6px 6px 0 rgba(250,250,245,0.9)",
  } as any,
  primaryPressed: {
    boxShadow: "0px 0px 0 rgba(250,250,245,0.9)",
    transform: [{ skewX: `${theme.skew}deg` }, { translateX: 4 }, { translateY: 4 }],
  } as any,
  locked: {
    backgroundColor: theme.color.surface1,
    borderWidth: theme.border.medium,
    borderColor: theme.color.border,
    opacity: 0.7,
  },
  label: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    letterSpacing: 2,
  },
  lockedTag: {
    color: theme.color.crimson,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 2,
  },
  sub: {
    color: theme.color.paperDim,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
});
