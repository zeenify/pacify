import { IonPage } from "@ionic/react";
import { ScreenShell } from "../components/ScreenShell";
import { router } from "../lib/nav";
import { P5Image } from "../components/P5Image";
import { playHover } from "../lib/sfx";
import s from "./howto.module.css";

/* THE TRICKS — the real seven, straight from the engine (hints mirror the
   duel's TRICK_HINT). The old placeholder listed five and lied about powers. */
const TRICKS = [
  { id: "void", name: "VOID", hint: "VOID ROUND", desc: "The round is void — nothing scores. The only trick that eats even the opponent's trick." },
  { id: "oracle", name: "ORACLE", hint: "PEEK 2", desc: "Peek 2 of the opponent's hidden hand. Information is the sharpest blade at this table." },
  { id: "reversal", name: "REVERSAL", hint: "SWAP SCORES", desc: "After scoring, the totals swap. Behind can become ahead in one flip — even on a tie." },
  { id: "ward", name: "WARD", hint: "BLOCK +5", desc: "Blocks the opponent's trick and lands a flat +5 while it's at it." },
  { id: "echo", name: "ECHO", hint: "NEXT ×2", desc: "Voids this round to 0, then doubles your next scoring round. Echo + R7 caps ×3, never ×4." },
  { id: "executioner", name: "EXECUTIONER", hint: "BEHEAD 7+", desc: "Beheads every 7+ number on the field — heads roll, points never land." },
  { id: "eclipse", name: "ECLIPSE", hint: "NO SHIELDS ×2", desc: "Voids this round and kills shields for 2 rounds — same-alignment no longer protects anyone." },
];

/* Real card face at rules size — trick ground: near-black, crimson corners,
   yellow accents. Same language as the duel's faces (emblem art center). */
function TrickFace({ id, name }: { id: string; name: string }) {
  return (
    <div className={`v ${s.face}`}>
      <div className={`v ${s.faceCornerA}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.faceCornerB}`} style={{ pointerEvents: "none" }} />
      <div className={`v ${s.faceEmblem}`}>
        <P5Image src={`/emblems/${id}.png`} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
      </div>
      <div className={`t ${s.faceName}`}>{name}</div>
    </div>
  );
}

export default function HowTo() {
  return (
    <IonPage>
      <ScreenShell>
      <div className={`v ${s.topbar}`}>
        <div className={`press`} style={{ padding: 10, margin: -10 }} onClick={() => router.replace("/menu")}>
          <div className={`t ${s.back}`}>‹ MENU</div>
        </div>
        <div className={`t ${s.mark}`}>HOW TO PLAY</div>
      </div>

      <div className={`v ${s.scroll} noscroll`}>
        <div className={`v ${s.scrollContent}`}>
          <div className={`v ${s.header}`}>
            <div className={`t ${s.kicker}`}>RULES • WATCH OR LOSE</div>
            <div className={`t ${s.title}`}>LEARN THE LIE</div>
          </div>

          {/* THE FILM — the official runthrough, produced with the final card art */}
          <div className={`v ${s.film}`}>
            <div className={`v ${s.filmTag}`}><div className={`t ${s.filmTagTxt}`}>THE FILM — OFFICIAL RUNTHROUGH</div></div>
            <div className={`v ${s.filmFrame}`}>
              <video
                className={s.filmVideo}
                src="/how-to-play-qoder/pacify-how-to-play.mp4"
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
            <div className={`t ${s.filmSub}`}>SOUND ON — TURN IT UP, THEN TAKE A SEAT</div>
          </div>

          <div className={`v ${s.stripRow}`}>
            <div className={`v ${s.stripCard}`}>
              <div className={`t ${s.stripNum}`}>01</div>
              <div className={`t ${s.stripTitle}`}>7 ROUNDS — SIMULTANEOUS</div>
              <div className={`t ${s.stripBody}`}>Hidden hands. One card each, both flip together. Singleton: no duplicate card in a match. Max 3 tricks per hand.</div>
              <div className={`v ${s.tag}`}>
                <div className={`t ${s.tagText}`}>FIRST TO 20</div>
              </div>
            </div>
            <div className={`v ${s.stripCard}`}>
              <div className={`t ${s.stripNum}`}>02</div>
              <div className={`t ${s.stripTitle}`}>SCORE THE DIFF</div>
              <div className={`t ${s.stripBody}`}>Higher wins winner − loser, but only good vs bad. Same alignment = shield, 0 both. Tricks and R7's ×2 climax break shields.</div>
            </div>
            <div className={`v ${s.stripCard}`} style={{ backgroundColor: "#FFFFFF", borderColor: "#E60012" }}>
              <div className={`t ${s.stripNum}`} style={{ color: "#E60012" }}>03</div>
              <div className={`t ${s.stripTitle}`} style={{ color: "#0A0A0A" }}>TRICKS — 7 WAYS TO LIE</div>
              <div className={`t ${s.stripBody}`} style={{ color: "#333" }}>Priority: Void → Eclipse → Ward → Echo → Reversal → Executioner → Oracle. One blocked trick dies, the rest still fire.</div>
            </div>
          </div>

          <div className={`v ${s.trickGrid}`}>
            {TRICKS.map((t) => (
              <div key={t.id} className={`v ${s.trick}`}>
                <TrickFace id={t.id} name={t.name} />
                <div className={`v ${s.trickBody}`}>
                  <div className={`t ${s.trickName}`}>{t.name}</div>
                  <div className={`t ${s.trickDesc}`}>{t.desc}</div>
                  <div className={`v ${s.note}`}>
                    <div className={`t ${s.noteText}`}>{t.hint}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`v ${s.footer}`}>
            <div className={`t ${s.footerTitle}`}>PRIORITY & CAPS</div>
            <div className={`t ${s.footerBody}`}>Void on top voids even the opponent's trick. Eclipse fires before Ward, but a Ward block cancels it. Echo, Eclipse and Oracle effects stack alongside each other. Ward blocks and lands flat +5. Reversal swaps totals after scoring, even on a tie. Echo voids the round to 0 then doubles your next scoring round — Echo + R7 caps at ×3, never ×4. Executioner beheads every 7+ number on the field.</div>
          </div>
        </div>
      </div>
      </ScreenShell>
    </IonPage>
  );
}
