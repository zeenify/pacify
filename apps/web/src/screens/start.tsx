import { IonPage } from "@ionic/react";
import { useEffect, useState } from "react";
import { playHover, unlockSfx } from "../lib/sfx";
import { router } from "../lib/nav";
import { api } from "../lib/api";
import { useGame } from "../state/game";
import { preloadVictor } from "../data/victor";
import { clearTutorialLog } from "../lib/tutorial-log";
import { P5Image } from "../components/P5Image";
import s from "./start.module.css";

type FanCard = {
  kind: "back" | "face";
  id?: string;
  name?: string;
  power?: string;
  align?: "good" | "bad";
  rot: number;
  y: number;
  z: number;
};

const FAN_CARDS: FanCard[] = [
  { kind: "back", rot: -14, y: 12, z: 0 },
  { kind: "face", id: "seraph", name: "SERAPH", power: "10", align: "good", rot: -2, y: -10, z: 1 },
  { kind: "face", id: "leviathan", name: "LEVIATHAN", power: "9", align: "bad", rot: 12, y: 8, z: 2 },
];

function StartCard({ card }: { card: FanCard }) {
  if (card.kind === "back") {
    return (
      <div className={`v ${s.card} ${s.cardBack}`}>
        <div className={`v ${s.cardBand}`} />
        <P5Image src="/emblems/back-crest.png" resizeMode="contain" style={{ width: "58%", height: "54%" }} />
      </div>
    );
  }
  const good = card.align === "good";
  return (
    <div className={`v ${s.card} ${good ? s.cardGood : s.cardBad}`}>
      <div className={`t ${s.cardPower}`}>{card.power ?? "—"}</div>
      <div className={`v ${s.cardEmblem}`}>
        <P5Image src={`/emblems/${card.id}.png`} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
      </div>
      <div className={`t ${s.cardName}`}>{card.name}</div>
    </div>
  );
}

export default function Start() {
  const { profile } = useGame();
  // The load screen already cached the profile; null only happens on a direct
  // visit with a cold session, where one /auth/me fills it in.
  const [tutorialDone, setTutorialDone] = useState<boolean | null>(profile?.tutorialDone ?? null);

  useEffect(() => {
    if (profile?.tutorialDone !== undefined) {
      setTutorialDone(profile.tutorialDone);
      return;
    }
    let alive = true;
    api<{ tutorialDone?: boolean }>("/auth/me")
      .then((u) => { if (alive) setTutorialDone(u?.tutorialDone === true); })
      .catch(() => { if (alive) setTutorialDone(true); }); // never trap a session we cannot read
    return () => { alive = false; };
  }, [profile?.tutorialDone]);

  // First-year orientation pending: warm Victor's portraits and clips on the
  // title screen, so the tutorial opens with zero audio/image wait.
  useEffect(() => {
    if (tutorialDone === false) preloadVictor();
  }, [tutorialDone]);

  useEffect(() => {
    const unlock = () => {
      unlockSfx();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  async function enter() {
    unlockSfx();
    let done = tutorialDone ?? profile?.tutorialDone ?? null;
    if (done === null) {
      try {
        const u = await api<{ tutorialDone?: boolean }>("/auth/me");
        done = u?.tutorialDone === true;
      } catch {
        done = true;
      }
      setTutorialDone(done);
    }
    if (done === false) clearTutorialLog(); // fresh run — one continuous transcript after this
    router.replace(done === false ? "/tutorial" : "/menu");
  }

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        <div className={`v ${s.redCut}`} aria-hidden="true" />
        <div className={`v ${s.paperCut}`} aria-hidden="true" />
        <div className={`v ${s.inkShard}`} aria-hidden="true" />
        <div className={`v ${s.halftone}`} aria-hidden="true" />
        <div className={`v ${s.cutLine}`} aria-hidden="true" />
        <div className={`t ${s.registration}`} aria-hidden="true">VX—01<br />NO APPEALS</div>

        <main className={`v ${s.hero}`}>
          <div className={`t ${s.kicker}`}>VERTEX INSTITUTE // FIRST YEAR DIVISION</div>
          <h1 className={`t ${s.logo}`} data-text="PACIFY">PACIFY</h1>
          <div className={`t ${s.tagline}`}>DON&apos;T OVERTHINK IT.</div>
          <button
            type="button"
            className={`press ${s.cta}`}
            onMouseEnter={playHover}
            onClick={() => { void enter(); }}
          >
            <span className={`ti ${s.ctaText}`}>ENTER THE TABLE</span>
            <span className={`v ${s.ctaIco}`} aria-hidden="true"><P5Image src="/ui/play.png" resizeMode="contain" style={{ width: "100%", height: "100%" }} /></span>
          </button>
        </main>

        <div className={`v ${s.art}`} aria-hidden="true">
          <div className={`v ${s.fan}`}>
            {FAN_CARDS.map((card, i) => (
              <div
                key={i}
                className={`v ${s.cardScatter}`}
                style={{ transform: `rotate(${card.rot}deg) translateY(${card.y}px)`, zIndex: card.z }}
              >
                <StartCard card={card} />
              </div>
            ))}
          </div>
          <P5Image
            src="/students/2clubs9x16nobgcropped.png"
            resizeMode="contain"
            className={s.kleinImg}
          />
        </div>

        <div className={`v ${s.hazard}`} aria-hidden="true" />
      </div>
    </IonPage>
  );
}