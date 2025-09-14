# Gestione Errori & Rollback

## API/Backend
- Middleware di **error handling** centralizzato (HTTP 4xx/5xx con JSON `message`, `detail`).
- **Validation** input (es. email, date) prima di toccare il DB.
- Logging con livelli (info/warn/error) e `request-id` per correlazione.

## Database
- Usa **transazioni** per operazioni multi-step (creazione booking + pagamento).
- Vincoli (FK, UNIQUE, CHECK) già presenti nello schema.
- Strategie di **rollback**:
  - Fallisce il pagamento → rollback della prenotazione oppure segna `status='pending'` e un job di cleanup.
  - Deadlock/lock timeout → retry con backoff.

## Deployment
- **Blue/Green** o **Canary** con due versioni attive (ECS o VM duplicate dietro ALB).
- Rollback = switch del target group o `docker compose` verso la precedente release (tag immagini).
- **Backup** DB: vedi `backend/scripts/backup.sh`.

## Notifiche
- Webhook/Email per conferme booking e alert errori (es. via SES/SendGrid).
