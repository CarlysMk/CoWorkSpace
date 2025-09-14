import React from "react";
import api from "../api";
import { ServiceChips } from "../lib/format.jsx";

export default function Profile() {
  const [me, setMe] = React.useState(null);
  const [bookings, setBookings] = React.useState([]);
  const [spaceMap, setSpaceMap] = React.useState({});
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const m = await api.me();
        setMe(m.user);
        const list = await api.listBookings({ user_id: m.user.sub });
        const arr = Array.isArray(list) ? list : [];
        setBookings(arr);
        // Precarica spazi per mappa id -> spazio
        const needed = arr.map(b => b.space_id).filter(Boolean);
        const uniq = Array.from(new Set(needed));
        const pairs = await Promise.all(uniq.map(id => api.request(`spaces/${id}`).catch(() => null)));
        const next = {};
        pairs.forEach(sp => { if (sp && sp.id) next[sp.id] = sp; });
        setSpaceMap(next);
      } catch (e) {
        setErr(e?.message || "Errore caricamento profilo");
      }
    })();
  }, []);

  // === Ricevuta dal profilo: usa i dati salvati dal pagamento (TRX/at/amount) oppure ricalcola ===
  const getStoredReceipt = (bookingId) => {
    try {
      const map = JSON.parse(localStorage.getItem("receiptsByBookingId") || "{}");
      return map[String(bookingId)] || null;
    } catch { return null; }
  };

  const buildReceiptText = (b) => {
    const stored = getStoredReceipt(b.id);
    const tx = stored?.tx || b.payment_tx || "OK";
    const at = stored?.at || b.payment_at || new Date().toISOString();
    const sp = spaceMap[b.space_id] || {};
    const loc = sp.location || {};

    const start = b.start_ts ? new Date(b.start_ts) : (b.start ? new Date(b.start) : null);
    const end   = b.end_ts ? new Date(b.end_ts) : (b.end ? new Date(b.end) : null);

    // Importo: 1) salvato; 2) booking.price_eur; 3) ore * price_per_hour
    let amount = (stored?.amount != null) ? Number(stored.amount) : Number(b.price_eur || NaN);
    if (!(typeof amount === "number" && !Number.isNaN(amount)) && start && end && sp.price_per_hour) {
      const hours = Math.max(0, (end - start) / 3600000);
      amount = Math.round(hours * Number(sp.price_per_hour));
    }

    const lines = [];
    lines.push("=== RICEVUTA PAGAMENTO ===");
    lines.push(`ID transazione: ${tx}`);
    lines.push(`Prenotazione: #${b.id}`);
    if (stored?.holderName) lines.push(`Intestatario: ${stored.holderName}`);
    if (stored?.email) lines.push(`Email: ${stored.email}`);
    lines.push(`Data: ${new Date(at).toLocaleString()}`);
    if (sp.name) lines.push(`Spazio: ${sp.name}`);
    lines.push(`Sede: ${loc.name || "-"}`);
    if (loc.address || loc.city) lines.push(`Indirizzo: ${(loc.address || "")}${loc.city ? ", " + loc.city : ""}`);
    if (start && end) lines.push(`Periodo: ${start.toLocaleString()} -> ${end.toLocaleString()}`);
    if (typeof amount === "number" && !Number.isNaN(amount)) {
      lines.push(`Importo: ${amount.toFixed(2)} €`);
    }
    lines.push("\nGrazie per l'acquisto!");
    return lines.join("\n");
  };

  const onDownloadReceipt = (b) => {
    const stored = getStoredReceipt(b.id);
    const tx = stored?.tx || b.payment_tx || "OK";
    const text = buildReceiptText(b);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ricevuta_${b.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  async function pay(id) {
    try {
      await api.payBooking(id);
      setBookings(prev => prev.map(b => b.id === id ? ({ ...b, payment_status: "paid" }) : b));
    } catch (e) {
      alert(e?.message || "Errore pagamento");
    }
  }

  return (
    <div className="container">
      <div className="hero">
        <h1>Il tuo profilo</h1>
        <p>Gestisci prenotazioni e pagamenti.</p>
      </div>

      {err && <div className="card" style={{ borderColor: "#f87171" }}>{err}</div>}

      {me ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div><strong>Email:</strong> {me.email}</div>
          <div><strong>Ruolo:</strong> {me.role}</div>
        </div>
      ) : (
        <div className="card"><em>Caricamento profilo…</em></div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Le tue prenotazioni</h2>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {bookings.map(b => (
            <div key={b.id} className="card" style={{ margin: 0 }}>
              <div className="chip" style={{ float: "right" }}>
                "Pagato"
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Prenotazione #{b.id}</div>
              <div style={{ fontSize: 14, opacity: .85, marginBottom: 8 }}>
                {spaceMap[b.space_id]?.name || "—"}
              </div>

              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div><span className="label">Inizio</span>{new Date(b.start_ts).toLocaleString()}</div>
                <div><span className="label">Fine</span>{new Date(b.end_ts).toLocaleString()}</div>
              </div>

              {spaceMap[b.space_id] && <ServiceChips items={spaceMap[b.space_id].services} />}

              {null}

              {b.payment_status === "paid" && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn" onClick={() => onDownloadReceipt(b)}>Scarica ricevuta</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {!bookings.length && <div className="card"><em>Nessuna prenotazione</em></div>}
      </div>
    </div>
  );
}
