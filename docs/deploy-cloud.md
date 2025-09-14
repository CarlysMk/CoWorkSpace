# Deploy Cloud (AWS ECS - guida rapida)

1. **Build & push** immagini su Amazon ECR (frontend, backend, nginx).
2. **PostgreSQL**: usare Amazon RDS (Postgres). Impostare `DATABASE_URL` sul backend.
3. **ECS (Fargate)**: creare cluster + Task Definition con 3 container e ALB che instrada:
   - `/api` -> backend:3001
   - `/`    -> frontend:80
4. **Secrets**: `JWT_SECRET`, eventuale `STRIPE_SECRET_KEY`, `DATABASE_URL` su AWS Secrets Manager.
5. **Auto Scaling & Health Checks**: target CPU/Memory e path `/api/health`.

> Alternativa: Render.com/Fly.io/Heroku con `Dockerfile` inclusi.
