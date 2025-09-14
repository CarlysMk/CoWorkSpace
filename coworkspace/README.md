# CoWorkSpace — Piattaforma per spazi condivisi

Questo repository contiene una demo **end‑to‑end** (frontend + backend + database + proxy) della piattaforma *CoWorkSpace* richiesta dalla consegna.

## Funzionalità coperte
- **Catalogo sedi** con filtri per *città*, *tipologia di spazio*, *servizi* e *disponibilità* (intervallo data/ora).
- **Gestione account**: registrazione, login JWT (password **hash** con bcrypt) e sezione **Profilo**.
- **Prenotazione**: creazione prenotazione con controllo disponibilità e stato `payment_status`.
- **Pagamento online**: endpoint `/api/bookings/:id/pay` (mock). Facoltativa integrazione Stripe impostando `STRIPE_SECRET_KEY` (non obbligatoria per la demo).
- **Dashboard gestori**: endpoint report `/api/manager/report` e pagina *ManagerDashboard* (minimal).
- **Deployment Cloud**: container Docker, `docker-compose.yml`, Dockerfile frontend/backend, reverse proxy Nginx. Pipeline CI su GitHub Actions.

> Nota: la demo privilegia la coerenza dello **schema** e delle **API**; il design UI è volutamente semplice.

## Avvio rapido (Docker)
1. Copia `.env.example` in `.env` e opzionalmente imposta `JWT_SECRET` e `VITE_API_BASE_URL` (frontend).
2. Avvia:  
   ```bash
   docker compose up -d --build
   ```
3. Frontend disponibile su **http://localhost:8080**. API su **http://localhost:8080/api** (via Nginx).

Credenziali seed: **manager@cowork.it / manager123** (ruolo `manager`).

## API principali
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Catalogo/Filtri**: `GET /api/locations?city=&type=&services=wifi,coffee&available_from=&available_to=`
- **Spazi**: `GET /api/locations/:id/spaces`
- **Prenotazioni**: `GET /api/bookings`, `GET /api/bookings/availability`, `POST /api/bookings`
- **Pagamento**: `POST /api/bookings/:id/pay` (mock)
- **Report gestori**: `GET /api/manager/report`

OpenAPI di riferimento: `backend/src/swagger.yaml` (da aggiornare se estendi le rotte).

## Struttura repository
- `frontend/` — React + Vite (routing, catalogo, profilo, prenotazioni).
- `backend/` — Node.js/Express + PostgreSQL (schema idempotente in `src/db/init.js` + `scripts/init_db.sql`).
- `nginx/` — reverse proxy.
- `.github/workflows/ci.yml` — build & test.
- `docker-compose.yml` — orchestrazione locale.

## Sicurezza
- Password salvate come **hash bcrypt** (`password_hash`).  
- JWT firmati con `JWT_SECRET`.  
- CORS e Helmet lato server (abilitabile).

## Deployment Cloud
Linee guida in `docs/deploy-cloud.md` (ECS su AWS con ECR + Task Definition + ALB) e alternativa su Render/Fly.io. Tutto è containerizzato.

## Testing
- **Smoke test** backend (`backend/__tests__/smoke.test.js`).
- Esempi in `docs/testing.md` per ampliare la copertura (auth, availability).

## Modalità di consegna
- **Repository Git** con branch per `frontend`, `backend`, `database`, `devops` (vedi `docs/branching.md`).  
- **README** (questo file), **Documentazione tecnica** (`docs/*`), **Demo** (istruzioni), **Test automatici**.

## Note
Se stai correggendo/estendendo, assicurati di mantenere allineati:
- lo **schema DB** (`src/db/init.js` e `scripts/init_db.sql`),
- le **rotte** Express,
- e l'**OpenAPI** (`swagger.yaml`).

Buon lavoro! 🚀
