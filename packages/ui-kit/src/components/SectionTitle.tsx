import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * Eyebrow chip + big Archivo heading + underline slash (ninjaruss page headers).
 */
export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.eyebrowBg, { transform: [{ skewX: `${theme.skew}deg` }] }]}>
        <Text style={[styles.eyebrow, { transform: [{ skewX: `${-theme.skew}deg` }] }]}>{eyebrow}</Text>
      </View>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      <View style={styles.slash} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.space.lg },
  eyebrowBg: {
    backgroundColor: theme.color.crimson,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 4,
  },
  eyebrow: {
    color: theme.color.paper,
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 3,
  },
  title: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 34,
    letterSpacing: 1,
    marginTop: 2,
  },
  slash: {
    width: 120,
    height: 4,
    backgroundColor: theme.color.crimson,
    transform: [{ rotate: "-1.5deg" }],
    marginTop: 4,
  },
});
