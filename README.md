# CoWorkSpace


Progetto demo per gestione spazi coworking.


## Requisiti
- Docker & Docker Compose (Docker Desktop va bene)


## Avvio rapido
1. Copia i file nelle cartelle come indicato.
2. (opzionale) Copia `.env.example` in `.env` e modifica se necessario.
3. Avvia: `docker compose up --build`
4. API backend: http://localhost:4000
Frontend: http://localhost:3000


## Note
- Il pagamento è simulato (endpoint mock).
- Per popolare DB: `node backend/scripts/seed.js` dentro il container o usare il file SQL di inizializzazione già presente.

---
## Deliverables & Documentazione

- **UI Frontend** (Vite/React) responsive con pagine: Home, Login/Register, Prenotazione, Dashboard Gestori.
- **API Backend** (Express) documentate in `backend/src/swagger.yaml` (OpenAPI 3).
- **Database**: script schema `backend/scripts/init_db.sql` + `docs/ER.md`.
- **DevOps**: `docker-compose.yml`, Dockerfile frontend/backend, workflow CI `./.github/workflows/ci.yml`.
- **Testing**: Jest + test smoke `backend/__tests__/smoke.test.js` (estendibile per integrazione con Supertest/PG).
- **Deploy**: linee guida in `docs/DEPLOY_CLOUD.md` (AWS ECS/EC2, GCP Cloud Run).
- **Errori & Rollback**: `docs/ERRORS_ROLLBACK.md`.
- **Backup DB**: `backend/scripts/backup.sh`.

### Avvio locale
```bash
docker compose up --build
# Frontend: http://localhost:8080 (o 3000 se lanciato senza nginx)
# Backend: http://localhost:4000
```

### Seed dati (opzionale)
```bash
docker compose exec backend node scripts/seed.js
```

### Test
```bash
docker compose run --rm backend npm test
```

### Note pagamenti
Per la consegna Ã¨ incluso un **mock pagamento** (simulato). Lâintegrazione reale puÃ² usare Stripe con webhook per conferma e riconciliazione.



## Credenziali demo
- Admin: **root@cowork.it** / **CowRoot**


## Test: come eseguire
```bash
cd backend
npm install
npm test
```

## Pagamenti (Stripe test-mode)
- Imposta nel `.env` del backend:
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `FRONTEND_BASE_URL=http://localhost:5173`
- Avvia `stripe listen --forward-to localhost:3001/api/payments/webhook` per testare i webhook.
- API:
  - `POST /api/bookings/:id/pay` → risponde `{ url }` (Checkout Session).
  - `POST /api/payments/webhook` → aggiorna `payment_status` a `paid`.


## Pagamento mock automatico
Se `STRIPE_SECRET_KEY` **non è impostata**, il backend usa automaticamente **mock mode**:
- `POST /api/bookings/:id/pay` risponde con un `url` di successo locale e imposta `payment_status='paid'`.
- Nessuna configurazione Stripe è necessaria per le demo rapide.

## Sicurezza
Middleware opzionale `backend/src/middleware/security.js`. Variabili RATE_LIMIT_*.
## CI
Workflows in `.github/workflows`.
