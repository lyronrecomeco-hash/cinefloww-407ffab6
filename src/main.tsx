import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSecurity } from "./lib/security";
import { trackVisit } from "./lib/apiClient";

// Initialize anti-DevTools security
initSecurity();

// Track visitor (non-blocking)
trackVisit();

createRoot(document.getElementById("root")!).render(<App />);
