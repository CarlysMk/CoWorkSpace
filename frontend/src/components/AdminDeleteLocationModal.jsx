import React from "react";
import api from "../api";
import { useAuth } from "../auth";

export default function AdminDeleteLocationModal({ open, onClose }) {
  const { user } = useAuth();
  const [locations, setLocations] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [okMsg, setOkMsg] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setError("");
      setOkMsg("");
      setSelectedId("");
      setLoading(true);
      try {
        const rows = await api.locations(); // GET /api/locations
        const list = dedupeLocations(rows);
        setLocations(list);
      } catch (e) {
        setError("Errore nel caricamento delle sedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  function dedupeLocations(rows = []) {
    const byId = new Map();
    for (const r of rows) {
      const id = r.location_id ?? r.id;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: r.location_name || r.name,
          city: r.city,
          address: r.address,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      (a.city || "").localeCompare(b.city || "") ||
      (a.name || "").localeCompare(b.name || "")
    );
  }

  async function onDelete(e) {
    e.preventDefault();
    setError("");
    setOkMsg("");
    if (!selectedId) return;

    const chosen = locations.find(l => String(l.id) === String(selectedId));
    const label = chosen ? `${chosen.name} – ${chosen.city}` : `ID ${selectedId}`;
    if (!window.confirm(`Confermi l'eliminazione della sede: ${label}?`)) return;

    try {
      setSubmitting(true);
      await api.deleteLocation(selectedId); // DELETE /api/locations/:id
      setOkMsg("Sede eliminata con successo.");
      // ricarica elenco rimuovendo quella appena cancellata
      setLocations(prev => prev.filter(l => String(l.id) !== String(selectedId)));
      setSelectedId("");
    } catch (e) {
      setError("Impossibile eliminare la sede. Verifica eventuali vincoli o riprova.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  if (!user || user.role !== "admin") return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Cancella sede</h3>

        {loading ? (
          <p>Caricamento sedi…</p>
        ) : (
          <>
            <label style={{ display: "block", marginBottom: 8 }}>Seleziona sede</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ minWidth: 360, marginRight: 8 }}
            >
              <option value="">— scegli una sede —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.city} ({l.address})
                </option>
              ))}
            </select>

            <div style={{ marginTop: 12 }}>
              <button className="btn btn-danger"
                disabled={!selectedId || submitting}
                onClick={onDelete}
              >
                {submitting ? "Elimino…" : "Cancella"}
              </button>
              {" "}
              <button className="btn" onClick={onClose} disabled={submitting}>
                Chiudi
              </button>
            </div>

            {okMsg && <p style={{ color: "green", marginTop: 12 }}>{okMsg}</p>}
            {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

            {!loading && !locations.length && (
              <p style={{ marginTop: 12 }}>Nessuna sede trovata.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    borderRadius: 12,
    padding: 20,
    width: 560,
    maxWidth: "90vw",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
};
