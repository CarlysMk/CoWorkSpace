import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/";

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const data = await api.login({ email, password });
      login({ token: data.token, email: data.email, role: data.role });
      setMsg("Login effettuato");
      nav(from, { replace: true });
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div>
      <h2>Login</h2>
      {err && <div className="error">{err}</div>}
      {msg && <div className="ok">{msg}</div>}
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <div style={{marginTop:10}}><button className="btn">Entra</button></div>
      </form>
    </div>
  );
}
