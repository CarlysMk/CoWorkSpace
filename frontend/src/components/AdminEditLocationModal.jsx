import React from "react";
import api from "../api";
import { useAuth } from "../auth";

const DEFAULT_SERVICES = ["wifi","coffee","printer","meeting rooms","phone booths","parking"];

export default function AdminEditLocationModal({ open, onClose }) {
  const { user } = useAuth();
  const [locations, setLocations] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");

  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [services, setServices] = React.useState([]); // array di servizi selezionati

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [okMsg, setOkMsg] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setError(""); setOkMsg("");
      setLoading(true);
      try {
        const rows = await api.locations(); // GET /api/locations (già usato per la cancellazione)
        const list = dedupeLocations(rows);
        setLocations(list);
        // reset modulo
        setSelectedId("");
        setName(""); setCity(""); setAddress(""); setServices([]);
      } catch (e) {
        setError(extractErr(e, "Errore nel caricamento delle sedi."));
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  React.useEffect(() => {
    if (!selectedId) return;
    const loc = locations.find(l => String(l.id) === String(selectedId));
    if (loc) {
      setName(loc.name || "");
      setCity(loc.city || "");
      setAddress(loc.address || "");
      // normalizza services: accetta object/array/string
      const sv =
        Array.isArray(loc.services) ? loc.services :
        (loc.services && typeof loc.services === "object")
          ? Object.keys(loc.services).filter(k => loc.services[k])
          : typeof loc.services === "string"
            ? loc.services.split(",").map(s => s.trim()).filter(Boolean)
            : [];
      setServices(sv);
    }
  }, [selectedId, locations]);

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
          services: r.services,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) =>
      (a.city || "").localeCompare(b.city || "") ||
      (a.name || "").localeCompare(b.name || "")
    );
  }

  function toggleService(s) {
    setServices(prev => prev.includes(s)
      ? prev.filter(x => x !== s)
      : [...prev, s]);
  }

  // Converte l'array in oggetto booleano (come spesso usa il wizard di creazione)
  function toServicesObject(list) {
    const obj = {};
    for (const key of DEFAULT_SERVICES) obj[key] = list.includes(key);
    return obj;
  }

  // prova metodi/endpoints noti in cascata; ferma al primo che va
  async function saveViaBestEndpoint(id, payload) {
    // 1) metodi già presenti nel tuo api.js
    if (typeof api.updateLocation === "function") {
      return api.updateLocation(id, payload);
    }
    if (typeof api.adminUpdateLocation === "function") {
      return api.adminUpdateLocation(id, payload);
    }
    // 2) PUT su endpoint admin poi pubblico
    try {
      return await api.put(`/admin/locations/${id}`, payload);
    } catch (e) {
      // se è 404/405/Not found, prova l'altro
      const msg = (e && (e.status === 404 || e.status === 405)) ? null : extractErr(e);
      if (msg) throw e; // errore “vero” -> rialza
    }
    return api.put(`/locations/${id}`, payload);
  }

  async function onSave(e) {
    e.preventDefault();
    if (!selectedId) return;
    setError(""); setOkMsg("");
    try {
      setSaving(true);
      const idNum = Number(selectedId); // alcuni backend vogliono numero
      const payload = {
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        services: toServicesObject(services), // formato oggetto
      };

      await saveViaBestEndpoint(idNum, payload);

      setOkMsg("Sede aggiornata con successo.");
      // aggiorna l'elenco locale
      setLocations(prev =>
        prev.map(l => Number(l.id) === idNum ? { ...l, ...payload } : l)
      );
    } catch (e) {
      console.error(e);
      setError(extractErr(e, "Impossibile aggiornare la sede."));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  if (!user || user.role !== "admin") return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Modifica sede</h3>

        {loading ? (
          <p>Caricamento sedi…</p>
        ) : (
          <>
            <label style={{ display: "block", marginBottom: 6 }}>Seleziona sede</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ minWidth: 360, marginBottom: 12 }}
            >
              <option value="">— scegli una sede —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} — {l.city} ({l.address})
                </option>
              ))}
            </select>

            {selectedId && (
              <form onSubmit={onSave}>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <label>Nome</label>
                    <input value={name} onChange={(e)=>setName(e.target.value)} />
                  </div>
                  <div>
                    <label>Città</label>
                    <input value={city} onChange={(e)=>setCity(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label>Indirizzo</label>
                  <input style={{ width: "100%" }} value={address} onChange={(e)=>setAddress(e.target.value)} />
                </div>

                <div style={{ marginTop: 10 }}>
                  <label>Servizi</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {DEFAULT_SERVICES.map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => toggleService(s)}
                        className="btn"
                        style={{
                          opacity: services.includes(s) ? 1 : 0.5,
                          border: services.includes(s) ? "2px solid #444" : "1px solid #ccc"
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <button className="btn" type="submit" disabled={saving}>
                    {saving ? "Salvo…" : "Salva modifiche"}
                  </button>{" "}
                <button className="btn" type="button" onClick={onClose} disabled={saving}>Chiudi</button>
                </div>
              </form>
            )}

            {okMsg && <p style={{ color: "green", marginTop: 12 }}>{okMsg}</p>}
            {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function extractErr(e, fallback = "Errore") {
  // prova a prendere il messaggio più utile da qualunque wrapper del tuo api.js
  const data = e?.response?.data ?? e?.data ?? e?.body ?? null;
  const msg = (typeof data === "string" && data) ||
              (data && (data.error || data.message)) ||
              e?.message;
  return msg || fallback;
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
    width: 640,
    maxWidth: "92vw",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
};
