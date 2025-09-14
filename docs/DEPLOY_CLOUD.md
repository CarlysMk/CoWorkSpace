# Deployment Cloud – Opzioni e Passi

Di seguito due percorsi semplici e riproducibili.

---

## Opzione A) **AWS EC2 + Docker Compose** (veloce)
1. Crea una EC2 (t2.micro per test) con **Ubuntu 22.04**, apri le porte 80/443, 3000, 4000 se servono in fase test.
2. Installa Docker + Compose:
   ```bash
   sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   echo      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu      $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```
3. Copia la cartella `coworkspace/` sulla EC2 (scp o git clone).
4. Imposta variabili `.env` (vedi `.env.example`).
5. Avvia:
   ```bash
   docker compose up -d --build
   ```
6. (Opzionale) Metti **nginx** davanti con certificati (Let's Encrypt) e proxy verso `frontend` e `backend`.

**Scalabilità base:** più istanze EC2 dietro un **Load Balancer**; Postgres gestito su RDS.

---

## Opzione B) **AWS ECS Fargate** (scalabile e gestito)
- Crea due servizi ECS (frontend e backend) con immagini dal tuo **ECR**.
- Usa **AWS RDS Postgres** come database.
- Configura **Application Load Balancer** con due target groups:
  - `/api/*` → backend
  - `/` → frontend (nginx static)
- Imposta auto-scaling (CPU/Memory o RequestCount).

**Pipeline:** vedi workflow GitHub Actions incluso (`.github/workflows/ci.yml`) che fa build & test; aggiungi step `docker/build-push-action` per pubblicare su ECR.

---

## Opzione C) **GCP Cloud Run**
- Containerizza `frontend` e `backend` (Dockerfile già presenti).
- Pubblica due servizi Cloud Run separati.
- Database: **Cloud SQL Postgres**.
- Connetti backend a Cloud SQL con **connector**.
- Metti **Cloud Load Balancing** con mapping `/api` → backend, resto → frontend.

---

## Variabili d’Ambiente (minimo)
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (backend)
- `VITE_API_URL` (frontend)

Vedi anche `README.md` per avvio locale.
