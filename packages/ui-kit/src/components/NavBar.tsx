import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { theme } from "../tokens";

export type NavItem = { key: string; label: string; locked?: boolean };

/**
 * Bottom segmented nav bar — ninjaruss style. Active = filled crimson wedge.
 */
export function NavBar({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={styles.bar}>
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <Pressable
            key={it.key}
            onPress={() => !it.locked && onSelect(it.key)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {it.label}
              {it.locked ? " 🔒" : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 14,
    left: 14,
    flexDirection: "row",
    borderWidth: theme.border.medium,
    borderColor: theme.color.paper,
    backgroundColor: theme.color.ink,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRightWidth: theme.border.thin,
    borderRightColor: theme.color.border,
  },
  tabActive: { backgroundColor: theme.color.crimson },
  label: {
    color: theme.color.paper,
    fontFamily: theme.font.display,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  labelActive: { color: theme.color.paper },
});
