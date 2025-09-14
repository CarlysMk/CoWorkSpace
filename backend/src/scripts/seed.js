const { Client } = require("pg");
require("dotenv").config();

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`INSERT INTO "Users"(email,password_hash,role)
      VALUES ('manager@cowork.it', '$2a$10$replaceWithHash', 'manager')
      ON CONFLICT (email) DO NOTHING`);

    await client.query(`INSERT INTO "Locations"(name,city,address,services)
      VALUES ('CoWork Milano','Milano','Via Roma 1','{"wifi":true,"caffè":true}')
      ON CONFLICT DO NOTHING`);

    await client.query(`INSERT INTO "Spaces"(location_id,name,type,capacity,price_per_hour)
      VALUES (1,'Sala 1','meeting',6,30.00)
      ON CONFLICT DO NOTHING`);

    
    // --- DEMO DATA: più locations e spazi ---
    await client.query(`
      INSERT INTO "Locations"(name,city,address,services) VALUES
      ('CoWork Milano Centrale','Milano','Via Torino 12','["wifi","coffee","printer","meeting-rooms"]'::jsonb),
      ('CoWork Garibaldi','Milano','Piazza Gae Aulenti 1','["wifi","coffee","phone-booths"]'::jsonb),
      ('CoWork Navigli','Milano','Alzaia Naviglio Grande 42','["wifi","bike-parking","meeting-rooms"]'::jsonb),
      ('CoWork Roma Centro','Roma','Via del Corso 88','["wifi","coffee","lockers","meeting-rooms"]'::jsonb),
      ('CoWork EUR','Roma','Viale Europa 2','["wifi","parking","meeting-rooms"]'::jsonb)
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO "Spaces"(location_id,name,type,capacity,price_per_hour) VALUES
      (1,'Sala Rubino','meeting',8,22.00),
      (1,'Sala Smeraldo','meeting',12,35.00),
      (1,'Desk A1','desk',1,6.00),
      (2,'Sala Skyline','meeting',10,30.00),
      (2,'Phone Booth 1','phone',1,4.00),
      (3,'Sala Navigli','meeting',6,18.00),
      (3,'Desk N12','desk',1,5.00),
      (4,'Sala Colosseo','meeting',14,40.00),
      (4,'Desk R21','desk',1,7.00),
      (5,'Sala EUR','meeting',10,28.00)
      ON CONFLICT DO NOTHING;
    `);

    
// --- DEMO DATA: 10+ locations ---
await client.query(`
  INSERT INTO "Locations"(name,city,address,services) VALUES
  ('CoWork Milano Centrale','Milano','Via Torino 12','["wifi","coffee","printer","meeting-rooms"]'::jsonb),
  ('CoWork Garibaldi','Milano','Piazza Gae Aulenti 1','["wifi","coffee","phone-booths"]'::jsonb),
  ('CoWork Navigli','Milano','Alzaia Naviglio Grande 42','["wifi","bike-parking","meeting-rooms"]'::jsonb),
  ('CoWork Bicocca','Milano','Viale Sarca 202','["wifi","parking","printer"]'::jsonb),
  ('CoWork Porta Romana','Milano','Corso Lodi 15','["wifi","coffee","lockers"]'::jsonb),
  ('CoWork Roma Centro','Roma','Via del Corso 88','["wifi","coffee","lockers","meeting-rooms"]'::jsonb),
  ('CoWork EUR','Roma','Viale Europa 2','["wifi","parking","meeting-rooms"]'::jsonb),
  ('CoWork Torino Centro','Torino','Via Garibaldi 5','["wifi","bike-parking","printer"]'::jsonb),
  ('CoWork Bologna Fiera','Bologna','Viale Aldo Moro 10','["wifi","parking","meeting-rooms"]'::jsonb),
  ('CoWork Firenze Duomo','Firenze','Via dei Calzaiuoli 3','["wifi","coffee","phone-booths"]'::jsonb),
  ('CoWork Napoli Centro','Napoli','Via Toledo 50','["wifi","coffee","meeting-rooms"]'::jsonb)
  ON CONFLICT DO NOTHING;
`);

await client.query(`
  INSERT INTO "Spaces"(location_id,name,type,capacity,price_per_hour) VALUES
  (1,'Sala Rubino','meeting',8,22.00),
  (1,'Sala Smeraldo','meeting',12,35.00),
  (1,'Desk A1','desk',1,6.00),
  (2,'Sala Skyline','meeting',10,30.00),
  (2,'Phone Booth 1','phone',1,4.00),
  (3,'Sala Navigli','meeting',6,18.00),
  (3,'Desk N12','desk',1,5.00),
  (4,'Sala Bicocca','meeting',10,24.00),
  (5,'Sala Romana','meeting',6,20.00),
  (6,'Sala Colosseo','meeting',14,40.00),
  (7,'Sala EUR','meeting',10,28.00),
  (8,'Sala Mole','meeting',8,22.00),
  (9,'Sala Fiera','meeting',12,32.00),
  (10,'Sala Duomo','meeting',8,26.00),
  (11,'Sala Partenope','meeting',10,25.00)
  ON CONFLICT DO NOTHING;
`);

    
// --- DEMO DATA: molte locations con vie diverse ---
await client.query(`
  INSERT INTO "Locations"(name,city,address,services) VALUES
  ('CoWork Duomo','Milano','Via Dante 14','["wifi","coffee","printer","meeting-rooms"]'::jsonb),
  ('CoWork Brera','Milano','Via Solferino 21','["wifi","coffee","lockers"]'::jsonb),
  ('CoWork Isola','Milano','Piazza Archinto 3','["wifi","bike-parking","meeting-rooms"]'::jsonb),
  ('CoWork Garibaldi','Milano','Corso Como 7','["wifi","phone-booths","printer"]'::jsonb),
  ('CoWork Navigli','Milano','Ripa di Porta Ticinese 18','["wifi","coffee","meeting-rooms"]'::jsonb),
  ('CoWork Parioli','Roma','Viale Bruno Buozzi 8','["wifi","parking","printer"]'::jsonb),
  ('CoWork Trastevere','Roma','Via della Lungaretta 40','["wifi","coffee","phone-booths"]'::jsonb),
  ('CoWork EUR','Roma','Viale Europa 90','["wifi","parking","meeting-rooms"]'::jsonb),
  ('CoWork Quadrilatero','Torino','Via Lagrange 24','["wifi","coffee","lockers"]'::jsonb),
  ('CoWork San Salvario','Torino','Via Baretti 12','["wifi","bike-parking","meeting-rooms"]'::jsonb),
  ('CoWork Fiera','Bologna','Viale della Fiera 20','["wifi","parking","meeting-rooms"]'::jsonb),
  ('CoWork Pratello','Bologna','Via del Pratello 36','["wifi","coffee","printer"]'::jsonb),
  ('CoWork Santa Croce','Firenze','Via de’ Benci 5','["wifi","coffee","phone-booths"]'::jsonb),
  ('CoWork Novoli','Firenze','Viale Guidoni 17','["wifi","parking","meeting-rooms"]'::jsonb),
  ('CoWork Chiaia','Napoli','Via Chiaia 52','["wifi","coffee","printer"]'::jsonb)
  ON CONFLICT DO NOTHING;
`);

await client.query(`
  INSERT INTO "Spaces"(location_id,name,type,capacity,price_per_hour) VALUES
  (1,'Sala Castello','meeting',8,24.00),
  (1,'Desk D1','desk',1,6.00),
  (2,'Sala Brera','meeting',10,28.00),
  (3,'Sala Isola','meeting',6,20.00),
  (4,'Sala Como','meeting',12,32.00),
  (5,'Sala Navigli','meeting',8,22.00),
  (6,'Sala Parioli','meeting',10,30.00),
  (7,'Sala Trastevere','meeting',6,18.00),
  (8,'Sala Eur','meeting',12,30.00),
  (9,'Sala Quadrilatero','meeting',8,23.00),
  (10,'Sala Salvario','meeting',6,19.00),
  (11,'Sala Fiera','meeting',12,33.00),
  (12,'Sala Pratello','meeting',6,18.00),
  (13,'Sala Croce','meeting',8,25.00),
  (14,'Sala Novoli','meeting',10,27.00),
  (15,'Sala Chiaia','meeting',8,24.00)
  ON CONFLICT DO NOTHING;
`);

    console.log("✅ Seed completato");
  } catch (e) {
    console.error("Seed error:", e);
  } finally {
    await client.end();
  }
})();
