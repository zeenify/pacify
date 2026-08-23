/* CAMPAIGN — THE THIRTEEN SEATS — premium pointed tickets */
import { View, Text, Pressable, StyleSheet, Platform, Image } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { api } from "../lib/api";
import { playHover } from "../lib/sfx";
import { P5Back } from "../components/P5Back";

const web = Platform.OS === "web";
const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

type StudentRow = {
  id: number;
  seat: string;
  title: string;
  tier: number;
  cleared: boolean;
  attempts: number;
  wins: number;
  losses: number;
  bestScore: number;
};

export default function Campaign() {
  const [data, setData] = useState<{ students: StudentRow[]; clearedCount: number } | null>(null);

  useEffect(() => {
    api("/campaign")
      .then((d: any) => setData(d))
      .catch(() => router.replace("/"));
  }, []);

  if (!data) {
    return (
      <View style={s.stage as any}>
        <Text style={[s.loadingTxt as any, web && ({ animation: "p5-blinkHard 0.9s steps(2) infinite" } as any)]}>PLOTTING THE ROUTE…</Text>
      </View>
    );
  }

  return (
    <View style={s.stage as any}>
      <P5Back style={{ position: "absolute", top: 20, left: 20, zIndex: 99 } as any} />
      <SampleD data={data} />
    </View>
  );
}

/* ============ D — PREMIUM POINTED TICKET — rebuilt from scratch ============ */
function SampleD({ data }: { data: { students: StudentRow[]; clearedCount: number } }) {
  const [selected, setSelected] = useState<number | null>(null);
  const nextId = data.clearedCount + 1;

  return (
    <View style={s.dStage as any}>
      <View style={s.dHeader as any}>
        <Text style={[s.dTitle as any, web && ({ animation: "heroIn 600ms 80ms both" } as any)]}>THE THIRTEEN</Text>
        <Text style={[s.dSub as any, web && ({ animation: "heroIn 500ms 260ms both" } as any)]}>VERTEX INSTITUTE — FIRST YEAR ELITE — HOVER A SEAT</Text>
      </View>

      <View style={s.dRow as any}>
        {data.students.map((st, i) => {
          const isNext = st.id === nextId;
          const locked = st.id > nextId;
          const isRealAsset = st.id === 2;
          const uri = "/students/2clubs9x16.png";

          const isActive = selected === st.id;
          return (
            <Pressable
              key={st.id}
              onPress={
                !locked
                  ? () => {
                      const willSelect = selected !== st.id;
                      if (willSelect) playHover();
                      setSelected(willSelect ? st.id : null);
                    }
                  : undefined
              }
              style={[
                s.dWrap as any,
                isActive && (s.dWrapHovered as any),
                web && ({ animation: `jokerIn 500ms ${100 + i * 42}ms both` } as any),
              ]}
            >
              {/* border shell — clipped, creates the crisp pointed outline */}
              <View
                style={[
                  s.dShell as any,
                  locked && (s.dShellLocked as any),
                  st.cleared && (s.dShellCleared as any),
                  isNext && (s.dShellNext as any),
                  isActive && !locked && (s.dShellHovered as any),
                ]}
              >
                {/* inner fill — same clip inset by 2.5px */}
                <View
                  style={[
                    s.dFill as any,
                    locked && (s.dFillLocked as any),
                    st.cleared && (s.dFillCleared as any),
                    isNext && (s.dFillNext as any),
                  ]}
                >
                  {/* subtle top highlight */}
                  <View style={s.dHighlight as any} pointerEvents="none" />

                  {/* seat number */}
                  <Text style={[s.dSeatNum as any, isActive && (s.dSeatNumHovered as any)]}>{String(st.id).padStart(2, "0")}</Text>

                  {/* status */}
                  {locked && (
                    <View style={s.dLockBadge as any}>
                      <Text style={s.dLockTxt as any}>LOCKED</Text>
                    </View>
                  )}
                  {st.cleared && !locked && (
                    <View style={s.dClearedBadge as any}>
                      <Text style={s.dClearedTxt as any}>PACIFIED</Text>
                    </View>
                  )}
                  {isNext && !st.cleared && !locked && (
                    <View style={s.dNextBadge as any}>
                      <Text style={s.dNextTxt as any}>TARGET</Text>
                    </View>
                  )}
                </View>

                {/* diamond rivets at the two points */}
                <View style={[s.dRivet as any, s.dRivetTop as any]} pointerEvents="none" />
                <View style={[s.dRivet as any, s.dRivetBottom as any]} pointerEvents="none" />
              </View>

              {/* character — silhouette faint, hover pops in front */}
              <View style={s.dImgWrap as any} pointerEvents="none">
                <Image
                  source={{ uri }}
                  style={[
                    s.dImg as any,
                    !isActive && (s.dImgSilhouette as any),
                    isActive && (s.dImgPop as any),
                    !isRealAsset && !isActive && ({ opacity: 0.48 } as any),
                    locked && !isActive && ({ opacity: 0.28 } as any),
                  ]}
                  resizeMode="contain"
                />
              </View>

              <Text style={[s.dSeatLabel as any, isActive && (s.dSeatLabelHovered as any)]}>{st.seat}</Text>
              {isActive && !locked && (
                <View style={s.dHoverBar as any} pointerEvents="none">
                  <Text style={s.dHoverBarTxt as any}>{st.cleared ? "REMATCH" : isNext ? "CHALLENGE →" : "VIEW"}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={s.dFoot as any}>CLICK A TICKET — THE SILHOUETTE STEPS FORWARD AND STAYS</Text>
    </View>
  );
}

const CLIP = "polygon(50% 0%, 90% 4%, 100% 8%, 100% 92%, 90% 96%, 50% 100%, 10% 96%, 0% 92%, 0% 8%, 10% 4%)";
// Bottom half matches CLIP exactly — top is opened to -40% so head/shoulders can extend above the red frame
const CLIP_BOTTOM = "polygon(0% -40%, 100% -40%, 100% 92%, 90% 96%, 50% 100%, 10% 96%, 0% 92%)";

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,
  loadingTxt: { fontFamily: theme.font.display, fontSize: 32, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }] } as any,

  /* D — premium ticket */
  dStage: { flex: 1, paddingHorizontal: "1.4%", paddingTop: 72, paddingBottom: 22, zIndex: 2 } as any,
  dHeader: { alignItems: "center", marginBottom: 18 } as any,
  dTitle: { fontFamily: theme.font.display, fontSize: 58, color: theme.color.paper, letterSpacing: 5, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  dSub: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.45)", fontWeight: "800", marginTop: 6 } as any,
  dRow: { flexDirection: "row", gap: 8, height: 580, alignItems: "flex-end", justifyContent: "center" } as any,
  dWrap: {
    flex: 1,
    height: 580,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
    ...(web ? ({ transition: "flex 520ms cubic-bezier(0.16,1,0.3,1)" } as any) : {}),
  } as any,
  dWrapHovered: { flex: 2.05 } as any,

  dShell: {
    width: "100%",
    height: 540,
    backgroundColor: "#1e1e1e",
    alignItems: "center",
    paddingTop: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    ...(web
      ? ({
          clipPath: CLIP,
          transition: "transform 480ms cubic-bezier(0.16,1,0.3,1), background-color 240ms, box-shadow 240ms",
        } as any)
      : {}),
  } as any,
  dShellHovered: {
    backgroundColor: theme.color.crimson,
    transform: [{ translateY: -12 }],
    shadowOpacity: 0.32,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  } as any,
  dShellLocked: { backgroundColor: "#151515", opacity: 0.92 } as any,
  dShellNext: { backgroundColor: "#1a0f10", shadowColor: theme.color.crimson, shadowOpacity: 0.18, shadowRadius: 16 } as any,
  dShellCleared: { backgroundColor: "#1e1a00" } as any,

  dFill: {
    ...StyleSheet.absoluteFillObject,
    top: 2.5,
    left: 2.5,
    right: 2.5,
    bottom: 2.5,
    backgroundColor: "#0c0c0c",
    alignItems: "center",
    paddingTop: 14,
    ...(web
      ? ({
          clipPath: CLIP,
          backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.035) 0%, transparent 22%, transparent 80%, rgba(230,0,18,0.07) 100%)",
        } as any)
      : {}),
  } as any,
  dFillLocked: { backgroundColor: "#0a0a0a" } as any,
  dFillNext: { backgroundColor: "#120a0a" } as any,
  dFillCleared: { backgroundColor: "#121000" } as any,

  dHighlight: {
    position: "absolute",
    top: 0,
    left: "8%",
    right: "8%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
  } as any,

  dRivet: {
    position: "absolute",
    left: "50%",
    width: 8,
    height: 8,
    marginLeft: -4,
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    transform: [{ rotate: "45deg" }],
    zIndex: 6,
  } as any,
  dRivetTop: { top: 4 } as any,
  dRivetBottom: { bottom: 4 } as any,

  dSeatNum: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.32)", fontWeight: "800", zIndex: 2 } as any,
  dSeatNumHovered: { color: theme.color.yellow } as any,
  dLockBadge: { marginTop: 10, backgroundColor: "rgba(0,0,0,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: "-6deg" }], zIndex: 2 } as any,
  dLockTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.45)", fontWeight: "800" } as any,
  dClearedBadge: { marginTop: 10, backgroundColor: theme.color.yellow, borderWidth: 1, borderColor: theme.color.black, paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: "-4deg" }], zIndex: 2 } as any,
  dClearedTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: theme.color.black, fontWeight: "900" } as any,
  dNextBadge: { marginTop: 10, backgroundColor: theme.color.crimson, borderWidth: 1, borderColor: theme.color.paper, paddingHorizontal: 7, paddingVertical: 3, transform: [{ rotate: "4deg" }], zIndex: 2 } as any,
  dNextTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: theme.color.paper, fontWeight: "900" } as any,

  dImgWrap: {
    position: "absolute",
    top: 2.5,
    left: 2.5,
    right: 2.5,
    bottom: 2.5,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    zIndex: 2,
    // Derived from CLIP — bottom edge is byte-for-byte the same polygon points as the red frame,
    // top is opened to -40% so the upper half extends in front of the frame
    ...(web ? ({ clipPath: CLIP_BOTTOM } as any) : {}),
  } as any,
  dImg: {
    width: "130%",
    height: "130%",
    ...(web
      ? ({
          objectFit: "contain",
          objectPosition: "50% 10%",
          transition: "transform 520ms cubic-bezier(0.16,1,0.3,1), filter 380ms, opacity 380ms",
        } as any)
      : {}),
  } as any,
  dImgSilhouette: {
    transform: [{ scale: 1.12 }],
    ...(web
      ? ({
          filter: "brightness(0.10) contrast(1.06) drop-shadow(0 0 10px rgba(255,255,255,0.18))",
          opacity: 0.92,
        } as any)
      : { opacity: 0.34 }),
  } as any,
  dImgPop: {
    transform: [{ scale: 1.38 }],
    ...(web ? ({ filter: "brightness(1) contrast(1.04) drop-shadow(0 14px 28px rgba(0,0,0,0.62))" } as any) : { opacity: 1 }),
  } as any,

  dSeatLabel: { marginTop: 12, fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, color: "rgba(255,255,255,0.32)", fontWeight: "800", textAlign: "center" } as any,
  dSeatLabelHovered: { color: theme.color.paper } as any,
  dHoverBar: { marginTop: 7, backgroundColor: theme.color.crimson, paddingHorizontal: 10, paddingVertical: 4, transform: [{ skewX: "-8deg" }] } as any,
  dHoverBarTxt: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 1.5, color: theme.color.paper, fontWeight: "900" } as any,
  dFoot: { marginTop: 18, textAlign: "center", fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.28)" } as any,
});
