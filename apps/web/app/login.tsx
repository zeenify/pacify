import { View, Text, Pressable, TextInput, StyleSheet, Platform } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { WedgeButton, theme } from "@pacify/ui-kit";
import { api } from "../lib/api";

const web = Platform.OS === "web";

export default function Login() {
  const [tab, setTab] = useState<"signin" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (tab === "register") {
        await api("/auth/register", { username: username.trim(), password, email: email.trim() || undefined });
      } else {
        await api("/auth/login", { username: username.trim(), password });
      }
      router.replace("/menu");
    } catch (e: any) {
      setErr(e?.message ?? "SOMETHING WENT WRONG");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.stage as any}>
      <View style={s.slashL as any} pointerEvents="none" />
      <View style={s.slashR as any} pointerEvents="none" />
      <Text style={s.watermark as any} pointerEvents="none">
        PACIFY
      </Text>

      <View style={s.frame as any}>
        <Text style={[s.logo as any, web && ({ animation: "heroIn 560ms 100ms both" } as any)]}>PACIFY</Text>
        <Text style={s.kicker as any}>{tab === "register" ? "NEW STUDENT // ENROLLMENT" : "WELCOME BACK // SIGN IN"}</Text>

        {/* tabs */}
        <View style={s.tabs as any}>
          {(
            [
              { key: "register", label: "NEW STUDENT" },
              { key: "signin", label: "SIGN IN" },
            ] as const
          ).map((t) => (
            <Pressable key={t.key} onPress={() => { setTab(t.key); setErr(null); }} style={({ hovered }) => [s.tab as any, tab === t.key && (s.tabOn as any), hovered && tab !== t.key && (s.tabHover as any)]}>
              <Text style={[s.tabTxt as any, tab === t.key && { color: theme.color.paper } as any]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.panel as any}>
          <Text style={s.label as any}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="off"
            placeholder="e.g. seat_01"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={s.input as any}
          />

          <Text style={s.label as any}>PASSWORD</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="min. 6 characters"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={s.input as any}
          />

          {tab === "register" && (
            <>
              <Text style={s.label as any}>
                EMAIL <Text style={s.opt as any}>// OPTIONAL — FOR RECOVERY ONLY</Text>
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="skip it if you want"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={s.input as any}
              />
            </>
          )}

          {err && <Text style={s.err as any}>{err}</Text>}

          <View style={{ marginTop: 22 } as any}>
            <WedgeButton label={busy ? "..." : tab === "register" ? "ENROLL" : "SIGN IN"} size="hero" onPress={submit} />
          </View>

          <Text style={s.foot as any}>
            {tab === "register" ? "13 SEATS. HARD FROM STUDENT 01." : "THE CLASS REMEMBERS EVERYTHING."}
          </Text>
        </View>
      </View>
    </View>
  );
}

const HATCH = "repeating-linear-gradient(135deg, #111 0 22px, #0c0c0c 22px 44px)";

const s = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: theme.color.black,
    overflow: "hidden",
    ...(web ? { backgroundImage: HATCH, backgroundSize: "44px 44px", animation: "bgShift 1.8s linear infinite" } as any : {}),
  } as any,
  slashL: { position: "absolute", top: "-10%", left: "-5%", width: "60%", height: "120%", backgroundColor: "rgba(230,0,18,0.9)", opacity: 0.14, transform: [{ skewX: "-18deg" }] } as any,
  slashR: { position: "absolute", top: "-10%", right: "-8%", width: "42%", height: "120%", backgroundColor: "rgba(163,0,12,0.55)", opacity: 0.12, transform: [{ skewX: "16deg" }] } as any,
  watermark: { position: "absolute", top: "26%", left: 0, right: 0, textAlign: "center", fontFamily: theme.font.display, fontSize: 220, color: theme.color.paper, opacity: 0.04, letterSpacing: 18, transform: [{ skewX: "-8deg" }] } as any,

  frame: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, zIndex: 2 } as any,
  logo: { fontFamily: theme.font.display, fontSize: 64, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `7px 7px 0 ${theme.color.crimson}` } as any,
  kicker: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 5, color: theme.color.yellow, marginTop: 8, marginBottom: 26 } as any,

  tabs: { flexDirection: "row", gap: 6, marginBottom: 14 } as any,
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#2A2A2A",
    backgroundColor: "rgba(10,10,10,0.92)",
    transform: [{ skewX: "-8deg" }],
  } as any,
  tabOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  tabHover: { borderColor: theme.color.paper } as any,
  tabTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: "rgba(255,255,255,0.65)", fontWeight: "700" } as any,

  panel: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(10,10,10,0.92)",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    padding: 24,
    transform: [{ skewX: "-2deg" }],
  } as any,
  label: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 3, color: theme.color.paper, fontWeight: "700", marginTop: 14, marginBottom: 6 } as any,
  opt: { color: theme.color.yellow, fontSize: 9, letterSpacing: 1.5 } as any,
  input: {
    backgroundColor: theme.color.black,
    borderWidth: 1,
    borderColor: theme.color.crimson,
    color: theme.color.paper,
    fontFamily: theme.font.body,
    fontSize: 15,
    paddingVertical: 9,
    paddingHorizontal: 12,
    outlineStyle: "none",
  } as any,
  err: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: theme.color.crimson, fontWeight: "700", marginTop: 16 } as any,
  foot: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.4)", marginTop: 18, textAlign: "center", transform: [{ skewX: "2deg" }] } as any,
});
