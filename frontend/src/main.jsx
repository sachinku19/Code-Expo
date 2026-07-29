import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/global.css"
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import axios from "axios"
import toast from "react-hot-toast"

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

// Auto-reload browser when Vercel deploys new build hashes to prevent stale chunk 404/MIME errors
window.addEventListener('vite:preloadError', (event) => {
  console.warn('New app deployment detected. Reloading page to fetch latest assets...', event);
  window.location.reload();
});

window.addEventListener('error', (event) => {
  if (
    event.message &&
    (event.message.includes('Failed to fetch dynamically imported module') ||
     event.message.includes('Importing a module script failed') ||
     event.message.includes('Expected a JavaScript-or-Wasm module script'))
  ) {
    console.warn('Module load error detected, auto-reloading page...', event.message);
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
