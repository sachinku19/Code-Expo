import React, { lazy, Suspense, createContext, useContext, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import GateOverlay from "../components/GateOverlay";
import { ModalProvider } from "../context/ModalContext";

// Lazy loaded page components
const Home = lazy(() => import("../pages/Home"));
const Auth = lazy(() => import("../pages/Auth"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Editor = lazy(() => import("../pages/Editor"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));

// Protected routes
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";

// Components
import AIChatbot from "../components/chatbot/AIChatbot";
import { CallProvider } from "../context/CallContext";
import CallOverlay from "../components/chat/CallOverlay";

// Global Transition Context
export const GateTransitionContext = createContext({
  triggerGateTransition: () => {}
});

export const useGateTransition = () => useContext(GateTransitionContext);

export function GateTransitionProvider({ children }) {
  const [gateState, setGateState] = useState("idle"); // 'idle' | 'closing' | 'opening'
  const [statusText, setStatusText] = useState("");
  const navigate = useNavigate();

  const triggerGateTransition = (targetPath, customStatusText = "Connecting to Neural Grid...") => {
    setStatusText(customStatusText);
    setGateState("closing");
    
    // 1. Wait for doors to slide shut (350ms)
    setTimeout(() => {
      // 2. Perform navigation, passing state so target page knows it is a transition
      navigate(targetPath, { state: { fromTransition: true } });
      
      // 3. Switch to opening state
      setGateState("opening");
      setStatusText("Decryption Complete");
      
      // 4. Wait for unlocking sequence + doors sliding open (650ms)
      setTimeout(() => {
        setGateState("idle");
      }, 650);
    }, 350);
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
  return <Navigate to={`/dashboard?tab=profile&userId=${userId}`} replace />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ModalProvider>
        <CallProvider>
          <GateTransitionProvider>
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Auth mode="login" />} />
                <Route path="/register" element={<Auth mode="register" />} />
                <Route path="/profile" element={<Navigate to="/dashboard?tab=profile" replace />} />
                <Route path="/user/:userId" element={<UserProfileRedirect />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/editor/:roomId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
              </Routes>
            </Suspense>
            <AIChatbot />
            <CallOverlay />
          </GateTransitionProvider>
        </CallProvider>
      </ModalProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;