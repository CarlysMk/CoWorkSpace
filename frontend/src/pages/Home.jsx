import React from "react";
import api from "../api";
import { useAuth } from "../auth";

/** sinonimi -> chiave canonica come nel Catalogo */
const SERVICE_ALIASES = {
  caffe: "coffee",
  "meeting-rooms": "meeting rooms",
  meetingrooms: "meeting rooms",
  meeting: "meeting rooms",
};

const SERVICE_META = {
  wifi: { label: "wifi", icon: "📶" },
  coffee: { label: "coffee", icon: "☕" },
  "meeting rooms": { label: "meeting rooms", icon: "🗓️" },
  printer: { label: "printer", icon: "🖨️" },
  "phone booths": { label: "phone booths", icon: "📞" },
  parking: { label: "parking", icon: "🅿️" },
};

function canonicalizeKey(k) {
  if (!k) return k;
  const low = String(k).trim().toLowerCase();
  return SERVICE_ALIASES[low] || low;
}

/** Converte qualsiasi formato di `services` in array di chiavi attive */
function toActiveServiceKeys(sv) {
  if (!sv && sv !== false) return [];

  // 1) se è già un array
  if (Array.isArray(sv)) {
    return sv.map(canonicalizeKey).filter(Boolean);
  }

  // 2) se è stringa: prova JSON.parse, altrimenti CSV
  if (typeof sv === "string") {
    const s = sv.trim();
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        return toActiveServiceKeys(JSON.parse(s));
      } catch {
        // fallback a CSV
      }
    }
    // CSV: "wifi, coffee"
    return s
      .split(",")
      .map((x) => canonicalizeKey(x))
      .filter(Boolean);
  }

  // 3) oggetto { wifi:true, coffee:false, ... }
  if (typeof sv === "object") {
    return Object.keys(sv)
      .filter((k) => !!sv[k])
      .map(canonicalizeKey);
  }

  return [];
}

/** Unifica righe duplicate (join) e costruisce card delle sedi */
function foldLocations(rows = []) {
  const byId = new Map();
  for (const r of rows) {
    const id = r.location_id ?? r.id;
    if (!id) continue;

    const name = r.location_name || r.name || "—";
    const city = r.city || "";
    const address = r.address || "";
    const services = toActiveServiceKeys(r.services);

    if (!byId.has(id)) {
      byId.set(id, { id, name, city, address, services: new Set(services) });
    } else {
      // se arriva da join, unisci eventuali servizi visti in altre righe
      services.forEach((k) => byId.get(id).services.add(k));
    }
  }
  // ordina per città poi nome
  return Array.from(byId.values())
    .map((l) => ({ ...l, services: Array.from(l.services) }))
    .sort(
      (a, b) =>
        (a.city || "").localeCompare(b.city || "") ||
        (a.name || "").localeCompare(b.name || "")
    );
}

function Pill({ children }) {
  return (
    <span
      className="pill"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 16,
        border: "1px solid #cfd6e4",
        background: "#eef3ff",
        fontSize: 14,
      }}
    >
      {children}
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [locations, setLocations] = React.useState([]);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        setError("");
        const rows = await api.locations(); // stessa sorgente del Catalogo
        setLocations(foldLocations(rows));
      } catch (e) {
        console.error(e);
        setError("Impossibile caricare le sedi.");
      }
    })();
  }, []);

  return (
    <div className="container">
      <h2>Benvenuto, {user?.email || "ospite"}!</h2>
      <p>Locations disponibili:</p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {locations.map((l) => (
        <div
          key={l.id}
          className="card"
          style={{
            padding: 18,
            marginBottom: 14,
            borderRadius: 16,
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          {/* Titolo come nel Catalogo: Nome — Via, Città */}
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            {l.name}
            {l.address ? ` — ${l.address}` : ""}
            {l.city ? (l.address ? `, ${l.city}` : ` — ${l.city}`) : ""}
          </div>

          {/* Badge servizi, identici al Catalogo */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {l.services.length ? (
              l.services.map((key) => {
                const meta = SERVICE_META[key] || { label: key, icon: "•" };
                return (
                  <Pill key={key}>
                    <span aria-hidden="true">{meta.icon}</span>
                    {meta.label}
                  </Pill>
                );
              })
            ) : (
              <Pill>Nessun servizio indicato</Pill>
            )}
          </div>
        </div>
      ))}

      {!locations.length && !error && (
        <div className="card" style={{ padding: 16 }}>
          Nessuna sede trovata.
        </div>
      )}
    </div>
  );
}
