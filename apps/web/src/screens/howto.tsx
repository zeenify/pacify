/* HOW TO PLAY — THE BRIEFING. The narrated 16-scene motion explainer that
   ships in /public/how-to-play (word-anchored beats, chapter index, mobile
   swipe). It fills the screen whole; the shared P5Back floats above it. */
import { IonPage } from "@ionic/react";
import { P5Back } from "../components/P5Back";
import s from "./howto.module.css";

export default function HowTo() {
  return (
    <IonPage>
      <iframe
        className={s.briefing}
        src="/how-to-play/how-to-play.html?embed=1"
        title="PACIFY — How To Play"
      />
      <div className={s.backDock}>
        <P5Back />
      </div>
    </IonPage>
  );
}
