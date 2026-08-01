import React, { lazy, Suspense, createContext, useContext, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import GateOverlay from "../components/GateOverlay";
import { ModalProvider } from "../context/ModalContext";
import { ThemeProvider } from "../context/ThemeContext";
import { Toaster } from "react-hot-toast";
import NetworkStatusTracker from "../components/NetworkStatusTracker";
import RootLayout from "../layouts/RootLayout";
import AuthLayout from "../layouts/AuthLayout";
import { ROUTES } from "../constants/routes";

// Page components (statically imported for instant transitions)
import Home from "../pages/Home";
import Auth from "../pages/Auth";
import NotFound from "../pages/NotFound";

// Lazy loaded page components
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Editor = lazy(() => import("../pages/Editor"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const PublicPostView = lazy(() => import("../pages/PublicPostView"));
const SetupUsername = lazy(() => import("../pages/SetupUsername"));

// Protected routes
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";

// Components
import AIChatbot from "../components/chatbot/AIChatbot";
import { CallProvider } from "../context/CallContext";
import CallOverlay from "../components/chat/CallOverlay";

// Global Transition Context
export const GateTransitionContext = createContext({
  triggerGateTransition: () => { }
});

export const useGateTransition = () => useContext(GateTransitionContext);

export function GateTransitionProvider({ children }) {
  const [gateState, setGateState] = useState("idle"); // 'idle' | 'closing' | 'opening'
  const [statusText, setStatusText] = useState("");
  const navigate = useNavigate();

  const triggerGateTransition = (targetPath, customStatusText = "Connecting to Neural Grid...") => {
    setStatusText(customStatusText);
    setGateState("closing");

    // 1. Wait for doors to slide shut (400ms)
    setTimeout(() => {
      // 2. Perform navigation, passing state so target page knows it is a transition
      navigate(targetPath, { state: { fromTransition: true } });

      // 3. Switch to opening state
      setGateState("opening");
      setStatusText("Decryption Complete");

      // 4. Wait for unlocking sequence + doors sliding open (800ms)
      setTimeout(() => {
        setGateState("idle");
      }, 800);
    }, 400);
  };

  return (
    <GateTransitionContext.Provider value={{ triggerGateTransition }}>
      {children}
      {gateState === "closing" && (
        <GateOverlay statusText={statusText} />
      )}
      {gateState === "opening" && (
        <GateOverlay exiting statusText={statusText} />
      )}
    </GateTransitionContext.Provider>
  );
}

// Premium top-progress-bar loader for route transitions
const RouteLoader = () => (
  <div style={{
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "3px",
    background: "linear-gradient(90deg, #aa3bff 0%, #00f0ff 50%, #aa3bff 100%)",
    backgroundSize: "200% 100%",
    animation: "route-loading-bar 1.5s infinite linear",
    zIndex: 99999
  }}>
    <style>{`
      @keyframes route-loading-bar {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

const UserProfileRedirect = () => {
  const { userId } = useParams();
  return <Navigate to={`/dashboard/profile/${userId}`} replace />;
};

const OwnProfileRedirect = () => {
  try {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.username) {
        return <Navigate to={`/u/${parsed.username}`} replace />;
      }
    }
  } catch (e) { }
  return <Navigate to="/dashboard/profile" replace />;
};

const PostRouteHandler = () => {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (token && storedUser && storedUser !== "null" && storedUser !== "undefined") {
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    );
  }
  return <PublicPostView />;
};

const AppRoutes = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ModalProvider>
          <CallProvider>
            <GateTransitionProvider>
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route element={<RootLayout />}>
                    {/* Public Routes */}
                    <Route path={ROUTES.HOME} element={<Home />} />
                    <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />

                    {/* Auth Routes */}
                    <Route element={<AuthLayout />}>
                      <Route path={ROUTES.LOGIN} element={<Auth mode="login" />} />
                      <Route path={ROUTES.REGISTER} element={<Auth mode="register" />} />
                    </Route>

                    {/* Setup Profile Route */}
                    <Route path={ROUTES.SETUP_USERNAME} element={<ProtectedRoute><SetupUsername /></ProtectedRoute>} />

                    {/* User profile and redirect links */}
                    <Route path={ROUTES.PROFILE} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/profile" element={<OwnProfileRedirect />} />
                    <Route path={ROUTES.USER_PROFILE} element={<UserProfileRedirect />} />
                    <Route path={ROUTES.POST} element={<PostRouteHandler />} />

                    {/* Protected Dashboard Nested Layout Routes */}
                    <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
                      <Route index element={<React.Fragment />} />
                      <Route path="cp" element={<React.Fragment />} />
                      <Route path="rooms" element={<React.Fragment />} />
                      <Route path="live-rooms" element={<React.Fragment />} />
                      <Route path="bookmarks" element={<React.Fragment />} />
                      <Route path="feed" element={<React.Fragment />} />
                      <Route path="following" element={<React.Fragment />} />
                      <Route path="leaderboard" element={<React.Fragment />} />
                      <Route path="achievements" element={<React.Fragment />} />
                      <Route path="history" element={<React.Fragment />} />
                      <Route path="whiteboards" element={<React.Fragment />} />
                      <Route path="messages" element={<React.Fragment />} />
                      <Route path="notifications" element={<React.Fragment />} />
                      <Route path="profile" element={<React.Fragment />} />
                      <Route path="profile/:userId" element={<React.Fragment />} />
                      <Route path="settings" element={<React.Fragment />} />
                      <Route path="helpdesk" element={<React.Fragment />} />
                      <Route path="planner" element={<React.Fragment />} />
                      <Route path="subscription" element={<React.Fragment />} />
                      <Route path="trust-safety" element={<React.Fragment />} />
                      {/* Catch-all for unrecognized dashboard subroutes */}
                      <Route path="*" element={<Navigate to="/404" replace />} />
                    </Route>

                    {/* Other Protected Pages */}
                    <Route path={ROUTES.EDITOR} element={<ProtectedRoute><Editor /></ProtectedRoute>} />
                    <Route path={ROUTES.ADMIN} element={<AdminRoute><AdminDashboard /></AdminRoute>} />

                    {/* Fallback 404 handler */}
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Route>
                </Routes>
              </Suspense>
              <CallOverlay />
              <NetworkStatusTracker />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "#0d0d15",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                    fontSize: "0.82rem",
                    borderRadius: "10px",
                  },
                }}
              />
            </GateTransitionProvider>
          </CallProvider>
        </ModalProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default AppRoutes;