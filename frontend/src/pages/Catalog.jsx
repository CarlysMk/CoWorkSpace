import React from "react";
import api from "../api";
import { useAuth } from "../auth";

/* ---- servizi: mapping e icone (stesse della Home) ---- */
const SERVICE_META = {
  wifi:            { label: "wifi",           icon: "📶" },
  coffee:          { label: "coffee",         icon: "☕" },
  "meeting rooms": { label: "meeting rooms",  icon: "🗓️" },
  printer:         { label: "printer",        icon: "🖨️" },
  "phone booths":  { label: "phone booths",   icon: "📞" },
  parking:         { label: "parking",        icon: "🅿️" },
};

/* chiavi UI -> chiavi canoniche */
const SERVICE_KEY = {
  "wifi": "wifi",
  "coffee": "coffee",
  "meeting-rooms": "meeting rooms",
  "printer": "printer",
  "phone-booths": "phone booths",
  "parking": "parking",
};

/* -------------------- normalizzazione servizi -------------------- */
const ALIASES = {
  caffe: "coffee",
  meeting: "meeting rooms",
  "meeting-rooms": "meeting rooms",
  meetingrooms: "meeting rooms",
  "phone-booths": "phone booths",
  phonebooths: "phone booths",
};
const canon = (k) => (k ? (ALIASES[String(k).toLowerCase().trim()] || String(k).toLowerCase().trim()) : null);

/** converte QUALSIASI formato in Set di chiavi attive */
function activeServicesSet(sv) {
  const out = new Set();
  if (sv == null) return out;

  try {
    if (typeof sv === "string") {
      const s = sv.trim();
      if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
        return activeServicesSet(JSON.parse(s));
      }
      s.split(",").map(canon).filter(Boolean).forEach((k) => out.add(k));
      return out;
    }
    if (Array.isArray(sv)) {
      sv.map(canon).filter(Boolean).forEach((k) => out.add(k));
      return out;
    }
    if (typeof sv === "object") {
      Object.entries(sv).forEach(([k, v]) => { const ck = canon(k); if (ck && !!v) out.add(ck); });
      return out;
    }
  } catch {
    /* ignore; ritorna set parziale/vuoto */
  }
  return out;
}

function matchesAllServices(svValue, requiredKeys /* array canonicali */) {
  if (!requiredKeys.length) return true;
  const active = activeServicesSet(svValue);
  return requiredKeys.every((k) => active.has(k));
}

/* -------------------- UI -------------------- */
function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 16,
        border: "1px solid #cfd6e4",
        background: "#eef3ff",
        fontSize: 14,
        marginRight: 8,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

export default function Catalog() {
  useAuth();
  const [city, setCity] = React.useState("");
  const [type, setType] = React.useState("Tutte");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  // stessi checkbox (inclusi phone-booths e parking)
  const [services, setServices] = React.useState({
    "wifi": false,
    "coffee": false,
    "meeting-rooms": false,
    "printer": false,
    "phone-booths": false,
    "parking": false,
  });

  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const requiredServiceKeys = React.useMemo(
    () =>
      Object.entries(services)
        .filter(([, on]) => on)
        .map(([uiKey]) => SERVICE_KEY[uiKey]),
    [services]
  );

  async function fetchList() {
    setLoading(true);
    setError("");
    try {
      // 👉 inviamo SOLO i filtri server-friendly (città/tipo/date). NIENTE servizi.
      const params = {};
      if (city.trim()) params.city = city.trim();
      if (type && type !== "Tutte") params.type = type;
      if (from) params.available_from = from;
      if (to) params.available_to = to;

      let data;
      if (typeof api.locations === "function") {
        data = await api.locations(params);
      } else if (typeof api.get === "function") {
        data = await api.get("/locations", params);
      } else {
        throw new Error("Client API non supportato");
      }

      const list = Array.isArray(data) ? data : (data?.rows || []);
      setRows(list);
    } catch (e) {
      console.error(e);
      setError("Impossibile caricare le sedi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onToggleService(key) {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // raggruppa per location (LEFT JOIN) e applica filtro servizi in client
  const locations = React.useMemo(() => {
    const byId = new Map();
    for (const r of rows) {
      if (requiredServiceKeys.length && !matchesAllServices(r.services, requiredServiceKeys)) {
        continue; // filtro servizi lato client
      }
      const id = r.location_id ?? r.id;
      if (!id) continue;
      const loc = byId.get(id) || {
        id,
        name: r.location_name || r.name || "—",
        city: r.city || "",
        address: r.address || "",
        services: new Set(activeServicesSet(r.services)),
        spaces: [],
      };
      if (r.space_id) {
        loc.spaces.push({
          id: r.space_id,
          name: r.space_name,
          type: r.type,
          price_per_hour: r.price_per_hour,
        });
      }
      activeServicesSet(r.services).forEach((k) => loc.services.add(k));
      byId.set(id, loc);
    }
    return Array.from(byId.values());
  }, [rows, requiredServiceKeys]);

  return (
    <div className="container">
      <h1>Catalogo sedi e spazi</h1>

      {/* FILTRI – layout invariato */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label>Città</label>
          <input value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Milano, Roma..." />
        </div>

        <div>
          <label>Tipologia</label>
          <select value={type} onChange={(e)=>setType(e.target.value)}>
            <option>Tutte</option>
            <option>desk</option>
            <option>meeting</option>
            <option>office</option>
          </select>
        </div>

        <div>
          <label>Servizi</label>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: 6, marginTop: 4 }}>
            <label><input type="checkbox" checked={services["wifi"]} onChange={() => onToggleService("wifi")} style={{ marginRight: 6 }} />wifi</label>
            <label><input type="checkbox" checked={services["coffee"]} onChange={() => onToggleService("coffee")} style={{ marginRight: 6 }} />coffee</label>
            <label><input type="checkbox" checked={services["meeting-rooms"]} onChange={() => onToggleService("meeting-rooms")} style={{ marginRight: 6 }} />meeting-rooms</label>
            <label><input type="checkbox" checked={services["printer"]} onChange={() => onToggleService("printer")} style={{ marginRight: 6 }} />printer</label>
            <label><input type="checkbox" checked={services["phone-booths"]} onChange={() => onToggleService("phone-booths")} style={{ marginRight: 6 }} />phone booths</label>
            <label><input type="checkbox" checked={services["parking"]} onChange={() => onToggleService("parking")} style={{ marginRight: 6 }} />parking</label>
          </div>
        </div>

        <div>
          <label>Disponibile dal</label>
          <input type="datetime-local" value={from} onChange={(e)=>setFrom(e.target.value)} />
        </div>
        <div>
          <label>Disponibile al</label>
          <input type="datetime-local" value={to} onChange={(e)=>setTo(e.target.value)} />
        </div>
      </div>

      <button className="btn" onClick={fetchList} disabled={loading}>
        {loading ? "Carico…" : "Applica filtri"}
      </button>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

      {/* LISTA */}
      <div style={{ marginTop: 16 }}>
        {locations.map((l) => (
          <div key={l.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{l.name}</div>
                <div>
                  {l.address}
                  {l.city ? (l.address ? `, ${l.city}` : l.city) : ""}
                </div>
              </div>
              <div style={{ color: "#4a5568" }}>{l.city}</div>
            </div>

            {l.spaces[0] && (
              <div style={{ marginTop: 8 }}>
                <div>
                  Spazio: <strong>{l.spaces[0].name}</strong> — {l.spaces[0].type} —{" "}
                  {Number(l.spaces[0].price_per_hour || 0).toFixed(2)} €/h
                </div>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div>Servizi:</div>
              <div style={{ display: "flex", flexWrap: "wrap", marginTop: 6 }}>
                {Array.from(l.services).map((key) => {
                  const meta = SERVICE_META[key] || { label: key, icon: "•" };
                  return (
                    <Pill key={key}>
                      <span aria-hidden="true">{meta.icon}</span>
                      {meta.label}
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* bottone "Prenota" rimosso */}
          </div>
        ))}

        {!locations.length && !loading && (
          <div className="card" style={{ padding: 16 }}>Nessun risultato.</div>
        )}
      </div>
    </div>
  );
}
