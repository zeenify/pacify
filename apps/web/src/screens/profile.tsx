/* PROFILE — Report Card of the Vertex Institute, floating in a living page:
   ghost institute lettering, spinning ring + starburst, floating diamonds,
   halftone patch, and a data ticker along the floor. Reads ONLY from the
   client store (DB fetched once at /load). */
import { IonPage } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/game";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import { P5Back } from "../components/P5Back";
import s from "./profile.module.css";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

/* identity badge — how the institute knows your name */
function idBadge(nameSource: string | null) {
  if (nameSource === "google") return { txt: "VERIFIED STUDENT", color: "#FCEE21" };
  if (nameSource === "email") return { txt: "ENROLLED", color: "#0A0A0A" };
  return { txt: "SELF-DECLARED", color: "#E60012" };
}

/* landscape-phone — the report card reflows (name on one line, stats in two
   columns); desktop keeps the 7-per-row ransom and single-column rows */
function useShortViewport() {
  const [short, setShort] = useState(() => window.innerHeight < 560);
  useEffect(() => {
    const on = () => setShort(window.innerHeight < 560);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return short;
}

export default function Profile() {
  const { profile, clearProfile, refreshProfile } = useGame();
  const triedRef = useRef(false);
  const short = useShortViewport();

  // Cold start (F5): session cache usually refills instantly. If it's somehow
  // empty, refill SILENTLY right here — never bounce the user through Load.
  // Only a genuinely dead session goes back to the gate.
  useEffect(() => {
    if (profile || triedRef.current) return;
    triedRef.current = true;
    refreshProfile().catch(() => {
      router.replace("/");
    });
  }, [profile, refreshProfile]);

  if (!profile)
    return (
      <IonPage>
        <div className={`v ${s.stage}`} />
      </IonPage>
    );

  const p = profile;
  const name = p.username ?? "GUEST";
  const badge = idBadge(p.nameSource);
  const tickerSrc = `VERTEX INSTITUTE ✦ FIRST YEAR DIVISION ✦ THE TOP 13 ✦ PACIFIED ${p.pacified}/13 ✦ ${name} ✦ ${p.wins}W / ${p.losses}L ✦ WIN RATE ${p.winRate}% ✦ `;
  const ticker = tickerSrc.repeat(4);

  async function logout() {
    try {
      await api("/auth/logout", {});
    } catch {}
    clearProfile();
    router.replace("/");
  }

  const chars = name.split("").slice(0, 14);
  const perRow = short ? chars.length : 7;
  const boxRows: string[][] = [];
  for (let i = 0; i < chars.length; i += perRow) boxRows.push(chars.slice(i, i + perRow));

  const grade = (v: number, good = 5) => (v <= 0 ? "—" : v >= good ? "A+" : v >= Math.ceil(good / 2) ? "B" : "C");
  const rows: { k: string; v: string; g: string }[] = [
    { k: "CAMPAIGNS PLAYED", v: String(p.played), g: grade(p.played, 13) },
    { k: "VICTORIES", v: String(p.wins), g: grade(p.wins) },
    { k: "DEFEATS", v: String(p.losses), g: p.losses > 0 ? "C" : "A" },
    { k: "DRAWS", v: String(p.draws), g: p.draws > 0 ? "B" : "—" },
    { k: "BEST STREAK", v: String(p.streak), g: grade(p.streak, 3) },
    { k: "WIN RATE", v: `${p.winRate}%`, g: grade(Math.round((p.winRate / 100) * 10), 7) },
    { k: "ENROLLED SINCE", v: fmtDate(p.memberSince), g: "★" },
  ];

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        {/* ---- environment ---- */}
        <div className={`v ${s.envSlashL}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.envSlashLIn}`} style={{ animation: "p5-slashA 0.9s 0.1s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>
        <div className={`v ${s.envSlashR}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.envSlashRIn}`} style={{ animation: "p5-slashB 0.9s 0.25s cubic-bezier(0.16,1,0.3,1) both" }} />
        </div>

        {/* ghost institute lettering behind everything */}
        <div className={`v ${s.ghostWrap}`} style={{ pointerEvents: "none" }}>
          <div className={`t ${s.ghostLine}`}>VERTEX</div>
          <div className={`t ${s.ghostLine2}`}>INSTITUTE</div>
        </div>

        {/* spinning ring left */}
        <div className={`v ${s.ringW}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.ring}`} />
          <div className={`t ${s.ringStar}`}>✦</div>
        </div>
        {/* starburst right */}
        <div className={`v ${s.burst}`} style={{ pointerEvents: "none" }} />

        {/* floating diamonds */}
        <div className={`v ${s.diamonds}`} style={{ pointerEvents: "none" }}>
          {[
            { t: "12%", l: "6%", sz: 16, d: "0s" },
            { t: "70%", l: "10%", sz: 11, d: "0.8s" },
            { t: "18%", l: "88%", sz: 13, d: "1.5s" },
            { t: "78%", l: "86%", sz: 17, d: "0.4s" },
            { t: "45%", l: "94%", sz: 9, d: "2s" },
          ].map((dm, i) => (
            <div
              key={i}
              className={`t ${s.diamond}`}
              style={{ top: dm.t, left: dm.l, fontSize: dm.sz, animationDelay: dm.d }}
            >
              ◆
            </div>
          ))}
        </div>

        {/* halftone patch top-right */}
        <div className={`v ${s.halftone}`} style={{ pointerEvents: "none" }} />

        {/* data ticker along the floor */}
        <div className={`v ${s.tickerWrap}`} style={{ pointerEvents: "none" }}>
          <div className={`t ${s.tickerTxt}`} style={{ animation: "p5-marquee 26s linear infinite" }}>{ticker}</div>
          <div className={`t ${s.tickerTxt}`} style={{ animation: "p5-marquee 26s linear infinite" }}>{ticker}</div>
        </div>

        {/* ---- the button ---- */}
        <P5Back style={{ position: "absolute", top: 20, left: 20 }} />

        {/* ---- the report card ---- */}
        <div className={`v ${s.card}`} style={{ animation: "jokerIn 550ms 100ms both" }}>
          <div className={`v ${s.stampIdleW}`} style={{ pointerEvents: "none" }}>
            <div className={`v ${s.stamp}`} style={{ animation: "p5-slam 450ms 650ms both" }}>
              <div className={`t ${s.stampTxt}`} style={badge.color === "#FCEE21" ? { color: "#8a6d00" } : undefined}>
                {badge.txt}
              </div>
            </div>
          </div>

          <div className={`t ${s.kicker}`}>VERTEX INSTITUTE — FIRST YEAR DIVISION</div>
          <div className={`t ${s.title}`}>REPORT CARD</div>

          {/* ransom name */}
          <div className={`v ${s.nameBlock}`}>
            {boxRows.map((row, r) => (
              <div key={r} className={`v`} style={{ flexDirection: "row", gap: 6 }}>
                {row.map((ch, i) => {
                  const gi = r * 7 + i;
                  const boxed = gi % 3 === 0;
                  const yellowed = gi % 3 === 2;
                  return (
                    <div
                      key={i}
                      className={`v ${s.box} ${boxed ? s.boxCrimson : ""} ${yellowed ? s.boxYellow : ""}`}
                      style={{ animation: `heroIn 420ms ${250 + gi * 45}ms both` }}
                    >
                      <div className={`t ${s.boxTxt}`} style={boxed ? { color: "#FFFFFF" } : undefined}>{ch}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* ink rows */}
          <div className={`v ${s.rowBlock}`}>
            {rows.map((r, i) => (
              <div key={r.k} className={`v ${s.row}`} style={{ animation: `rowIn 400ms ${500 + i * 80}ms both` }}>
                <div className={`t ${s.rowKey}`}>{r.k}</div>
                <div className={`t ${s.rowVal}`}>{r.v}</div>
                <div className={`t ${s.rowGrade}`}>{r.g}</div>
              </div>
            ))}
          </div>

          {/* the top 13 */}
          <div className={`v ${s.seatsBlock}`}>
            <div className={`t ${s.seatLabel}`}>THE TOP 13 — PACIFIED {p.pacified}/13</div>
            <div className={`v`} style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className={`v ${s.seat} ${i < p.pacified ? s.seatOn : ""}`}>
                  <div className={`t ${s.seatTxt}`} style={i < p.pacified ? { color: "#FFFFFF" } : undefined}>{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* tear-off logout stub */}
          <div className={`press ${s.stub}`} onClick={logout}>
            <div className={`t ${s.stubDash}`}>✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</div>
            <div className={`t ${s.stubTxt}`}>TEAR HERE TO LOG OUT ▶</div>
          </div>
        </div>
      </div>
    </IonPage>
  );
}
