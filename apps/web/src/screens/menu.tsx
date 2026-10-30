import { IonPage } from "@ionic/react";
import { useState } from "react";
import { theme } from "../theme/tokens";
import { playHover, playClick } from "../lib/sfx";
import { router } from "../lib/nav";
import s from "./menu.module.css";

const NAV = [
  { n: "01", label: "CAMPAIGN", sub: "13 students to beat", to: "/campaign" },
  { n: "02", label: "DOSSIER", sub: "13 Seats Secret Files", to: "/dossier" },
  { n: "03", label: "HALL OF SHAME", sub: "Dont be listed here", to: "/shame" },
  { n: "04", label: "MULTIPLAYER", sub: "", to: null },
  { n: "05", label: "PROFILE", sub: "stats • records", to: "/profile" },
  { n: "06", label: "HOW TO PLAY", sub: "Read me PLEASE!!!", to: "/howto" },
  { n: "07", label: "OPTIONS", sub: "sound • display", to: "/options" },
];

/* hidden lore word — the boxed letter on each row reads top-to-bottom */
const BOX_INDEX: Record<string, number> = {
  CAMPAIGN: 3, // P
  DOSSIER: 4, // I
  "HALL OF SHAME": 8, // S
  MULTIPLAYER: 3, // T
  PROFILE: 2, // O
  "HOW TO PLAY": 8, // L
  OPTIONS: 6, // S
};

/* ransom-note typography: every letter tilted its own way, one letter inverted */
function Ransom({ text, size, dim, box }: { text: string; size: number; dim?: boolean; box?: number }) {
  return (
    <>
      {text.split("").map((ch, i) => {
        const flip = box !== undefined && i === box;
        const tilt = (i % 3) - 1;
        return (
          <div
            key={i}
            className={`t ${s.ransomLetter}`}
            style={{
              fontSize: i % 2 ? size * 1.08 : size,
              transform: `rotate(${tilt * 3}deg) translateY(${tilt * size * 0.05}px)`,
              ...(dim && !flip ? { color: "#8f8f8f" } : null),
              ...(flip
                ? {
                    backgroundColor: dim ? "#5a5a5a" : theme.color.crimson,
                    color: theme.color.paper,
                    paddingLeft: 4,
                    paddingRight: 4,
                    borderRadius: 2,
                    border: "1px solid rgba(255,255,255,0.55)",
                    marginLeft: 2,
                    marginRight: 2,
                  }
                : null),
            }}
          >
            {ch}
          </div>
        );
      })}
    </>
  );
}

export default function Menu() {
  return <DesignJ />;
}

/* ========== DESIGN J — GAZE LINE (authentic P5: white central line guides the eye) ========== */
function DesignJ() {
  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        <div className={`v ${s.halftone}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.jLine}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.echoLine}`} style={{ pointerEvents: "none" }} />
        <div className={`v ${s.bRed}`} style={{ pointerEvents: "none" }} />
        <div className={`t ${s.watermark}`} style={{ pointerEvents: "none" }}>
          PACIFY
        </div>
        <div className={`t ${s.starA}`} style={{ pointerEvents: "none", animation: "p5-spin 22s linear infinite" }}>
          ✦
        </div>
        <div className={`t ${s.starB}`} style={{ pointerEvents: "none" }}>
          ✦
        </div>

        {/* rotating target ring — top right */}
        <div className={`v ${s.lTarget}`} style={{ pointerEvents: "none" }}>
          <div className={`v ${s.lRingDash}`} style={{ animation: "p5-spin 14s linear infinite" }} />
          <div className={`v ${s.lRingSolid}`} />
          <div className={`v ${s.lDot}`} />
        </div>

        {/* floating suit diamonds */}
        <div
          className={`v ${s.diamond} ${s.diamondA}`}
          style={{ pointerEvents: "none", animation: "p5-float 4.5s ease-in-out infinite" }}
        />
        <div
          className={`v ${s.diamond} ${s.diamondB}`}
          style={{ pointerEvents: "none", animation: "p5-float 6s 1.2s ease-in-out infinite" }}
        />

        <div className={`v ${s.frame}`}>
          <div className={`v ${s.headAbs}`}>
            <div className={`t ${s.logo}`} style={{ animation: "heroIn 560ms 100ms both" }}>PACIFY</div>
            <div className={`t ${s.kicker}`}>SELECT YOUR POISON</div>
          </div>

          {NAV.map((it, i) => (
            <MenuRow key={it.label} it={it} i={i} />
          ))}
        </div>

        {/* hazard tape floor */}
        <div className={`v ${s.hazard}`} style={{ pointerEvents: "none" }} />
      </div>
    </IonPage>
  );
}

function MenuRow({ it, i }: { it: (typeof NAV)[number]; i: number }) {
  const [hovered, setHovered] = useState(false);
  const enabled = !!it.to;
  return (
    <div
      className={`press ${s.jRow} ${!enabled ? s.jRowLocked : ""}`}
      onMouseEnter={() => {
        if (!enabled) return;
        setHovered(true);
        playHover();
      }}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!it.to) return;
        playClick();
        router.push(it.to);
      }}
      style={{ animation: `rowIn 600ms ${120 + i * 70}ms both` }}
    >
      <div className={`v ${s.jInner}`} style={{ transform: `translateX(${(3 - i) * 18}px)` }}>
        <div className={`v ${s.jLeft}`}>
          <div className={`t ${s.idx} ${enabled && hovered ? s.idxOn : ""}`}>{it.n}</div>
          <div
            className={`v ${s.ransomWrap}`}
            style={
              hovered && enabled
                ? { animation: "p5-shiver 0.28s linear", transform: "translateX(-6px) scale(1.05)" }
                : undefined
            }
          >
            <Ransom text={it.label} size={48} dim={!enabled} box={BOX_INDEX[it.label]} />
          </div>
        </div>
        <div className={`v ${s.jRight}`}>
          {enabled ? (
            <>
              <div
                className={`t ${s.jSub}`}
                style={hovered ? { color: theme.color.yellow, letterSpacing: 3.5 } : undefined}
              >
                {it.sub}
              </div>
              <div
                className={`t ${s.jArrow}`}
                style={hovered ? { opacity: 1, transform: "translateX(6px)" } : undefined}
              >
                ▶
              </div>
            </>
          ) : (
            <div className={`v ${s.soonStamp}`}>
              <div className={`t ${s.soonStampTxt}`}>COMING SOON</div>
            </div>
          )}
        </div>
      </div>
      {hovered && enabled && <div className={`v ${s.sweepBar}`} style={{ pointerEvents: "none" }} />}
    </div>
  );
}
