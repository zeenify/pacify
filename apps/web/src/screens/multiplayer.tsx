import { IonPage } from "@ionic/react";
import { ScreenShell } from "../components/ScreenShell";
import { router } from "../lib/nav";
import s from "./multiplayer.module.css";

export default function Multiplayer() {
  return (
    <IonPage>
      <ScreenShell>
      <div className={`v ${s.topbar}`}>
        <div className={`press`} style={{ padding: 10, margin: -10 }} onClick={() => router.replace("/menu")}>
          <div className={`t ${s.back}`}>‹ MENU</div>
        </div>
        <div className={`t ${s.mark}`}>MULTIPLAYER</div>
        <div className={`v ${s.lock}`}>
          <div className={`t ${s.lockText}`}>LOCKED</div>
        </div>
      </div>

      <div className={`v ${s.stage}`}>
        <div className={`v ${s.cabinet}`}>
          <div className={`v ${s.marquee}`}>
            <div className={`t ${s.marqueeText}`}>1V1 • SAME ENGINE • SAME TRICKS</div>
          </div>
          <div className={`v ${s.screen}`}>
            <div className={`t ${s.big}`}>COMING SOON</div>
            <div className={`t ${s.sub}`}>Human vs human — hidden hands, same 7-card singleton, 3 tricks max. No AI tells to farm.</div>
          </div>
          <div className={`v ${s.controls}`}>
            <div className={`v ${s.stick}`} />
            <div className={`v ${s.buttons}`}>
              <div className={`v ${s.btnRed}`} />
              <div className={`v ${s.btnWhite}`} />
              <div className={`v ${s.btnBlack}`} />
            </div>
          </div>
        </div>
        <div className={`press ${s.cta}`} onClick={() => router.replace("/menu")}>
          <div className={`t ${s.ctaText}`}>BACK TO MENU</div>
        </div>
      </div>
      </ScreenShell>
    </IonPage>
  );
}
