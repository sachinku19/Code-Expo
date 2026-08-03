import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/global.css"
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import axios from "axios"
import toast from "react-hot-toast"
import { loader } from "@monaco-editor/react";

// Configure Monaco Editor to load assets locally from public directory (eliminates external CDN delay)
loader.config({ paths: { vs: "/monaco-editor/min/vs" } });

// Configure Global Axios Interceptors for custom client instances (DNS/Timeout/Server Down Errors)
let lastNetworkErrorTime = 0;
const originalCreate = axios.create;
axios.create = function (...args) {
  const instance = originalCreate.apply(this, args);
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Catch absolute network offline/disconnect or server down errors
      if (!error.response || error.code === "ERR_NETWORK" || error.message === "Network Error") {
        const now = Date.now();
        if (now - lastNetworkErrorTime > 4000) {
          toast.error("Server connection lost. Please verify your internet connection.", {
            id: "global-network-error-toast",
            duration: 4000
          });
          lastNetworkErrorTime = now;
        }
      }
      return Promise.reject(error);
    }
  );
  return instance;
};

// Debounce auto-reloads to prevent infinite reload loops (e.g. during real offline/disconnect or server down states)
const reloadWithDebounce = (reason) => {
  try {
    const lastReload = sessionStorage.getItem("ce_last_preload_reload");
    const now = Date.now();
    // Only reload if the last automatic reload was more than 10 seconds ago
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem("ce_last_preload_reload", String(now));
      console.warn(`${reason}. Reloading page to fetch latest assets...`);
      window.location.reload();
    } else {
      console.error(`${reason}. Skipped automatic reload to prevent infinite loop.`);
    }
  } catch (e) {
    // Fallback if sessionStorage is disabled/blocked in the user's browser
    window.location.reload();
  }
};

// Auto-reload browser when Vercel deploys new build hashes to prevent stale chunk 404/MIME errors
window.addEventListener('vite:preloadError', (event) => {
  reloadWithDebounce("vite:preloadError detected");
});

window.addEventListener('error', (event) => {
  if (
    event.message &&
    (event.message.includes('Failed to fetch dynamically imported module') ||
     event.message.includes('Importing a module script failed') ||
     event.message.includes('Expected a JavaScript-or-Wasm module script'))
  ) {
    reloadWithDebounce(`Module load error: ${event.message}`);
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
