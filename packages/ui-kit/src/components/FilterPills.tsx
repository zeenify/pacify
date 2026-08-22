import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { theme } from "../tokens";

export type PillOption = { key: string; label: string; count?: number };

/**
 * Filter pills — ALL 29 / NOTE 23 / SHOWCASE 6 style. Active = filled crimson, skewed.
 */
export function FilterPills({
  options,
  active,
  onSelect,
}: {
  options: PillOption[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const isActive = o.key === active;
        return (
          <Pressable key={o.key} onPress={() => onSelect(o.key)}>
            <View
              style={[
                styles.pill,
                { transform: [{ skewX: `${theme.skew}deg` }] },
                isActive ? styles.active : {},
              ]}
            >
              <Text style={[styles.text, { transform: [{ skewX: `${-theme.skew}deg` }] }, isActive && styles.textActive]}>
                {o.label.toUpperCase()}
                {o.count !== undefined ? ` ${o.count}` : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  pill: {
    borderWidth: theme.border.medium,
    borderColor: theme.color.paper,
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  active: { backgroundColor: theme.color.crimson },
  text: {
    color: theme.color.paperDim,
    fontFamily: theme.font.display,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  textActive: { color: theme.color.paper },
});
