/* GATE — flow is Login -> Load -> Start -> Menu.
   Valid session? straight to Load (the one-time fetch). Otherwise, enrollment. */
import { IonPage } from "@ionic/react";
import { useEffect } from "react";
import { api } from "../lib/api";
import { router } from "../lib/nav";
import s from "./gate.module.css";

export default function Gate() {
  useEffect(() => {
    api("/auth/me")
      .then(() => router.replace("/load"))
      .catch(() => router.replace("/login"));
  }, []);

  return (
    <IonPage>
      <div className={`v ${s.stage}`}>
        <div className={`t ${s.txt}`}>PACIFY</div>
      </div>
    </IonPage>
  );
}
