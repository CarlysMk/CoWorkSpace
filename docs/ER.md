# Schema ER – CoWorkSpace (testuale + mermaid)

## Entità principali
- **Users**(id, name, email, password, role, created_at)
- **Locations**(id, name, city, address, description)
- **Spaces**(id, location_id, type, name, capacity, price_hour, amenities, is_active)
- **Bookings**(id, user_id, space_id, start_ts, end_ts, status, note, created_at)
- **Payments**(id, booking_id, provider, amount, currency, status, tx_ref, created_at)
- **Amenities**(id, name)
- **SpaceAmenities**(space_id, amenity_id)

## Relazioni
- Un **User** effettua molte **Bookings**
- Una **Booking** riguarda uno **Space**
- Uno **Space** appartiene ad una **Location**
- Uno **Space** ha molti **Amenities** tramite **SpaceAmenities**
- Una **Booking** può avere un **Payment**

```mermaid
erDiagram
  USERS ||--o{ BOOKINGS : makes
  LOCATIONS ||--o{ SPACES : offers
  SPACES ||--o{ BOOKINGS : reserves
  SPACES }o--o{ AMENITIES : via SPACE_AMENITIES
  BOOKINGS ||--o| PAYMENTS : paid_by

  USERS {
    int id PK
    string name
    string email UK
    string password
    string role
    timestamp created_at
  }
  LOCATIONS {
    int id PK
    string name
    string city
    string address
    string description
  }
  SPACES {
    int id PK
    int location_id FK
    string type
    string name
    int capacity
    numeric price_hour
    boolean is_active
  }
  BOOKINGS {
    int id PK
    int user_id FK
    int space_id FK
    timestamp start_ts
    timestamp end_ts
    string status
    string note
    timestamp created_at
  }
  PAYMENTS {
    int id PK
    int booking_id FK
    string provider
    numeric amount
    string currency
    string status
    string tx_ref
    timestamp created_at
  }
  AMENITIES {
    int id PK
    string name
  }
  SPACE_AMENITIES {
    int space_id FK
    int amenity_id FK
  }
```
