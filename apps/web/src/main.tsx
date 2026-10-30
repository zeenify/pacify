import { createRoot } from "react-dom/client";
/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";
/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "./theme/global.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
