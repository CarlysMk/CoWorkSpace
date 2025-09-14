// backend/src/db/resetSequences.js
const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";

function client() {
  return new Client({ connectionString: DATABASE_URL });
}

/**
 * Riallinea le sequence degli id alle tabelle principali.
 * Usa nomi con schema e identifier quoting per i nomi mixed-case.
 */
async function resetSequences() {
  const db = client();
  await db.connect();
  try {
    await db.query("BEGIN");
    const targets = [
      { tbl: '"Users"',     schema: 'public', col: 'id' },
      { tbl: '"Locations"', schema: 'public', col: 'id' },
      { tbl: '"Spaces"',    schema: 'public', col: 'id' },
      { tbl: '"Bookings"',  schema: 'public', col: 'id' },
    ];

    for (const t of targets) {
      const rel = `${t.schema}."${t.tbl.replace(/(^\"|\"$)/g,'').replace(/\"/g,'')}"`;
      // pg_get_serial_sequence richiede il nome come testo, includendo schema ed eventuali doppi apici per i mixed-case
      const seqSql = `SELECT setval(pg_get_serial_sequence('${rel}', '${t.col}'),
                                    COALESCE((SELECT MAX(${t.col}) FROM ${t.tbl}), 0));`;
      await db.query(seqSql);
    }

    await db.query("COMMIT");
    console.log("🔧 Sequences realigned");
  } catch (e) {
    await db.query("ROLLBACK");
    console.warn("⚠️  Could not reset sequences:", e.message);
  } finally {
    await db.end();
  }
}

module.exports = { resetSequences };
