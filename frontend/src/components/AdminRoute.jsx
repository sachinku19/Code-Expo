import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  // If there is no token at all, redirect to login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If user state exists but role is not admin, redirect to user dashboard
  if (user && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Note: if user is not loaded yet but token is present, we return children
  // (AuthContext initializes synchronously from localStorage)
  return children;
};

export default AdminRoute;
