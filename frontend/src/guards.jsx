import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";

export function RequireAdmin() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireManager() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user || (user.role !== "manager" && user.role !== "admin")) return <Navigate to="/login" replace />;
  return <Outlet />;
}
