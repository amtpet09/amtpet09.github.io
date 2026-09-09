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

/* =========================================================
   DATABASE
========================================================= */

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  pool.on("error", (err) => {
    console.error("PostgreSQL pool error:", err);
  });
}

async function dbQuery(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return await pool.query(text, params);
}

/* =========================================================
   70 COMMON PETS
========================================================= */

const PET_SEED = [

  /* ================= EARTH ================= */

  {
    code: "earth-01",
    name: "Terrax",
    element: "Earth",
    image: "terrax.png",
    hp: 120,
    atk: 20,
    def: 22
  },
  {
    code: "earth-02",
    name: "Rockhorn",
    element: "Earth",
    image: "rockhorn.png",
    hp: 125,
    atk: 19,
    def: 24
  },
  {
    code: "earth-03",
    name: "Stonefist",
    element: "Earth",
    image: "stonefist.png",
    hp: 130,
    atk: 22,
    def: 25
  },
  {
    code: "earth-04",
    name: "Earthdrake",
    element: "Earth",
    image: "earthdrake.png",
    hp: 128,
    atk: 23,
    def: 23
  },
  {
    code: "earth-05",
    name: "Boulderlynx",
    element: "Earth",
    image: "boulderlynx.png",
    hp: 118,
    atk: 24,
    def: 20
  },
  {
    code: "earth-06",
    name: "Terrapin",
    element: "Earth",
    image: "terrapin.png",
    hp: 140,
    atk: 16,
    def: 28
  },
  {
    code: "earth-07",
    name: "Gravelpaw",
    element: "Earth",
    image: "gravelpaw.png",
    hp: 115,
    atk: 21,
    def: 21
  },
  {
    code: "earth-08",
    name: "Pebblix",
    element: "Earth",
    image: "pebblix.png",
    hp: 110,
    atk: 18,
    def: 20
  },
  {
    code: "earth-09",
    name: "Mountainhoof",
    element: "Earth",
    image: "mountainhoof.png",
    hp: 145,
    atk: 18,
    def: 30
  },
  {
    code: "earth-10",
    name: "Terroscale",
    element: "Earth",
    image: "terroscale.png",
    hp: 135,
    atk: 25,
    def: 24
  },

  /* ================= WATER ================= */

  {
    code: "water-01",
    name: "Aqualis",
    element: "Water",
    image: "aqualis.png",
    hp: 110,
    atk: 23,
    def: 18
  },
  {
    code: "water-02",
    name: "Tideback",
    element: "Water",
    image: "tideback.png",
    hp: 135,
    atk: 18,
    def: 27
  },
  {
    code: "water-03",
    name: "Oceanix",
    element: "Water",
    image: "oceanix.png",
    hp: 125,
    atk: 24,
    def: 20
  },
  {
    code: "water-04",
    name: "Neptunox",
    element: "Water",
    image: "neptunox.png",
    hp: 130,
    atk: 27,
    def: 21
  },
  {
    code: "water-05",
    name: "Jellyfin",
    element: "Water",
    image: "jellyfin.png",
    hp: 105,
    atk: 19,
    def: 19
  },
  {
    code: "water-06",
    name: "Sharky",
    element: "Water",
    image: "sharky.png",
    hp: 120,
    atk: 29,
    def: 17
  },
  {
    code: "water-07",
    name: "Seapony",
    element: "Water",
    image: "seapony.png",
    hp: 115,
    atk: 22,
    def: 21
  },
  {
    code: "water-08",
    name: "Krakenling",
    element: "Water",
    image: "krakenling.png",
    hp: 140,
    atk: 26,
    def: 23
  },
  {
    code: "water-09",
    name: "Riptide",
    element: "Water",
    image: "riptide.png",
    hp: 118,
    atk: 30,
    def: 18
  },
  {
    code: "water-10",
    name: "Abyssal",
    element: "Water",
    image: "abyssal.png",
    hp: 145,
    atk: 28,
    def: 25
  },

  /* ================= NATURE ================= */

  {
    code: "nature-01",
    name: "Leaflyn",
    element: "Nature",
    image: "leaflyn.png",
    hp: 115,
    atk: 20,
    def: 22
  },
  {
    code: "nature-02",
    name: "Treetle",
    element: "Nature",
    image: "treetle.png",
    hp: 130,
    atk: 18,
    def: 27
  },
  {
    code: "nature-03",
    name: "Sylvann",
    element: "Nature",
    image: "sylvann.png",
    hp: 120,
    atk: 25,
    def: 20
  },
  {
    code: "nature-04",
    name: "Verdira",
    element: "Nature",
    image: "verdira.png",
    hp: 118,
    atk: 23,
    def: 23
  },
  {
    code: "nature-05",
    name: "Bloomtail",
    element: "Nature",
    image: "bloomtail.png",
    hp: 112,
    atk: 21,
    def: 22
  },
  {
    code: "nature-06",
    name: "Groveon",
    element: "Nature",
    image: "groveon.png",
    hp: 128,
    atk: 22,
    def: 25
  },
  {
    code: "nature-07",
    name: "Nutty",
    element: "Nature",
    image: "nutty.png",
    hp: 108,
    atk: 19,
    def: 20
  },
  {
    code: "nature-08",
    name: "Flora",
    element: "Nature",
    image: "flora.png",
    hp: 110,
    atk: 26,
    def: 19
  },
  {
    code: "nature-09",
    name: "Forestfang",
    element: "Nature",
    image: "forestfang.png",
    hp: 125,
    atk: 28,
    def: 21
  },
  {
    code: "nature-10",
    name: "Everbloom",
    element: "Nature",
    image: "everbloom.png",
    hp: 138,
    atk: 25,
    def: 26
  },

  /* ================= ICE ================= */

  {
    code: "ice-01",
    name: "Frostbite",
    element: "Ice",
    image: "frostbite.png",
    hp: 115,
    atk: 24,
    def: 21
  },
  {
    code: "ice-02",
    name: "Glaciard",
    element: "Ice",
    image: "glaciard.png",
    hp: 130,
    atk: 20,
    def: 27
  },
  {
    code: "ice-03",
    name: "Snowwing",
    element: "Ice",
    image: "snowwing.png",
    hp: 108,
    atk: 27,
    def: 18
  },
  {
    code: "ice-04",
    name: "Frostdrake",
    element: "Ice",
    image: "frostdrake.png",
    hp: 135,
    atk: 28,
    def: 24
  },
  {
    code: "ice-05",
    name: "Chillpengu",
    element: "Ice",
    image: "chillpengu.png",
    hp: 105,
    atk: 19,
    def: 20
  },
  {
    code: "ice-06",
    name: "Frostwolf",
    element: "Ice",
    image: "frostwolf.png",
    hp: 125,
    atk: 30,
    def: 21
  },
  {
    code: "ice-07",
    name: "Icetusk",
    element: "Ice",
    image: "icetusk.png",
    hp: 142,
    atk: 22,
    def: 29
  },
  {
    code: "ice-08",
    name: "Frostseal",
    element: "Ice",
    image: "frostseal.png",
    hp: 120,
    atk: 21,
    def: 25
  },
  {
    code: "ice-09",
    name: "Glacieron",
    element: "Ice",
    image: "glacieron.png",
    hp: 132,
    atk: 26,
    def: 26
  },
  {
    code: "ice-10",
    name: "Frostbear",
    element: "Ice",
    image: "frostbear.png",
    hp: 150,
    atk: 24,
    def: 31
  },

  /* ================= FIRE ================= */

  {
    code: "fire-01",
    name: "Flammy",
    element: "Fire",
    image: "flammy.png",
    hp: 108,
    atk: 27,
    def: 17
  },
  {
    code: "fire-02",
    name: "Pyroclaw",
    element: "Fire",
    image: "pyroclaw.png",
    hp: 115,
    atk: 30,
    def: 18
  },
  {
    code: "fire-03",
    name: "Blazewing",
    element: "Fire",
    image: "blazewing.png",
    hp: 110,
    atk: 32,
    def: 17
  },
  {
    code: "fire-04",
    name: "Infernox",
    element: "Fire",
    image: "infernox.png",
    hp: 128,
    atk: 31,
    def: 21
  },
  {
    code: "fire-05",
    name: "Phoenixia",
    element: "Fire",
    image: "phoenixia.png",
    hp: 125,
    atk: 34,
    def: 20
  },
  {
    code: "fire-06",
    name: "Magmortar",
    element: "Fire",
    image: "magmortar.png",
    hp: 145,
    atk: 28,
    def: 28
  },
  {
    code: "fire-07",
    name: "Salamorra",
    element: "Fire",
    image: "salamorra.png",
    hp: 130,
    atk: 33,
    def: 23
  },
  {
    code: "fire-08",
    name: "Emberhorn",
    element: "Fire",
    image: "emberhorn.png",
    hp: 120,
    atk: 29,
    def: 22
  },
  {
    code: "fire-09",
    name: "Flamefang",
    element: "Fire",
    image: "flamefang.png",
    hp: 118,
    atk: 35,
    def: 19
  },
  {
    code: "fire-10",
    name: "Pyromite",
    element: "Fire",
    image: "pyromite.png",
    hp: 135,
    atk: 32,
    def: 25
  },

  /* ================= WIND ================= */

  {
    code: "wind-01",
    name: "Zephyrin",
    element: "Wind",
    image: "zephyrin.png",
    hp: 105,
    atk: 25,
    def: 18
  },
  {
    code: "wind-02",
    name: "Skyflare",
    element: "Wind",
    image: "skyflare.png",
    hp: 110,
    atk: 29,
    def: 17
  },
  {
    code: "wind-03",
    name: "Windrake",
    element: "Wind",
    image: "windrake.png",
    hp: 125,
    atk: 30,
    def: 21
  },
  {
    code: "wind-04",
    name: "Aerolith",
    element: "Wind",
    image: "aerolith.png",
    hp: 115,
    atk: 26,
    def: 22
  },
  {
    code: "wind-05",
    name: "Skywhisp",
    element: "Wind",
    image: "skywhisp.png",
    hp: 100,
    atk: 24,
    def: 16
  },
  {
    code: "wind-06",
    name: "Stormtalon",
    element: "Wind",
    image: "stormtalon.png",
    hp: 120,
    atk: 34,
    def: 19
  },
  {
    code: "wind-07",
    name: "Cloudstride",
    element: "Wind",
    image: "cloudstride.png",
    hp: 112,
    atk: 28,
    def: 20
  },
  {
    code: "wind-08",
    name: "Breezeling",
    element: "Wind",
    image: "breezeling.png",
    hp: 102,
    atk: 23,
    def: 18
  },
  {
    code: "wind-09",
    name: "Tornadope",
    element: "Wind",
    image: "tornadope.png",
    hp: 118,
    atk: 33,
    def: 18
  },
  {
    code: "wind-10",
    name: "Zephyria",
    element: "Wind",
    image: "zephyria.png",
    hp: 130,
    atk: 31,
    def: 23
  },

  /* ================= THUNDER ================= */

  {
    code: "thunder-01",
    name: "Voltix",
    element: "Thunder",
    image: "voltix.png",
    hp: 110,
    atk: 30,
    def: 18
  },
  {
    code: "thunder-02",
    name: "Zephron",
    element: "Thunder",
    image: "zephron.png",
    hp: 115,
    atk: 28,
    def: 19
  },
  {
    code: "thunder-03",
    name: "Stormee",
    element: "Thunder",
    image: "stormee.png",
    hp: 108,
    atk: 32,
    def: 17
  },
  {
    code: "thunder-04",
    name: "Thunderdrake",
    element: "Thunder",
    image: "thunderdrake.png",
    hp: 130,
    atk: 35,
    def: 23
  },
  {
    code: "thunder-05",
    name: "Sparkster",
    element: "Thunder",
    image: "sparkster.png",
    hp: 105,
    atk: 29,
    def: 18
  },
  {
    code: "thunder-06",
    name: "Raihorn",
    element: "Thunder",
    image: "raihorn.png",
    hp: 140,
    atk: 27,
    def: 30
  },
  {
    code: "thunder-07",
    name: "Voltlynx",
    element: "Thunder",
    image: "voltlynx.png",
    hp: 118,
    atk: 34,
    def: 20
  },
  {
    code: "thunder-08",
    name: "Electrix",
    element: "Thunder",
    image: "electrix.png",
    hp: 112,
    atk: 31,
    def: 19
  },
  {
    code: "thunder-09",
    name: "Skyshock",
    element: "Thunder",
    image: "skyshock.png",
    hp: 120,
    atk: 36,
    def: 18
  },
  {
    code: "thunder-10",
    name: "Thunderix",
    element: "Thunder",
    image: "thunderix.png",
    hp: 135,
    atk: 38,
    def: 24
  }
];

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {

  if (!pool) {
    console.log("DATABASE_URL is not configured.");
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
      pioneer_id BIGINT NOT NULL
        REFERENCES pioneers(id)
        ON DELETE CASCADE,

      pet_code TEXT NOT NULL
        REFERENCES pets_catalog(pet_code),

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
    CREATE INDEX IF NOT EXISTS idx_pets_catalog_element
    ON pets_catalog(element);
  `);

  await dbQuery(`
    CREATE INDEX IF NOT EXISTS idx_user_pets_pioneer
    ON user_pets(pioneer_id);
  `);

  console.log("Database tables ready.");
}

/* =========================================================
   SEED PET CATALOG
========================================================= */

async function seedPetCatalog() {

  if (!pool) {
    return;
  }

  for (const pet of PET_SEED) {

    await dbQuery(`
      INSERT INTO pets_catalog (
        pet_code,
        name,
        element,
        rarity,
        image,
        base_hp,
        base_atk,
        base_def
      )
      VALUES (
        $1,
        $2,
        $3,
        'Common',
        $4,
        $5,
        $6,
        $7
      )
      ON CONFLICT (pet_code)
      DO UPDATE SET
        name = EXCLUDED.name,
        element = EXCLUDED.element,
        rarity = EXCLUDED.rarity,
        image = EXCLUDED.image,
        base_hp = EXCLUDED.base_hp,
        base_atk = EXCLUDED.base_atk,
        base_def = EXCLUDED.base_def
    `, [
      pet.code,
      pet.name,
      pet.element,
      pet.image,
      pet.hp,
      pet.atk,
      pet.def
    ]);
  }

  console.log(`Pet catalog ready: ${PET_SEED.length} pets.`);
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/", (req, res) => {

  res.json({
    ok: true,
    app: "AMT Pet Marketplace",
    version: "1.0.0",
    network: "Pi Testnet",
    status: "online"
  });

});

app.get("/api/health", async (req, res) => {

  let database = false;

  if (pool) {

    try {
      await dbQuery("SELECT 1");
      database = true;
    } catch (error) {
      database = false;
    }

  }

  res.json({
    ok: true,
    service: "amt-pet-marketplace",
    databaseConfigured: !!DATABASE_URL,
    databaseConnected: database,
    petCount: PET_SEED.length,
    timestamp: new Date().toISOString()
  });

});

/* =========================================================
   PET CATALOG
========================================================= */

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
      ORDER BY
        CASE element
          WHEN 'Earth' THEN 1
          WHEN 'Water' THEN 2
          WHEN 'Nature' THEN 3
          WHEN 'Ice' THEN 4
          WHEN 'Fire' THEN 5
          WHEN 'Wind' THEN 6
          WHEN 'Thunder' THEN 7
          ELSE 99
        END,
        pet_code
    `);

    res.json({
      ok: true,
      count: result.rows.length,
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

/* =========================================================
   PETS BY ELEMENT
========================================================= */

app.get("/api/pets/element/:element", async (req, res) => {

  try {

    const element = req.params.element;

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
      WHERE LOWER(element) = LOWER($1)
      ORDER BY pet_code
    `, [element]);

    res.json({
      ok: true,
      element,
      count: result.rows.length,
      pets: result.rows
    });

  } catch (error) {

    console.error("GET /api/pets/element:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to load pets."
    });

  }

});

/* =========================================================
   GET SINGLE PET
========================================================= */

app.get("/api/pets/:petCode", async (req, res) => {

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
      WHERE pet_code = $1
      LIMIT 1
    `, [req.params.petCode]);

    if (result.rows.length === 0) {

      return res.status(404).json({
        ok: false,
        error: "Pet not found."
      });

    }

    res.json({
      ok: true,
      pet: result.rows[0]
    });

  } catch (error) {

    console.error("GET /api/pets/:petCode:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to load pet."
    });

  }

});

/* =========================================================
   CREATE / UPDATE PIONEER
========================================================= */

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
        username =
          COALESCE(EXCLUDED.username, pioneers.username),

        wallet_address =
          COALESCE(EXCLUDED.wallet_address, pioneers.wallet_address),

        updated_at = NOW()

      RETURNING
        id,
        pi_uid,
        username,
        wallet_address,
        created_at,
        updated_at
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

/* =========================================================
   GET PIONEER
========================================================= */

app.get("/api/pioneers/:pi_uid", async (req, res) => {

  try {

    const result = await dbQuery(`
      SELECT
        id,
        pi_uid,
        username,
        wallet_address,
        created_at,
        updated_at
      FROM pioneers
      WHERE pi_uid = $1
      LIMIT 1
    `, [req.params.pi_uid]);

    if (result.rows.length === 0) {

      return res.status(404).json({
        ok: false,
        error: "Pioneer not found."
      });

    }

    res.json({
      ok: true,
      pioneer: result.rows[0]
    });

  } catch (error) {

    console.error("GET /api/pioneers:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to load Pioneer."
    });

  }

});

/* =========================================================
   MY PETS
========================================================= */

app.get("/api/my-pets/:pi_uid", async (req, res) => {

  try {

    const result = await dbQuery(`
      SELECT
        up.id,
        up.pet_code,

        pc.name,
        pc.element,
        pc.image,

        up.rarity,
        up.level,
        up.xp,

        up.hp,
        up.atk,
        up.def,

        up.created_at,
        up.updated_at

      FROM user_pets up

      INNER JOIN pioneers p
        ON p.id = up.pioneer_id

      INNER JOIN pets_catalog pc
        ON pc.pet_code = up.pet_code

      WHERE p.pi_uid = $1

      ORDER BY up.created_at DESC
    `, [req.params.pi_uid]);

    res.json({
      ok: true,
      count: result.rows.length,
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

/* =========================================================
   TEST: GIVE PET TO PIONEER
   Development endpoint only.
========================================================= */

app.post("/api/dev/give-pet", async (req, res) => {

  try {

    const {
      pi_uid,
      pet_code,
      username,
      wallet_address
    } = req.body;

    if (!pi_uid || !pet_code) {

      return res.status(400).json({
        ok: false,
        error: "pi_uid and pet_code are required."
      });

    }

    const petResult = await dbQuery(`
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
      WHERE pet_code = $1
      LIMIT 1
    `, [pet_code]);

    if (petResult.rows.length === 0) {

      return res.status(404).json({
        ok: false,
        error: "Pet not found."
      });

    }

    const pioneerResult = await dbQuery(`
      INSERT INTO pioneers (
        pi_uid,
        username,
        wallet_address
      )
      VALUES ($1, $2, $3)

      ON CONFLICT (pi_uid)

      DO UPDATE SET
        username =
          COALESCE(EXCLUDED.username, pioneers.username),

        wallet_address =
          COALESCE(EXCLUDED.wallet_address, pioneers.wallet_address),

        updated_at = NOW()

      RETURNING id
    `, [
      pi_uid,
      username || null,
      wallet_address || null
    ]);

    const pioneerId = pioneerResult.rows[0].id;
    const pet = petResult.rows[0];

    const userPetResult = await dbQuery(`
      INSERT INTO user_pets (
        pioneer_id,
        pet_code,
        rarity,
        level,
        xp,
        hp,
        atk,
        def
      )
      VALUES (
        $1,
        $2,
        'Common',
        1,
        0,
        $3,
        $4,
        $5
      )

      RETURNING *
    `, [
      pioneerId,
      pet.pet_code,
      pet.base_hp,
      pet.base_atk,
      pet.base_def
    ]);

    res.json({
      ok: true,
      message: "Pet added to Pioneer collection.",
      pet: userPetResult.rows[0]
    });

  } catch (error) {

    console.error("POST /api/dev/give-pet:", error);

    res.status(500).json({
      ok: false,
      error: "Unable to give pet."
    });

  }

});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {

  res.status(404).json({
    ok: false,
    error: "Endpoint not found."
  });

});

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {

  try {

    await initializeDatabase();

    await seedPetCatalog();

    app.listen(PORT, () => {

      console.log("======================================");
      console.log("       AMT PET MARKETPLACE");
      console.log("======================================");
      console.log(`Server running on port ${PORT}`);
      console.log(`Database configured: ${!!DATABASE_URL}`);
      console.log(`Pet catalog: ${PET_SEED.length} pets`);
      console.log("Network: Pi Testnet");
      console.log("======================================");

    });

  } catch (error) {

    console.error("SERVER STARTUP ERROR:");
    console.error(error);

    process.exit(1);
  }
}

startServer();