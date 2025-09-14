
# Admin Wizard (Sede + Spazi)

## Endpoints

- `GET /api/admin/wizard/prefill` → Cataloghi (servizi, tipi spazi, default)
- `POST /api/admin/wizard/validate` → Valida payload `{ location, spaces[] }`
- `POST /api/admin/wizard/commit` → Crea **Location** + **Spaces** in un'unica transazione

## Payload esempio

```json
{
  "location": {
    "name": "CoWork Torino Centro",
    "city": "Torino",
    "address": "Via Example 10",
    "services": ["wifi","coffee","printer"]
  },
  "spaces": [
    { "name":"Sala Meeting 1", "type":"meeting", "capacity": 8, "price_per_hour": 25 },
    { "name":"Hot Desk 1", "type":"desk", "capacity": 1, "price_per_hour": 6 }
  ]
}
```

## RBAC
Tutte le route richiedono `auth` e ruolo `admin` o `manager`.

