import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { theme } from "@pacify/ui-kit";
import { useGame, ProfileData } from "../lib/game";

const web = Platform.OS === "web";

/* e•••••••@gmail.com */
function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "NOT ON FILE";
  const [local, domain] = email.split("@");
  const head = local.slice(0, 1);
  const dots = "•".repeat(Math.min(7, Math.max(3, local.length - 1)));
  return `${head}${dots}@${domain}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

/* identity badge — how the academy knows your name */
function idBadge(p: ProfileData) {
  if (p.nameSource === "google") return { txt: "VERIFIED STUDENT", color: theme.color.yellow };
  if (p.nameSource === "email") return { txt: "ENROLLED", color: theme.color.paper };
  return { txt: "SELF-DECLARED", color: theme.color.crimson };
}

function CountUp({ to, dur = 900 }: { to: number; dur?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!to) {
      setV(0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, dur]);
  return <>{v}</>;
}

async function doLogout() {
  try {
    await api("/auth/logout", {});
  } catch {}
  router.replace("/");
}

/* sample switcher + back — removed once a design is locked */
function Picker({ sample, setSample }: { sample: string; setSample: (s: any) => void }) {
  return (
    <>
      <Pressable onPress={() => router.push("/menu")} style={({ hovered }) => [s.backBtn as any, hovered && (s.chipHover as any)]}>
        <Text style={s.backTxt as any}>◀ MENU</Text>
      </Pressable>
      <View style={s.picker as any}>
        {["a", "b", "c"].map((k) => (
          <Pressable key={k} onPress={() => setSample(k)} style={[s.pickBtn as any, sample === k && (s.pickOn as any)]}>
            <Text style={s.pickTxt as any}>{k.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

export default function Profile() {
  const { profile } = useGame();
  const [sample, setSample] = useState<any>("a");
  const p = profile;

  // cold start (F5 deep-link) — store is empty, bounce to the flow's entrance
  useEffect(() => {
    if (!p) router.replace("/");
  }, [p]);

  const name = p?.username ?? "GUEST";

  return (
    <View style={s.stage as any}>
      {p && <Picker sample={sample} setSample={setSample} />}
      {p && sample === "a" && <SampleA p={p} name={name} />}
      {p && sample === "b" && <SampleB p={p} name={name} />}
      {p && sample === "c" && <SampleC p={p} name={name} />}
    </View>
  );
}

/* ============ A — THE DOSSIER: giant vertical ransom name + skewed panels ============ */
function SampleA({ p, name }: { p: ProfileData; name: string }) {
  const letters = name.split("").slice(0, 9);
  const badge = idBadge(p);
  return (
    <>
      <View style={s.aGaze as any} pointerEvents="none" />
      {web && (
        <View style={s.aRingW as any} pointerEvents="none">
          <View style={s.aRing as any} />
        </View>
      )}

      <View style={s.aWrap as any}>
        {/* LEFT — the name takes the screen */}
        <View style={s.aNameCol as any}>
          <Text style={s.aKicker as any}>SUBJECT FILE —</Text>
          {letters.map((ch, i) => (
            <View key={i} style={[{ flexDirection: "row" } as any, i % 2 ? { paddingLeft: 26 } : null]}>
              <Text
                style={[
                  s.aLetter,
                  i % 3 === 0 && (s.aLetterBoxCrimson as any),
                  i % 3 === 1 && (s.aLetterPlain as any),
                  i % 3 === 2 && (s.aLetterBoxYellow as any),
                  web && ({ animation: `heroIn 500ms ${i * 70}ms both` } as any),
                ]}
              >
                {ch}
              </Text>
            </View>
          ))}
        </View>

        {/* RIGHT — records */}
        <View style={s.aPanelCol as any}>
          <View style={[s.aPanel as any, web && ({ animation: "jokerIn 500ms 200ms both" } as any)]}>
            <Text style={s.aPanelTag as any}>STUDENT ID CARD</Text>
            <Text style={s.aNameLine as any}>{name}</Text>
            <View style={s.aRow as any}>
              <Text style={s.aKey as any}>MAILBOX</Text>
              <Text style={s.aVal as any}>{maskEmail(p.email)}</Text>
            </View>
            <View style={s.aRow as any}>
              <Text style={s.aKey as any}>ENROLLED</Text>
              <Text style={s.aVal as any}>{fmtDate(p.memberSince)}</Text>
            </View>
            <View style={s.aRow as any}>
              <Text style={s.aKey as any}>STATUS</Text>
              <Text style={[s.aBadge as any, { color: badge.color, borderColor: badge.color }] as any}>{badge.txt}</Text>
            </View>
          </View>

          <View style={[s.aPanel as any, web && ({ animation: "jokerIn 500ms 340ms both" } as any)]}>
            <Text style={s.aPanelTag as any}>RECORD</Text>
            <View style={{ flexDirection: "row", gap: 26 } as any}>
              {[
                { k: "PLAYED", v: p.played },
                { k: "WINS", v: p.wins },
                { k: "LOSSES", v: p.losses },
                { k: "STREAK", v: p.streak },
              ].map((st, i) => (
                <View key={st.k} style={web ? ({ animation: `p5-countPop 450ms ${400 + i * 90}ms both` } as any) : undefined}>
                  <Text style={s.aBigNum as any}>
                    <CountUp to={st.v} />
                  </Text>
                  <Text style={s.aNumKey as any}>{st.k}</Text>
                </View>
              ))}
            </View>
            <View style={s.aBarTrack as any}>
              <View
                style={[
                  s.aBarFill as any,
                  web ? ({ width: `${p.winRate}%`, animation: "p5-fillBar 900ms 500ms both" } as any) : ({ width: `${p.winRate}%` } as any),
                ]}
              />
              <Text style={s.aBarTxt as any}>WIN RATE {p.winRate}%</Text>
            </View>
          </View>

          <View style={[s.aPanel as any, web && ({ animation: "jokerIn 500ms 480ms both" } as any)]}>
            <Text style={s.aPanelTag as any}>STUDENTS PACIFIED — {p.pacified}/13</Text>
            <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" } as any}>
              {Array.from({ length: 13 }).map((_, i) => (
                <View key={i} style={[s.aTick as any, i < p.pacified && (s.aTickOn as any)]} />
              ))}
            </View>
          </View>

          <Pressable onPress={doLogout} style={({ hovered }) => [s.logoutBtn as any, hovered && (s.logoutHover as any)]}>
            <Text style={s.logoutTxt as any}>LOG OUT</Text>
            <Text style={s.logoutArr as any}>◀</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

/* ============ B — STATUS TERMINAL: marquee tickers + echo slam name ============ */
function SampleB({ p, name }: { p: ProfileData; name: string }) {
  const badge = idBadge(p);
  const tickerSrc = `${name} ✦ ${p.coins} COINS ✦ ${p.wins}W / ${p.losses}L / ${p.draws}D ✦ STREAK ${p.streak} ✦ WIN RATE ${p.winRate}% ✦ PACIFIED ${p.pacified}/13 ✦ `;
  const ticker = tickerSrc.repeat(6);
  return (
    <>
      {/* scanlines */}
      {web && <View style={s.bScan as any} pointerEvents="none" />}

      {/* tickers */}
      <View style={s.tickerWrap as any} pointerEvents="none">
        <Text style={[s.tickerTxt as any, web && ({ animation: "p5-marquee 22s linear infinite" } as any)]}>{ticker}</Text>
        <Text style={[s.tickerTxt as any, web && ({ animation: "p5-marquee 22s linear infinite" } as any)]}>{ticker}</Text>
      </View>
      <View style={[s.tickerWrap, s.tickerBottom as any] as any} pointerEvents="none">
        <Text style={[s.tickerTxtB as any, web && ({ animation: "p5-marquee 26s linear infinite reverse" } as any)]}>{ticker}</Text>
        <Text style={[s.tickerTxtB as any, web && ({ animation: "p5-marquee 26s linear infinite reverse" } as any)]}>{ticker}</Text>
      </View>

      <View style={s.bCenter as any}>
        {/* echo copies behind the name */}
        <View style={s.bNameStage as any}>
          {web && (
            <>
              <Text style={[s.bEchoCrimson as any, { animation: "heroIn 500ms 120ms both" } as any]}>{name}</Text>
              <Text style={[s.bEchoYellow as any, { animation: "heroIn 500ms 200ms both" } as any]}>{name}</Text>
            </>
          )}
          <Text style={[s.bName as any, web && ({ animation: "p5-slam 480ms 260ms both" } as any)]}>{name}</Text>
        </View>

        <View style={s.bBadgeRow as any}>
          <Text style={s.bKicker as any}>STATUS TERMINAL</Text>
          <Text style={[s.aBadge as any, { color: badge.color, borderColor: badge.color }] as any}>{badge.txt}</Text>
        </View>

        {/* giant stat row */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 34, marginTop: 34 } as any}>
          {[
            { k: "PLAYED", v: p.played },
            { k: "WINS", v: p.wins },
            { k: "LOSSES", v: p.losses },
            { k: "STREAK", v: p.streak },
            { k: "COINS", v: p.coins },
          ].map((st, i) => (
            <View key={st.k} style={[{ alignItems: "center" } as any, i < 4 && { borderRightWidth: 3, borderRightColor: theme.color.crimson, paddingRight: 34 } as any, web && ({ animation: `p5-countPop 450ms ${450 + i * 100}ms both` } as any)]}>
              <Text style={s.bNum as any}>
                <CountUp to={st.v} />
              </Text>
              <Text style={s.bNumKey as any}>{st.k}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={doLogout} style={({ hovered }) => [s.logoutBtn as any, { marginTop: 44 }, hovered && (s.logoutHover as any)]}>
          <Text style={s.logoutTxt as any}>LOG OUT</Text>
          <Text style={s.logoutArr as any}>◀</Text>
        </Pressable>
      </View>
    </>
  );
}

/* ============ C — REPORT CARD: paper poster + ransom name + grades ============ */
function SampleC({ p, name }: { p: ProfileData; name: string }) {
  const badge = idBadge(p);
  const chars = name.split("").slice(0, 14);
  const rows: string[][] = [];
  for (let i = 0; i < chars.length; i += 7) rows.push(chars.slice(i, i + 7));
  const grade = (v: number, good = 5) => (v <= 0 ? "—" : v >= good ? "A+" : v >= Math.ceil(good / 2) ? "B" : "C");
  const rows2: { k: string; v: string; g: string }[] = [
    { k: "CAMPAIGNS PLAYED", v: String(p.played), g: grade(p.played, 13) },
    { k: "VICTORIES", v: String(p.wins), g: grade(p.wins) },
    { k: "DEFEATS", v: String(p.losses), g: p.losses > 0 ? "C" : "A" },
    { k: "BEST STREAK", v: String(p.streak), g: grade(p.streak, 3) },
    { k: "COINS EARNED", v: String(p.coins), g: grade(p.coins, 100) },
    { k: "ENROLLED SINCE", v: fmtDate(p.memberSince), g: "★" },
  ];
  return (
    <View style={s.cWrap as any}>
      <View style={[s.cCard as any, web && ({ animation: "jokerIn 550ms 100ms both" } as any)]}>
        {/* stamp varies by identity source */}
        <View style={s.stampIdleW as any} pointerEvents="none">
          <View style={[s.cStamp as any, web && ({ animation: "p5-slam 450ms 650ms both" } as any)]}>
            <Text style={[s.cStampTxt as any, badge.color === theme.color.paper && { color: theme.color.black }] as any}>{badge.txt}</Text>
          </View>
        </View>

        <Text style={s.cKicker as any}>PACIFY ACADEMY — TERM 01</Text>
        <Text style={s.cTitle as any}>REPORT CARD</Text>

        {/* ransom name */}
        <View style={{ marginTop: 14, gap: 6 } as any}>
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 6 } as any}>
              {row.map((ch, i) => {
                const gi = r * 7 + i;
                const boxed = gi % 3 === 0;
                const yellowed = gi % 3 === 2;
                return (
                  <View
                    key={i}
                    style={[
                      s.cBox as any,
                      boxed && (s.cBoxCrimson as any),
                      yellowed && (s.cBoxYellow as any),
                      web && ({ animation: `heroIn 420ms ${250 + gi * 45}ms both` } as any),
                    ]}
                  >
                    <Text style={[s.cBoxTxt as any, boxed && { color: theme.color.paper } as any, yellowed && { color: theme.color.black } as any]}>{ch}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ink rows */}
        <View style={{ marginTop: 20, borderTopWidth: 3, borderTopColor: theme.color.black } as any}>
          {rows2.map((r, i) => (
            <View key={r.k} style={[s.cRow as any, web && ({ animation: `rowIn 400ms ${500 + i * 80}ms both` } as any)]}>
              <Text style={s.cRowKey as any}>{r.k}</Text>
              <Text style={s.cRowVal as any}>{r.v}</Text>
              <Text style={s.cRowGrade as any}>{r.g}</Text>
            </View>
          ))}
        </View>

        {/* class of thirteen */}
        <View style={{ marginTop: 18 } as any}>
          <Text style={s.aPanelTag as any}>CLASS OF THIRTEEN — PACIFIED {p.pacified}/13</Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" } as any}>
            {Array.from({ length: 13 }).map((_, i) => (
              <View key={i} style={[s.cSeat as any, i < p.pacified && (s.cSeatOn as any)]}>
                <Text style={[s.cSeatTxt as any, i < p.pacified && { color: theme.color.paper } as any]}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* tear-off logout stub */}
        <Pressable onPress={doLogout} style={({ hovered }) => [s.cStub as any, hovered && (s.cStubHover as any)]}>
          <Text style={s.cStubDash as any}>✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</Text>
          <Text style={s.cStubTxt as any}>TEAR HERE TO LOG OUT ▶</Text>
        </Pressable>
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

  // shared chrome
  backBtn: { position: "absolute", top: 16, left: 16, zIndex: 99, backgroundColor: theme.color.paper, borderWidth: 2, borderColor: theme.color.black, paddingVertical: 8, paddingHorizontal: 14, transform: [{ skewX: "-8deg" }] } as any,
  chipHover: { backgroundColor: theme.color.yellow } as any,
  backTxt: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 2, color: theme.color.black, fontWeight: "800" } as any,
  picker: { position: "absolute", top: 16, right: 16, zIndex: 99, flexDirection: "row", gap: 6 } as any,
  pickBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: theme.color.paper, backgroundColor: "rgba(0,0,0,0.55)" } as any,
  pickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.yellow } as any,
  pickTxt: { fontFamily: theme.font.display, fontSize: 15, color: theme.color.paper } as any,

  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "flex-start", backgroundColor: theme.color.crimson, borderWidth: 2, borderColor: theme.color.black, paddingVertical: 12, paddingHorizontal: 22, marginTop: 26, transform: [{ skewX: "-8deg" }], shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 0, shadowOffset: { width: 6, height: 6 } } as any,
  logoutHover: { transform: [{ skewX: "-8deg" }, { translateX: -3 }, { translateY: -3 }], shadowOffset: { width: 10, height: 10 }, backgroundColor: "#c50010" } as any,
  logoutTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 2, color: theme.color.paper } as any,
  logoutArr: { fontFamily: theme.font.body, fontSize: 18, color: theme.color.yellow, fontWeight: "700" } as any,

  /* ---- A ---- */
  aGaze: { position: "absolute", top: "-12%", bottom: "-12%", left: "44%", width: 5, backgroundColor: "rgba(255,255,255,0.92)", transform: [{ rotate: "9deg" }], shadowColor: "#fff", shadowOpacity: 0.6, shadowRadius: 14 } as any,
  aRingW: { position: "absolute", left: "-12%", top: "8%", width: 420, height: 420, alignItems: "center", justifyContent: "center" } as any,
  aRing: { width: 380, height: 380, borderRadius: 200, borderWidth: 3, borderStyle: "dashed", borderColor: "rgba(252,238,33,0.4)", ...(web ? ({ animation: "p5-spin 30s linear infinite" } as any) : {}) } as any,
  aWrap: { flex: 1, flexDirection: "row", paddingHorizontal: "6%", paddingTop: 64, paddingBottom: 30, gap: 40, zIndex: 2 } as any,
  aNameCol: { width: "38%", gap: 2 } as any,
  aKicker: { fontFamily: theme.font.body, fontSize: 15, letterSpacing: 6, color: theme.color.yellow, fontWeight: "800", marginBottom: 10, marginLeft: 4 } as any,
  aLetter: { fontFamily: theme.font.display, fontSize: 108, lineHeight: 116, color: theme.color.paper } as any,
  aLetterBoxCrimson: { backgroundColor: theme.color.crimson, color: theme.color.paper, paddingHorizontal: 10, textShadow: "none", maxWidth: 132, textAlign: "center" } as any,
  aLetterPlain: { color: theme.color.paper, textShadow: `5px 5px 0 ${theme.color.crimson}` } as any,
  aLetterBoxYellow: { backgroundColor: theme.color.yellow, color: theme.color.black, paddingHorizontal: 10, maxWidth: 132, textAlign: "center" } as any,
  aPanelCol: { flex: 1, gap: 18, justifyContent: "center" } as any,
  aPanel: { backgroundColor: "#141414", borderLeftWidth: 7, borderLeftColor: theme.color.crimson, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#2b2b2b", paddingVertical: 18, paddingHorizontal: 22, transform: [{ skewX: "-3deg" }] } as any,
  aPanelTag: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 4, color: theme.color.yellow, fontWeight: "800", marginBottom: 8 } as any,
  aNameLine: { fontFamily: theme.font.display, fontSize: 34, color: theme.color.paper, letterSpacing: 1, marginBottom: 10 } as any,
  aRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4 } as any,
  aKey: { width: 110, fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, color: "rgba(255,255,255,0.45)", fontWeight: "800" } as any,
  aVal: { fontFamily: theme.font.body, fontSize: 17, letterSpacing: 1.5, color: theme.color.paper, fontWeight: "700" } as any,
  aBadge: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 3, fontWeight: "800", borderWidth: 2, paddingHorizontal: 10, paddingVertical: 3 } as any,
  aBigNum: { fontFamily: theme.font.display, fontSize: 58, lineHeight: 62, color: theme.color.paper } as any,
  aNumKey: { fontFamily: theme.font.body, fontSize: 12.5, letterSpacing: 3, color: "rgba(255,255,255,0.5)", fontWeight: "800" } as any,
  aBarTrack: { position: "relative", height: 30, backgroundColor: "#000", borderWidth: 2, borderColor: "#333", marginTop: 14, overflow: "hidden" } as any,
  aBarFill: { position: "absolute", top: 0, left: 0, bottom: 0, backgroundColor: theme.color.crimson } as any,
  aBarTxt: { position: "absolute", left: 10, top: 5, fontFamily: theme.font.body, fontSize: 14, letterSpacing: 2.5, color: theme.color.paper, fontWeight: "800" } as any,
  aTick: { width: 26, height: 34, borderWidth: 2, borderColor: "#3a3a3a", backgroundColor: "#101010" } as any,
  aTickOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.paper } as any,

  /* ---- B ---- */
  bScan: { position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px)", zIndex: 3 } as any,
  tickerWrap: { position: "absolute", top: 52, left: 0, right: 0, overflow: "hidden", flexDirection: "row", width: "200%", zIndex: 2 } as any,
  tickerBottom: { top: "auto", bottom: 46 } as any,
  tickerTxt: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 3, color: "rgba(255,255,255,0.85)", paddingRight: 40, whiteSpace: "nowrap" } as any,
  tickerTxtB: { fontFamily: theme.font.display, fontSize: 24, letterSpacing: 3, color: theme.color.crimson, paddingRight: 40, whiteSpace: "nowrap" } as any,
  bCenter: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 4 } as any,
  bNameStage: { alignItems: "center", justifyContent: "center" } as any,
  bEchoCrimson: { position: "absolute", fontFamily: theme.font.display, fontSize: 128, color: theme.color.crimson, transform: [{ skewX: "-8deg" }, { translateX: 10 }, { translateY: 10 }] } as any,
  bEchoYellow: { position: "absolute", fontFamily: theme.font.display, fontSize: 128, color: theme.color.yellow, transform: [{ skewX: "-8deg" }, { translateX: -5 }, { translateY: -5 }] } as any,
  bName: { fontFamily: theme.font.display, fontSize: 128, lineHeight: 136, color: theme.color.paper, transform: [{ skewX: "-8deg" }], textShadow: `8px 8px 0 ${theme.color.black}` } as any,
  bBadgeRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 18 } as any,
  bKicker: { fontFamily: theme.font.body, fontSize: 16, letterSpacing: 7, color: "rgba(255,255,255,0.55)", fontWeight: "800" } as any,
  bNum: { fontFamily: theme.font.display, fontSize: 84, lineHeight: 90, color: theme.color.paper } as any,
  bNumKey: { fontFamily: theme.font.body, fontSize: 14, letterSpacing: 4, color: theme.color.crimson, fontWeight: "800", marginTop: 2 } as any,

  /* ---- C ---- */
  cWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, zIndex: 2 } as any,
  cCard: { width: "min(94%, 720px)", maxHeight: "94%", backgroundColor: theme.color.paper, borderWidth: 4, borderColor: theme.color.black, outlineStyle: "solid", outlineWidth: 2, outlineOffset: 6, outlineColor: theme.color.black, paddingVertical: 26, paddingHorizontal: 32, transform: [{ rotate: "-1.2deg" }, { skewX: "-1deg" }], shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 0, shadowOffset: { width: 14, height: 14 } } as any,
  cKicker: { fontFamily: theme.font.body, fontSize: 13, letterSpacing: 5, color: "#888", fontWeight: "800" } as any,
  cTitle: { fontFamily: theme.font.display, fontSize: 64, lineHeight: 70, color: theme.color.black, letterSpacing: 1 } as any,
  stampIdleW: { position: "absolute", top: -14, right: -18, zIndex: 7, ...(web ? ({ animation: "p5-stampIdle 6s ease-in-out infinite" } as any) : {}) } as any,
  cStamp: { backgroundColor: "#fffdf5", borderWidth: 3, borderColor: theme.color.crimson, paddingHorizontal: 12, paddingVertical: 6, transform: [{ rotate: "6deg" }] } as any,
  cStampTxt: { fontFamily: theme.font.body, fontSize: 12, letterSpacing: 3, color: theme.color.crimson, fontWeight: "800" } as any,
  cBox: { minWidth: 54, height: 66, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: theme.color.black, backgroundColor: "#fff" } as any,
  cBoxCrimson: { backgroundColor: theme.color.crimson } as any,
  cBoxYellow: { backgroundColor: theme.color.yellow } as any,
  cBoxTxt: { fontFamily: theme.font.display, fontSize: 42, lineHeight: 48, color: theme.color.black } as any,
  cRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: "#e2ddd2", paddingVertical: 9, gap: 12 } as any,
  cRowKey: { flex: 1, fontFamily: theme.font.body, fontSize: 15, letterSpacing: 3, color: "#333", fontWeight: "800" } as any,
  cRowVal: { fontFamily: theme.font.body, fontSize: 19, color: theme.color.black, fontWeight: "800" } as any,
  cRowGrade: { width: 56, textAlign: "center", fontFamily: theme.font.display, fontSize: 30, color: theme.color.crimson, transform: [{ rotate: "-6deg" }] } as any,
  cSeat: { minWidth: 34, height: 42, borderWidth: 2, borderColor: "#cfc7ba", backgroundColor: "#faf7f0", alignItems: "center", justifyContent: "center" } as any,
  cSeatOn: { backgroundColor: theme.color.crimson, borderColor: theme.color.black } as any,
  cSeatTxt: { fontFamily: theme.font.body, fontSize: 15, color: "#999", fontWeight: "800" } as any,
  cStub: { alignSelf: "stretch", marginTop: 22, marginHorizontal: -32, marginBottom: -26, borderTopWidth: 3, borderTopColor: theme.color.black, borderStyle: "dashed", paddingVertical: 14, alignItems: "center", backgroundColor: "#f3efe6" } as any,
  cStubHover: { backgroundColor: theme.color.yellow } as any,
  cStubDash: { fontFamily: theme.font.body, fontSize: 12, color: "#aaa", letterSpacing: 2 } as any,
  cStubTxt: { fontFamily: theme.font.display, fontSize: 20, letterSpacing: 2, color: theme.color.crimson, marginTop: 4 } as any,
});
