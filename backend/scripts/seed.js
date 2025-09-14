// Script semplice per inserire dati di esempio usando pg
// Eseguire dentro il container oppure localmente impostando DATABASE_URL
const { Client } = require('pg');
require('dotenv').config();


(async () => {
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
await client.query("INSERT INTO \"Users\" (name,email,password,role) VALUES ('Manager','manager@cw.test','not_hashed','manager') ON CONFLICT DO NOTHING");
await client.query("INSERT INTO \"Locations\" (name,city,address) VALUES ('CoWork Milano','Milano','Via Roma 1') ON CONFLICT DO NOTHING");
await client.query("INSERT INTO \"Spaces\" (location_id,name,type,capacity,price_per_hour) VALUES (1,'Sala 1','meeting',6,30.00) ON CONFLICT DO NOTHING");
console.log('Seed completato');
} catch (e) {
console.error(e);
} finally {
await client.end();
}
})();