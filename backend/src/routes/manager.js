const express = require("express");
const { Client } = require("pg");
require("dotenv").config();

const router = express.Router();
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });

router.get("/report", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const { rows } = await db.query(`
      SELECT l.name AS location,
             s.name AS space,
             COUNT(b.id) AS bookings,
             COALESCE(SUM(
               CASE WHEN b.payment_status='paid'
                    THEN EXTRACT(EPOCH FROM (b.end_ts - b.start_ts))/3600 * s.price_per_hour
                    ELSE 0 END
             ),0) AS revenue
      FROM "Spaces" s
      JOIN "Locations" l ON l.id = s.location_id
      LEFT JOIN "Bookings" b ON b.space_id = s.id
      GROUP BY l.name, s.name
      ORDER BY l.name, s.name
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Errore report", detail: e.message });
  } finally {
    await db.end();
  }
});

module.exports = router;
