import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth";

export default function PrivateRoute() {
  const { token, ready } = useAuth();
  const loc = useLocation();

  if (!ready) {
    // evita flicker/redirect mentre ripristiniamo dal localStorage
    return <div style={{ padding: 24 }}>Caricamento…</div>;
  }
  if (!token) {
    // non loggato → torna a /login con redirect state
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return <Outlet />;
}
