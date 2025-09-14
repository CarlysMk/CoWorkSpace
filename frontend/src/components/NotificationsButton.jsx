import React, { useEffect, useRef, useState } from "react";

export default function NotificationsButton() {
  const [on, setOn] = useState(false);
  const [messages, setMessages] = useState([]);
  const lastSeenIdsRef = useRef(new Set());

  // cache leggere per evitare richieste duplicate
  const usersCacheRef = useRef(new Map());      // key: user_id -> { email }
  const spacesCacheRef = useRef(new Map());     // key: space_id -> { name }

  // fetch helper con timeout
  async function fetchJson(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  async function getUserEmailById(userId) {
    if (!userId) return null;
    if (usersCacheRef.current.has(userId)) {
      return usersCacheRef.current.get(userId)?.email ?? null;
    }
    // endpoint più probabile
    let data = await fetchJson(`/api/users/${userId}`);
    // alcuni backend rispondono con array su ?id=
    if (!data) data = (await fetchJson(`/api/users?id=${userId}`))?.[0] ?? null;

    const email =
      data?.email ??
      data?.user?.email ??
      data?.account?.email ??
      data?.mail ??
      null;

    usersCacheRef.current.set(userId, { email });
    return email;
  }

  async function getSpaceNameById(spaceId) {
    if (!spaceId) return null;
    if (spacesCacheRef.current.has(spaceId)) {
      return spacesCacheRef.current.get(spaceId)?.name ?? null;
    }

    // Prova vari endpoint comuni per "spazio/sede"
    let data =
      (await fetchJson(`/api/locations/${spaceId}`)) ||
      (await fetchJson(`/api/spaces/${spaceId}`)) ||
      (await fetchJson(`/api/workspaces/${spaceId}`));

    // fallback: alcune API usano ?id=
    if (!data) {
      data =
        ((await fetchJson(`/api/locations?id=${spaceId}`))?.[0]) ||
        ((await fetchJson(`/api/spaces?id=${spaceId}`))?.[0]) ||
        ((await fetchJson(`/api/workspaces?id=${spaceId}`))?.[0]) ||
        null;
    }

    const name =
      data?.name ??
      data?.nome ??
      data?.title ??
      data?.location?.name ??
      data?.workspace?.name ??
      null;

    spacesCacheRef.current.set(spaceId, { name });
    return name;
  }

  useEffect(() => {
    let timer;

    async function primeRead() {
      try {
        const res = await fetch("/api/bookings?limit=20&sort=desc");
        if (!res.ok) return;
        const data = await res.json();
        data.forEach((b) => lastSeenIdsRef.current.add(b.id));
      } catch {}
    }

    async function tick() {
      try {
        const res = await fetch("/api/bookings?limit=20&sort=desc");
        if (!res.ok) return;
        const data = await res.json();

        const newOnes = [];
        for (const b of data) {
          if (!lastSeenIdsRef.current.has(b.id)) {
            newOnes.push(b);
          }
        }
        data.forEach((b) => lastSeenIdsRef.current.add(b.id));

        if (newOnes.length) {
          const msgs = await Promise.all(
            newOnes.map(async (b) => {
              const email = (await getUserEmailById(b.user_id)) ?? "utente";
              const loc =
                (await getSpaceNameById(b.space_id)) ?? "una sede";
              return {
                id: b.id,
                text: `${email} sta effettuando prenotazione presso ${loc}`,
              };
            })
          );
          setMessages((prev) => [...msgs, ...prev]);
        }
      } catch {}
    }

    if (on) {
      primeRead();
      timer = setInterval(tick, 10000); // ogni 10s
    }
    return () => clearInterval(timer);
  }, [on]);

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 9999 }}>
      <button
        onClick={() => setOn((v) => !v)}
        style={{
          padding: "10px 14px",
          borderRadius: 999,
          border: "1px solid #ddd",
          background: on ? "#e8fff1" : "#fff",
          cursor: "pointer",
        }}
        aria-pressed={on}
      >
        🔔 Notifiche {on ? "ON" : "OFF"}
      </button>

      {messages.length > 0 && (
        <div
          style={{
            marginTop: 8,
            maxWidth: 380,
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            boxShadow: "0 6px 18px rgba(0,0,0,.08)",
            padding: 10,
          }}
          role="status"
          aria-live="polite"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid #f2f2f2",
              }}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
