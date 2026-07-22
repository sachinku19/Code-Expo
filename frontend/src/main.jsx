import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/global.css"
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

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
