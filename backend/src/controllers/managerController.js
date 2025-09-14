// backend/src/controllers/managerController.js

// Mock temporaneo per test
let managers = [
  { id: 1, name: "Mario Rossi", role: "Admin" },
  { id: 2, name: "Luca Bianchi", role: "Manager" }
];

// Restituisce la lista dei manager
function getManagers(req, res) {
  res.json(managers);
}

// Crea un nuovo manager
function createManager(req, res) {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ message: "Nome e ruolo obbligatori" });
  }
  const newManager = { id: managers.length + 1, name, role };
  managers.push(newManager);
  res.status(201).json(newManager);
}

module.exports = { getManagers, createManager };
