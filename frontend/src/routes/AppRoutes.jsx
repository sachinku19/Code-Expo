import React, { lazy, Suspense } from "react";
import {BrowserRouter,Routes,Route,Navigate} from "react-router-dom";

// Lazy loaded page components
const Home = lazy(() => import("../pages/Home"));
const Auth = lazy(() => import("../pages/Auth"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Editor = lazy(() => import("../pages/Editor"));
const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));

//protected route
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute";

// components
import AIChatbot from "../components/chatbot/AIChatbot";

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

const AppRoutes=()=>{
    return(
        <BrowserRouter>
           <Suspense fallback={<RouteLoader />}>
              <Routes>
                 <Route path="/"  element={<Home/>}/>
                 <Route path="/login"  element={<Auth mode="login"/>}/>
                 <Route path="/register"  element={<Auth mode="register"/>}/>
                 <Route path="/profile" element={<Navigate to="/dashboard?tab=profile" replace />} />
                 <Route path="/dashboard"  element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
                 <Route path="/editor/:roomId"  element={<ProtectedRoute><Editor/></ProtectedRoute>}/>
                 <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              </Routes>
           </Suspense>
           <AIChatbot />
        </BrowserRouter>
    )
}

export default AppRoutes;