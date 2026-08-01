import React, { Component, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Runtime error caught by RootLayout Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#05050a",
          color: "#fff",
          fontFamily: "'Outfit', 'Inter', sans-serif",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{
            background: "rgba(255, 50, 50, 0.04)",
            border: "1px solid rgba(255, 50, 50, 0.15)",
            padding: "40px",
            borderRadius: "16px",
            maxWidth: "500px",
            boxShadow: "0 0 30px rgba(255, 0, 0, 0.1)"
          }}>
            <h1 style={{ fontSize: "2.5rem", margin: "0 0 10px 0", color: "#ef4444" }}>System Anomaly</h1>
            <p style={{ color: "#a1a1aa", fontSize: "0.95rem", marginBottom: "24px" }}>
              A critical runtime error has occurred. The grid connection has been terminated to protect local workspaces.
            </p>
            <div style={{
              background: "#0c0c14",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              color: "#f87171",
              textAlign: "left",
              maxHeight: "150px",
              overflowY: "auto",
              marginBottom: "24px"
            }}>
              {this.state.error?.toString() || "Unknown grid failure"}
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)"
                }}
              >
                Reconnect Grid
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#e4e4e7",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.85rem"
                }}
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Scroll to Top & Title Updater wrapper
function NavigationWrapper({ children }) {
  const location = useLocation();

  useEffect(() => {
    // 1. Scroll to top on route change
    window.scrollTo({ top: 0, behavior: "instant" });

    // 2. Dynamic titles based on pathname
    const path = location.pathname;
    let title = "CODE-EXPO | Real-Time Collaborative Workspace";

    if (path === "/") {
      title = "CODE-EXPO | Code, Connect & Collaborate";
    } else if (path === "/login" || path === "/register") {
      title = "CODE-EXPO | Authentication Gate";
    } else if (path === "/setup-username") {
      title = "CODE-EXPO | Initialize Workspace Profile";
    } else if (path.startsWith("/u/")) {
      const username = path.substring(3);
      title = `@${username} on CODE-EXPO`;
    } else if (path.startsWith("/editor/")) {
      title = "CODE-EXPO | Real-Time Editor Session";
    } else if (path === "/admin") {
      title = "CODE-EXPO | Central Admin Command Panel";
    } else if (path.startsWith("/dashboard")) {
      const parts = path.split("/");
      const section = parts[2] || "home";
      const formatted = section.charAt(0).toUpperCase() + section.slice(1).replace("-", " ");
      title = `CODE-EXPO | Dashboard - ${formatted}`;
    }

    document.title = title;
  }, [location.pathname]);

  return children;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <NavigationWrapper>
        <Outlet />
      </NavigationWrapper>
    </ErrorBoundary>
  );
}
