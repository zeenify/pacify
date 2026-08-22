import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../tokens";

type Props = {
  children: React.ReactNode;
  span?: number; // grid columns to span
  tone?: "dark" | "crimson" | "paper";
  onPress?: () => void;
  locked?: boolean;
  ribbon?: string;
  style?: any;
};

/**
 * Bento tile — hard-bordered panel with crimson hard-shadow on hover.
 * Used for campaign map + dashboard grids.
 */
export function BentoTile({ children, span = 1, tone = "dark", onPress, locked, ribbon, style }: Props) {
  const bg =
    tone === "crimson" ? theme.color.crimson : tone === "paper" ? theme.color.paper : theme.color.surface2;
  const content = (
    <View style={[styles.inner, { backgroundColor: bg }, tone === "paper" && styles.paperInner]}>
      {ribbon ? (
        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>{ribbon}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );

  if (!onPress || locked) {
    return <View style={[styles.tile, { flex: span }, locked && styles.locked, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { flex: span },
        pressed ? styles.tilePressed : styles.tileShadow,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: theme.border.thick,
    borderColor: theme.color.paper,
    minHeight: 120,
    overflow: "hidden",
  },
  tileShadow: { boxShadow: "5px 5px 0 rgba(212,0,0,1)" } as any,
  tilePressed: { boxShadow: "0px 0px 0 rgba(212,0,0,1)", transform: [{ translateX: 3 }, { translateY: 3 }] } as any,
  locked: { opacity: 0.45 },
  inner: { flex: 1, padding: theme.space.md },
  paperInner: {}, // children handle dark text on paper
  ribbon: {
    position: "absolute",
    top: 8,
    right: -18,
    transform: [{ rotate: "35deg" }],
    backgroundColor: theme.color.paper,
    paddingHorizontal: 24,
    paddingVertical: 2,
    zIndex: 2,
  },
  ribbonText: {
    color: theme.color.black,
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 2,
  },
});
