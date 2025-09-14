import React from "react";
import { Wifi, Coffee, Printer, Calendar, Phone, Lock, ParkingSquare, Utensils, Bell } from "lucide-react";
export function euro(n) {
  try { return new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR' }).format(Number(n||0)); }
  catch { return `€ ${Number(n||0).toFixed(2)}`; }
}

export function parseServices(raw) {
  if (!raw) return [];
  try {
    if (typeof raw === 'string') {
      const t = raw.trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return Object.keys(parsed).filter(k => parsed[k]);
      }
      // stringa semplice separata da virgole
      return t.split(',').map(s=>s.replace(/["\[\]{}]/g,'').trim()).filter(Boolean);
    }
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') return Object.keys(raw).filter(k => raw[k]);
  } catch {}
  return [];
}

const ICONS = {
  wifi: { Icon: Wifi, label: "wifi", desc: "Rete Wi‑Fi ad alta velocità" },
  coffee: { Icon: Coffee, label: "coffee", desc: "Area coffee break" },
  printer: { Icon: Printer, label: "printer", desc: "Stampante / multifunzione" },
  "meeting-rooms": { Icon: Calendar, label: "meeting rooms", desc: "Sale riunioni disponibili" },
  "phone-booths": { Icon: Phone, label: "phone booths", desc: "Postazioni per call" },
  lockers: { Icon: Lock, label: "lockers", desc: "Armadietti personali" },
  parking: { Icon: ParkingSquare, label: "parking", desc: "Parcheggio disponibile" },
  kitchen: { Icon: Utensils, label: "kitchen", desc: "Cucina / area pranzo" },
  reception: { Icon: Bell, label: "reception", desc: "Reception / accoglienza" },
};

export function ServiceChips({ items }) {
  const list = parseServices(items);
  if (!list.length) return null;
  return (
    <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
      {list.map((key,i)=> {
        const def = ICONS[String(key).toLowerCase()] || null;
        const LabelIcon = def?.Icon || null;
        return (
          <span key={i} className="badge" style={{background:'#eef2ff', borderColor:'#c7d2fe', color:'#3730a3', display:'inline-flex', alignItems:'center', gap:6}}>
            {LabelIcon ? <LabelIcon size={14}/> : null}
            {def?.label || String(key).replace(/_/g,' ')}
          </span>
        );
      })}
    </div>
  );
}
