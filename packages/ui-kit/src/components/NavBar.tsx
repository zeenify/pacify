import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { theme } from "../tokens";

export type NavItem = { key: string; label: string; locked?: boolean };

export function NavBar({ items, active, onSelect }: { items: NavItem[]; active: string; onSelect: (key: string) => void }) {
  return (
    <View style={[styles.wrap, { pointerEvents: "box-none" } as any]}>
      <View style={styles.bar}>
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <Pressable
              key={it.key}
              onPress={() => !it.locked && onSelect(it.key)}
              style={({ pressed, hovered }) => [
                styles.tab,
                isActive && styles.tabActive,
                it.locked && styles.tabLocked,
                Platform.OS === "web" && ({ transition: "all 120ms" } as any),
                hovered && !isActive && !pressed && { transform: [{ translateY: -2 }] } as any,
                pressed && { transform: [{ translateY: 2 }], opacity: 0.95 } as any,
              ]}
            >
              <Text style={[styles.label, isActive && styles.labelActive, it.locked && styles.labelLocked]} numberOfLines={1}>
                {it.label}
                {it.locked ? "  ◆" : ""}
              </Text>
              {isActive ? <View style={styles.underline as any} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", bottom: 14, left: 14, right: 14, alignItems: "center" } as any,
  bar: {
    flexDirection: "row",
    backgroundColor: theme.color.paper,
    borderWidth: theme.border.medium,
    borderColor: theme.color.black,
    padding: 3,
    gap: 3,
    transform: [{ skewX: `${theme.skew}deg` }],
    marginRight: 4,
    marginBottom: 4,
  } as any,
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.color.black,
    borderWidth: 1.5,
    borderColor: theme.color.black,
    transform: [{ skewX: `${-theme.skew}deg` }],
  } as any,
  tabActive: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  tabLocked: { opacity: 0.45 } as any,
  label: { color: theme.color.paper, fontFamily: theme.font.mono, fontSize: 10, letterSpacing: 1.4, fontWeight: "800" } as any,
  labelActive: { color: theme.color.paper } as any,
  labelLocked: { color: theme.color.paperDim } as any,
  underline: {
    position: "absolute",
    bottom: -3,
    left: 6,
    right: 6,
    height: 3,
    backgroundColor: theme.color.paper,
  } as any,
});