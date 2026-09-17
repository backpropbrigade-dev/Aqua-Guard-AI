import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensurePlatformDemoData } from "./lib/demo-platform-seed";

ensurePlatformDemoData();

createRoot(document.getElementById("root")!).render(<App />);
