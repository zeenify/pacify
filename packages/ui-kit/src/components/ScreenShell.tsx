import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

/**
 * Game shell — not a website container.
 * Black desk with diagonal hachure, halftone burst, grain, and a hard paper frame.
 */
export function ScreenShell({ children, tint = "black" }: { children: React.ReactNode; tint?: "black" | "ink" }) {
  return (
    <View style={[styles.root, tint === "ink" && { backgroundColor: theme.color.ink }]}>
      {/* hachure stripes */}
      <View style={styles.stripes as any} pointerEvents="none" />
      {/* halftone phantom burst */}
      <View style={styles.burst as any} pointerEvents="none" />
      <View style={styles.burst2 as any} pointerEvents="none" />
      {/* grain */}
      {Platform.OS === "web" ? <View style={styles.grain as any} pointerEvents="none" /> : null}
      {/* paper inner frame */}
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.black,
    padding: 14,
  } as any,
  stripes: {
    position: "absolute",
    inset: 0,
    opacity: 0.35,
    // fallback to CSS class on web, inline repeating stripe on native
    backgroundColor: "transparent",
  } as any,
  burst: {
    position: "absolute",
    width: 700,
    height: 700,
    borderRadius: 350,
    top: -320,
    right: -240,
    backgroundColor: "rgba(212,0,0,0.08)",
    borderWidth: 28,
    borderColor: "rgba(212,0,0,0.08)",
    transform: [{ rotate: "12deg" }],
  } as any,
  burst2: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: 260,
    bottom: -200,
    left: -180,
    backgroundColor: "rgba(250,250,245,0.04)",
    borderWidth: 18,
    borderColor: "rgba(250,250,245,0.06)",
  } as any,
  grain: {
    position: "absolute",
    inset: 0,
    opacity: 0.07,
  } as any,
  frame: {
    flex: 1,
    borderWidth: theme.border.thick,
    borderColor: theme.color.paper,
    backgroundColor: "rgba(10,10,10,0.72)",
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: 76,
    overflow: "hidden",
  } as any,
});
