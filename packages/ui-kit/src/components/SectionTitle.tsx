import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

/**
 * Clean P5 header — like .kicker + .pagetitle + .role
 */
export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.wrap as any}>
      <Text style={styles.kicker as any}>{eyebrow}</Text>
      <Text
        style={[
          styles.title as any,
          Platform.OS === "web" && ({ animation: "heroIn 520ms cubic-bezier(0.175,0.885,0.32,1.275) forwards" } as any),
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View style={styles.slash as any} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18, gap: 6 } as any,
  kicker: {
    fontFamily: theme.font.body,
    fontSize: 13,
    letterSpacing: 6,
    color: theme.color.yellow,
    fontWeight: "600",
  } as any,
  title: {
    fontFamily: theme.font.display,
    fontSize: 56,
    lineHeight: 56 as any,
    letterSpacing: 1,
    color: theme.color.paper,
    transform: [{ skewX: "-8deg" }],
    textShadowColor: theme.color.crimson,
    textShadowOffset: { width: 6, height: 6 },
    textShadowRadius: 0,
  } as any,
  slash: { width: 120, height: 4, backgroundColor: theme.color.crimson, transform: [{ skewX: "-8deg" }], marginTop: 6 } as any,
});
