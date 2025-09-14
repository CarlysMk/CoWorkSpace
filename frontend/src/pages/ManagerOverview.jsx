import React from "react";
import api from "../api"; // usa i tuoi metodi se presenti; altrimenti fallback su REST

////////////////////////////////////////////////////////////////////////////////
// Helpers con fallback multipli (prova /api/admin/... poi /admin/...)
////////////////////////////////////////////////////////////////////////////////

const has = (obj, key) => obj && typeof obj[key] === "function";

async function httpOne(url, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`${res.status} ${res.statusText}: ${t || url}`);
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

async function http(urlOrUrls, opts) {
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  let lastErr;
  for (const u of urls) {
    try { return await httpOne(u, opts); }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// API astratta: prova api.js, poi REST con fallback multipli
const AdminAPI = {
  async metrics() {
    if (has(api, "adminMetrics")) {
      try { return await api.adminMetrics(); } catch { /* fallback REST */ }
    }
    return http(["/api/admin/metrics", "/admin/metrics"]);
  },
  async locationsCount() {
    // prova api.locations() se restituisce array o {count}
    if (has(api, "locations")) {
      try {
        const xs = await api.locations();
        return Array.isArray(xs) ? xs.length : (xs?.count ?? 0);
      } catch { /* fallback REST */ }
    }
    const xs = await http(["/api/admin/locations", "/admin/locations"]);
    return Array.isArray(xs) ? xs.length : (xs?.count ?? 0);
  },
  async bookingsCount() {
    // NON usiamo api.adminBookingsCount perché può puntare a /admin/*
    // Useremo direttamente i fallback REST multipli
    try {
      const r = await http(["/api/admin/bookings?count=1", "/admin/bookings?count=1"]);
      if (typeof r?.count === "number") return r.count;
      if (Array.isArray(r)) return r.length;
    } catch { /* fallback totale */ }
    const r = await http(["/api/admin/bookings", "/admin/bookings"]);
    return Array.isArray(r) ? r.length : (r?.count ?? 0);
  },
  async users() {
    if (has(api, "users")) {
      try { return await api.users(); } catch { /* fallback REST */ }
    }
    return http(["/api/admin/users", "/admin/users"]);
  },
};

////////////////////////////////////////////////////////////////////////////////
// UI minima
////////////////////////////////////////////////////////////////////////////////

const styles = {
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  kpi: { fontSize: 28, fontWeight: 700, marginTop: 4 },
  sub: { color: "#64748b", fontSize: 13 },
  btn: { borderRadius: 12, padding: "8px 12px", fontSize: 14, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0", color: "#475569" },
  td: { padding: "8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
};

function Card({ title, children, right }) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.sub}>{label}</div>
      <div style={styles.kpi}>{value}</div>
    </div>
  );
}

function normalizeRoles(u) {
  if (!u) return [];
  if (Array.isArray(u.roles)) return u.roles.map(String);
  if (typeof u.roles === "string") return u.roles.split(/[,\s]+/).filter(Boolean);
  if (typeof u.role === "string") return [u.role];
  return [];
}

function countRoles(usersArr) {
  const roles = usersArr.map(normalizeRoles).flat().map(r => r?.toLowerCase?.() || "");
  const admins = roles.filter(r => r === "admin").length;
  const managers = roles.filter(r => r === "manager").length;
  const regular = roles.filter(r => r === "user").length;
  return { admins, managers, regular };
}

export default function ManagerOverview() {
  const [metrics, setMetrics] = React.useState({
    locationsCount: 0,
    bookingsCount: 0,
    usersCount: 0,
    adminsCount: 0,
    managersCount: 0,
    regularUsersCount: 0,
  });
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      // prova endpoint unico
      try {
        const m = await AdminAPI.metrics();
        if (m && typeof m === "object") {
          const out = {
            locationsCount: m.locationsCount ?? 0,
            bookingsCount: m.bookingsCount ?? 0,
            usersCount: m.usersCount ?? 0,
            adminsCount: m.adminsCount ?? 0,
            managersCount: m.managersCount ?? 0,
            regularUsersCount: m.regularUsersCount ?? 0,
          };
          // se abbiamo almeno uno di questi popolato, usiamo m
          if (Object.values(out).some(v => Number(v) > 0)) {
            setMetrics(out);
            setLoading(false);
            return;
          }
        }
      } catch { /* fallback calcolato */ }

      // fallback calcolato da endpoints singoli
      const [lc, bc, users] = await Promise.all([
        AdminAPI.locationsCount(),
        AdminAPI.bookingsCount(),
        AdminAPI.users(),
      ]);
      const usersArr = Array.isArray(users) ? users : (users?.rows ?? []);
      const { admins, managers, regular } = countRoles(usersArr);
      const totalUsers = Array.isArray(usersArr) ? usersArr.length : (users?.count ?? admins + managers + regular);
      setMetrics({
        locationsCount: lc ?? 0,
        bookingsCount: bc ?? 0,
        usersCount: totalUsers ?? 0,
        adminsCount: admins ?? 0,
        managersCount: managers ?? 0,
        regularUsersCount: regular ?? 0,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Dashboard — Riepilogo</h1>
        <button style={{ ...styles.btn }} onClick={load}>Aggiorna</button>
      </header>

      {err && <div style={{ ...styles.card, background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c", marginBottom: 16 }}>
        Errore: {err}
      </div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
        <KPI label="Sedi" value={metrics.locationsCount} />
        <KPI label="Prenotazioni" value={metrics.bookingsCount} />
        <KPI label="Utenti (totale)" value={metrics.usersCount} />
        <KPI label="Admin" value={metrics.adminsCount} />
      </div>

      <Card title="Utenti per ruolo">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Ruolo</th>
              <th style={styles.th}>Conteggio</th>
              <th style={styles.th}>Note</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={styles.td}>Admin</td><td style={styles.td}>{metrics.adminsCount}</td><td style={styles.td}>Utenti con ruolo <code>admin</code></td></tr>
            <tr><td style={styles.td}>Manager</td><td style={styles.td}>{metrics.managersCount}</td><td style={styles.td}>Utenti con ruolo <code>manager</code></td></tr>
            <tr><td style={styles.td}>User</td><td style={styles.td}>{metrics.regularUsersCount}</td><td style={styles.td}>Utenti con ruolo <code>user</code></td></tr>
            <tr><td style={{ ...styles.td, fontWeight: 600 }}>Totale</td><td style={{ ...styles.td, fontWeight: 600 }}>{metrics.usersCount}</td><td style={styles.td}>La somma dei ruoli può differire se un utente ha più ruoli</td></tr>
          </tbody>
        </table>
      </Card>

      {loading && (
        <div style={{ position: "fixed", right: 16, bottom: 16 }}>
          <div style={{ ...styles.card, padding: "8px 12px" }}>Caricamento…</div>
        </div>
      )}
    </div>
  );
}
