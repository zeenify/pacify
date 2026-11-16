import { IonApp, IonRouterOutlet, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Navigate, Route } from "react-router-dom";
import { GameProvider } from "./state/game";
import { BgmController } from "./lib/bgm";
import { RouterBridge } from "./lib/nav";
import { NavTransition } from "./components/NavTransition";
import Gate from "./screens/gate";
import Login from "./screens/login";
import Load from "./screens/load";
import Start from "./screens/start";
import Menu from "./screens/menu";
import Campaign from "./screens/campaign";
import Story from "./screens/story";
import Duel from "./screens/duel";
import Dossier from "./screens/dossier";
import Shame from "./screens/shame";
import Profile from "./screens/profile";
import Howto from "./screens/howto";
import Options from "./screens/options";
import Multiplayer from "./screens/multiplayer";
import SfxTest from "./screens/sfx-test";

/* no page transitions — the Expo stack ran with animation: "none" */
setupIonicReact({ animated: false });

export default function App() {
  return (
    <GameProvider>
      <IonApp>
        <IonReactRouter>
          <RouterBridge />
          <BgmController />
          <IonRouterOutlet>
            <Route path="/" element={<Gate />} />
            <Route path="/login" element={<Login />} />
            <Route path="/load" element={<Load />} />
            <Route path="/start" element={<Start />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/campaign" element={<Campaign />} />
            <Route path="/story" element={<Story />} />
            <Route path="/duel" element={<Duel />} />
            <Route path="/dossier" element={<Dossier />} />
            <Route path="/shame" element={<Shame />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/howto" element={<Howto />} />
            <Route path="/options" element={<Options />} />
            <Route path="/multiplayer" element={<Multiplayer />} />
            {/* audio QA only — never routable in a production build */}
            {import.meta.env.DEV && <Route path="/sfx-test" element={<SfxTest />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </IonRouterOutlet>
          {/* "Calling Card Cut" — one overlay above the router, driven by lib/nav */}
          <NavTransition />
        </IonReactRouter>
      </IonApp>
    </GameProvider>
  );
}
