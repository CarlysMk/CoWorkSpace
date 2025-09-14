
import React from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import { ServiceChips } from "../lib/format.jsx";
import { CheckCheck, CreditCard, Search } from "lucide-react";

function persistReceipt(bookingId, data){
  try{
    const key="receiptsByBookingId";
    const map=JSON.parse(localStorage.getItem(key)||"{}");
    map[String(bookingId)]={...(map[String(bookingId)]||{}), ...data};
    localStorage.setItem(key, JSON.stringify(map));
  }catch{}
}
export default function Booking() {
  const q = new URLSearchParams(useLocation().search);
  const [start, setStart] = React.useState(q.get("start") || "");
  const [end, setEnd] = React.useState(q.get("end") || "");
  const spaceId = q.get("space_id");
  const [availableLocations, setAvailableLocations] = React.useState([]);
  const [locationId, setLocationId] = React.useState("");
  const [booking, setBooking] = React.useState(null);
  const [space, setSpace] = React.useState(null);

  
  const [showPayment, setShowPayment] = React.useState(true);
  // Cleanup: se l'utente lascia la pagina prima di completare il pagamento, elimina la prenotazione pending
  React.useEffect(() => {
    const onBeforeUnload = () => {
      try {
        if (booking && booking.payment_status !== 'paid') {
          navigator.sendBeacon && navigator.sendBeacon(`/api/bookings/${booking.id}`, new Blob([], { type: 'application/json' }));
        }
      } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [booking]);

  // Stato form pagamento (punto 2)
  const [cardNumber, setCardNumber] = React.useState("");
  const [holderName, setHolderName] = React.useState("");
  const [expiry, setExpiry] = React.useState("");
  const [cvv, setCvv] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [city, setCity] = React.useState("");
  const [cap, setCap] = React.useState("");

  const onlyDigits = (s) => (s || "").replace(/\D+/g, "");

  const onCardNumberChange = (e) => {
    const digits = onlyDigits(e.target.value).slice(0,16);
    const parts = digits.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(" "));
  };
  const onExpiryChange = (e) => {
    let v = e.target.value.replace(/[^0-9]/g, "").slice(0,4);
    if (v.length > 2) v = v.slice(0,2) + "/" + v.slice(2);
    setExpiry(v);
  };
  const onCvvChange = (e) => {
    setCvv(onlyDigits(e.target.value).slice(0,3));
  };

  const validCard = onlyDigits(cardNumber).length === 16;
  const validHolder = holderName.length >= 2 && holderName.length <= 60;
  const validExpiry = expiry.length === 5;
  const validCvv = cvv.length === 3;
  const validEmail = (email.length >= 5 && email.length <= 100);
  const validStreet = street.length === 0 || (street.length >= 5 && street.length <= 80);
  const validCity = city.length === 0 || (city.length >= 2 && city.length <= 50);
  const validCap = cap.length === 0 || cap.length === 5;

  const formValid = validCard && validHolder && validExpiry && validCvv && validEmail && validStreet && validCity && validCap;

  // Punto 3-4: simulatore + update booking
  const [paymentProcessing, setPaymentProcessing] = React.useState(false);
  const [paymentResult, setPaymentResult] = React.useState(null);
  const genTxnId = () => {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i=0;i<10;i++) s += letters[Math.floor(Math.random()*letters.length)];
    const y = new Date().getFullYear();
    return `TRX-${y}-${s}`;
  };
  
  // Punto 5: helpers riepilogo e ricevuta
  const calcAmount = () => {
    if (booking?.price_eur) return Number(booking.price_eur);
    try {
      const startD = new Date(start);
      const endD = new Date(end);
      const hours = Math.max(0, (endD - startD) / 3600000);
      const p = Number(space?.price_per_hour || 0);
      return Math.round(hours * p);
    } catch { return undefined; }
  };
  const fmtAmount = (v) => (typeof v === "number" && !isNaN(v)) ? `${v.toFixed(2)} €` : "—";

  const downloadReceipt = () => {
    const lines = [];
    lines.push("=== RICEVUTA PAGAMENTO ===");
    lines.push(`ID transazione: ${paymentResult?.transactionId || booking?.payment_tx || "-"}`);
    lines.push(`Prenotazione: #${booking?.id}`);
    lines.push(`Data: ${new Date(paymentResult?.at || booking?.payment_at || Date.now()).toLocaleString()}`);
    lines.push(`Intestatario: ${holderName || "-"}`);
    lines.push(`Email: ${email || "-"}`);
    lines.push(`Spazio: ${space?.name || "-"}`);
    lines.push(`Periodo: ${start} -> ${end}`);
    const amt = calcAmount();
    if (amt !== undefined) lines.push(`Importo: ${fmtAmount(amt)}`);
    lines.push("\nGrazie per l'acquisto!");
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ricevuta_${booking?.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const sendReceiptEmail = async () => {
    const to = (email || "").trim();
    if (!to) { alert("Inserisci un indirizzo email prima di inviare la ricevuta."); return; }
    try {
      await api.emailReceipt(booking?.id, { toEmail: to });
      alert("Email inviata!");
    } catch (e) {
      alert("Invio email fallito: " + (e?.message || "errore imprevisto"));
    }
  };

const submitFakePayment = async () => {
    if (!formValid || paymentProcessing) return;
    setPaymentProcessing(true);
    setPaymentResult(null);
    const txnId = genTxnId();
    const at = new Date().toISOString();
    await new Promise(r => setTimeout(r, 1500)); // finto processing
    setPaymentProcessing(false);
    setPaymentResult({ ok: true, transactionId: txnId, at });
    try { const amt = calcAmount ? calcAmount() : undefined; } catch(e) {}
    persistReceipt(booking.id, { tx: txnId, at, holderName, email, amount: (typeof amt==='number' && !Number.isNaN(amt))?amt:undefined, spaceName: space?.name, locName: space?.location?.name, locAddress: space?.location?.address, locCity: space?.location?.city, start, end });
    try { await api.payBooking(booking.id); } catch (e) { console.warn("Aggiornamento backend fallito:", e?.message || e); }
    setBooking(prev => prev ? ({ ...prev, payment_status: 'paid', payment_tx: txnId, payment_at: at }) : prev);
  };
// carica sedi disponibili quando cambiano gli orari
  React.useEffect(() => {
    (async () => {
      setAvailableLocations([]);
      setLocationId("");
      if (!start || !end) return;
      const params = new URLSearchParams({ start_ts: start, end_ts: end });
      const rows = await api.request(`locations/available?${params.toString()}`);
      setAvailableLocations(Array.isArray(rows) ? rows : []);
    })();
  }, [start, end]);

  async function check() {
    if (!locationId || !start || !end) return alert("Seleziona una sede e un intervallo");
    alert("Sede disponibile nel periodo selezionato");
  }

  async function createBooking() {
    if (!start || !end) return alert("Seleziona l'intervallo");
    const s = new Date(start);
    const e = new Date(end);
    if (s > e) {
      return alert("La data di inizio non può essere maggiore della data di fine");
    }
    try {
      if (spaceId) {
        const r = await api.createBooking({ space_id: Number(spaceId), start_ts: start, end_ts: end });
        const bk = r.booking || r;
        setBooking(bk);
        try { const detail = await api.request(`spaces/${bk.space_id}`); setSpace(detail); } catch {}
        return;
      }
      if (!locationId) return alert("Seleziona una sede");
      const q2 = new URLSearchParams({ start_ts: start, end_ts: end, location_id: locationId });
      const spaces = await api.request(`spaces/available?${q2.toString()}`);
      if (!spaces || !spaces.length) return alert("Nessuno spazio libero in questa sede");
      const chosen = spaces[0];
      const r = await api.createBooking({ space_id: chosen.id, start_ts: start, end_ts: end });
      const bk = r.booking || r;
      setBooking(bk);
      try { const detail = await api.request(`spaces/${bk.space_id}`); setSpace(detail); } catch {}
    } catch (e) {
      alert(e.message || "Errore durante la prenotazione");
    }
  }

  async function pay() {
    if (!booking) return;
    const r = await api.payBooking(booking.id);
    setBooking(b => ({ ...(b||{}), payment_status: r.booking?.payment_status || "paid" }));
  }

  return (
    <div className="container">
      <h2>Prenotazione</h2>

      <div className="card">
        <div className="form-row">
          <div>
            <label className="label">Dal</label>
            <input className="input" type="datetime-local" value={start} onChange={(e)=>setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">Al</label>
            <input className="input" type="datetime-local" value={end} onChange={(e)=>setEnd(e.target.value)} />
          </div>
        </div>

        {!spaceId && (
          <div style={{marginTop:12}}>
            <label className="label">Sede disponibile</label>
            <select className="input" value={locationId} onChange={(e)=>setLocationId(e.target.value)} disabled={!availableLocations.length}>
              <option value="">{availableLocations.length ? "Seleziona una sede" : "Nessuna sede disponibile"}</option>
              {availableLocations.map(l => (
                <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{marginTop:12, display:"flex", gap:8}}>
          {!spaceId && <button className="btn" onClick={check} style={{display:"inline-flex", alignItems:"center", gap:6}}><Search size={18}/> Verifica disponibilità</button>}
          <button className="btn primary" onClick={createBooking} disabled={!start || !end} style={{display:"inline-flex", alignItems:"center", gap:6}}><CheckCheck size={18}/> Conferma prenotazione</button>
        </div>
      </div>

      {booking && (
        <div className="card" style={{marginTop:16}}>
          {space && (
            <>
              <div><strong>{space.name}</strong> — {space.type} — {space.price_per_hour ? `${space.price_per_hour}€/h` : ""}</div>
              <ServiceChips items={space.services} />
            </>
          )}
          <div>ID prenotazione: <strong>{booking.id}</strong></div>
          <div>Stato pagamento: <span className={"badge " + (booking.payment_status === "paid" ? "success" : "warn")}>{booking.payment_status === "paid" ? "Pagato" : "Non pagato"}</span></div>
          {/* blocco — rimosso */}
        </div>
      )}
      
      {showPayment && booking && (
        <div className="card" style={{marginTop:16}}>
          <h3 style={{marginTop:0}}>Pagamento</h3>
          {!paymentResult && (
            <>
              <div style={{fontSize:14, opacity:.8, marginBottom:12}}>
                Completa il pagamento per la prenotazione <strong>#{booking.id}</strong>.
              </div>

              <div className="form-row" aria-disabled={paymentProcessing}>
                <div style={{flex:1}}>
                  <label className="label">Numero carta</label>
                  <input className="input" type="text" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={onCardNumberChange} disabled={paymentProcessing} />
                  {!validCard && <div className="help error">Deve contenere esattamente 16 cifre.</div>}
                </div>
                <div style={{width:220}}>
                  <label className="label">Intestatario</label>
                  <input className="input" type="text" placeholder="Nome Cognome" value={holderName} onChange={(e)=>setHolderName(e.target.value)} disabled={paymentProcessing} />
                  {!validHolder && <div className="help error">Lunghezza 2–60 caratteri.</div>}
                </div>
              </div>

              <div className="form-row" style={{marginTop:8}} aria-disabled={paymentProcessing}>
                <div style={{width:180}}>
                  <label className="label">Scadenza (MM/AA)</label>
                  <input className="input" type="text" placeholder="MM/AA" value={expiry} onChange={onExpiryChange} disabled={paymentProcessing} />
                  {!validExpiry && <div className="help error">Formato lungo 5 caratteri (MM/AA).</div>}
                </div>
                <div style={{width:120}}>
                  <label className="label">CVV</label>
                  <input className="input" type="password" placeholder="***" value={cvv} onChange={onCvvChange} disabled={paymentProcessing} />
                  {!validCvv && <div className="help error">Esattamente 3 cifre.</div>}
                </div>
              </div>

              <div style={{marginTop:8}} aria-disabled={paymentProcessing}>
                <label className="label">Email ricevuta</label>
                <input className="input" type="email" placeholder="es. nome@esempio.it" value={email} onChange={(e)=>setEmail(e.target.value)} disabled={paymentProcessing} />
                {!validEmail && <div className="help error">Se compilata: 5–100 caratteri.</div>}
              </div>

              <div className="form-row" style={{marginTop:8}} aria-disabled={paymentProcessing}>
                <div style={{flex:2}}>
                  <label className="label">Indirizzo </label>
                  <input className="input" type="text" placeholder="Via e numero" value={street} onChange={(e)=>setStreet(e.target.value)} disabled={paymentProcessing} />
                  {!validStreet && <div className="help error">Se compilato: 5–80 caratteri.</div>}
                </div>
                <div style={{flex:1}}>
                  <label className="label">Città </label>
                  <input className="input" type="text" placeholder="Città" value={city} onChange={(e)=>setCity(e.target.value)} disabled={paymentProcessing} />
                  {!validCity && <div className="help error">Se compilata: 2–50 caratteri.</div>}
                </div>
                <div style={{width:120}}>
                  <label className="label">CAP </label>
                  <input className="input" type="text" placeholder="CAP" value={cap} onChange={(e)=>setCap(e.target.value.slice(0,5))} disabled={paymentProcessing} />
                  {!validCap && <div className="help error">Se compilato: esattamente 5 caratteri.</div>}
                </div>
              </div>

              <div style={{marginTop:12, display:"flex", gap:8, alignItems:"center"}}>
                <button className="btn" onClick={() => setShowPayment(false)} disabled={paymentProcessing}>Annulla</button>
                <button className="btn primary" onClick={submitFakePayment} disabled={!formValid || paymentProcessing}>
                  {paymentProcessing ? "Elaborazione..." : "Procedi al pagamento"}
                </button>
                {paymentProcessing && <div className="spinner" style={{marginLeft:8}} />}
              </div>
            </>
          )}

          {paymentResult && (
            <div>
              <div className="alert success" style={{marginBottom:12}}>
                Pagamento effettuato con successo.
              </div>
              <div className="summary-grid">
                <div><strong>ID transazione</strong></div><div>{paymentResult.transactionId}</div>
                <div><strong>Data</strong></div><div>{new Date(paymentResult.at).toLocaleString()}</div>
                <div><strong>Metodo</strong></div><div>Carta</div>
                <div><strong>Importo</strong></div><div>{fmtAmount(calcAmount())}</div>
                <div><strong>Spazio</strong></div><div>{space?.name || "—"}</div>
                <div><strong>Periodo</strong></div><div>{start} → {end}</div>
              </div>
              <div style={{marginTop:12, display:"flex", gap:8}}>
                <button className="btn" onClick={() => { setPaymentResult(null); setShowPayment(false); }}>Chiudi</button>
                <button className="btn" onClick={downloadReceipt}>Scarica ricevuta</button>
                <button className="btn" onClick={sendReceiptEmail}>Invia mail</button>
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
