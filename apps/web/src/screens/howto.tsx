import { IonPage } from "@ionic/react";
import { ScreenShell } from "../components/ScreenShell";
import { router } from "../lib/nav";
import s from "./howto.module.css";

const TRICKS = [
  { name: "VOID", power: "NULL", desc: "Voids everything — even opponent trick.", note: "TOP" },
  { name: "ORACLE", power: "3", desc: "Peek 2 random hidden cards.", note: "INFO" },
  { name: "REVERSAL", power: "4", desc: "Swap totals AFTER scoring.", note: "SWAP" },
  { name: "WARD", power: "3", desc: "Blocks trick + flat 3 pts.", note: "GUARD" },
  { name: "ECHO", power: "NULL", desc: "Voids this, doubles next.", note: "ECHO" },
];

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
            <div className={`t ${s.kicker}`}>RULES • READ OR LOSE</div>
            <div className={`t ${s.title}`}>LEARN THE LIE</div>
          </div>

          <div className={`v ${s.stripRow}`}>
            <div className={`v ${s.stripCard}`}>
              <div className={`t ${s.stripNum}`}>01</div>
              <div className={`t ${s.stripTitle}`}>5 ROUNDS — SIMULTANEOUS</div>
              <div className={`t ${s.stripBody}`}>Hidden hands. One card each. Singleton: no duplicate card in a match.</div>
              <div className={`v ${s.tag}`}>
                <div className={`t ${s.tagText}`}>30% TRICK DRAW</div>
              </div>
            </div>
            <div className={`v ${s.stripCard}`}>
              <div className={`t ${s.stripNum}`}>02</div>
              <div className={`t ${s.stripTitle}`}>SCORE THE DIFF</div>
              <div className={`t ${s.stripBody}`}>Higher wins winner − loser only if good vs bad. Same side → 0. Tricks neutral always score. Tie 0. R5 ×2.</div>
            </div>
            <div className={`v ${s.stripCard}`} style={{ backgroundColor: "#FFFFFF", borderColor: "#E60012" }}>
              <div className={`t ${s.stripNum}`} style={{ color: "#E60012" }}>03</div>
              <div className={`t ${s.stripTitle}`} style={{ color: "#0A0A0A" }}>TRICKS — 5 WAYS TO LIE</div>
              <div className={`t ${s.stripBody}`} style={{ color: "#333" }}>Void → Ward → rest (both fire). See below.</div>
            </div>
          </div>

          <div className={`v ${s.trickGrid}`}>
            {TRICKS.map((t) => (
              <div key={t.name} className={`v ${s.trick}`}>
                <div className={`v ${s.trickTop}`}>
                  <div className={`t ${s.trickName}`}>{t.name}</div>
                  <div className={`v ${s.power}`}>
                    <div className={`t ${s.powerText}`}>{t.power}</div>
                  </div>
                </div>
                <div className={`t ${s.trickDesc}`}>{t.desc}</div>
                <div className={`v ${s.note}`}>
                  <div className={`t ${s.noteText}`}>{t.note}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={`v ${s.footer}`}>
            <div className={`t ${s.footerTitle}`}>PRIORITY & CAPS</div>
            <div className={`t ${s.footerBody}`}>Void top voids even opponent. Ward blocks + flat 3. Reversal 4 swaps after scoring even on tie. Echo voids current 0 then doubles next — Echo on 4 + R5 capped ×3 not ×4.</div>
          </div>
        </div>
      </div>
      </ScreenShell>
    </IonPage>
  );
}
