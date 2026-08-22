import { View, Text, Pressable, TextInput, StyleSheet, Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { WedgeButton, theme } from "@pacify/ui-kit";
import { api } from "../lib/api";

const web = Platform.OS === "web";
const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

declare global {
  interface Window {
    google?: any;
  }
}

type Tab = "signin" | "register";
type FieldProps = {
  tab: Tab;
  setTab: (t: Tab) => void;
  u: string; setU: (v: string) => void;
  p: string; setP: (v: string) => void;
  e: string; setE: (v: string) => void;
  err: string | null;
  busy: boolean;
  onSubmit: () => void;
};

/* ---- Google Identity Services loader ---- */
function useGoogleReady(onCredential: (c: string) => void) {
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!web || !CLIENT_ID) return;
    const w = window as any;
    const init = () => {
      try {
        w.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r: any) => cbRef.current(r.credential),
        });
        setReady(true);
      } catch {}
    };
    if (w.google?.accounts?.id) return init();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = init;
    document.head.appendChild(s);
  }, []);
  return ready;
}

function GoogleBtn({ gReady }: { gReady: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!web || !gReady || !ref.current) return;
    try {
      window.google.accounts.id.renderButton(ref.current, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 320,
      });
    } catch {}
  }, [gReady]);
  if (!web || !CLIENT_ID) return null;
  return (
    <View style={{ alignItems: "center", marginTop: 18 } as any}>
      <div ref={ref as any} />
    </View>
  );
}

export default function Login() {
  const [tab, setTab] = useState<Tab>("register");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [e, setE] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<number>(1);

  // already logged in? straight to menu
  useEffect(() => {
    api("/auth/me").then(() => router.replace("/menu")).catch(() => {});
  }, []);

  async function submit() {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (tab === "register") await api("/auth/register", { username: u.trim(), password: p, email: e.trim() || undefined });
      else await api("/auth/login", { username: u.trim(), password: p });
      router.replace("/menu");
    } catch (ex: any) {
      setErr(ex?.message ?? "SOMETHING WENT WRONG");
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle(credential: string) {
    setErr(null);
    try {
      await api("/auth/google", { credential });
      router.replace("/menu");
    } catch (ex: any) {
      setErr(ex?.message ?? "GOOGLE FAILED");
    }
  }
  const gReady = useGoogleReady(submitGoogle);

  const fp: FieldProps = { tab, setTab, u, setU, p, setP, e, setE, err, busy, onSubmit: submit };

  return (
    <View style={s.stage as any}>
      {sample === 1 && <SampleA {...fp} gReady={gReady} />}
      {sample === 2 && <SampleB {...fp} gReady={gReady} />}
      {sample === 3 && <SampleC {...fp} gReady={gReady} />}

      {/* TEMP picker */}
      <View style={s.picker as any}>
        {[1, 2, 3].map((n) => (
          <Pressable key={n} onPress={() => setSample(n)} style={[s.pickBtn as any, sample === n && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{String.fromCharCode(64 + n)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ================= SAMPLE A — GAZE LINE ================= */
function SampleA(f: FieldProps & { gReady: boolean }) {
  return (
    <>
      <View style={[s.slashL as any]} pointerEvents="none" />
      <View style={[s.slashR as any]} pointerEvents="none" />
      <Text style={s.watermark as any} pointerEvents="none">PACIFY</Text>
      <View style={s.aLine as any} pointerEvents="none" />
      <View style={s.frameA as any}>
        <Tabs f={f} variant="strip" />
        <View style={s.aRow as any}>
          <Text style={[s.aLabelL as any]}>USERNAME</Text>
          <TextInput value={f.u} onChangeText={f.setU} autoCapitalize="none" placeholder="seat_01" placeholderTextColor="rgba(255,255,255,0.3)" style={s.aInputR as any} />
        </View>
        <View style={s.aRow as any}>
          <Text style={s.aLabelL as any}>PASSWORD</Text>
          <TextInput value={f.p} onChangeText={f.setP} secureTextEntry placeholder="••••••" placeholderTextColor="rgba(255,255,255,0.3)" style={s.aInputR as any} />
        </View>
        {f.tab === "register" && (
          <View style={s.aRow as any}>
            <Text style={s.aLabelL as any}>
              EMAIL <Text style={{ color: theme.color.yellow, fontSize: 9 } as any}>//OPTIONAL</Text>
            </Text>
            <TextInput value={f.e} onChangeText={f.setE} autoCapitalize="none" keyboardType="email-address" placeholder="for recovery only" placeholderTextColor="rgba(255,255,255,0.3)" style={s.aInputR as any} />
          </View>
        )}
        {f.err ? <Text style={s.errA as any}>{f.err}</Text> : null}
        <View style={s.ctaWrap as any}>
          <WedgeButton label={f.busy ? "..." : f.tab === "register" ? "ENROLL" : "SIGN IN"} size="hero" onPress={f.onSubmit} />
        </View>
        <GoogleBtn gReady={f.gReady} />
        <Text style={s.foot as any}>13 SEATS. HARD FROM STUDENT 01.</Text>
      </View>
    </>
  );
}

/* ---- tabs (shared, two visual variants) ---- */
function Tabs({ f, variant }: { f: FieldProps; variant: "strip" | "folder" }) {
  return (
    <View style={(variant === "strip" ? s.tabs : s.folderTabs) as any}>
      {(["register", "signin"] as const).map((k) => (
        <Pressable
          key={k}
          onPress={() => f.setTab(k)}
          style={({ hovered }) => [
            (variant === "strip" ? s.tabStrip : s.tabFolder) as any,
            f.tab === k && ((variant === "strip" ? s.tabStripOn : s.tabFolderOn) as any),
            hovered && f.tab !== k && ({ borderColor: theme.color.paper } as any),
          ]}
        >
          <Text style={[(variant === "strip" ? s.tabTxt : s.tabTxtInk) as any, f.tab === k && { color: variant === "strip" ? theme.color.paper : theme.color.black } as any]}>
            {k === "register" ? "NEW STUDENT" : "SIGN IN"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ================= SAMPLE B — ENROLLMENT FOLDER ================= */
function SampleB(f: FieldProps & { gReady: boolean }) {
  return (
    <>
      <View style={s.slashL as any} pointerEvents="none" />
      <View style={s.slashR as any} pointerEvents="none" />
      <View style={s.frameB as any}>
        <View style={s.bHead as any}>
          <Text style={s.logo as any}>PACIFY</Text>
          <View style={s.bStamp as any}>
            <Text style={s.bStampTxt as any}>TOP SECRET</Text>
          </View>
        </View>

        {/* folder tabs */}
        <Tabs f={f} variant="folder" />

        <View style={[s.bCard as any, web && ({ animation: "jokerIn 600ms 120ms both" } as any)]}>
          <Text style={s.bFormTitle as any}>STUDENT ENROLLMENT FORM</Text>
          <Text style={s.bFormSub as any}>ACADEMY OF THE THIRTEEN — OFFICE COPY</Text>

          <Text style={s.inkLabel as any}>{f.tab === "register" ? "PREFERRED USERNAME" : "USERNAME ON RECORD"}</Text>
          <TextInput value={f.u} onChangeText={f.setU} autoCapitalize="none" placeholder="_______________" placeholderTextColor="rgba(0,0,0,0.25)" style={s.inkInput as any} />

          <Text style={s.inkLabel as any}>SECRET PHRASE (PASSWORD)</Text>
          <TextInput value={f.p} onChangeText={f.setP} secureTextEntry placeholder="min. 6 characters" placeholderTextColor="rgba(0,0,0,0.25)" style={s.inkInput as any} />

          {f.tab === "register" && (
            <>
              <Text style={s.inkLabel as any}>HOME MAILBOX (EMAIL) — OPTIONAL</Text>
              <TextInput value={f.e} onChangeText={f.setE} autoCapitalize="none" keyboardType="email-address" placeholder="for lost records only" placeholderTextColor="rgba(0,0,0,0.25)" style={s.inkInput as any} />
            </>
          )}

          {f.err ? <Text style={s.errInk as any}>{f.err}</Text> : null}

          <View style={{ marginTop: 20 } as any}>
            <WedgeButton label={f.busy ? "..." : f.tab === "register" ? "SUBMIT FORM" : "ENTER CLASS"} size="hero" onPress={f.onSubmit} />
          </View>
          <GoogleBtn gReady={f.gReady} />
          <Text style={s.bFootInk as any}>BY ENROLLING YOU ACCEPT: NO TUTORIALS. NO MERCY.</Text>
        </View>
      </View>
    </>
  );
}

/* ================= SAMPLE C — SPOTLIGHT ================= */
function SampleC(f: FieldProps & { gReady: boolean }) {
  const [focus, setFocus] = useState<string | null>(null);
  const focusStyle = (k: string) => [s.cInput as any, focus === k && { borderBottomColor: theme.color.yellow } as any];
  return (
    <>
      <View style={s.cBeam as any} pointerEvents="none" />
      <View style={s.slashR as any} pointerEvents="none" />
      <View style={s.frameC as any}>
        <View style={s.cTitleWrap as any}>
          <Text style={[s.logo as any, web && ({ animation: "heroIn 600ms 80ms both" } as any)]}>PACIFY</Text>
          <View style={s.cCursor as any} />
        </View>
        <Text style={s.cKicker as any}>
          {f.tab === "register" ? "IDENTIFY YOURSELF_" : "STATE YOUR NAME_"}
        </Text>

        <View style={s.cPanel as any}>
          <Tabs f={f} variant="strip" />

          <TextInput value={f.u} onChangeText={f.setU} onFocus={() => setFocus("u")} onBlur={() => setFocus(null)} autoCapitalize="none" placeholder="USERNAME" placeholderTextColor="rgba(255,255,255,0.3)" style={focusStyle("u")} />
          <TextInput value={f.p} onChangeText={f.setP} onFocus={() => setFocus("p")} onBlur={() => setFocus(null)} secureTextEntry placeholder="PASSWORD" placeholderTextColor="rgba(255,255,255,0.3)" style={focusStyle("p")} />
          {f.tab === "register" && (
            <TextInput value={f.e} onChangeText={f.setE} onFocus={() => setFocus("e")} onBlur={() => setFocus(null)} autoCapitalize="none" keyboardType="email-address" placeholder="EMAIL // OPTIONAL" placeholderTextColor="rgba(255,255,255,0.3)" style={focusStyle("e")} />
          )}

          {f.err ? <Text style={s.errA as any}>{f.err}</Text> : null}

          <View style={{ marginTop: 26 } as any}>
            <WedgeButton label={f.busy ? "..." : f.tab === "register" ? "ENROLL" : "SIGN IN"} size="hero" onPress={f.onSubmit} />
          </View>
          <GoogleBtn gReady={f.gReady} />
        </View>
        <Text style={s.foot as any}>THE CLASS REMEMBERS EVERYTHING.</Text>
      </View>
    </>
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
  watermark: { position: "absolute", top: "24%", left: 0, right: 0, textAlign: "center", fontFamily: theme.font.display, fontSize: 220, color: theme.color.paper, opacity: 0.04, letterSpacing: 18, transform: [{ skewX: "-8deg" }] } as any,
  logo: { fontFamily: theme.font.display, fontSize: 56, color: theme.color.paper, letterSpacing: 2, transform: [{ skewX: "-8deg" }], textShadow: `6px 6px 0 ${theme.color.crimson}` } as any,
  foot: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.4)", marginTop: 20, textAlign: "center" } as any,

  // tabs — strip (A/C)
  tabs: { flexDirection: "row", gap: 8, marginBottom: 22, justifyContent: "center" } as any,
  tabStrip: { paddingVertical: 9, paddingHorizontal: 22, borderWidth: 2, borderColor: "#2A2A2A", backgroundColor: "rgba(10,10,10,0.92)", transform: [{ skewX: "-8deg" }] } as any,
  tabStripOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,
  tabTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: "rgba(255,255,255,0.6)", fontWeight: "700" } as any,

  // A
  aLine: { position: "absolute", top: "-14%", bottom: "-14%", left: "50%", width: 4, backgroundColor: "rgba(255,255,255,0.75)", transform: [{ rotate: "9deg" }], zIndex: 1 } as any,
  frameA: { flex: 1, justifyContent: "center", paddingHorizontal: 40, zIndex: 2, maxWidth: 560, alignSelf: "center", width: "100%" } as any,
  aRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" } as any,
  aLabelL: { flex: 1, fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, color: theme.color.paper, fontWeight: "700", textAlign: "right", paddingRight: 30 } as any,
  aInputR: { flex: 1, paddingLeft: 30, color: theme.color.paper, fontFamily: theme.font.body, fontSize: 16, outlineStyle: "none" } as any,
  errA: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 2, color: theme.color.crimson, fontWeight: "700", marginTop: 14, textAlign: "center" } as any,
  ctaWrap: { alignItems: "center", marginTop: 26 } as any,

  // B folder
  frameB: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, zIndex: 2 } as any,
  bHead: { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 20 } as any,
  bStamp: { borderWidth: 2, borderColor: theme.color.crimson, paddingHorizontal: 8, paddingVertical: 3, transform: [{ rotate: "4deg" }] } as any,
  bStampTxt: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 3, color: theme.color.crimson, fontWeight: "800" } as any,
  folderTabs: { flexDirection: "row", gap: 4, zIndex: 3 } as any,
  tabFolder: { paddingVertical: 8, paddingHorizontal: 18, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: "#D9D2C7", backgroundColor: "#EFEAE2", transform: [{ skewX: "-6deg" }] } as any,
  tabFolderOn: { backgroundColor: theme.color.paper, paddingBottom: 12 } as any,
  tabTxtInk: { fontFamily: theme.font.body, fontSize: 11, letterSpacing: 2.5, color: "#555", fontWeight: "800" } as any,
  bCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: theme.color.paper,
    borderLeftWidth: 6,
    borderLeftColor: theme.color.crimson,
    borderBottomWidth: 3,
    borderBottomColor: "#D9D2C7",
    paddingVertical: 26,
    paddingHorizontal: 26,
    gap: 4,
    transform: [{ skewX: "-2deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  } as any,
  bFormTitle: { fontFamily: theme.font.display, fontSize: 22, color: theme.color.black, letterSpacing: 1 } as any,
  bFormSub: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2.5, color: "#777", marginTop: 2, marginBottom: 10 } as any,
  inkLabel: { fontFamily: theme.font.body, fontSize: 10, letterSpacing: 2.5, color: "#333", fontWeight: "800", marginTop: 12, marginBottom: 2 } as any,
  inkInput: { backgroundColor: "transparent", borderBottomWidth: 2, borderBottomColor: theme.color.black, color: theme.color.black, fontFamily: theme.font.body, fontSize: 15, paddingVertical: 6, outlineStyle: "none" } as any,
  errInk: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 1.5, color: theme.color.crimson, fontWeight: "800", marginTop: 12 } as any,
  bFootInk: { fontFamily: theme.font.body, fontSize: 9, letterSpacing: 2, color: "#999", marginTop: 16, textAlign: "center" } as any,

  // C spotlight
  cBeam: { position: "absolute", top: "-10%", bottom: "-10%", left: "34%", width: 200, backgroundColor: "rgba(230,0,18,0.16)", transform: [{ skewX: "-14deg" }], zIndex: 0 } as any,
  frameC: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, zIndex: 2 } as any,
  cTitleWrap: { flexDirection: "row", alignItems: "flex-end" } as any,
  cCursor: { width: 14, height: 46, marginLeft: 10, marginBottom: 8, backgroundColor: theme.color.yellow, ...(web ? { animation: "p5-blinkHard 1s steps(1) infinite" } as any : {}) } as any,
  cKicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 6, color: theme.color.yellow, marginTop: 10, marginBottom: 30 } as any,
  cPanel: { width: "100%", maxWidth: 380, gap: 22 } as any,
  cInput: { backgroundColor: "transparent", borderWidth: 0, borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.25)", color: theme.color.paper, fontFamily: theme.font.body, fontSize: 17, letterSpacing: 2, paddingVertical: 10, outlineStyle: "none" } as any,

  // picker (TEMP)
  picker: { position: "absolute", top: 14, right: 14, zIndex: 99, flexDirection: "row", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", padding: 6, borderWidth: 1, borderColor: theme.color.yellow, transform: [{ skewX: "-8deg" }] } as any,
  pickBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(10,10,10,0.9)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 14, color: theme.color.paper } as any,
});

