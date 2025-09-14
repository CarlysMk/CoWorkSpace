import React from "react";
import { useAuth } from "../auth";
import api from "../api";
import "./../wizard.css";
import { DEFAULT_SERVICES } from "../constants";

function StepDots({ step, setStep }) {
  return (
    <div className="steps">
      {[1,2,3].map(n => (
        <button key={n} type="button"
          className={"step-dot" + (n===step ? " active" : "")}
          onClick={() => setStep(n)} aria-label={`Vai allo step ${n}`}>{n}</button>
      ))}
    </div>
  );
}

function ServiceChip({ active, icon, children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={"service-chip" + (active ? " selected" : "")}>
      <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      <span>{children}</span>
    </button>
  );
}

export default function AdminWizard(){
  const [step, setStep] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [ok, setOk] = React.useState("");

  const [location, setLocation] = React.useState({ name:"", city:"", address:"", services:[] });
  const [spaces, setSpaces] = React.useState([{ name:"", type:"desk", capacity:1, price_per_hour:0 }]);

  const addSpace=()=> setSpaces(s=>[...s,{ name:"", type:"desk", capacity:1, price_per_hour:0 }]);
  const rmSpace=i=> setSpaces(s=> s.filter((_,idx)=> idx!==i));
  const upSpace=(i,patch)=> setSpaces(s=> s.map((sp,idx)=> idx===i? {...sp, ...patch}: sp));

  const canNext1 = location.name.trim() && location.city.trim();
  const canNext2 = spaces.every(sp=> sp.name.trim());

  
  async function createAll(){
    setBusy(true); setError(""); setOk("");
    try{
      await api.wizardValidate({ location, spaces });
      const res = await api.wizardCommit({ location, spaces });
      setOk("Sede e spazi creati con successo");
    }catch(e){ setError(String(e?.message || e)); }
    finally{ setBusy(false); }
  }

  return (
    <div className="page">
      <h1>Wizard Sede + Spazi</h1>
      <StepDots step={step} setStep={setStep} />
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      {step===1 && (
        <section className="card">
          <h3>Dettagli sede</h3>
          <div className="grid">
            <div>
              <label>Nome</label>
              <input value={location.name}
                onChange={e=> setLocation({ ...location, name:e.target.value })} />
            </div>
            <div>
              <label>Città</label>
              <input value={location.city}
                onChange={e=> setLocation({ ...location, city:e.target.value })} />
            </div>
            <div>
              <label>Indirizzo</label>
              <input value={location.address}
                onChange={e=> setLocation({ ...location, address:e.target.value })} />
            </div>
          </div>

          <div className="services-title"><strong>Servizi</strong></div>
          <div className="services-grid">
            {DEFAULT_SERVICES.map(svc=>{
              const selected = (location.services||[]).includes(svc.id);
              return (
                <ServiceChip key={svc.id} icon={svc.icon} active={selected}
                  onClick={()=>{
                    const set = new Set(location.services||[]);
                    selected ? set.delete(svc.id) : set.add(svc.id);
                    setLocation({ ...location, services:[...set] });
                  }}>{svc.label}</ServiceChip>
              );
            })}
          </div>

          <div className="actions">
            <button className="btn" disabled={!canNext1} onClick={()=>setStep(2)}>Avanti</button>
          </div>
        </section>
      )}

      {step===2 && (
        <section className="card">
          <h3>Spazi</h3>
          <div className="space-legend"><div>Nome</div><div>Tipo</div><div>Capienza</div><div>€/h</div><div></div></div>
          {spaces.map((sp,i)=>(
            <div key={i} className="space-row">
              <input placeholder="Nome spazio" value={sp.name}
                onChange={e=> upSpace(i, { name:e.target.value })} />
              <select value={sp.type} onChange={e=> upSpace(i, { type:e.target.value })}>
                <option value="desk">desk</option>
                <option value="meeting">meeting</option>
                <option value="office">office</option>
              </select>
              <input type="number" min="1" value={sp.capacity}
                onChange={e=> upSpace(i, { capacity: Math.max(1, +e.target.value||1) })} />
              <input type="number" min="0" step="0.5" value={sp.price_per_hour}
                onChange={e=> upSpace(i, { price_per_hour: +e.target.value||0 })} />
              <button className="btn ghost" onClick={()=>rmSpace(i)}>Rimuovi</button>
            </div>
          ))}
          <button className="btn ghost" onClick={addSpace}>+ Aggiungi spazio</button>
          <div className="actions">
            <button className="btn ghost" onClick={()=>setStep(1)}>Indietro</button>
            <button className="btn" disabled={!canNext2} onClick={()=>setStep(3)}>Avanti</button>
          </div>
        </section>
      )}

      {step===3 && (
        <section className="card">
          <h3>Riepilogo</h3>
          <div className="card soft">
            <strong>{location.name||"—"}</strong>
            <div>{location.address||"—"}, {location.city||"—"}</div>
            <div><strong>Servizi:</strong> {(location.services||[]).join(", ")||"—"}</div>
          </div>
          <table className="table stack-12">
            <thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Capienza</th><th>€/h</th></tr></thead>
            <tbody>
              {spaces.map((sp,i)=>(
                <tr key={i}><td>{i+1}</td><td>{sp.name||"—"}</td><td>{sp.type}</td><td>{sp.capacity}</td><td>{Number(sp.price_per_hour).toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="actions">
            <button className="btn ghost" onClick={()=>setStep(2)}>Indietro</button>
            <button className="btn primary" disabled={busy} onClick={createAll}>{busy? "Creazione...":"Crea sede"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
