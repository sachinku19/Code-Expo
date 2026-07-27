import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const storedUser = localStorage.getItem("user");
  let user = null;
  if (storedUser) {
    try { user = JSON.parse(storedUser); } catch (e) {}
  }
   
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user has not set up a username handle yet, force redirect to /setup-username onboarding
  if (user && !user.username && location.pathname !== "/setup-username") {
    return <Navigate to="/setup-username" replace />;
  }

  // If user is already on /setup-username but username IS set, redirect to /dashboard
  if (user && user.username && location.pathname === "/setup-username") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

