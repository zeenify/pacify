import { useEffect } from "react";
import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Navigate, Route } from "react-router-dom";
import { GameProvider } from "./state/game";
import { BgmController } from "./lib/bgm";
import { installDesktopGate } from "./lib/desktopGate";
import Gate from "./screens/gate";
import Login from "./screens/login";
import Load from "./screens/load";
import Start from "./screens/start";
import Menu from "./screens/menu";
import Campaign from "./screens/campaign";
import Duel from "./screens/duel";
import Dossier from "./screens/dossier";
import Shame from "./screens/shame";
import Profile from "./screens/profile";
import Howto from "./screens/howto";
import Options from "./screens/options";
import Multiplayer from "./screens/multiplayer";

/* no page transitions — the Expo stack ran with animation: "none" */
setupIonicReact({ animated: false });

export default function App() {
  useEffect(() => {
    installDesktopGate();
  }, []);
  return (
    <GameProvider>
      <IonApp>
        <IonReactRouter>
          <BgmController />
          <IonRouterOutlet>
            <Route path="/" element={<Gate />} />
            <Route path="/login" element={<Login />} />
            <Route path="/load" element={<Load />} />
            <Route path="/start" element={<Start />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/campaign" element={<Campaign />} />
            <Route path="/duel" element={<Duel />} />
            <Route path="/dossier" element={<Dossier />} />
            <Route path="/shame" element={<Shame />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/howto" element={<Howto />} />
            <Route path="/options" element={<Options />} />
            <Route path="/multiplayer" element={<Multiplayer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </GameProvider>
  );
}
