const { applySecurity } = require('./middleware/security');
// backend/src/index.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { ensureSchema } = require("./db/init");
const { resetSequences } = require("./db/resetSequences");

const app = express();
app.use(cors());
app.use(helmet());
app.use((req,res,next)=>{ if (req.path === "/api/payments/webhook") return next(); express.json()(req,res,next); });

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Monta rotte (se presenti)
try { app.use("/api/auth", require("./routes/auth")); } catch {}
try { app.use("/api/admin", require("./routes/admin")); } catch {}
try { app.use("/api", require("./routes/payments")); } catch {}
try { app.use("/api/spaces", require("./routes/spaces")); } catch {}
try { app.use("/api/bookings", require("./routes/bookings")); } catch {}
try { app.use("/api/locations", require("./routes/locations")); } catch {}
try { app.use("/api/manager", require("./routes/manager")); } catch {}
try { app.use("/api/admin/wizard", require("./routes/adminWizard")); } catch {}


// Back-compat non-API alias
try { app.use("/spaces", require("./routes/spaces")); } catch {}
// 404 API
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Endpoint non trovato", path: req.path });
});

// Error handler esplicito per vedere l’errore reale nel log
app.use((err, _req, res, _next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({ message: "Errore server", detail: err?.message });
});

const PORT = Number(process.env.PORT || 3001);

(async () => {
  try {
    await ensureSchema();              // <<=== crea tabelle se mancano
    await resetSequences();           // <<=== riallinea sequence id
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Backend listening on http://0.0.0.0:${PORT}`);
    });
  } catch (e) {
    console.error("Fatal on startup:", e);
    process.exit(1);
  }
})();
