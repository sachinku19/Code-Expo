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
    const params = new URLSearchParams(location.search);
    const postId = params.get("post");
    if (postId) {
      return <Navigate to={`/post/${postId}`} replace />;
    }
    const profileMatch = location.pathname.match(/^\/dashboard\/profile\/(.+)$/);
    if (profileMatch && profileMatch[1]) {
      return <Navigate to={`/u/${profileMatch[1]}`} replace />;
    }
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

