require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const StellarSDK = require("@stellar/stellar-sdk");

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
const AMT_RECEIVER = process.env.AMT_RECEIVER || process.env.AMT_DISTRIBUTOR ||
  "GAVFYNEHSTW4P65DM75P4TYAC6PNO5A6LGSYSGEFNN3O7A23XHWABSBP";
const AMT_HORIZON_URL = process.env.AMT_HORIZON_URL || "https://api.testnet.minepi.com";
const AMT_NETWORK_PASSPHRASE = process.env.AMT_NETWORK_PASSPHRASE || "Pi Testnet";
const AMT_DISTRIBUTOR_SECRET = process.env.AMT_DISTRIBUTOR_SECRET || "";
const AMT_DISTRIBUTOR_WALLET = process.env.AMT_DISTRIBUTOR_WALLET || "";
const AMT_STORE_RATE = Number(process.env.AMT_STORE_RATE || "0.8");
const AMT_STORE_CURRENCY = "Pi";
const AMT_STORE_MIN_PI = 1;
const AMT_STORE_MAX_PI = 1000;

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "1mb" }));

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pool.on("error", e => console.error("PostgreSQL pool error:", e));
}

async function dbQuery(text, params = []) {
  if (!pool) throw new Error("DATABASE_URL is not configured.");
  return pool.query(text, params);
}

/* 70-PET CATALOG */
const PET_SEED = [
  ["earth-01", "Terrax", "Earth", "terrax.png", 120, 20, 22], ["earth-02", "Rockhorn", "Earth", "rockhorn.png", 125, 19, 24],
  ["earth-03", "Stonefist", "Earth", "stonefist.png", 130, 22, 25], ["earth-04", "Earthdrake", "Earth", "earthdrake.png", 128, 23, 23],
  ["earth-05", "Boulderlynx", "Earth", "boulderlynx.png", 118, 24, 20], ["earth-06", "Terrapin", "Earth", "terrapin.png", 140, 16, 28],
  ["earth-07", "Gravelpaw", "Earth", "gravelpaw.png", 115, 21, 21], ["earth-08", "Pebblix", "Earth", "pebblix.png", 110, 18, 20],
  ["earth-09", "Mountainhoof", "Earth", "mountainhoof.png", 145, 18, 30], ["earth-10", "Terroscale", "Earth", "terroscale.png", 135, 25, 24],
  ["water-01", "Aqualis", "Water", "aqualis.png", 110, 23, 18], ["water-02", "Tideback", "Water", "tideback.png", 135, 18, 27],
  ["water-03", "Oceanix", "Water", "oceanix.png", 125, 24, 20], ["water-04", "Neptunox", "Water", "neptunox.png", 130, 27, 21],
  ["water-05", "Jellyfin", "Water", "jellyfin.png", 105, 19, 19], ["water-06", "Sharky", "Water", "sharky.png", 120, 29, 17],
  ["water-07", "Seapony", "Water", "seapony.png", 115, 22, 21], ["water-08", "Krakenling", "Water", "krakenling.png", 140, 26, 23],
  ["water-09", "Riptide", "Water", "riptide.png", 118, 30, 18], ["water-10", "Abyssal", "Water", "abyssal.png", 145, 28, 25],
  ["nature-01", "Leaflyn", "Nature", "leaflyn.png", 115, 20, 22], ["nature-02", "Treetle", "Nature", "treetle.png", 130, 18, 27],
  ["nature-03", "Sylvann", "Nature", "sylvann.png", 120, 25, 20], ["nature-04", "Verdira", "Nature", "verdira.png", 118, 23, 23],
  ["nature-05", "Bloomtail", "Nature", "bloomtail.png", 112, 21, 22], ["nature-06", "Groveon", "Nature", "groveon.png", 128, 22, 25],
  ["nature-07", "Nutty", "Nature", "nutty.png", 108, 19, 20], ["nature-08", "Flora", "Nature", "flora.png", 110, 26, 19],
  ["nature-09", "Forestfang", "Nature", "forestfang.png", 125, 28, 21], ["nature-10", "Everbloom", "Nature", "everbloom.png", 138, 25, 26],
  ["ice-01", "Frostbite", "Ice", "frostbite.png", 115, 24, 21], ["ice-02", "Glaciard", "Ice", "glaciard.png", 130, 20, 27],
  ["ice-03", "Snowwing", "Ice", "snowwing.png", 108, 27, 18], ["ice-04", "Frostdrake", "Ice", "frostdrake.png", 135, 28, 24],
  ["ice-05", "Chillpengu", "Ice", "chillpengu.png", 105, 19, 20], ["ice-06", "Frostwolf", "Ice", "frostwolf.png", 125, 30, 21],
  ["ice-07", "Icetusk", "Ice", "icetusk.png", 142, 22, 29], ["ice-08", "Frostseal", "Ice", "frostseal.png", 120, 21, 25],
  ["ice-09", "Glacieron", "Ice", "glacieron.png", 132, 26, 26], ["ice-10", "Frostbear", "Ice", "frostbear.png", 150, 24, 31],
  ["fire-01", "Flammy", "Fire", "flammy.png", 108, 27, 17], ["fire-02", "Pyroclaw", "Fire", "pyroclaw.png", 115, 30, 18],
  ["fire-03", "Blazewing", "Fire", "blazewing.png", 110, 32, 17], ["fire-04", "Infernox", "Fire", "infernox.png", 128, 31, 21],
  ["fire-05", "Phoenixia", "Fire", "phoenixia.png", 125, 34, 20], ["fire-06", "Magmortar", "Fire", "magmortar.png", 145, 28, 28],
  ["fire-07", "Salamorra", "Fire", "salamorra.png", 130, 33, 23], ["fire-08", "Emberhorn", "Fire", "emberhorn.png", 120, 29, 22],
  ["fire-09", "Flamefang", "Fire", "flamefang.png", 118, 35, 19], ["fire-10", "Pyromite", "Fire", "pyromite.png", 135, 32, 25],
  ["wind-01", "Zephyrin", "Wind", "zephyrin.png", 105, 25, 18], ["wind-02", "Skyflare", "Wind", "skyflare.png", 110, 29, 17],
  ["wind-03", "Windrake", "Wind", "windrake.png", 125, 30, 21], ["wind-04", "Aerolith", "Wind", "aerolith.png", 115, 26, 22],
  ["wind-05", "Skywhisp", "Wind", "skywhisp.png", 100, 24, 16], ["wind-06", "Stormtalon", "Wind", "stormtalon.png", 120, 34, 19],
  ["wind-07", "Cloudstride", "Wind", "cloudstride.png", 112, 28, 20], ["wind-08", "Breezeling", "Wind", "breezeling.png", 102, 23, 18],
  ["wind-09", "Tornadope", "Wind", "tornadope.png", 118, 33, 18], ["wind-10", "Zephyria", "Wind", "zephyria.png", 130, 31, 23],
  ["thunder-01", "Voltix", "Thunder", "voltix.png", 110, 30, 18], ["thunder-02", "Zephron", "Thunder", "zephron.png", 115, 28, 19],
  ["thunder-03", "Stormee", "Thunder", "stormee.png", 108, 32, 17], ["thunder-04", "Thunderdrake", "Thunder", "thunderdrake.png", 130, 35, 23],
  ["thunder-05", "Sparkster", "Thunder", "sparkster.png", 105, 29, 18], ["thunder-06", "Raihorn", "Thunder", "raihorn.png", 140, 27, 30],
  ["thunder-07", "Voltlynx", "Thunder", "voltlynx.png", 118, 34, 20], ["thunder-08", "Electrix", "Thunder", "electrix.png", 112, 31, 19],
  ["thunder-09", "Skyshock", "Thunder", "skyshock.png", 120, 36, 18], ["thunder-10", "Thunderix", "Thunder", "thunderix.png", 135, 38, 24]
].map(([code, name, element, image, hp, atk, def]) => ({ code, name, element, image, hp, atk, def }));

async function initializeDatabase() {
  if (!pool) { console.log("DATABASE_URL is not configured."); return; }
  await dbQuery(`CREATE TABLE IF NOT EXISTS pioneers(
    id BIGSERIAL PRIMARY KEY,pi_uid TEXT UNIQUE NOT NULL,username TEXT,wallet_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await dbQuery(`ALTER TABLE pioneers ADD COLUMN IF NOT EXISTS profile_image TEXT;`);
  await dbQuery(`ALTER TABLE pioneers ADD COLUMN IF NOT EXISTS coins BIGINT NOT NULL DEFAULT 0;`);
  await dbQuery(`ALTER TABLE pioneers ADD COLUMN IF NOT EXISTS food BIGINT NOT NULL DEFAULT 0;`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS pets_catalog(
    id BIGSERIAL PRIMARY KEY,pet_code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,element TEXT NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'Common',image TEXT NOT NULL,base_hp INTEGER NOT NULL DEFAULT 100,
    base_atk INTEGER NOT NULL DEFAULT 10,base_def INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS user_pets(
    id BIGSERIAL PRIMARY KEY,pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
    pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),rarity TEXT NOT NULL DEFAULT 'Common',
    level INTEGER NOT NULL DEFAULT 1,xp BIGINT NOT NULL DEFAULT 0,hp INTEGER NOT NULL DEFAULT 100,
    atk INTEGER NOT NULL DEFAULT 10,def INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await dbQuery(`ALTER TABLE user_pets ADD COLUMN IF NOT EXISTS payment_id TEXT;`);
  await dbQuery(`CREATE UNIQUE INDEX IF NOT EXISTS user_pets_payment_id_uq ON user_pets(payment_id) WHERE payment_id IS NOT NULL;`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS pet_payments(
    id BIGSERIAL PRIMARY KEY,payment_id TEXT UNIQUE NOT NULL,pi_uid TEXT NOT NULL,username TEXT,
    pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),currency TEXT NOT NULL,amount NUMERIC(30,8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',transaction_id TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ);`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS amt_payments(
    id BIGSERIAL PRIMARY KEY,pi_uid TEXT NOT NULL,pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),
    amount NUMERIC(30,8) NOT NULL,asset_code TEXT NOT NULL DEFAULT 'AMT',receiver TEXT NOT NULL,
    txid TEXT UNIQUE,status TEXT NOT NULL DEFAULT 'PREPARED',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ);`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS amt_store_orders(
    id BIGSERIAL PRIMARY KEY,payment_id TEXT UNIQUE NOT NULL,pi_uid TEXT NOT NULL,username TEXT,
    wallet_address TEXT NOT NULL,pi_amount NUMERIC(30,8) NOT NULL,amt_amount NUMERIC(30,8) NOT NULL,
    rate NUMERIC(30,8) NOT NULL DEFAULT 0.8,status TEXT NOT NULL DEFAULT 'CREATED',
    pi_txid TEXT,amt_txid TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ);`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS pet_battles(
    id BIGSERIAL PRIMARY KEY,attacker_pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
    attacker_pet_id BIGINT NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
    defender_pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
    defender_pet_id BIGINT NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
    winner_pioneer_id BIGINT REFERENCES pioneers(id) ON DELETE SET NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS pet_breeding(
    id BIGSERIAL PRIMARY KEY,parent1_id BIGINT NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
    parent2_id BIGINT NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,offspring_id BIGINT REFERENCES user_pets(id) ON DELETE SET NULL,
    pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS pet_listings(
    id BIGSERIAL PRIMARY KEY,pet_id BIGINT UNIQUE NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
    pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,price_amt NUMERIC(30,8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);

  /* EGGS + INCUBATOR */
  await dbQuery(`CREATE TABLE IF NOT EXISTS pet_eggs(
    id BIGSERIAL PRIMARY KEY,egg_code TEXT UNIQUE NOT NULL,
    pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
    parent1_id BIGINT NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
    parent2_id BIGINT NOT NULL REFERENCES user_pets(id) ON DELETE CASCADE,
    future_pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code),
    element TEXT NOT NULL,rarity TEXT NOT NULL DEFAULT 'Common',
    status TEXT NOT NULL DEFAULT 'NEW',incubated_at TIMESTAMPTZ,
    hatch_ready_at TIMESTAMPTZ,hatch_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await dbQuery(`CREATE TABLE IF NOT EXISTS egg_listings(
    id BIGSERIAL PRIMARY KEY,egg_id BIGINT UNIQUE NOT NULL REFERENCES pet_eggs(id) ON DELETE CASCADE,
    pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
    price_amt NUMERIC(30,8) NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  console.log("Database tables ready.");
}

async function seedPetCatalog() {
  if (!pool) return;
  for (const p of PET_SEED) {
    await dbQuery(`INSERT INTO pets_catalog
      (pet_code,name,element,rarity,image,base_hp,base_atk,base_def)
      VALUES($1,$2,$3,'Common',$4,$5,$6,$7)
      ON CONFLICT(pet_code) DO UPDATE SET name=EXCLUDED.name,element=EXCLUDED.element,
      rarity=EXCLUDED.rarity,image=EXCLUDED.image,base_hp=EXCLUDED.base_hp,
      base_atk=EXCLUDED.base_atk,base_def=EXCLUDED.base_def`,
      [p.code, p.name, p.element, p.image, p.hp, p.atk, p.def]);
  }
  console.log(`Pet catalog ready: ${PET_SEED.length} pets.`);
}

async function piFetch(path, options = {}) {
  if (!PI_API_KEY) throw new Error("PI_API_KEY is not configured on Render.");
  const r = await fetch(PI_API_BASE + path, {
    ...options, headers: {
      Accept: "application/json", "Content-Type": "application/json",
      Authorization: "Key " + PI_API_KEY, ...(options.headers || {})
    }
  });
  const text = await r.text(); let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!r.ok) { const e = new Error(data?.error || data?.message || `Pi API HTTP ${r.status}`); e.status = r.status; throw e; }
  return data;
}

async function verifyPiAccessToken(token) {
  if (!token) throw new Error("Missing Pi access token.");
  const r = await fetch(PI_API_BASE + "/v2/me", { headers: { Authorization: "Bearer " + token, Accept: "application/json" } });
  const text = await r.text(); let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { }
  if (!r.ok) throw new Error(data?.error || data?.message || "Pi authentication verification failed.");
  return {
    uid: data.uid || data.user?.uid || "", username: data.username || data.user?.username || "",
    wallet_address: data.wallet_address || data.walletAddress || data.user?.wallet_address || data.user?.walletAddress || ""
  };
}

function isPublicStellarAddress(v) { return typeof v === "string" && /^G[A-Z2-7]{55}$/.test(v.trim().toUpperCase()); }
function normalizeWallet(v) { const x = String(v || "").trim().toUpperCase(); return isPublicStellarAddress(x) ? x : ""; }

async function upsertPioneer(pi_uid, username, wallet_address) {
  const incoming = normalizeWallet(wallet_address);
  if (wallet_address && !incoming) throw new Error("Invalid Pi Testnet public wallet address.");
  const old = await dbQuery("SELECT * FROM pioneers WHERE pi_uid=$1 LIMIT 1", [pi_uid]);
  if (old.rows.length) {
    const current = normalizeWallet(old.rows[0].wallet_address);
    if (current && incoming && current !== incoming) throw new Error("This Pioneer wallet is already synchronized and cannot be changed from this app.");
    const r = await dbQuery(`UPDATE pioneers SET username=COALESCE(NULLIF($2,''),username),
      wallet_address=COALESCE(NULLIF($3,''),wallet_address),updated_at=NOW() WHERE pi_uid=$1
      RETURNING id,pi_uid,username,wallet_address,created_at,updated_at`, [pi_uid, username || "", incoming]);
    return r.rows[0];
  }
  const r = await dbQuery(`INSERT INTO pioneers(pi_uid,username,wallet_address) VALUES($1,$2,$3)
    RETURNING id,pi_uid,username,wallet_address,created_at,updated_at`, [pi_uid, username || "", incoming || null]);
  return r.rows[0];
}

async function requirePiAuth(req, res, next) {
  try {
    let token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) token = String(req.body?.accessToken || req.body?.access_token || "").trim();
    if (!token) return res.status(401).json({ ok: false, error: "Pi authentication required." });
    const piUser = await verifyPiAccessToken(token);
    if (!piUser.uid) return res.status(401).json({ ok: false, error: "Pi UID was not returned." });
    const pioneer = await upsertPioneer(piUser.uid, piUser.username, piUser.wallet_address);
    req.piUser = piUser; req.pioneer = pioneer; req.piToken = token; next();
  } catch (e) { console.error("Pi auth:", e.message); res.status(401).json({ ok: false, error: e.message || "Pi authentication failed." }); }
}

async function horizonGet(path) {
  const r = await fetch(AMT_HORIZON_URL + path, { headers: { Accept: "application/json" } });
  const text = await r.text(); let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { }
  if (!r.ok) throw new Error(data?.title || data?.detail || `Pi Testnet Horizon HTTP ${r.status}`);
  return data;
}

async function grantPet(pi_uid, pet_code, payment_id = null) {
  const p = await dbQuery("SELECT * FROM pets_catalog WHERE pet_code=$1 LIMIT 1", [pet_code]);
  if (!p.rows.length) throw new Error("Pet not found.");
  const u = await dbQuery("SELECT id FROM pioneers WHERE pi_uid=$1 LIMIT 1", [pi_uid]);
  if (!u.rows.length) throw new Error("Pioneer not found.");
  if (payment_id) {
    const existing = await dbQuery(`SELECT up.*,pc.name,pc.element,pc.image FROM user_pets up
      JOIN pets_catalog pc ON pc.pet_code=up.pet_code WHERE up.payment_id=$1 LIMIT 1`, [payment_id]);
    if (existing.rows.length) return existing.rows[0];
  }
  const x = p.rows[0];
  const r = await dbQuery(`INSERT INTO user_pets
    (pioneer_id,pet_code,payment_id,rarity,level,xp,hp,atk,def)
    VALUES($1,$2,$3,'Common',1,0,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *`,
    [u.rows[0].id, x.pet_code, payment_id || null, x.base_hp, x.base_atk, x.base_def]);
  if (!r.rows.length && payment_id) {
    const existing = await dbQuery(`SELECT up.*,pc.name,pc.element,pc.image FROM user_pets up
      JOIN pets_catalog pc ON pc.pet_code=up.pet_code WHERE up.payment_id=$1 LIMIT 1`, [payment_id]);
    if (existing.rows.length) return existing.rows[0];
  }
  if (!r.rows.length) throw new Error("Pet could not be granted.");
  return { ...r.rows[0], name: x.name, element: x.element, image: x.image };
}

function requestedPetId(req) { return req.body?.pet_id || req.body?.petId || req.body?.id || null; }

async function findOwnedPet(uid, req) {
  const id = requestedPetId(req), code = req.body?.pet_code || req.body?.petCode || null;
  if (!id && !code) throw new Error("pet_id or pet_code is required.");
  const r = await dbQuery(`SELECT up.*,pc.name,pc.element,pc.image,pc.base_hp,pc.base_atk,pc.base_def
    FROM user_pets up JOIN pioneers p ON p.id=up.pioneer_id JOIN pets_catalog pc ON pc.pet_code=up.pet_code
    WHERE ${id ? "up.id=$1" : "up.pet_code=$1"} AND p.pi_uid=$2 ${id ? "" : "ORDER BY up.created_at DESC"} LIMIT 1`,
    [id ? Number(id) : code, uid]);
  if (!r.rows.length) throw new Error("Owned pet not found.");
  return r.rows[0];
}

app.get("/", (req, res) => res.json({ ok: true, app: "AMT Pet Marketplace", version: "2.3.0", network: "Pi Testnet", status: "online" }));

app.get("/api/health", async (req, res) => {
  let db = false;
  try { if (pool) { await dbQuery("SELECT 1"); db = true; } } catch { }
  res.json({ ok: true, databaseConfigured: !!DATABASE_URL, databaseConnected: db, piApiConfigured: !!PI_API_KEY, petCount: PET_SEED.length });
});

app.get("/api/pets", async (req, res) => {
  try {
    const r = await dbQuery("SELECT pet_code,name,element,rarity,image,base_hp,base_atk,base_def FROM pets_catalog ORDER BY pet_code");
    res.json({ ok: true, count: r.rows.length, pets: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/api/my-pets/:uid", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT up.id,up.pet_code,pc.name,pc.element,pc.image,up.rarity,up.level,up.xp,up.hp,up.atk,up.def
FROM user_pets up JOIN pioneers p ON p.id=up.pioneer_id JOIN pets_catalog pc ON pc.pet_code=up.pet_code WHERE p.pi_uid=$1 ORDER BY up.created_at DESC`, [req.params.uid]);
    res.json({ ok: true, count: r.rows.length, pets: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post("/api/auth/verify", requirePiAuth, (req, res) => res.json({
  ok: true, uid: req.piUser.uid, username: req.piUser.username,
  walletAddress: req.pioneer.wallet_address || null, wallet_address: req.pioneer.wallet_address || null, pioneer: req.pioneer
}));

app.get("/api/profile", requirePiAuth, async (req, res) => {
  try {
    const r = await dbQuery("SELECT pi_uid,username,wallet_address,profile_image,coins,food FROM pioneers WHERE pi_uid=$1 LIMIT 1", [req.piUser.uid]);
    if (!r.rows.length) return res.status(404).json({ ok: false, error: "Pioneer profile not found." });
    res.json({ ok: true, profile: r.rows[0] });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post("/api/profile/image", requirePiAuth, async (req, res) => {
  try {
    const image = String(req.body?.image || "");
    if (!image.startsWith("data:image/")) return res.status(400).json({ ok: false, error: "Invalid profile image." });
    if (image.length > 900000) return res.status(400).json({ ok: false, error: "Profile image is too large after compression." });
    await dbQuery("UPDATE pioneers SET profile_image=$1,updated_at=NOW() WHERE pi_uid=$2", [image, req.piUser.uid]);
    res.json({ ok: true, message: "Profile picture saved to your Pioneer profile." });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

async function walletBindHandler(req, res) {
  try {
    const wallet = normalizeWallet(req.body?.wallet_address || req.body?.walletAddress || req.body?.address || req.piUser.wallet_address);
    if (!wallet) return res.status(400).json({ ok: false, error: "Pi did not provide a valid public wallet address. Make sure wallet_address scope is requested." });
    const pioneer = await upsertPioneer(req.piUser.uid, req.piUser.username, wallet);
    res.json({ ok: true, synced: true, uid: req.piUser.uid, username: req.piUser.username, wallet_address: pioneer.wallet_address, walletAddress: pioneer.wallet_address, network: "Pi Testnet" });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
}

app.post("/api/wallet/sync", requirePiAuth, walletBindHandler);
app.post("/api/wallet/bind", requirePiAuth, walletBindHandler);

app.get("/api/wallet/onchain", requirePiAuth, async (req, res) => {
  try {
    const wallet = req.pioneer.wallet_address || "";
    if (!isPublicStellarAddress(wallet)) return res.status(400).json({ ok: false, error: "No synchronized public Pi Testnet wallet address found." });
    const a = await horizonGet("/accounts/" + encodeURIComponent(wallet));
    const balance = (a.balances || []).filter(b => b.asset_type === "credit_alphanum4" && b.asset_code === AMT_ASSET_CODE && b.asset_issuer === AMT_ISSUER).reduce((s, b) => s + Number(b.balance || 0), 0);
    const piBalance = (a.balances || []).filter(b => b.asset_type === "native").reduce((s, b) => s + Number(b.balance || 0), 0);
    res.json({
      ok: true, wallet_address: wallet, walletAddress: wallet, pi_balance: piBalance, piBalance, balance, issuer: AMT_ISSUER, asset_code: AMT_ASSET_CODE,
      amt: { wallet, asset_code: AMT_ASSET_CODE, issuer: AMT_ISSUER, balance }, pi: { wallet, balance: piBalance, asset_code: "Pi" }
    });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

app.get("/api/wallet/config", (req, res) => res.json({ ok: true, asset_code: AMT_ASSET_CODE, issuer: AMT_ISSUER, receiver: AMT_RECEIVER, horizon: AMT_HORIZON_URL, network: "Pi Testnet" }));

async function care(req, res) {
  try {
    const p = await findOwnedPet(req.piUser.uid, req);
    const r = await dbQuery("UPDATE user_pets SET hp=$1,updated_at=NOW() WHERE id=$2 RETURNING *", [p.base_hp, p.id]);
    res.json({ ok: true, action: "CARE", message: "Pet cared for successfully. HP restored.", pet: { ...r.rows[0], name: p.name, element: p.element, image: p.image, max_hp: p.base_hp } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
}
app.post("/api/care", requirePiAuth, care);
app.post("/api/care/pet", requirePiAuth, care);
app.post("/api/pets/care", requirePiAuth, care);

async function train(req, res) {
  try {
    const p = await findOwnedPet(req.piUser.uid, req), gain = 25, total = Number(p.xp || 0) + gain, old = Number(p.level || 1), level = Math.max(1, Math.floor(total / 100) + 1), ups = Math.max(0, level - old);
    const r = await dbQuery(`UPDATE user_pets SET xp=$1,level=$2,atk=$3,def=$4,updated_at=NOW() WHERE id=$5 RETURNING *`,
      [total, level, Number(p.atk) + ups * 2, Number(p.def) + ups * 2, p.id]);
    res.json({ ok: true, action: "TRAIN", message: ups ? `Training complete. Pet reached Level ${level}!` : "Training complete. XP gained.", xpGained: gain, levelUps: ups, pet: { ...r.rows[0], name: p.name, element: p.element, image: p.image } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
}
app.post("/api/train", requirePiAuth, train);
app.post("/api/train/pet", requirePiAuth, train);
app.post("/api/pets/train", requirePiAuth, train);

/* ==========================================
   PRODUCTION-GRADE TURN-BASED BATTLE ENGINE
   ========================================== */

const ELEMENT_CHART = {
  Fire: { strongAgainst: ["Nature", "Ice"], weakAgainst: ["Water", "Earth"] },
  Water: { strongAgainst: ["Fire", "Earth"], weakAgainst: ["Thunder", "Nature"] },
  Earth: { strongAgainst: ["Thunder", "Fire"], weakAgainst: ["Wind", "Nature"] },
  Wind: { strongAgainst: ["Earth", "Nature"], weakAgainst: ["Thunder", "Ice"] },
  Nature: { strongAgainst: ["Water", "Earth"], weakAgainst: ["Fire", "Wind"] },
  Ice: { strongAgainst: ["Wind", "Nature"], weakAgainst: ["Fire", "Thunder"] },
  Thunder: { strongAgainst: ["Water", "Wind"], weakAgainst: ["Earth", "Ice"] }
};

function getElementMultiplier(attackerElement, defenderElement) {
  const chart = ELEMENT_CHART[attackerElement];
  if (!chart) return 1.0;
  if (chart.strongAgainst.includes(defenderElement)) return 1.5;
  if (chart.weakAgainst.includes(defenderElement)) return 0.7;
  return 1.0;
}

function calculateDamage(attacker, defender) {
  const elementMult = getElementMultiplier(attacker.element, defender.element);
  const isCrit = Math.random() < 0.10;
  const critMult = isCrit ? 1.5 : 1.0;
  const variance = 0.85 + Math.random() * 0.30;

  let rawDamage = (attacker.atk * 2) - defender.def;
  if (rawDamage < 5) rawDamage = 5;

  const finalDamage = Math.round(rawDamage * elementMult * critMult * variance);

  return {
    damage: finalDamage,
    isCrit,
    elementMult,
    isSuperEffective: elementMult > 1.0,
    isIneffective: elementMult < 1.0
  };
}

function simulateCombat(petA, petB) {
  let combatants = [
    { ...petA, currentHp: petA.hp, maxHp: petA.hp, isPlayer: true },
    { ...petB, currentHp: petB.hp, maxHp: petB.hp, isPlayer: false }
  ];

  if (combatants[1].atk > combatants[0].atk || (combatants[1].atk === combatants[0].atk && Math.random() > 0.5)) {
    combatants.reverse();
  }

  const logs = [];
  let turn = 1;
  const maxTurns = 20;

  while (combatants[0].currentHp > 0 && combatants[1].currentHp > 0 && turn <= maxTurns) {
    const attacker = combatants[0];
    const defender = combatants[1];

    const hit = calculateDamage(attacker, defender);
    defender.currentHp = Math.max(0, defender.currentHp - hit.damage);

    logs.push({
      turn,
      attackerName: attacker.name,
      defenderName: defender.name,
      damage: hit.damage,
      defenderRemainingHp: defender.currentHp,
      defenderMaxHp: defender.maxHp,
      isCrit: hit.isCrit,
      isSuperEffective: hit.isSuperEffective,
      isIneffective: hit.isIneffective,
      actionText: `${attacker.name} attacked ${defender.name} dealing ${hit.damage} damage!${hit.isCrit ? " CRITICAL HIT!" : ""}${hit.isSuperEffective ? " It's super effective!" : ""}`
    });

    if (defender.currentHp <= 0) break;

    combatants.reverse();
    turn++;
  }

  const winner = combatants.find(c => c.currentHp > 0) || combatants[0];
  const isPlayerWin = winner.isPlayer;

  return {
    winner: winner.name,
    isPlayerWin,
    totalTurns: turn,
    logs
  };
}

async function arenaBattle(req, res) {
  try {
    const playerPet = await findOwnedPet(req.piUser.uid, req);

    const elements = ["Fire", "Water", "Earth", "Wind", "Nature", "Ice", "Thunder"];
    const bossNames = ["Titan Golem", "Infernal Wyrm", "Abyssal Hydra", "Storm Sovereign", "Vortex Behemoth"];
    
    const randomElem = elements[Math.floor(Math.random() * elements.length)];
    const bossName = bossNames[Math.floor(Math.random() * bossNames.length)];

    const bossPet = {
      name: `[Boss] ${bossName}`,
      element: randomElem,
      level: Math.max(1, Number(playerPet.level) + Math.floor(Math.random() * 3) - 1),
      hp: Math.round(playerPet.hp * (0.9 + Math.random() * 0.3)),
      atk: Math.round(playerPet.atk * (0.85 + Math.random() * 0.3)),
      def: Math.round(playerPet.def * (0.85 + Math.random() * 0.3))
    };

    const simulation = simulateCombat(playerPet, bossPet);

    const xpGain = simulation.isPlayerWin ? (40 + playerPet.level * 5) : 15;
    const coinsGain = simulation.isPlayerWin ? (60 + playerPet.level * 10) : 20;
    const foodGain = simulation.isPlayerWin ? 4 : 1;

    const totalXp = Number(playerPet.xp || 0) + xpGain;
    const newLevel = Math.max(1, Math.floor(totalXp / 100) + 1);
    const levelUps = Math.max(0, newLevel - Number(playerPet.level));

    const updatedPet = await dbQuery(
      `UPDATE user_pets SET xp=$1, level=$2, atk=$3, def=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [totalXp, newLevel, Number(playerPet.atk) + (levelUps * 2), Number(playerPet.def) + (levelUps * 2), playerPet.id]
    );

    await dbQuery(
      `UPDATE pioneers SET coins=coins+$1, food=food+$2, updated_at=NOW() WHERE pi_uid=$3`,
      [coinsGain, foodGain, req.piUser.uid]
    );

    res.json({
      ok: true,
      mode: "ARENA_PRO",
      result: simulation.isPlayerWin ? "WIN" : "LOSS",
      message: simulation.isPlayerWin 
        ? `Victory! ${playerPet.name} defeated ${bossPet.name} in ${simulation.totalTurns} turns!`
        : `${playerPet.name} was defeated by ${bossPet.name}.`,
      rewards: { xp: xpGain, coins: coinsGain, food: foodGain, levelUps },
      combatLogs: simulation.logs,
      pet: { ...updatedPet.rows[0], name: playerPet.name, element: playerPet.element, image: playerPet.image },
      opponent: bossPet
    });

  } catch (e) {
    console.error("Arena error:", e);
    res.status(400).json({ ok: false, error: e.message });
  }
}

async function adventureBattle(req, res) {
  try {
    const playerPet = await findOwnedPet(req.piUser.uid, req);

    const opponentQuery = await dbQuery(
      `SELECT up.*, p.id AS opponent_pioneer_id, p.username AS opponent_username, pc.name, pc.element, pc.image 
       FROM user_pets up 
       JOIN pioneers p ON p.id=up.pioneer_id 
       JOIN pets_catalog pc ON pc.pet_code=up.pet_code 
       WHERE p.pi_uid <> $1 
       ORDER BY RANDOM() LIMIT 1`,
      [req.piUser.uid]
    );

    if (!opponentQuery.rows.length) {
      return res.status(409).json({
        ok: false,
        error: "No rival Pioneer found.",
        message: "Kailangan muna ng ibang Pioneer na may pet para sa PvP Adventure."
      });
    }

    const opponentPet = opponentQuery.rows[0];

    const simulation = simulateCombat(playerPet, opponentPet);

    const xpGain = simulation.isPlayerWin ? (55 + playerPet.level * 6) : 20;
    const coinsGain = simulation.isPlayerWin ? (100 + playerPet.level * 12) : 30;
    const foodGain = simulation.isPlayerWin ? 6 : 2;

    const totalXp = Number(playerPet.xp || 0) + xpGain;
    const newLevel = Math.max(1, Math.floor(totalXp / 100) + 1);
    const levelUps = Math.max(0, newLevel - Number(playerPet.level));

    const updatedPet = await dbQuery(
      `UPDATE user_pets SET xp=$1, level=$2, atk=$3, def=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
      [totalXp, newLevel, Number(playerPet.atk) + (levelUps * 2), Number(playerPet.def) + (levelUps * 2), playerPet.id]
    );

    await dbQuery(
      `INSERT INTO pet_battles(attacker_pioneer_id, attacker_pet_id, defender_pioneer_id, defender_pet_id, winner_pioneer_id, xp_earned) 
       VALUES($1, $2, $3, $4, $5, $6)`,
      [
        req.pioneer.id,
        playerPet.id,
        opponentPet.opponent_pioneer_id,
        opponentPet.id,
        simulation.isPlayerWin ? req.pioneer.id : opponentPet.opponent_pioneer_id,
        xpGain
      ]
    );

    await dbQuery(
      `UPDATE pioneers SET coins=coins+$1, food=food+$2, updated_at=NOW() WHERE pi_uid=$3`,
      [coinsGain, foodGain, req.piUser.uid]
    );

    res.json({
      ok: true,
      mode: "PVP_ADVENTURE_PRO",
      result: simulation.isPlayerWin ? "WIN" : "LOSS",
      message: simulation.isPlayerWin
        ? `PvP Victory! ${playerPet.name} defeated @${opponentPet.opponent_username || "Pioneer"}'s ${opponentPet.name}!`
        : `${playerPet.name} lost against @${opponentPet.opponent_username || "Pioneer"}'s ${opponentPet.name}.`,
      rewards: { xp: xpGain, coins: coinsGain, food: foodGain, levelUps },
      combatLogs: simulation.logs,
      pet: { ...updatedPet.rows[0], name: playerPet.name, element: playerPet.element, image: playerPet.image },
      opponent: {
        id: opponentPet.id,
        name: opponentPet.name,
        element: opponentPet.element,
        image: opponentPet.image,
        level: opponentPet.level,
        username: opponentPet.opponent_username || "Pioneer"
      }
    });

  } catch (e) {
    console.error("PvP Adventure error:", e);
    res.status(400).json({ ok: false, error: e.message });
  }
}

app.post("/api/battle/arena", requirePiAuth, arenaBattle);
app.post("/api/battle/adventure", requirePiAuth, adventureBattle);
app.post("/api/pets/battle", requirePiAuth, arenaBattle);
app.post("/api/battle", requirePiAuth, arenaBattle);
app.post("/api/battle/pet", requirePiAuth, arenaBattle);

/* BREEDING -> EGG -> 24H INCUBATOR */
function rarityRank(r) { return { Common: 1, Rare: 2, Epic: 3, Legendary: 4 }[String(r || "Common")] || 1; }

function chooseEggRarity(a, b) {
  const base = Math.min(rarityRank(a.rarity), rarityRank(b.rarity));
  const bump = Math.random() < 0.18 ? 1 : 0;
  return Object.keys({ Common: 1, Rare: 2, Epic: 3, Legendary: 4 }).find(k => ({ Common: 1, Rare: 2, Epic: 3, Legendary: 4 }[k] === Math.min(4, base + bump))) || "Common";
}

function newEggCode() { return "AMT-EGG-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(); }

async function ownedEgg(uid, req) {
  const id = req.body?.egg_id || req.body?.eggId || req.body?.id || null;
  if (!id) throw new Error("egg_id is required.");
  const r = await dbQuery(`SELECT e.*,p1.pet_code AS parent1_pet_code,p2.pet_code AS parent2_pet_code,
    c.name AS future_name,c.image AS future_image
    FROM pet_eggs e JOIN pioneers p ON p.id=e.pioneer_id
    JOIN user_pets p1 ON p1.id=e.parent1_id JOIN user_pets p2 ON p2.id=e.parent2_id
    JOIN pets_catalog c ON c.pet_code=e.future_pet_code
    WHERE e.id=$1 AND p.pi_uid=$2 LIMIT 1`, [Number(id), uid]);
  if (!r.rows.length) throw new Error("Owned egg not found.");
  return r.rows[0];
}

function normalizeEggStatus(row) {
  if (row.status === "INCUBATING" && row.hatch_ready_at && new Date(row.hatch_ready_at).getTime() <= Date.now()) return "READY";
  return row.status;
}

app.post("/api/pets/breed", requirePiAuth, async (req, res) => {
  try {
    const p1 = await findOwnedPet(req.piUser.uid, { body: { pet_id: req.body?.parent1_id } });
    const p2 = await findOwnedPet(req.piUser.uid, { body: { pet_id: req.body?.parent2_id } });
    if (String(p1.id) === String(p2.id)) return res.status(400).json({ ok: false, error: "Choose two different parent pets." });
    const cats = await dbQuery(`SELECT * FROM pets_catalog WHERE element IN ($1,$2) ORDER BY RANDOM() LIMIT 1`, [p1.element, p2.element]);
    if (!cats.rows.length) return res.status(400).json({ ok: false, error: "No compatible offspring pet is available." });
    const c = cats.rows[0], rarity = chooseEggRarity(p1, p2), eggCode = newEggCode();
    const r = await dbQuery(`INSERT INTO pet_eggs(egg_code,pioneer_id,parent1_id,parent2_id,future_pet_code,element,rarity,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,'NEW') RETURNING *`,
      [eggCode, req.pioneer.id, p1.id, p2.id, c.pet_code, c.element, rarity]);
    await dbQuery(`INSERT INTO pet_breeding(parent1_id,parent2_id,offspring_id,pioneer_id) VALUES($1,$2,NULL,$3)`,
      [p1.id, p2.id, req.pioneer.id]);
    res.json({ ok: true, message: `Breeding complete! Egg ${eggCode} was created.`, egg: { ...r.rows[0], future_name: c.name, future_image: c.image, incubator_hours: 24 } });
  } catch (e) { console.error("breed:", e); res.status(400).json({ ok: false, error: e.message }); }
});

app.get("/api/my-eggs", requirePiAuth, async (req, res) => {
  try {
    const r = await dbQuery(`SELECT e.*,p1.pet_code AS parent1_pet_code,p2.pet_code AS parent2_pet_code,
      c.name AS future_name,c.image AS future_image
      FROM pet_eggs e JOIN pioneers p ON p.id=e.pioneer_id
      JOIN user_pets p1 ON p1.id=e.parent1_id JOIN user_pets p2 ON p2.id=e.parent2_id
      JOIN pets_catalog c ON c.pet_code=e.future_pet_code
      WHERE p.pi_uid=$1 ORDER BY e.created_at DESC`, [req.piUser.uid]);
    const eggs = [];
    for (const row of r.rows) {
      const status = normalizeEggStatus(row);
      if (status !== row.status) await dbQuery("UPDATE pet_eggs SET status='READY' WHERE id=$1", [row.id]);
      eggs.push({ ...row, status, ready_in_ms: status === "INCUBATING" ? Math.max(0, new Date(row.hatch_ready_at).getTime() - Date.now()) : 0 });
    }
    res.json({ ok: true, count: eggs.length, eggs });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post("/api/eggs/incubate", requirePiAuth, async (req, res) => {
  try {
    const e = await ownedEgg(req.piUser.uid, req);
    const status = normalizeEggStatus(e);
    if (status !== "NEW") return res.status(400).json({ ok: false, error: `Egg status is ${status}; only NEW eggs can enter the incubator.` });
    const r = await dbQuery(`UPDATE pet_eggs SET status='INCUBATING',incubated_at=NOW(),hatch_ready_at=NOW()+INTERVAL '24 hours' WHERE id=$1 RETURNING *`, [e.id]);
    res.json({ ok: true, message: `${e.egg_code} is now incubating for 24 hours.`, egg: { ...r.rows[0], future_name: e.future_name, future_image: e.future_image } });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

app.post("/api/eggs/hatch", requirePiAuth, async (req, res) => {
  try {
    const e = await ownedEgg(req.piUser.uid, req);
    const status = normalizeEggStatus(e);
    if (status !== "READY") return res.status(400).json({ ok: false, error: "Egg incubation is not complete yet." });
    
    const pet = await grantPet(req.piUser.uid, e.future_pet_code);
    await dbQuery("UPDATE pet_eggs SET status='HATCHED',hatch_at=NOW() WHERE id=$1", [e.id]);
    await dbQuery("UPDATE pet_breeding SET offspring_id=$1 WHERE parent1_id=$2 AND parent2_id=$3 AND offspring_id IS NULL", [pet.id, e.parent1_id, e.parent2_id]);
    
    res.json({ ok: true, message: `Egg hatched into ${pet.name}!`, pet });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

/* PI PAYMENT FLOW FOR PETS */
app.post("/api/payments/approve", requirePiAuth, async (req, res) => {
  try {
    const paymentId = req.body?.paymentId || req.body?.payment_id;
    if (!paymentId) return res.status(400).json({ ok: false, error: "paymentId is required." });
    
    const approved = await piFetch(`/v2/payments/${paymentId}/approve`, { method: "POST" });
    await dbQuery(`UPDATE pet_payments SET status='APPROVED',updated_at=NOW() WHERE payment_id=$1`, [paymentId]);
    res.json({ ok: true, approved });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

app.post("/api/payments/complete", requirePiAuth, async (req, res) => {
  try {
    const paymentId = req.body?.paymentId || req.body?.payment_id;
    const txid = req.body?.txid;
    if (!paymentId || !txid) return res.status(400).json({ ok: false, error: "paymentId and txid are required." });

    const completed = await piFetch(`/v2/payments/${paymentId}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid })
    });

    const p = await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1", [paymentId]);
    if (p.rows.length) {
      await dbQuery("UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW() WHERE payment_id=$2", [txid, paymentId]);
      const pet = await grantPet(p.rows[0].pi_uid, p.rows[0].pet_code, paymentId);
      return res.json({ ok: true, completed, pet });
    }
    res.json({ ok: true, completed });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

/* MARKETPLACE LISTINGS */
app.get("/api/marketplace/listings", async (req, res) => {
  try {
    const r = await dbQuery(`SELECT l.*, up.pet_code, pc.name, pc.element, pc.image, up.level, up.rarity, p.username AS seller
      FROM pet_listings l
      JOIN user_pets up ON up.id=l.pet_id
      JOIN pets_catalog pc ON pc.pet_code=up.pet_code
      JOIN pioneers p ON p.id=l.pioneer_id
      WHERE l.status='ACTIVE' ORDER BY l.created_at DESC`);
    res.json({ ok: true, count: r.rows.length, listings: r.rows });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post("/api/marketplace/list", requirePiAuth, async (req, res) => {
  try {
    const pet = await findOwnedPet(req.piUser.uid, req);
    const priceAmt = Number(req.body?.price_amt || req.body?.priceAmt || 0);
    if (priceAmt <= 0) return res.status(400).json({ ok: false, error: "Invalid price in AMT." });

    const r = await dbQuery(`INSERT INTO pet_listings(pet_id,pioneer_id,price_amt,status)
      VALUES($1,$2,$3,'ACTIVE')
      ON CONFLICT(pet_id) DO UPDATE SET price_amt=EXCLUDED.price_amt,status='ACTIVE',updated_at=NOW()
      RETURNING *`, [pet.id, req.pioneer.id, priceAmt]);
    res.json({ ok: true, message: `${pet.name} listed on Marketplace for ${priceAmt} AMT.`, listing: r.rows[0] });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// START SERVER & DATABASE INITIALIZATION
(async () => {
  try {
    await initializeDatabase();
    await seedPetCatalog();
    app.listen(PORT, () => {
      console.log(`🚀 AMT Pet Marketplace Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
})();