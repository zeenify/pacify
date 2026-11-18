/* HOW TO PLAY — THE BRIEFING. The narrated 16-scene motion explainer that
   ships in /public/how-to-play (word-anchored beats, chapter index, mobile
   swipe). It fills the screen whole; the MENU button floats above it. */
import { IonPage } from "@ionic/react";
import { router } from "../lib/nav";
import s from "./howto.module.css";

export default function HowTo() {
  return (
    <IonPage>
      <iframe
        className={s.briefing}
        src="/how-to-play/how-to-play.html"
        title="PACIFY — How To Play"
      />
      <div className={`press ${s.floatMenu}`} onClick={() => router.replace("/menu")}>
        <div className={`t ${s.floatMenuTxt}`}>‹ MENU</div>
      </div>
    </IonPage>
  );
}
