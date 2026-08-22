import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

/**
 * P5 section header — skewed crimson eyebrow, giant outlined title with hard drop, slash + diamond.
 */
export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.wrap as any}>
      <View style={[styles.eyebrowBg as any]}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text
        style={[
          styles.title as any,
          Platform.OS === "web" && ({ animation: "p5-entrance-unskew 400ms cubic-bezier(0.16,1,0.3,1)" } as any),
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View style={styles.slashRow as any}>
        <View style={styles.slash as any} />
        <View style={styles.diamond as any} />
        <View style={styles.slashThin as any} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.lg, gap: 6 } as any,
  eyebrowBg: {
    backgroundColor: theme.color.crimson,
    borderWidth: 2,
    borderColor: theme.color.paper,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    transform: [{ skewX: `${theme.skew}deg` }],
  } as any,
  eyebrow: {
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "800",
    transform: [{ skewX: `${-theme.skew}deg` }],
  } as any,
  title: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 32,
    letterSpacing: 2,
    // hard P5 drop
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  } as any,
  slashRow: { flexDirection: "row", alignItems: "center", gap: 8 } as any,
  slash: { width: 120, height: 6, backgroundColor: theme.color.paper, transform: [{ skewX: `${theme.skew}deg` }] } as any,
  slashThin: { width: 60, height: 3, backgroundColor: theme.color.crimson, transform: [{ skewX: `${theme.skew}deg` }], opacity: 0.9 } as any,
  diamond: { width: 10, height: 10, backgroundColor: theme.color.crimson, transform: [{ rotate: "45deg" }] } as any,
});
