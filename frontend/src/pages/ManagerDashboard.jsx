import React from "react";
import api from "../api"; // se non esiste o non ha i metodi usati, il codice farà fallback su fetch
// Se hai già questi componenti/util nei tuoi file, puoi integrarli. Questo file non richiede librerie esterne.

////////////////////////////////////////////////////////////////////////////////
// Helpers: usa api.* se disponibile, altrimenti fallback su fetch verso /api/admin
////////////////////////////////////////////////////////////////////////////////

const has = (obj, key) => obj && typeof obj[key] === "function";

async function http(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${t}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

const AdminAPI = {
  async locations() {
    if (has(api, "locations")) return api.locations();
    return http("/api/admin/locations");
  },
  async availability(locationId) {
    if (has(api, "adminAvailability")) return api.adminAvailability({ locationId });
    return http(`/api/admin/availability?locationId=${encodeURIComponent(locationId)}`);
  },
  async addSlot(slot) {
    if (has(api, "addAvailabilitySlot")) return api.addAvailabilitySlot(slot);
    return http(`/api/admin/availability`, { method: "POST", body: slot });
  },
  async deleteSlot(slotId) {
    if (has(api, "deleteAvailabilitySlot")) return api.deleteAvailabilitySlot(slotId);
    return http(`/api/admin/availability/${encodeURIComponent(slotId)}`, { method: "DELETE" });
  },
  async bookings(params) {
    if (has(api, "adminBookings")) return api.adminBookings(params);
    const q = new URLSearchParams(params).toString();
    return http(`/api/admin/bookings?${q}`);
  },
  async setBookingStatus(id, status) {
    if (has(api, "setBookingStatus")) return api.setBookingStatus(id, status);
    return http(`/api/admin/bookings/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: { status },
    });
  },
  async report(params) {
    if (has(api, "managerReport")) return api.managerReport(params);
    const q = new URLSearchParams(params || {}).toString();
    return http(`/api/admin/reports${q ? `?${q}` : ""}`);
  },
};

////////////////////////////////////////////////////////////////////////////////
// Utility UI semplici (no dipendenze esterne)
////////////////////////////////////////////////////////////////////////////////

const styles = {
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  input: { border: "1px solid #cbd5e1", borderRadius: 12, padding: "8px 10px", fontSize: 14 },
  btn: {
    base: { borderRadius: 12, padding: "8px 12px", fontSize: 14, border: "1px solid transparent", cursor: "pointer" },
    primary: { background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" },
    ghost: { background: "#fff", color: "#334155", borderColor: "#e2e8f0" },
    danger: { background: "#e11d48", color: "#fff", borderColor: "#e11d48" },
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0", color: "#475569" },
  td: { padding: "8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  badge: (tone) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    ...(tone === "green" && { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }),
    ...(tone === "red" && { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }),
    ...(tone === "amber" && { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }),
    ...(tone === "blue" && { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }),
    ...(tone === "slate" && { background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0" }),
  }),
};

function Button({ variant = "primary", style, children, ...rest }) {
  const sx = { ...styles.btn.base, ...(styles.btn[variant] || {}), ...(style || {}) };
  return (
    <button style={sx} {...rest}>{children}</button>
  );
}

function Pill({ tone = "slate", children }) {
  return <span style={styles.badge(tone)}>{children}</span>;
}

function TextInput(props) {
  return <input {...props} style={{ ...styles.input, ...(props.style || {}) }} />;
}

function Select(props) {
  return <select {...props} style={{ ...styles.input, ...(props.style || {}) }} />;
}

function Card({ title, description, right, children }) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
          {description && <p style={{ color: "#64748b", marginTop: 6, marginBottom: 0, fontSize: 13 }}>{description}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// Component
////////////////////////////////////////////////////////////////////////////////

export default function ManagerDashboard() {
  const [tab, setTab] = React.useState("availability");

  // Sedi
  const [locations, setLocations] = React.useState([]);
  const [locationId, setLocationId] = React.useState("");

  // Disponibilità
  const [slots, setSlots] = React.useState([]);
  const [slotForm, setSlotForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    start: "09:00",
    end: "18:00",
    capacity: 10,
  });

  // Prenotazioni
  const [bookings, setBookings] = React.useState([]);
  const [filters, setFilters] = React.useState({
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    status: "all",
  });

  // Report
  const [report, setReport] = React.useState({ totals: { count: 0, hours: 0, revenue: 0 }, byDay: [] });

  // Errori & loading
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  // bootstrap
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const ls = await AdminAPI.locations();
        setLocations(ls || []);
        if ((ls || []).length && !locationId) setLocationId(String(ls[0].id || ls[0].location_id || ls[0].value || ls[0]));
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // carica dati quando cambia sede
  React.useEffect(() => {
    if (!locationId) return;
    (async () => {
      try {
        setLoading(true);
        const [av, rep] = await Promise.all([
          AdminAPI.availability(locationId),
          AdminAPI.report({ locationId }),
        ]);
        setSlots(Array.isArray(av) ? av : []);
        setReport(rep || { totals: { count: 0, hours: 0, revenue: 0 }, byDay: [] });

        const bs = await AdminAPI.bookings({ locationId, from: filters.from, to: filters.to, status: filters.status });
        setBookings(Array.isArray(bs) ? bs : []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // azioni disponibilità
  async function addSlot() {
    try {
      setLoading(true);
      const payload = { ...slotForm, locationId: Number(locationId) };
      await AdminAPI.addSlot(payload);
      const next = await AdminAPI.availability(locationId);
      setSlots(Array.isArray(next) ? next : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSlot(id) {
    try {
      setLoading(true);
      await AdminAPI.deleteSlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // azioni prenotazioni
  async function refreshBookings() {
    try {
      setLoading(true);
      const bs = await AdminAPI.bookings({ locationId, from: filters.from, to: filters.to, status: filters.status });
      setBookings(Array.isArray(bs) ? bs : []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function setBookingStatus(id, status) {
    try {
      setLoading(true);
      await AdminAPI.setBookingStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // export CSV (report e inventario servizi)
  async function exportReportCSV() {
    const data = await AdminAPI.report({ locationId, from: filters.from, to: filters.to });
    const rows = Array.isArray(data?.byDay) ? data.byDay : [];
    const header = ["Date", "Bookings", "Hours", "RevenueEUR"];
    const csv = [header.join(",")].concat(
      rows.map(r =>
        [r.date, r.count, r.hours, Number(r.revenue || 0).toFixed(2)]
          .map(v => `"${String(v).replaceAll('"','""')}"`).join(",")
      )
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `manager_report_${locationId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportServicesCSV() {
    const locs = await AdminAPI.locations();
    const rows = Array.isArray(locs) ? locs : [];
    const header = ["City","Location","Address","Space","Type","PricePerHour","Services"];
    const csv = [header.join(",")].concat(
      rows.map(r => [
        r.city,
        r.location_name || r.name || "",
        r.address || "",
        r.space_name || "",
        r.type || "",
        r.price_per_hour || "",
        Array.isArray(r.services) ? r.services.join(";") : (r.services || "")
      ].map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "locations_spaces_services.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // UI

  const currentLocation = locations.find(l =>
    String(l.id ?? l.location_id ?? l.value ?? l) === String(locationId)
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Dashboard Responsabile Sede</h1>
        <p style={{ margin: "6px 0 0", color: "#475569" }}>Gestisci disponibilità, prenotazioni e report.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["availability","bookings","reports"].map(id => (
          <Button key={id} variant={tab === id ? "primary" : "ghost"} onClick={() => setTab(id)}>
            {id === "availability" ? "Disponibilità" : id === "bookings" ? "Prenotazioni" : "Report"}
          </Button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button variant="ghost" onClick={exportReportCSV}>Esporta report CSV</Button>
          <Button variant="ghost" onClick={exportServicesCSV}>Esporta servizi CSV</Button>
        </div>
      </div>

      {/* Selettore sede */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "#475569" }}>Sede</label>
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={{ minWidth: 260 }}>
          {locations.map((l, i) => {
            const id = l.id ?? l.location_id ?? l.value ?? i;
            const name = l.name ?? l.location_name ?? l.label ?? `Sede ${id}`;
            return <option key={id} value={String(id)}>{name}</option>;
          })}
        </Select>
        {currentLocation && <Pill tone="blue">{currentLocation.name || currentLocation.location_name || "Sede selezionata"}</Pill>}
      </div>

      {tab === "availability" && (
        <Card
          title="Gestione disponibilità"
          description="Crea, modifica o rimuovi gli slot di disponibilità per la sede selezionata."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Data</div>
              <TextInput type="date" value={slotForm.date} onChange={(e) => setSlotForm(s => ({ ...s, date: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Inizio</div>
              <TextInput type="time" value={slotForm.start} onChange={(e) => setSlotForm(s => ({ ...s, start: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Fine</div>
              <TextInput type="time" value={slotForm.end} onChange={(e) => setSlotForm(s => ({ ...s, end: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Capacità</div>
              <TextInput type="number" min={1} value={slotForm.capacity} onChange={(e) => setSlotForm(s => ({ ...s, capacity: Number(e.target.value || 1) }))} />
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <Button onClick={addSlot}>Aggiungi slot</Button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Inizio</th>
                  <th style={styles.th}>Fine</th>
                  <th style={styles.th}>Capacità</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {slots.length ? slots.map((s) => (
                  <tr key={s.id}>
                    <td style={styles.td}>{s.date || s.day || "-"}</td>
                    <td style={styles.td}>{s.start}</td>
                    <td style={styles.td}>{s.end}</td>
                    <td style={styles.td}>{s.capacity}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <Button variant="ghost" onClick={() => deleteSlot(s.id)}>Rimuovi</Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td style={styles.td} colSpan={5}><em>Nessuno slot configurato</em></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "bookings" && (
        <Card
          title="Gestione prenotazioni"
          description="Filtra, aggiorna stato ed esporta le prenotazioni."
          right={<Button variant="ghost" onClick={refreshBookings}>Aggiorna</Button>}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Da</div>
              <TextInput type="date" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>A</div>
              <TextInput type="date" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Stato</div>
              <Select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="all">Tutti</option>
                <option value="pending">In attesa</option>
                <option value="confirmed">Confermate</option>
                <option value="cancelled">Annullate</option>
              </Select>
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <Button onClick={refreshBookings}>Filtra</Button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Spazio</th>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Inizio</th>
                  <th style={styles.th}>Fine</th>
                  <th style={styles.th}>Ore</th>
                  <th style={styles.th}>Stato</th>
                  <th style={styles.th}>€</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {bookings.length ? bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={styles.td}>{b.id}</td>
                    <td style={styles.td}>{b.customer?.name || "-"}</td>
                    <td style={styles.td}>{b.space?.name || "-"}</td>
                    <td style={styles.td}>{b.date}</td>
                    <td style={styles.td}>{b.start}</td>
                    <td style={styles.td}>{b.end}</td>
                    <td style={styles.td}>{b.hours}</td>
                    <td style={styles.td}>
                      <Pill tone={b.status === "confirmed" ? "green" : b.status === "cancelled" ? "red" : "amber"}>
                        {b.status}
                      </Pill>
                    </td>
                    <td style={styles.td}>{Number(b.price || 0).toFixed(2)}</td>
                    <td style={{ ...styles.td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <Button variant="ghost" onClick={() => setBookingStatus(b.id, "confirmed")}>Conferma</Button>
                      <Button variant="ghost" onClick={() => setBookingStatus(b.id, "cancelled")}>Annulla</Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td style={styles.td} colSpan={10}><em>Nessuna prenotazione trovata</em></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "reports" && (
        <Card
          title="Reportistica"
          description="Riepilogo rapido per finestra temporale selezionata."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
            <Kpi title="Prenotazioni" value={report?.totals?.count ?? 0} />
            <Kpi title="Ore prenotate" value={report?.totals?.hours ?? 0} suffix="h" />
            <Kpi title="Incassato" value={(report?.totals?.revenue ?? 0).toFixed(2)} prefix="€" />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Giorno</th>
                  <th style={styles.th}>Prenotazioni</th>
                  <th style={styles.th}>Ore</th>
                  <th style={styles.th}>€</th>
                </tr>
              </thead>
              <tbody>
                {(report?.byDay || []).length ? (report.byDay).map((r, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{r.date}</td>
                    <td style={styles.td}>{r.count}</td>
                    <td style={styles.td}>{r.hours}</td>
                    <td style={styles.td}>{Number(r.revenue || 0).toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr><td style={styles.td} colSpan={4}><em>Nessun dato nel periodo</em></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(loading || err) && (
        <div style={{ position: "fixed", right: 16, bottom: 16 }}>
          {loading && <div style={{ ...styles.card, padding: "8px 12px" }}>Caricamento…</div>}
          {err && <div style={{ ...styles.card, background: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}>Errore: {err}</div>}
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, prefix = "", suffix = "" }) {
  return (
    <div style={styles.card}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{prefix}{value}{suffix}</div>
    </div>
  );
}
