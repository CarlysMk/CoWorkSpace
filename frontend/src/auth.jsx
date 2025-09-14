import React from "react";
import api from "./api";

const AuthCtx = React.createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      const email = localStorage.getItem("email");
      const role = localStorage.getItem("role");
      if (t && email && role) {
        setToken(t);
        setUser({ email, role });
      }
    } finally {
      setReady(true);
    }
  }, []);

  function login({ token, email, role }) {
    setToken(token);
    setUser({ email, role });
    localStorage.setItem("token", token);
    localStorage.setItem("email", email);
    localStorage.setItem("role", role);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
  }

  const value = { token, user, login, logout, ready };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return React.useContext(AuthCtx);
}
