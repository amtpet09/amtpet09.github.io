require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL || "";

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

async function dbQuery(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return pool.query(text, params);
}

/* =========================
   DATABASE
========================= */

async function initializeDatabase() {
  if (!pool) {
    console.log("DATABASE_URL not configured. Database initialization skipped.");
    return;
  }

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS pioneers (
      id BIGSERIAL PRIMARY KEY,
      pi_uid TEXT UNIQUE NOT NULL,
      username TEXT,
      wallet_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS pets_catalog (
      id BIGSERIAL PRIMARY KEY,
      pet_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      element TEXT NOT NULL,
      rarity TEXT NOT NULL DEFAULT 'Common',
      image TEXT NOT NULL,
      base_hp INTEGER NOT NULL DEFAULT 100,
      base_atk INTEGER NOT NULL DEFAULT 10,
      base_def INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS user_pets (
      id BIGSERIAL PRIMARY KEY,
      pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
      pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),
      rarity TEXT NOT NULL DEFAULT 'Common',
      level INTEGER NOT NULL DEFAULT 1,
      xp BIGINT NOT NULL DEFAULT 0,
      hp INTEGER NOT NULL DEFAULT 100,
      atk INTEGER NOT NULL DEFAULT 10,
      def INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_user_pets_pioneer
    ON user_pets(pioneer_id);
  `);

  console.log("AMT Pet Marketplace database ready.");
}

/* =========================
   HEALTH
========================= */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "AMT Pet Marketplace",
    version: "1.0.0",
    network: "Pi Testnet",
    status: "online"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "amt-pet-marketplace",
    databaseConfigured: !!DATABASE_URL,
    timestamp: new Date().toISOString()
  });
});

/* =========================
   PET CATALOG
========================= */

app.get("/api/pets", async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT
        pet_code,
        name,
        element,
        rarity,
        image,
        base_hp,
        base_atk,
        base_def
      FROM pets_catalog
      ORDER BY element, pet_code
    `);

    res.json({
      ok: true,
      pets: result.rows
    });

  } catch (error) {
    console.error("GET /api/pets:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to load pet catalog."
    });
  }
});

/* =========================
   CREATE / UPDATE PIONEER
========================= */

app.post("/api/pioneers", async (req, res) => {
  try {
    const {
      pi_uid,
      username,
      wallet_address
    } = req.body;

    if (!pi_uid) {
      return res.status(400).json({
        ok: false,
        error: "pi_uid is required."
      });
    }

    const result = await dbQuery(`
      INSERT INTO pioneers (
        pi_uid,
        username,
        wallet_address
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (pi_uid)
      DO UPDATE SET
        username = COALESCE(EXCLUDED.username, pioneers.username),
        wallet_address = COALESCE(EXCLUDED.wallet_address, pioneers.wallet_address),
        updated_at = NOW()
      RETURNING id, pi_uid, username, wallet_address;
    `, [
      pi_uid,
      username || null,
      wallet_address || null
    ]);

    res.json({
      ok: true,
      pioneer: result.rows[0]
    });

  } catch (error) {
    console.error("POST /api/pioneers:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to save Pioneer."
    });
  }
});

/* =========================
   PIONEER PETS
========================= */

app.get("/api/my-pets/:pi_uid", async (req, res) => {
  try {
    const { pi_uid } = req.params;

    const result = await dbQuery(`
      SELECT
        up.id,
        up.pet_code,
        pc.name,
        pc.element,
        up.rarity,
        up.level,
        up.xp,
        up.hp,
        up.atk,
        up.def,
        pc.image
      FROM user_pets up
      INNER JOIN pioneers p
        ON p.id = up.pioneer_id
      INNER JOIN pets_catalog pc
        ON pc.pet_code = up.pet_code
      WHERE p.pi_uid = $1
      ORDER BY up.created_at DESC
    `, [pi_uid]);

    res.json({
      ok: true,
      pets: result.rows
    });

  } catch (error) {
    console.error("GET /api/my-pets:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to load Pioneer pets."
    });
  }
});

/* =========================
   START SERVER
========================= */

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log("--------------------------------------");
      console.log("AMT PET MARKETPLACE");
      console.log(`Server running on port ${PORT}`);
      console.log("--------------------------------------");
    });

  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

startServer();