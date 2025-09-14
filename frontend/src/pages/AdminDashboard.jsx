import React from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import AdminDeleteLocationModal from "../components/AdminDeleteLocationModal.jsx";
import AdminEditLocationModal from "../components/AdminEditLocationModal.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();

  const [users, setUsers] = React.useState([]);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState("manager");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);

  async function loadUsers() {
    try {
      setError("");
      const list = await api.adminListUsers();   // funzioni reali del tuo api.js
      setUsers(list);
    } catch (e) {
      console.error(e);
      setError("Impossibile caricare gli utenti.");
    }
  }

  React.useEffect(() => { loadUsers(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = { email, password, role };
      await api.adminCreateUser(body);
      setEmail(""); setPassword(""); setRole("manager");
      await loadUsers();
    } catch (e) {
      console.error(e);
      setError("Errore nella creazione utente.");
    } finally {
      setLoading(false);
    }
  }

  if (!user || user.role !== "admin") return <div>Permesso negato</div>;

  return (
    <div className="container">
      <h2>Admin – Gestione Utenti</h2>

      {/* Azioni sedi */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Link className="btn" to="/admin/wizard">➕ Nuova sede (Wizard)</Link>
        <button className="btn" onClick={() => setShowEditModal(true)}>✏️ Modifica sede</button>
        <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>🗑️ Cancella sede</button>
      </div>

      {/* Modali sedi */}
      <AdminEditLocationModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
      <AdminDeleteLocationModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />

      <form onSubmit={createUser} style={{ marginBottom: 16 }}>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ marginRight: 8 }}
        >
          <option value="manager">manager</option>
          <option value="admin">admin</option>
          <option value="customer">customer</option>
          <option value="client">client</option>
        </select>
        <button className="btn" disabled={loading}>
          {loading ? "Creo…" : "Crea utente"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>ID</th>
              <th>Email</th>
              <th style={{ width: 140 }}>Ruolo</th>
              <th style={{ width: 220 }}>Creato</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.created_at}</td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={4} style={{ padding: 16 }}>
                  Nessun utente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
