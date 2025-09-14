Setup invio email (Gmail già configurato)
- Account: CoWorkspaceUNI@gmail.com
- App Password (senza spazi): avhlmfwufiwlqnyr

Se l'invio fallisce, verifica che l'App Password sia corretta e che non ci siano blocchi sull'account.
Ricostruisci il backend dopo cambi .env:
  docker compose down
  docker compose build backend
  docker compose up -d
