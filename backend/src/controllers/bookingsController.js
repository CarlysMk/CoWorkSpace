// backend/src/controllers/bookingsController.js
// Mock in-memory. In produzione sostituisci con query al DB.
let bookings = [
  { id: 1, user: "user@cowork.com", locationId: 1, date: "2025-08-25", note: "Prova iniziale" }
];

// GET /api/bookings
function getBookings(req, res) {
  // Potresti filtrare per utente/ruolo se vuoi.
  res.json(bookings);
}

// POST /api/bookings
function createBooking(req, res) {
  const { user, locationId, date, note = "" } = req.body || {};
  if (!user || !locationId || !date) {
    return res.status(400).json({ message: "user, locationId e date sono obbligatori" });
  }

  // controllo sovrapposizione semplice: stessa location stesso giorno
  const overlap = bookings.find(b => String(b.locationId) === String(locationId) && b.date === date);
  if (overlap) {
    return res.status(409).json({ message: "La location è già prenotata per questa data" });
  }

  const newBooking = {
    id: bookings.length ? Math.max(...bookings.map(b => b.id)) + 1 : 1,
    user,
    locationId: Number(locationId),
    date,
    note
  };

  bookings.push(newBooking);
  return res.status(201).json({ message: "Prenotazione creata con successo", booking: newBooking });
}

module.exports = { getBookings, createBooking };
