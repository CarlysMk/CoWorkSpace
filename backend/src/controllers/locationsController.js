// backend/src/controllers/locationsController.js

let locations = [
  { id: 1, name: "Sala Riunioni", capacity: 10 },
  { id: 2, name: "Ufficio Privato", capacity: 3 }
];

function getLocations(req, res) {
  res.json(locations);
}

function createLocation(req, res) {
  const { name, capacity } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ message: "Nome e capacità obbligatori" });
  }
  const newLocation = { id: locations.length + 1, name, capacity };
  locations.push(newLocation);
  res.status(201).json(newLocation);
}

module.exports = { getLocations, createLocation };
