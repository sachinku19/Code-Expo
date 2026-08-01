import React from "react";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="auth-layout-root">
      <Outlet />
    </div>
  );
}
