import React from "react";

export default function Filters({ value, onChange }) {
  const [city, setCity] = React.useState(value.city || "");
  const [type, setType] = React.useState(value.type || "");
  const [services, setServices] = React.useState(value.services || []);
  const [from, setFrom] = React.useState(value.available_from || "");
  const [to, setTo] = React.useState(value.available_to || "");

  function toggleService(s) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x!==s) : [...prev, s]);
  }

  React.useEffect(() => {
    onChange({ city, type, services, available_from: from, available_to: to });
  }, [city, type, services, from, to]);

  return (
    <div className="filters" style={{display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", alignItems:"end"}}>
      <div>
        <label>Città</label>
        <input value={city} onChange={(e)=>setCity(e.target.value)} placeholder="Milano, Roma..." />
      </div>
      <div>
        <label>Tipologia</label>
        <select value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="">Tutte</option>
          <option value="desk">Desk</option>
          <option value="office">Ufficio</option>
          <option value="meeting">Sala riunioni</option>
        </select>
      </div>
      <div>
        <label>Servizi</label>
        <div>
          {["wifi","coffee","meeting-rooms","printer"].map(s => (
            <label key={s} style={{marginRight:8, display:"inline-flex", gap:6}}>
              <input type="checkbox" checked={services.includes(s)} onChange={()=>toggleService(s)} /> {s}
            </label>
          ))}
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
  );
}
