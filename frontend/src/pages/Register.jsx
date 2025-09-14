import React from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";

export default function Register() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
    const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const nav = useNavigate();
  const { login } = useAuth();

  function isValidEmail(v) {
    // richiesta: deve avere la "@"
    return typeof v === "string" && v.includes("@");
  }
  function isValidPassword(v) {
    // richiesta: almeno 4 caratteri e almeno una MAIUSCOLA
    return typeof v === "string" && v.length >= 4 && /[A-Z]/.test(v);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setMsg("");

    if (!isValidEmail(email)) {
      setErr("Email non valida: deve contenere il simbolo '@'.");
      return;
    }
    if (!isValidPassword(password)) {
      setErr("Password non valida: minimo 4 caratteri e almeno una lettera maiuscola.");
      return;
    }

    try {
      const data = await api.register({ email, password });
      login({ token: data.token, email: data.email, role: data.role });
      setMsg("Registrazione completata.");
      nav("/", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Errore in registrazione");
    }
  }

  const pwdOk = isValidPassword(password);
  const emailOk = isValidEmail(email);

  return (
    <div>
      <h2>Registrazione</h2>
      {err && <div className="error" style={{marginBottom:12}}>{err}</div>}
      {msg && <div className="ok" style={{marginBottom:12}}>{msg}</div>}

      <form onSubmit={onSubmit}>
        <label className="label">Email</label>
        <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nome@dominio.it" />
        <div style={{fontSize:'.9rem', color: emailOk ? 'var(--ok)' : 'var(--muted)', margin:'6px 0 14px'}}>
          Struttura richiesta: deve contenere il simbolo <b>@</b>.
        </div>

        <label className="label">Password</label>
        <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Almeno 4 caratteri, una MAIUSCOLA" />
        <ul style={{margin:'6px 0 14px', paddingLeft: '18px', color: pwdOk ? 'var(--ok)' : 'var(--muted)'}}>
          <li>Minimo 4 caratteri</li>
          <li>Almeno una lettera <b>maiuscola</b></li>
        </ul>
<div style={{marginTop:14}}>
          <button className="btn" type="submit" disabled={!emailOk || !pwdOk}>Crea account</button>
        </div>
      </form>
    </div>
  );
}
