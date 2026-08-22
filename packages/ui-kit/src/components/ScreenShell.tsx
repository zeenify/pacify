import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../tokens";

/**
 * Landscape screen shell: dot-grid black bg + safe padding.
 * All screens render inside this for consistency.
 */
export function ScreenShell({ children, tint = "black" }: { children: React.ReactNode; tint?: "black" | "ink" }) {
  return <View style={[styles.root, tint === "ink" && { backgroundColor: theme.color.ink }]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.black,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: 76, // room for NavBar
    // dot grid via backgroundImage not supported in RN; overlay component handles it
  },
});
