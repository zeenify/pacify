/* P5Back — the ONE reusable back-navigation button. Big skewed crimson slab,
   hard black offset shadow that GROWS on hover, yellow sweep bar, arrow kick,
   entrance slam. Use on every screen that needs a way out. */
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { playHover } from "../lib/sfx";

const web = Platform.OS === "web";

export function P5Back({
  label = "MENU",
  to = "/menu",
  onPress,
  style,
}: {
  label?: string;
  to?: string;
  onPress?: () => void;
  style?: any;
}) {
  return (
    <Pressable
      onHoverIn={playHover}
      onPress={onPress ?? (() => router.replace(to))}
      style={({ hovered, pressed }) => [
        s.wrap as any,
        style,
        hovered && !pressed && (s.hov as any),
        pressed && (s.down as any),
        web && ({ transition: "transform 160ms cubic-bezier(0.175,0.885,0.32,1.275)" } as any),
      ]}
    >
      {({ hovered }) => (
        <>
          {/* hard offset shadow block */}
          <View style={[s.shadowBlock as any, hovered && { transform: [{ translateX: -4 }, { translateY: -4 }] } as any]} />
          {/* crimson slab */}
          <View style={s.slab as any}>
            <Text style={[s.arrow as any, hovered && (s.arrowHov as any)]}>{hovered ? "◀" : "◁"}</Text>
            <Text style={s.txt as any}>{label}</Text>
          </View>
          {/* yellow sweep bar */}
          <View style={[s.bar as any, hovered ? { width: "100%" } : { width: "34%" }]} />
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
    transform: [{ skewX: "-8deg" }],
    zIndex: 100,
  } as any,
  hov: {
    transform: [{ skewX: "-8deg" }, { translateX: -5 }, { translateY: -5 }],
  } as any,
  down: {
    transform: [{ skewX: "-8deg" }, { translateX: 2 }, { translateY: 2 }],
    opacity: 0.94,
  } as any,
  shadowBlock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.black,
    borderWidth: 3,
    borderColor: theme.color.black,
    transform: [{ translateX: 8 }, { translateY: 8 }],
  } as any,
  slab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.color.crimson,
    borderWidth: 3,
    borderColor: theme.color.black,
    paddingVertical: 13,
    paddingHorizontal: 24,
  } as any,
  arrow: {
    fontFamily: theme.font.body,
    fontSize: 20,
    lineHeight: 24,
    color: theme.color.yellow,
    fontWeight: "800",
  } as any,
  arrowHov: { transform: [{ translateX: -6 }] } as any,
  txt: {
    fontFamily: theme.font.display,
    fontSize: 21,
    letterSpacing: 3,
    color: theme.color.paper,
  } as any,
  bar: {
    position: "absolute",
    bottom: -9,
    left: 0,
    height: 5,
    backgroundColor: theme.color.yellow,
    ...(web ? ({ transition: "width 200ms cubic-bezier(0.16,1,0.3,1)" } as any) : {}),
  } as any,
});
