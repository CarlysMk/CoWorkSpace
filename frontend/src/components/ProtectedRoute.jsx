import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, isLoggedIn } from "../api";

export default function ProtectedRoute({ children, requireRole }) {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isLoggedIn()) {
        setOk(false);
        setLoading(false);
        return;
      }
      try {
        const { user } = await api("/auth/me", { auth: true });
        if (requireRole && user.role !== requireRole) setOk(false);
        else setOk(true);
      } catch {
        setOk(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [requireRole]);

  if (loading) return <p>Caricamento…</p>;
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}
