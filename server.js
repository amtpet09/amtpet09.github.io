require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

const DATABASE_URL = process.env.DATABASE_URL || "";
const PI_API_KEY = process.env.PI_API_KEY || "";
const PI_API_BASE = "https://api.minepi.com";
const PI_PAYMENT_CURRENCY = "Pi";
const PET_PI_PRICE = "10";
const PET_AMT_PRICE = "100";

const AMT_ASSET_CODE = process.env.AMT_ASSET_CODE || "AMT";
const AMT_ISSUER = process.env.AMT_ISSUER || "GCDV5VKFE4EPQFRPDDZN64RXZMH2T4EHP47PMZ7KJMILR5DQICONMFP5";
const AMT_RECEIVER =
  process.env.AMT_RECEIVER ||
  process.env.AMT_DISTRIBUTOR ||
  "GAVFYNEHSTW4P65DM75P4TYAC6PNO5A6LGSYSGEFNN3O7A23XHWABSBP";
const AMT_HORIZON_URL =
  process.env.AMT_HORIZON_URL || "https://api.testnet.minepi.com";

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "1mb" }));

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pool.on("error", err => console.error("PostgreSQL pool error:", err));
}

async function dbQuery(text, params = []) {
  if (!pool) throw new Error("DATABASE_URL is not configured.");
  return pool.query(text, params);
}

/* -------------------------------------------------------------------------- */
/* PET CATALOG - same 70 pets, compact format                                 */
/* -------------------------------------------------------------------------- */

const PET_SEED = [
  ["earth-01","Terrax","Earth","terrax.png",120,20,22],
  ["earth-02","Rockhorn","Earth","rockhorn.png",125,19,24],
  ["earth-03","Stonefist","Earth","stonefist.png",130,22,25],
  ["earth-04","Earthdrake","Earth","earthdrake.png",128,23,23],
  ["earth-05","Boulderlynx","Earth","boulderlynx.png",118,24,20],
  ["earth-06","Terrapin","Earth","terrapin.png",140,16,28],
  ["earth-07","Gravelpaw","Earth","gravelpaw.png",115,21,21],
  ["earth-08","Pebblix","Earth","pebblix.png",110,18,20],
  ["earth-09","Mountainhoof","Earth","mountainhoof.png",145,18,30],
  ["earth-10","Terroscale","Earth","terroscale.png",135,25,24],

  ["water-01","Aqualis","Water","aqualis.png",110,23,18],
  ["water-02","Tideback","Water","tideback.png",135,18,27],
  ["water-03","Oceanix","Water","oceanix.png",125,24,20],
  ["water-04","Neptunox","Water","neptunox.png",130,27,21],
  ["water-05","Jellyfin","Water","jellyfin.png",105,19,19],
  ["water-06","Sharky","Water","sharky.png",120,29,17],
  ["water-07","Seapony","Water","seapony.png",115,22,21],
  ["water-08","Krakenling","Water","krakenling.png",140,26,23],
  ["water-09","Riptide","Water","riptide.png",118,30,18],
  ["water-10","Abyssal","Water","abyssal.png",145,28,25],

  ["nature-01","Leaflyn","Nature","leaflyn.png",115,20,22],
  ["nature-02","Treetle","Nature","treetle.png",130,18,27],
  ["nature-03","Sylvann","Nature","sylvann.png",120,25,20],
  ["nature-04","Verdira","Nature","verdira.png",118,23,23],
  ["nature-05","Bloomtail","Nature","bloomtail.png",112,21,22],
  ["nature-06","Groveon","Nature","groveon.png",128,22,25],
  ["nature-07","Nutty","Nature","nutty.png",108,19,20],
  ["nature-08","Flora","Nature","flora.png",110,26,19],
  ["nature-09","Forestfang","Nature","forestfang.png",125,28,21],
  ["nature-10","Everbloom","Nature","everbloom.png",138,25,26],

  ["ice-01","Frostbite","Ice","frostbite.png",115,24,21],
  ["ice-02","Glaciard","Ice","glaciard.png",130,20,27],
  ["ice-03","Snowwing","Ice","snowwing.png",108,27,18],
  ["ice-04","Frostdrake","Ice","frostdrake.png",135,28,24],
  ["ice-05","Chillpengu","Ice","chillpengu.png",105,19,20],
  ["ice-06","Frostwolf","Ice","frostwolf.png",125,30,21],
  ["ice-07","Icetusk","Ice","icetusk.png",142,22,29],
  ["ice-08","Frostseal","Ice","frostseal.png",120,21,25],
  ["ice-09","Glacieron","Ice","glacieron.png",132,26,26],
  ["ice-10","Frostbear","Ice","frostbear.png",150,24,31],

  ["fire-01","Flammy","Fire","flammy.png",108,27,17],
  ["fire-02","Pyroclaw","Fire","pyroclaw.png",115,30,18],
  ["fire-03","Blazewing","Fire","blazewing.png",110,32,17],
  ["fire-04","Infernox","Fire","infernox.png",128,31,21],
  ["fire-05","Phoenixia","Fire","phoenixia.png",125,34,20],
  ["fire-06","Magmortar","Fire","magmortar.png",145,28,28],
  ["fire-07","Salamorra","Fire","salamorra.png",130,33,23],
  ["fire-08","Emberhorn","Fire","emberhorn.png",120,29,22],
  ["fire-09","Flamefang","Fire","flamefang.png",118,35,19],
  ["fire-10","Pyromite","Fire","pyromite.png",135,32,25],

  ["wind-01","Zephyrin","Wind","zephyrin.png",105,25,18],
  ["wind-02","Skyflare","Wind","skyflare.png",110,29,17],
  ["wind-03","Windrake","Wind","windrake.png",125,30,21],
  ["wind-04","Aerolith","Wind","aerolith.png",115,26,22],
  ["wind-05","Skywhisp","Wind","skywhisp.png",100,24,16],
  ["wind-06","Stormtalon","Wind","stormtalon.png",120,34,19],
  ["wind-07","Cloudstride","Wind","cloudstride.png",112,28,20],
  ["wind-08","Breezeling","Wind","breezeling.png",102,23,18],
  ["wind-09","Tornadope","Wind","tornadope.png",118,33,18],
  ["wind-10","Zephyria","Wind","zephyria.png",130,31,23],

  ["thunder-01","Voltix","Thunder","voltix.png",110,30,18],
  ["thunder-02","Zephron","Thunder","zephron.png",115,28,19],
  ["thunder-03","Stormee","Thunder","stormee.png",108,32,17],
  ["thunder-04","Thunderdrake","Thunder","thunderdrake.png",130,35,23],
  ["thunder-05","Sparkster","Thunder","sparkster.png",105,29,18],
  ["thunder-06","Raihorn","Thunder","raihorn.png",140,27,30],
  ["thunder-07","Voltlynx","Thunder","voltlynx.png",118,34,20],
  ["thunder-08","Electrix","Thunder","electrix.png",112,31,19],
  ["thunder-09","Skyshock","Thunder","skyshock.png",120,36,18],
  ["thunder-10","Thunderix","Thunder","thunderix.png",135,38,24]
].map(([code,name,element,image,hp,atk,def]) =>
  ({ code, name, element, image, hp, atk, def })
);

/* -------------------------------------------------------------------------- */
/* DATABASE                                                                    */
/* -------------------------------------------------------------------------- */

async function initializeDatabase() {
  if (!pool) {
    console.log("DATABASE_URL is not configured.");
    return;
  }

  await dbQuery(`CREATE TABLE IF NOT EXISTS pioneers(
    id BIGSERIAL PRIMARY KEY,
    pi_uid TEXT UNIQUE NOT NULL,
    username TEXT,
    wallet_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS pets_catalog(
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
  );`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS user_pets(
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
  );`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS pet_payments(
    id BIGSERIAL PRIMARY KEY,
    payment_id TEXT UNIQUE NOT NULL,
    pi_uid TEXT NOT NULL,
    username TEXT,
    pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),
    currency TEXT NOT NULL,
    amount NUMERIC(30,8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',
    transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS amt_payments(
    id BIGSERIAL PRIMARY KEY,
    pi_uid TEXT NOT NULL,
    pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),
    amount NUMERIC(30,8) NOT NULL,
    asset_code TEXT NOT NULL DEFAULT 'AMT',
    receiver TEXT NOT NULL,
    txid TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'PREPARED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );`);

  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_pets_catalog_element
    ON pets_catalog(element);`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_user_pets_pioneer
    ON user_pets(pioneer_id);`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_pet_payments_uid
    ON pet_payments(pi_uid);`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_amt_payments_uid
    ON amt_payments(pi_uid);`);

  console.log("Database tables ready.");
}

async function seedPetCatalog() {
  if (!pool) return;

  for (const pet of PET_SEED) {
    await dbQuery(`INSERT INTO pets_catalog
      (pet_code,name,element,rarity,image,base_hp,base_atk,base_def)
      VALUES($1,$2,$3,'Common',$4,$5,$6,$7)
      ON CONFLICT(pet_code) DO UPDATE SET
        name=EXCLUDED.name,
        element=EXCLUDED.element,
        rarity=EXCLUDED.rarity,
        image=EXCLUDED.image,
        base_hp=EXCLUDED.base_hp,
        base_atk=EXCLUDED.base_atk,
        base_def=EXCLUDED.base_def`,
      [pet.code,pet.name,pet.element,pet.image,pet.hp,pet.atk,pet.def]
    );
  }

  console.log(`Pet catalog ready: ${PET_SEED.length} pets.`);
}

/* -------------------------------------------------------------------------- */
/* PI AUTH                                                                     */
/* -------------------------------------------------------------------------- */

async function piFetch(path, options = {}) {
  if (!PI_API_KEY) {
    throw new Error("PI_API_KEY is not configured on Render.");
  }

  const r = await fetch(PI_API_BASE + path, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Key " + PI_API_KEY,
      ...(options.headers || {})
    }
  });

  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!r.ok) {
    const err = new Error(
      data?.error ||
      data?.message ||
      `Pi API HTTP ${r.status}`
    );
    err.status = r.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function verifyPiAccessToken(token) {
  if (!token) throw new Error("Missing Pi access token.");
  if (!PI_API_KEY) throw new Error("PI_API_KEY is not configured.");

  const r = await fetch(PI_API_BASE + "/v2/me", {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json"
    }
  });

  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!r.ok) {
    throw new Error(
      data?.error || data?.message || "Pi authentication verification failed."
    );
  }

  return {
    uid: data.uid || data.user?.uid || "",
    username: data.username || data.user?.username || "",
    wallet_address:
      data.wallet_address ||
      data.walletAddress ||
      data.user?.wallet_address ||
      data.user?.walletAddress ||
      ""
  };
}

async function upsertPioneer(pi_uid, username, wallet_address) {
  const r = await dbQuery(`INSERT INTO pioneers
      (pi_uid,username,wallet_address)
      VALUES($1,$2,$3)
      ON CONFLICT(pi_uid) DO UPDATE SET
        username=COALESCE(NULLIF(EXCLUDED.username,''),pioneers.username),
        wallet_address=COALESCE(NULLIF(EXCLUDED.wallet_address,''),pioneers.wallet_address),
        updated_at=NOW()
      RETURNING id,pi_uid,username,wallet_address,created_at,updated_at`,
    [pi_uid, username || null, wallet_address || null]
  );

  return r.rows[0];
}

async function requirePiAuth(req, res, next) {
  try {
    let token = (req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();

    /* Allows the existing frontend to send the Pi token in JSON too. */
    if (!token) {
      token = String(
        req.body?.accessToken ||
        req.body?.access_token ||
        req.body?.piToken ||
        ""
      ).trim();
    }

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Pi authentication required."
      });
    }

    const piUser = await verifyPiAccessToken(token);

    if (!piUser.uid) {
      return res.status(401).json({
        ok: false,
        error: "Pi UID was not returned."
      });
    }

    const pioneer = await upsertPioneer(
      piUser.uid,
      piUser.username,
      piUser.wallet_address
    );

    req.piUser = piUser;
    req.pioneer = pioneer;
    req.piToken = token;
    next();
  } catch (e) {
    console.error("Pi auth:", e.message);
    return res.status(401).json({
      ok: false,
      error: e.message || "Pi authentication failed."
    });
  }
}

/* -------------------------------------------------------------------------- */
/* WALLET                                                                      */
/* -------------------------------------------------------------------------- */

function isPublicStellarAddress(value) {
  return typeof value === "string" &&
    /^G[A-Z2-7]{55}$/.test(value.trim());
}

async function horizonGet(path) {
  const r = await fetch(AMT_HORIZON_URL + path, {
    headers: { Accept: "application/json" }
  });

  const text = await r.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!r.ok) {
    const e = new Error(
      data?.title ||
      data?.detail ||
      `Pi Testnet Horizon HTTP ${r.status}`
    );
    e.status = r.status;
    throw e;
  }

  return data;
}

async function verifyAMTTransfer(txid, { from, to, amount }) {
  if (!txid) throw new Error("AMT transaction hash is required.");

  if (!isPublicStellarAddress(from)) {
    throw new Error("No valid Pioneer wallet is synchronized.");
  }

  if (!isPublicStellarAddress(to)) {
    throw new Error("AMT receiver is not configured correctly.");
  }

  const ops = await horizonGet(
    "/operations?transaction_hash=" +
    encodeURIComponent(txid) +
    "&limit=100"
  );

  const wanted = Number(amount);

  const op = (ops._embedded?.records || []).find(x =>
    x.type === "payment" &&
    x.asset_type === "credit_alphanum4" &&
    x.asset_code === AMT_ASSET_CODE &&
    x.asset_issuer === AMT_ISSUER &&
    x.source_account === from &&
    x.to === to &&
    Number(x.amount) === wanted
  );

  if (!op) {
    throw new Error(
      "AMT transfer not found for this Pioneer wallet, receiver, asset, and amount."
    );
  }

  const tx = await horizonGet(
    "/transactions/" + encodeURIComponent(txid)
  );

  if (tx.successful !== true) {
    throw new Error("AMT transaction is not successful on Pi Testnet.");
  }

  return {
    txid,
    operationId: op.id,
    from,
    to,
    amount: wanted
  };
}

/* -------------------------------------------------------------------------- */
/* PET HELPERS                                                                 */
/* -------------------------------------------------------------------------- */

async function grantPet(pi_uid, pet_code) {
  const p = await dbQuery(`SELECT pet_code,name,element,rarity,image,
      base_hp,base_atk,base_def
      FROM pets_catalog WHERE pet_code=$1 LIMIT 1`, [pet_code]);

  if (!p.rows.length) throw new Error("Pet not found.");

  const pioneer = await dbQuery(
    "SELECT id FROM pioneers WHERE pi_uid=$1 LIMIT 1",
    [pi_uid]
  );

  if (!pioneer.rows.length) throw new Error("Pioneer not found.");

  const pet = p.rows[0];
  const pid = pioneer.rows[0].id;

  const r = await dbQuery(`INSERT INTO user_pets
      (pioneer_id,pet_code,rarity,level,xp,hp,atk,def)
      VALUES($1,$2,'Common',1,0,$3,$4,$5)
      RETURNING *`,
    [pid, pet.pet_code, pet.base_hp, pet.base_atk, pet.base_def]
  );

  return {
    ...r.rows[0],
    name: pet.name,
    element: pet.element,
    image: pet.image
  };
}

function getRequestedPetId(req) {
  return req.body?.pet_id ||
    req.body?.petId ||
    req.body?.id ||
    null;
}

function getRequestedPetCode(req) {
  return req.body?.pet_code ||
    req.body?.petCode ||
    null;
}

async function findOwnedPet(pi_uid, req) {
  const petId = getRequestedPetId(req);
  const petCode = getRequestedPetCode(req);

  if (!petId && !petCode) {
    throw new Error("pet_id or pet_code is required.");
  }

  let r;

  if (petId) {
    r = await dbQuery(`SELECT
        up.id,up.pet_code,up.level,up.xp,up.hp,up.atk,up.def,
        pc.name,pc.element,pc.image,pc.base_hp,pc.base_atk,pc.base_def
        FROM user_pets up
        JOIN pioneers p ON p.id=up.pioneer_id
        JOIN pets_catalog pc ON pc.pet_code=up.pet_code
        WHERE up.id=$1 AND p.pi_uid=$2
        LIMIT 1`,
      [Number(petId), pi_uid]
    );
  } else {
    r = await dbQuery(`SELECT
        up.id,up.pet_code,up.level,up.xp,up.hp,up.atk,up.def,
        pc.name,pc.element,pc.image,pc.base_hp,pc.base_atk,pc.base_def
        FROM user_pets up
        JOIN pioneers p ON p.id=up.pioneer_id
        JOIN pets_catalog pc ON pc.pet_code=up.pet_code
        WHERE up.pet_code=$1 AND p.pi_uid=$2
        ORDER BY up.created_at DESC
        LIMIT 1`,
      [petCode, pi_uid]
    );
  }

  if (!r.rows.length) {
    throw new Error("Owned pet not found.");
  }

  return r.rows[0];
}

/* -------------------------------------------------------------------------- */
/* CORE ROUTES                                                                 */
/* -------------------------------------------------------------------------- */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "AMT Pet Marketplace",
    version: "2.1.0",
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
    } catch {}
  }

  res.json({
    ok: true,
    service: "amt-pet-marketplace",
    databaseConfigured: !!DATABASE_URL,
    databaseConnected: database,
    piApiConfigured: !!PI_API_KEY,
    petCount: PET_SEED.length,
    prices: {
      pi: PET_PI_PRICE,
      amt: PET_AMT_PRICE
    },
    timestamp: new Date().toISOString()
  });
});

/* Catalog */
app.get("/api/pets", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT pet_code,name,element,rarity,image,
        base_hp,base_atk,base_def
        FROM pets_catalog
        ORDER BY CASE element
          WHEN 'Earth' THEN 1 WHEN 'Water' THEN 2 WHEN 'Nature' THEN 3
          WHEN 'Ice' THEN 4 WHEN 'Fire' THEN 5 WHEN 'Wind' THEN 6
          WHEN 'Thunder' THEN 7 ELSE 99 END,pet_code`);

    res.json({ ok: true, count: r.rows.length, pets: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: "Unable to load pet catalog."
    });
  }
});

app.get("/api/pets/element/:element", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT pet_code,name,element,rarity,image,
        base_hp,base_atk,base_def
        FROM pets_catalog
        WHERE LOWER(element)=LOWER($1)
        ORDER BY pet_code`, [req.params.element]);

    res.json({
      ok: true,
      element: req.params.element,
      count: r.rows.length,
      pets: r.rows
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "Unable to load pets."
    });
  }
});

app.get("/api/pets/:petCode", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT pet_code,name,element,rarity,image,
        base_hp,base_atk,base_def
        FROM pets_catalog WHERE pet_code=$1 LIMIT 1`,
      [req.params.petCode]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Pet not found."
      });
    }

    res.json({ ok: true, pet: r.rows[0] });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "Unable to load pet."
    });
  }
});

/* Auth */
app.post("/api/auth/verify", requirePiAuth, async (req, res) => {
  res.json({
    ok: true,
    uid: req.piUser.uid,
    username: req.piUser.username,
    walletAddress: req.piUser.wallet_address || null,
    wallet_address: req.piUser.wallet_address || null,
    pioneer: req.pioneer
  });
});

/* Wallet config */
app.get("/api/wallet/config", (req, res) => {
  res.json({
    ok: true,
    asset_code: AMT_ASSET_CODE,
    issuer: AMT_ISSUER,
    receiver: AMT_RECEIVER,
    staking_receiver: AMT_RECEIVER,
    horizon: AMT_HORIZON_URL,
    network: "Pi Testnet"
  });
});

/*
 * Wallet synchronization.
 * Supports both /api/wallet/bind and /api/wallet/sync so an existing
 * frontend does not need to be rewritten.
 */
async function walletBindHandler(req, res) {
  try {
    const wallet = String(
      req.body?.wallet_address ||
      req.body?.walletAddress ||
      req.body?.address ||
      req.piUser.wallet_address ||
      ""
    ).trim();

    if (!isPublicStellarAddress(wallet)) {
      return res.status(400).json({
        ok: false,
        error:
          "Enter a valid public Pi Testnet wallet address starting with G and containing 56 characters."
      });
    }

    const pioneer = await upsertPioneer(
      req.piUser.uid,
      req.piUser.username,
      wallet
    );

    res.json({
      ok: true,
      synced: true,
      uid: req.piUser.uid,
      username: req.piUser.username,
      wallet_address: pioneer.wallet_address,
      walletAddress: pioneer.wallet_address,
      network: "Pi Testnet",
      message: "Public Pi Testnet wallet synchronized successfully."
    });
  } catch (e) {
    console.error("wallet sync:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Unable to synchronize wallet."
    });
  }
}

app.post("/api/wallet/bind", requirePiAuth, walletBindHandler);
app.post("/api/wallet/sync", requirePiAuth, walletBindHandler);

app.get("/api/wallet/sync", requirePiAuth, async (req, res) => {
  try {
    const wallet = req.pioneer.wallet_address || req.piUser.wallet_address || "";

    if (!isPublicStellarAddress(wallet)) {
      return res.status(400).json({
        ok: false,
        synced: false,
        error: "No valid public Pi Testnet wallet is synchronized yet."
      });
    }

    res.json({
      ok: true,
      synced: true,
      uid: req.piUser.uid,
      username: req.piUser.username,
      wallet_address: wallet,
      walletAddress: wallet,
      network: "Pi Testnet"
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get("/api/wallet/onchain", requirePiAuth, async (req, res) => {
  try {
    const wallet = req.pioneer.wallet_address || "";

    if (!isPublicStellarAddress(wallet)) {
      return res.status(400).json({
        ok: false,
        error: "No synchronized public Pi Testnet wallet address found for this Pioneer."
      });
    }

    const account = await horizonGet(
      "/accounts/" + encodeURIComponent(wallet)
    );

    const balances = Array.isArray(account.balances)
      ? account.balances
      : [];

    const balance = balances
      .filter(b =>
        b.asset_type === "credit_alphanum4" &&
        b.asset_code === AMT_ASSET_CODE &&
        b.asset_issuer === AMT_ISSUER
      )
      .reduce((sum, b) => sum + Number(b.balance || 0), 0);

    res.json({
      ok: true,
      pi_uid: req.piUser.uid,
      username: req.piUser.username,
      wallet_address: wallet,
      walletAddress: wallet,
      amt: {
        wallet,
        asset_code: AMT_ASSET_CODE,
        issuer: AMT_ISSUER,
        balance
      }
    });
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e.message
    });
  }
});

/* Pioneer */
app.post("/api/pioneers", async (req, res) => {
  try {
    const { pi_uid, username, wallet_address } = req.body || {};

    if (!pi_uid) {
      return res.status(400).json({
        ok: false,
        error: "pi_uid is required."
      });
    }

    const pioneer = await upsertPioneer(
      pi_uid,
      username,
      wallet_address
    );

    res.json({ ok: true, pioneer });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: "Unable to save Pioneer."
    });
  }
});

app.get("/api/pioneers/:pi_uid", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT id,pi_uid,username,wallet_address,
        created_at,updated_at
        FROM pioneers WHERE pi_uid=$1 LIMIT 1`,
      [req.params.pi_uid]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Pioneer not found."
      });
    }

    res.json({ ok: true, pioneer: r.rows[0] });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "Unable to load Pioneer."
    });
  }
});

/* My pets */
app.get("/api/my-pets/:pi_uid", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT
        up.id,up.pet_code,pc.name,pc.element,pc.image,up.rarity,
        up.level,up.xp,up.hp,up.atk,up.def,up.created_at,up.updated_at
        FROM user_pets up
        JOIN pioneers p ON p.id=up.pioneer_id
        JOIN pets_catalog pc ON pc.pet_code=up.pet_code
        WHERE p.pi_uid=$1
        ORDER BY up.created_at DESC`,
      [req.params.pi_uid]
    );

    res.json({
      ok: true,
      count: r.rows.length,
      pets: r.rows
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "Unable to load Pioneer pets."
    });
  }
});

/* -------------------------------------------------------------------------- */
/* CARE + TRAIN - fixes "Endpoint not found"                                  */
/* -------------------------------------------------------------------------- */

async function carePetHandler(req, res) {
  try {
    const pet = await findOwnedPet(req.piUser.uid, req);

    const r = await dbQuery(`UPDATE user_pets
      SET hp=$1,updated_at=NOW()
      WHERE id=$2
      RETURNING id,pet_code,rarity,level,xp,hp,atk,def,updated_at`,
      [pet.base_hp, pet.id]
    );

    res.json({
      ok: true,
      action: "CARE",
      message: "Pet cared for successfully. HP restored.",
      pet: {
        ...r.rows[0],
        name: pet.name,
        element: pet.element,
        image: pet.image,
        max_hp: pet.base_hp
      }
    });
  } catch (e) {
    console.error("care:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Unable to care for pet."
    });
  }
}

async function trainPetHandler(req, res) {
  try {
    const pet = await findOwnedPet(req.piUser.uid, req);

    const XP_GAIN = 25;
    const oldXp = Number(pet.xp || 0);
    const oldLevel = Number(pet.level || 1);
    const totalXp = oldXp + XP_GAIN;

    /*
     * 100 XP per level.
     * Example: level 1 + 25 XP = level 1 / 25 XP.
     * Level increases automatically whenever a 100 XP boundary is reached.
     */
    const newLevel = Math.max(1, Math.floor(totalXp / 100) + 1);
    const levelUps = Math.max(0, newLevel - oldLevel);

    const newAtk = Number(pet.atk) + (levelUps * 2);
    const newDef = Number(pet.def) + (levelUps * 2);
    const newMaxHp = Number(pet.base_hp) + (levelUps * 5);

    const r = await dbQuery(`UPDATE user_pets
      SET xp=$1,
          level=$2,
          atk=$3,
          def=$4,
          hp=LEAST(hp,$5),
          updated_at=NOW()
      WHERE id=$6
      RETURNING id,pet_code,rarity,level,xp,hp,atk,def,updated_at`,
      [totalXp,newLevel,newAtk,newDef,newMaxHp,pet.id]
    );

    res.json({
      ok: true,
      action: "TRAIN",
      message: levelUps > 0
        ? `Training complete. Pet reached Level ${newLevel}!`
        : "Training complete. XP gained.",
      xpGained: XP_GAIN,
      levelUps,
      pet: {
        ...r.rows[0],
        name: pet.name,
        element: pet.element,
        image: pet.image,
        max_hp: newMaxHp
      }
    });
  } catch (e) {
    console.error("train:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Unable to train pet."
    });
  }
}

/*
 * Multiple compatible paths are intentionally provided.
 * This prevents the current frontend from breaking if it calls one of
 * the common names below.
 */
app.post("/api/care", requirePiAuth, carePetHandler);
app.post("/api/care/pet", requirePiAuth, carePetHandler);
app.post("/api/pets/care", requirePiAuth, carePetHandler);

app.post("/api/train", requirePiAuth, trainPetHandler);
app.post("/api/train/pet", requirePiAuth, trainPetHandler);
app.post("/api/pets/train", requirePiAuth, trainPetHandler);

/* -------------------------------------------------------------------------- */
/* PI PAYMENTS                                                                 */
/* -------------------------------------------------------------------------- */

app.post("/api/payments/pi/prepare", requirePiAuth, async (req, res) => {
  try {
    const { payment_id, pet_code } = req.body || {};

    if (!payment_id || !pet_code) {
      return res.status(400).json({
        ok: false,
        error: "payment_id and pet_code are required."
      });
    }

    const pet = await dbQuery(
      "SELECT pet_code,name FROM pets_catalog WHERE pet_code=$1 LIMIT 1",
      [pet_code]
    );

    if (!pet.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Pet not found."
      });
    }

    const payment = await piFetch(
      "/v2/payments/" + encodeURIComponent(payment_id)
    );

    const amount = String(payment.amount ?? "");
    const metadata = payment.metadata || {};

    if (Number(amount) !== Number(PET_PI_PRICE)) {
      return res.status(400).json({
        ok: false,
        error: `Payment amount must be ${PET_PI_PRICE} Pi Test.`
      });
    }

    if (metadata.pet_code && metadata.pet_code !== pet_code) {
      return res.status(400).json({
        ok: false,
        error: "Payment pet does not match."
      });
    }

    await dbQuery(`INSERT INTO pet_payments
      (payment_id,pi_uid,username,pet_code,currency,amount,status)
      VALUES($1,$2,$3,$4,'PI',$5,'CREATED')
      ON CONFLICT(payment_id) DO UPDATE SET
        pet_code=EXCLUDED.pet_code,
        updated_at=NOW()`,
      [
        payment_id,
        req.piUser.uid,
        req.piUser.username,
        pet_code,
        Number(PET_PI_PRICE)
      ]
    );

    res.json({
      ok: true,
      paymentId: payment_id,
      pet_code,
      amount: Number(PET_PI_PRICE),
      currency: PI_PAYMENT_CURRENCY,
      status: "CREATED"
    });
  } catch (e) {
    console.error("prepare pi:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Unable to prepare Pi payment."
    });
  }
});

app.post("/api/payments/pi/approve", requirePiAuth, async (req, res) => {
  try {
    const { payment_id, pet_code } = req.body || {};

    if (!payment_id || !pet_code) {
      return res.status(400).json({
        ok: false,
        error: "payment_id and pet_code are required."
      });
    }

    const row = await dbQuery(
      `SELECT * FROM pet_payments
       WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1`,
      [payment_id, req.piUser.uid]
    );

    if (!row.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Payment intent not found. Prepare it first."
      });
    }

    const payment = await piFetch(
      "/v2/payments/" + encodeURIComponent(payment_id)
    );

    if (Number(payment.amount) !== Number(PET_PI_PRICE)) {
      return res.status(400).json({
        ok: false,
        error: `Payment amount is not ${PET_PI_PRICE} Pi Test.`
      });
    }

    const approved = await piFetch(
      "/v2/payments/" + encodeURIComponent(payment_id) + "/approve",
      { method: "POST" }
    );

    await dbQuery(
      `UPDATE pet_payments
       SET status='APPROVED',updated_at=NOW()
       WHERE payment_id=$1`,
      [payment_id]
    );

    res.json({
      ok: true,
      paymentId: payment_id,
      status: "APPROVED",
      pi: approved
    });
  } catch (e) {
    console.error("approve pi:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Pi approval failed."
    });
  }
});

app.post("/api/payments/pi/complete", requirePiAuth, async (req, res) => {
  try {
    const { payment_id, pet_code, txid } = req.body || {};

    if (!payment_id || !pet_code) {
      return res.status(400).json({
        ok: false,
        error: "payment_id and pet_code are required."
      });
    }

    const row = await dbQuery(
      `SELECT * FROM pet_payments
       WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1`,
      [payment_id, req.piUser.uid]
    );

    if (!row.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Payment intent not found."
      });
    }

    if (row.rows[0].status === "COMPLETED") {
      return res.json({
        ok: true,
        status: "COMPLETED",
        message: "Payment already completed; pet ownership already granted."
      });
    }

    const payment = await piFetch(
      "/v2/payments/" + encodeURIComponent(payment_id)
    );

    const transactionId =
      txid ||
      payment.transaction?.txid ||
      payment.txid ||
      "";

    const status = payment.status || {};

    if (!transactionId) {
      return res.status(409).json({
        ok: false,
        error: "Pi transaction ID is not available yet. Please wait for the blockchain transaction."
      });
    }

    if (status.cancelled === true || status.cancelled === 1) {
      return res.status(409).json({
        ok: false,
        error: "Pi payment was cancelled."
      });
    }

    const completed = await piFetch(
      "/v2/payments/" + encodeURIComponent(payment_id) + "/complete",
      {
        method: "POST",
        body: JSON.stringify({ txid: transactionId })
      }
    );

    const pet = await grantPet(req.piUser.uid, pet_code);

    await dbQuery(`UPDATE pet_payments
      SET status='COMPLETED',
          transaction_id=$1,
          completed_at=NOW(),
          updated_at=NOW()
      WHERE payment_id=$2`,
      [transactionId, payment_id]
    );

    res.json({
      ok: true,
      status: "COMPLETED",
      paymentId: payment_id,
      transactionId,
      pi: completed,
      pet
    });
  } catch (e) {
    console.error("complete pi:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Pi completion verification failed."
    });
  }
});

app.post("/api/payments/pi/callback", async (req, res) => {
  try {
    const { payment_id, txid } = req.body || {};

    if (!payment_id) {
      return res.status(400).json({
        ok: false,
        error: "payment_id is required."
      });
    }

    const payment = await piFetch(
      "/v2/payments/" + encodeURIComponent(payment_id)
    );

    const row = await dbQuery(
      "SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1",
      [payment_id]
    );

    if (!row.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Payment intent not found."
      });
    }

    if (row.rows[0].status !== "COMPLETED") {
      const transactionId =
        txid ||
        payment.transaction?.txid ||
        payment.txid ||
        "";

      const status = payment.status || {};

      if (status.cancelled === true || status.cancelled === 1) {
        return res.status(409).json({
          ok: false,
          error: "Pi payment was cancelled."
        });
      }

      if (transactionId) {
        await piFetch(
          "/v2/payments/" + encodeURIComponent(payment_id) + "/complete",
          {
            method: "POST",
            body: JSON.stringify({ txid: transactionId })
          }
        );

        const pet = await grantPet(
          row.rows[0].pi_uid,
          row.rows[0].pet_code
        );

        await dbQuery(`UPDATE pet_payments
          SET status='COMPLETED',
              transaction_id=$1,
              completed_at=NOW(),
              updated_at=NOW()
          WHERE payment_id=$2`,
          [transactionId, payment_id]
        );

        return res.json({
          ok: true,
          status: "COMPLETED",
          pet
        });
      }
    }

    res.json({
      ok: true,
      status: row.rows[0].status
    });
  } catch (e) {
    console.error("callback:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "Callback verification failed."
    });
  }
});

/* -------------------------------------------------------------------------- */
/* AMT PAYMENTS                                                                */
/* -------------------------------------------------------------------------- */

app.post("/api/payments/amt/prepare", requirePiAuth, async (req, res) => {
  try {
    const { pet_code } = req.body || {};

    if (!pet_code) {
      return res.status(400).json({
        ok: false,
        error: "pet_code is required."
      });
    }

    const pet = await dbQuery(
      "SELECT pet_code,name FROM pets_catalog WHERE pet_code=$1 LIMIT 1",
      [pet_code]
    );

    if (!pet.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Pet not found."
      });
    }

    const wallet = req.pioneer.wallet_address || "";

    if (!isPublicStellarAddress(wallet)) {
      return res.status(400).json({
        ok: false,
        error: "Sync your public Pi Testnet wallet first."
      });
    }

    res.json({
      ok: true,
      pet_code,
      amount: Number(PET_AMT_PRICE),
      currency: AMT_ASSET_CODE,
      from_wallet: wallet,
      receiver: AMT_RECEIVER,
      issuer: AMT_ISSUER,
      horizon: AMT_HORIZON_URL,
      status: "READY_FOR_VERIFIED_AMT_TRANSFER",
      message:
        "Send the exact AMT amount to the receiver, then submit the transaction hash. Ownership is granted only after server-side on-chain verification."
    });
  } catch (e) {
    res.status(400).json({
      ok: false,
      error: e.message
    });
  }
});

app.post("/api/payments/amt/complete", requirePiAuth, async (req, res) => {
  try {
    const { pet_code, txid } = req.body || {};

    if (!pet_code || !txid) {
      return res.status(400).json({
        ok: false,
        error: "pet_code and txid are required."
      });
    }

    const pet = await dbQuery(
      "SELECT pet_code,name FROM pets_catalog WHERE pet_code=$1 LIMIT 1",
      [pet_code]
    );

    if (!pet.rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Pet not found."
      });
    }

    const wallet = req.pioneer.wallet_address || "";

    if (!isPublicStellarAddress(wallet)) {
      return res.status(400).json({
        ok: false,
        error: "Sync your public Pi Testnet wallet first."
      });
    }

    const used = await dbQuery(
      "SELECT id,pi_uid,pet_code FROM amt_payments WHERE txid=$1 LIMIT 1",
      [txid]
    );

    if (used.rows.length) {
      return res.status(409).json({
        ok: false,
        error: "This AMT transaction hash has already been used."
      });
    }

    const verified = await verifyAMTTransfer(
      String(txid).trim(),
      {
        from: wallet,
        to: AMT_RECEIVER,
        amount: Number(PET_AMT_PRICE)
      }
    );

    await dbQuery(`INSERT INTO amt_payments
      (pi_uid,pet_code,amount,asset_code,receiver,txid,status,completed_at)
      VALUES($1,$2,$3,$4,$5,$6,'COMPLETED',NOW())`,
      [
        req.piUser.uid,
        pet_code,
        Number(PET_AMT_PRICE),
        AMT_ASSET_CODE,
        AMT_RECEIVER,
        verified.txid
      ]
    );

    const petRow = await grantPet(req.piUser.uid, pet_code);

    res.json({
      ok: true,
      status: "COMPLETED",
      transactionId: verified.txid,
      pet: petRow
    });
  } catch (e) {
    console.error("complete amt:", e);
    res.status(400).json({
      ok: false,
      error: e.message || "AMT transfer verification failed."
    });
  }
});

/* Development helper */
app.post("/api/dev/give-pet", async (req, res) => {
  try {
    const {
      pi_uid,
      pet_code,
      username,
      wallet_address
    } = req.body || {};

    if (!pi_uid || !pet_code) {
      return res.status(400).json({
        ok: false,
        error: "pi_uid and pet_code are required."
      });
    }

    await upsertPioneer(
      pi_uid,
      username,
      wallet_address
    );

    const pet = await grantPet(pi_uid, pet_code);

    res.json({
      ok: true,
      message: "Pet added to Pioneer collection.",
      pet
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: "Unable to give pet."
    });
  }
});

/* -------------------------------------------------------------------------- */
/* 404                                                                        */
/* -------------------------------------------------------------------------- */

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Endpoint not found.",
    path: req.originalUrl
  });
});

/* -------------------------------------------------------------------------- */
/* START                                                                       */
/* -------------------------------------------------------------------------- */

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
      console.log(`Pi API key configured: ${!!PI_API_KEY}`);
      console.log(`Pet catalog: ${PET_SEED.length} pets`);
      console.log("Pi network: Testnet");
      console.log("Pet Pi price: " + PET_PI_PRICE);
      console.log("Pet AMT price: " + PET_AMT_PRICE);
      console.log("Care endpoints: /api/care, /api/care/pet, /api/pets/care");
      console.log("Train endpoints: /api/train, /api/train/pet, /api/pets/train");
      console.log("Wallet endpoints: /api/wallet/bind, /api/wallet/sync");
      console.log("======================================");
    });
  } catch (e) {
    console.error("SERVER STARTUP ERROR:", e);
    process.exit(1);
  }
}

startServer();
