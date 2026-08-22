/* P5Back v2 — built the way Atlus builds buttons: TWO stacked clip-path
   polygons (jagged black underlayer offset behind a crimson trapezoid),
   a white circle badge whose arrow spins on hover, and a yellow slash
   revealed between the separating layers. Text never skews — only the
   background layers do, so the label stays crisp. */
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
      style={[s.hit as any, style]}
    >
      {({ hovered }) => {
        const sep = hovered && !false;
        return (
          <View style={s.stage as any}>
            {/* yellow slash — hidden between the layers until hover separates them */}
            <View style={[s.slash as any, sep && (s.slashHov as any)]} />

            {/* layer 1 — jagged black underlayer (the Atlus sticker outline) */}
            <View style={[s.jag as any, sep && (s.jagHov as any)]} />

            {/* layer 2 — crimson trapezoid face */}
            <View style={[s.face as any, hovered && (s.faceHov as any)]}>
              <View style={s.row as any}>
                <View style={[s.badgeSpin as any, hovered && (s.badgeHov as any)]}>
                  <Text style={s.badgeTxt as any}>{hovered ? "◀" : "◁"}</Text>
                </View>
                <Text style={s.txt as any}>{label}</Text>
              </View>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

/* slants capped in px so short labels don't get eaten */
const FACE_CLIP = "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)";
const JAG_CLIP = "polygon(18px 6%, 102% 0%, calc(100% - 8px) 94%, -2% 100%)";

const s = StyleSheet.create({
  hit: { alignSelf: "flex-start", zIndex: 100 } as any,
  stage: { position: "relative", width: 172, height: 62 } as any,

  slash: {
    position: "absolute",
    top: "50%",
    left: -14,
    right: -14,
    height: 7,
    marginTop: -3,
    backgroundColor: theme.color.yellow,
    transform: [{ rotate: "-4deg" }],
    opacity: 0,
    zIndex: 1,
    ...(web ? ({ transition: "opacity 140ms" } as any) : {}),
  } as any,
  slashHov: { opacity: 1 } as any,

  jag: {
    position: "absolute",
    top: 10,
    left: 10,
    right: -8,
    bottom: -8,
    backgroundColor: theme.color.black,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.14)",
    ...(web ? ({ clipPath: JAG_CLIP, transition: "transform 170ms cubic-bezier(0.16,1,0.3,1)" } as any) : {}),
    zIndex: 2,
  } as any,
  jagHov: { transform: [{ translateX: 9 }, { translateY: 9 }, { rotate: "2deg" }] } as any,

  face: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.crimson,
    borderWidth: 2,
    borderColor: theme.color.black,
    overflow: "hidden",
    zIndex: 3,
    ...(web ? ({ clipPath: FACE_CLIP, transition: "transform 170ms cubic-bezier(0.16,1,0.3,1), background-color 150ms" } as any) : {}),
  } as any,
  faceHov: { transform: [{ translateX: -5 }, { translateY: -5 }], backgroundColor: "#c80010" } as any,

  row: { flex: 1, flexDirection: "row", alignItems: "center", gap: 13, paddingLeft: 24, paddingRight: 20 } as any,

  // white circle badge — arrow spins a quarter turn on hover
  badgeSpin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.color.paper,
    borderWidth: 2,
    borderColor: theme.color.black,
    alignItems: "center",
    justifyContent: "center",
    ...(web ? ({ transition: "transform 260ms cubic-bezier(0.16,1,0.3,1)" } as any) : {}),
  } as any,
  badgeHov: { transform: [{ rotate: "-360deg" }] } as any,
  badgeTxt: { fontFamily: theme.font.body, fontSize: 16, lineHeight: 19, color: theme.color.crimson, fontWeight: "800" } as any,

  txt: {
    flex: 1,
    fontFamily: theme.font.display,
    fontSize: 23,
    letterSpacing: 3,
    color: theme.color.paper,
    textShadow: "2px 2px 0 rgba(0,0,0,0.35)",
  } as any,
});
