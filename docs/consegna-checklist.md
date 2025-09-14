# Checklist aderenza alla consegna (Esame Pratico Agosto)

**Progetto: Piattaforma “CoWorkSpace” per la gestione di spazi condivisi**

## 1) Catalogo sedi con filtri (città, tipologia, servizi, disponibilità)
- Backend: `GET /api/locations?city=&type=&services=&available_from=&available_to=` → `backend/src/routes/locations.js`
- Frontend: pagina **Catalog.jsx** + **Filters.jsx** → `frontend/src/pages/Catalog.jsx`, `frontend/src/components/Filters.jsx`

## 2) Gestione account (registrazione, autenticazione, profilo)
- Backend: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (JWT, bcrypt) → `backend/src/routes/auth.js`
- Frontend: pagine **Login.jsx**, **Register.jsx**, **Profile.jsx** → `frontend/src/pages/*`

## 3) Prenotazione e pagamento online
- Prenotazione: `POST /api/bookings` (con controllo disponibilità `GET /api/bookings/availability`) → `backend/src/routes/bookings.js`
- Pagamento: `POST /api/bookings/:id/pay` (mock) → `backend/src/routes/bookings.js`
- Frontend: pagina **Booking.jsx** con pulsante “Paga ora” → `frontend/src/pages/Booking.jsx`

## 4) Dashboard gestori
- Report: `GET /api/manager/report` → `backend/src/routes/manager.js`
- Frontend: **ManagerDashboard.jsx** (minimal) → `frontend/src/pages/ManagerDashboard.jsx`

## 5) Deployment Cloud
- Dockerfile frontend/backend, `docker-compose.yml`, Nginx reverse proxy → cartella root
- Guida: `docs/deploy-cloud.md` (AWS ECS + alternative) 

## 6) Repository e documentazione
- **README.md** aggiornato con istruzioni e API principali
- **OpenAPI**: `backend/src/swagger.yaml` (esteso con nuovi endpoint)
- **Test**: `backend/__tests__/smoke.test.js` (estendibile, vedi `docs/testing.md`)
- **Branching**: `docs/branching.md`
- **Intervista** (riassunto): `docs/intervista.md`

## Note importanti
- Schema DB consolidato con **password_hash** + **payment_status** in: `backend/src/db/init.js` e `backend/src/scripts/init_db.sql`.
- Sicurezza: JWT + bcrypt; aggiungere HTTPS e secret management in cloud (vedi guida).
- Pagamento: endpoint **mock** pronto; integrazione Stripe opzionale impostando variabile `STRIPE_SECRET_KEY` (non richiesta per la demo d’esame).

