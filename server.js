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
const PET_AMT_PRICE = "10";
const AMT_ASSET_CODE = process.env.AMT_ASSET_CODE || "AMT";

app.use(cors({origin:"*",methods:["GET","POST","OPTIONS"],allowedHeaders:["Content-Type","Authorization"]}));
app.use(express.json({limit:"1mb"}));

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false}});
  pool.on("error",err=>console.error("PostgreSQL pool error:",err));
}
async function dbQuery(text,params=[]) {
  if (!pool) throw new Error("DATABASE_URL is not configured.");
  return pool.query(text,params);
}

const PET_SEED = [{"code":"earth-01","name":"Terrax","element":"Earth","image":"terrax.png","hp":120,"atk":20,"def":22},{"code":"earth-02","name":"Rockhorn","element":"Earth","image":"rockhorn.png","hp":125,"atk":19,"def":24},{"code":"earth-03","name":"Stonefist","element":"Earth","image":"stonefist.png","hp":130,"atk":22,"def":25},{"code":"earth-04","name":"Earthdrake","element":"Earth","image":"earthdrake.png","hp":128,"atk":23,"def":23},{"code":"earth-05","name":"Boulderlynx","element":"Earth","image":"boulderlynx.png","hp":118,"atk":24,"def":20},{"code":"earth-06","name":"Terrapin","element":"Earth","image":"terrapin.png","hp":140,"atk":16,"def":28},{"code":"earth-07","name":"Gravelpaw","element":"Earth","image":"gravelpaw.png","hp":115,"atk":21,"def":21},{"code":"earth-08","name":"Pebblix","element":"Earth","image":"pebblix.png","hp":110,"atk":18,"def":20},{"code":"earth-09","name":"Mountainhoof","element":"Earth","image":"mountainhoof.png","hp":145,"atk":18,"def":30},{"code":"earth-10","name":"Terroscale","element":"Earth","image":"terroscale.png","hp":135,"atk":25,"def":24},{"code":"water-01","name":"Aqualis","element":"Water","image":"aqualis.png","hp":110,"atk":23,"def":18},{"code":"water-02","name":"Tideback","element":"Water","image":"tideback.png","hp":135,"atk":18,"def":27},{"code":"water-03","name":"Oceanix","element":"Water","image":"oceanix.png","hp":125,"atk":24,"def":20},{"code":"water-04","name":"Neptunox","element":"Water","image":"neptunox.png","hp":130,"atk":27,"def":21},{"code":"water-05","name":"Jellyfin","element":"Water","image":"jellyfin.png","hp":105,"atk":19,"def":19},{"code":"water-06","name":"Sharky","element":"Water","image":"sharky.png","hp":120,"atk":29,"def":17},{"code":"water-07","name":"Seapony","element":"Water","image":"seapony.png","hp":115,"atk":22,"def":21},{"code":"water-08","name":"Krakenling","element":"Water","image":"krakenling.png","hp":140,"atk":26,"def":23},{"code":"water-09","name":"Riptide","element":"Water","image":"riptide.png","hp":118,"atk":30,"def":18},{"code":"water-10","name":"Abyssal","element":"Water","image":"abyssal.png","hp":145,"atk":28,"def":25},{"code":"nature-01","name":"Leaflyn","element":"Nature","image":"leaflyn.png","hp":115,"atk":20,"def":22},{"code":"nature-02","name":"Treetle","element":"Nature","image":"treetle.png","hp":130,"atk":18,"def":27},{"code":"nature-03","name":"Sylvann","element":"Nature","image":"sylvann.png","hp":120,"atk":25,"def":20},{"code":"nature-04","name":"Verdira","element":"Nature","image":"verdira.png","hp":118,"atk":23,"def":23},{"code":"nature-05","name":"Bloomtail","element":"Nature","image":"bloomtail.png","hp":112,"atk":21,"def":22},{"code":"nature-06","name":"Groveon","element":"Nature","image":"groveon.png","hp":128,"atk":22,"def":25},{"code":"nature-07","name":"Nutty","element":"Nature","image":"nutty.png","hp":108,"atk":19,"def":20},{"code":"nature-08","name":"Flora","element":"Nature","image":"flora.png","hp":110,"atk":26,"def":19},{"code":"nature-09","name":"Forestfang","element":"Nature","image":"forestfang.png","hp":125,"atk":28,"def":21},{"code":"nature-10","name":"Everbloom","element":"Nature","image":"everbloom.png","hp":138,"atk":25,"def":26},{"code":"ice-01","name":"Frostbite","element":"Ice","image":"frostbite.png","hp":115,"atk":24,"def":21},{"code":"ice-02","name":"Glaciard","element":"Ice","image":"glaciard.png","hp":130,"atk":20,"def":27},{"code":"ice-03","name":"Snowwing","element":"Ice","image":"snowwing.png","hp":108,"atk":27,"def":18},{"code":"ice-04","name":"Frostdrake","element":"Ice","image":"frostdrake.png","hp":135,"atk":28,"def":24},{"code":"ice-05","name":"Chillpengu","element":"Ice","image":"chillpengu.png","hp":105,"atk":19,"def":20},{"code":"ice-06","name":"Frostwolf","element":"Ice","image":"frostwolf.png","hp":125,"atk":30,"def":21},{"code":"ice-07","name":"Icetusk","element":"Ice","image":"icetusk.png","hp":142,"atk":22,"def":29},{"code":"ice-08","name":"Frostseal","element":"Ice","image":"frostseal.png","hp":120,"atk":21,"def":25},{"code":"ice-09","name":"Glacieron","element":"Ice","image":"glacieron.png","hp":132,"atk":26,"def":26},{"code":"ice-10","name":"Frostbear","element":"Ice","image":"frostbear.png","hp":150,"atk":24,"def":31},{"code":"fire-01","name":"Flammy","element":"Fire","image":"flammy.png","hp":108,"atk":27,"def":17},{"code":"fire-02","name":"Pyroclaw","element":"Fire","image":"pyroclaw.png","hp":115,"atk":30,"def":18},{"code":"fire-03","name":"Blazewing","element":"Fire","image":"blazewing.png","hp":110,"atk":32,"def":17},{"code":"fire-04","name":"Infernox","element":"Fire","image":"infernox.png","hp":128,"atk":31,"def":21},{"code":"fire-05","name":"Phoenixia","element":"Fire","image":"phoenixia.png","hp":125,"atk":34,"def":20},{"code":"fire-06","name":"Magmortar","element":"Fire","image":"magmortar.png","hp":145,"atk":28,"def":28},{"code":"fire-07","name":"Salamorra","element":"Fire","image":"salamorra.png","hp":130,"atk":33,"def":23},{"code":"fire-08","name":"Emberhorn","element":"Fire","image":"emberhorn.png","hp":120,"atk":29,"def":22},{"code":"fire-09","name":"Flamefang","element":"Fire","image":"flamefang.png","hp":118,"atk":35,"def":19},{"code":"fire-10","name":"Pyromite","element":"Fire","image":"pyromite.png","hp":135,"atk":32,"def":25},{"code":"wind-01","name":"Zephyrin","element":"Wind","image":"zephyrin.png","hp":105,"atk":25,"def":18},{"code":"wind-02","name":"Skyflare","element":"Wind","image":"skyflare.png","hp":110,"atk":29,"def":17},{"code":"wind-03","name":"Windrake","element":"Wind","image":"windrake.png","hp":125,"atk":30,"def":21},{"code":"wind-04","name":"Aerolith","element":"Wind","image":"aerolith.png","hp":115,"atk":26,"def":22},{"code":"wind-05","name":"Skywhisp","element":"Wind","image":"skywhisp.png","hp":100,"atk":24,"def":16},{"code":"wind-06","name":"Stormtalon","element":"Wind","image":"stormtalon.png","hp":120,"atk":34,"def":19},{"code":"wind-07","name":"Cloudstride","element":"Wind","image":"cloudstride.png","hp":112,"atk":28,"def":20},{"code":"wind-08","name":"Breezeling","element":"Wind","image":"breezeling.png","hp":102,"atk":23,"def":18},{"code":"wind-09","name":"Tornadope","element":"Wind","image":"tornadope.png","hp":118,"atk":33,"def":18},{"code":"wind-10","name":"Zephyria","element":"Wind","image":"zephyria.png","hp":130,"atk":31,"def":23},{"code":"thunder-01","name":"Voltix","element":"Thunder","image":"voltix.png","hp":110,"atk":30,"def":18},{"code":"thunder-02","name":"Zephron","element":"Thunder","image":"zephron.png","hp":115,"atk":28,"def":19},{"code":"thunder-03","name":"Stormee","element":"Thunder","image":"stormee.png","hp":108,"atk":32,"def":17},{"code":"thunder-04","name":"Thunderdrake","element":"Thunder","image":"thunderdrake.png","hp":130,"atk":35,"def":23},{"code":"thunder-05","name":"Sparkster","element":"Thunder","image":"sparkster.png","hp":105,"atk":29,"def":18},{"code":"thunder-06","name":"Raihorn","element":"Thunder","image":"raihorn.png","hp":140,"atk":27,"def":30},{"code":"thunder-07","name":"Voltlynx","element":"Thunder","image":"voltlynx.png","hp":118,"atk":34,"def":20},{"code":"thunder-08","name":"Electrix","element":"Thunder","image":"electrix.png","hp":112,"atk":31,"def":19},{"code":"thunder-09","name":"Skyshock","element":"Thunder","image":"skyshock.png","hp":120,"atk":36,"def":18},{"code":"thunder-10","name":"Thunderix","element":"Thunder","image":"thunderix.png","hp":135,"atk":38,"def":24}];

async function initializeDatabase() {
  if (!pool) { console.log("DATABASE_URL is not configured."); return; }

  await dbQuery(`CREATE TABLE IF NOT EXISTS pioneers(
    id BIGSERIAL PRIMARY KEY, pi_uid TEXT UNIQUE NOT NULL, username TEXT,
    wallet_address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS pets_catalog(
    id BIGSERIAL PRIMARY KEY, pet_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    element TEXT NOT NULL, rarity TEXT NOT NULL DEFAULT 'Common', image TEXT NOT NULL,
    base_hp INTEGER NOT NULL DEFAULT 100, base_atk INTEGER NOT NULL DEFAULT 10,
    base_def INTEGER NOT NULL DEFAULT 10, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`);

  await dbQuery(`CREATE TABLE IF NOT EXISTS user_pets(
    id BIGSERIAL PRIMARY KEY, pioneer_id BIGINT NOT NULL REFERENCES pioneers(id) ON DELETE CASCADE,
    pet_code TEXT NOT NULL REFERENCES pets_catalog(pet_code), rarity TEXT NOT NULL DEFAULT 'Common',
    level INTEGER NOT NULL DEFAULT 1, xp BIGINT NOT NULL DEFAULT 0,
    hp INTEGER NOT NULL DEFAULT 100, atk INTEGER NOT NULL DEFAULT 10, def INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_pets_catalog_element ON pets_catalog(element);`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_user_pets_pioneer ON user_pets(pioneer_id);`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_pet_payments_uid ON pet_payments(pi_uid);`);
  console.log("Database tables ready.");
}

async function seedPetCatalog() {
  if (!pool) return;
  for (const pet of PET_SEED) {
    await dbQuery(`INSERT INTO pets_catalog
      (pet_code,name,element,rarity,image,base_hp,base_atk,base_def)
      VALUES($1,$2,$3,'Common',$4,$5,$6,$7)
      ON CONFLICT(pet_code) DO UPDATE SET name=EXCLUDED.name,element=EXCLUDED.element,
      rarity=EXCLUDED.rarity,image=EXCLUDED.image,base_hp=EXCLUDED.base_hp,
      base_atk=EXCLUDED.base_atk,base_def=EXCLUDED.base_def`,
      [pet.code,pet.name,pet.element,pet.image,pet.hp,pet.atk,pet.def]);
  }
  console.log(`Pet catalog ready: ${PET_SEED.length} pets.`);
}

async function piFetch(path,options={}) {
  if (!PI_API_KEY) throw new Error("PI_API_KEY is not configured on Render.");
  const r = await fetch(PI_API_BASE + path, {
    ...options,
    headers: {Accept:"application/json","Content-Type":"application/json","Authorization":"Key "+PI_API_KEY,...(options.headers||{})}
  });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = {raw:text}; }
  if (!r.ok) {
    const err = new Error(data?.error || data?.message || `Pi API HTTP ${r.status}`);
    err.status = r.status; err.data = data; throw err;
  }
  return data;
}

async function verifyPiAccessToken(token) {
  if (!token) throw new Error("Missing Pi access token.");
  if (!PI_API_KEY) throw new Error("PI_API_KEY is not configured.");
  const r = await fetch(PI_API_BASE+"/v2/me", {
    headers: {Authorization:"Bearer "+token,Accept:"application/json"}
  });
  const text = await r.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!r.ok) throw new Error(data?.error || "Pi authentication verification failed.");
  return {
    uid:data.uid || data.user?.uid || "",
    username:data.username || data.user?.username || "",
    wallet_address:data.wallet_address || data.user?.wallet_address || ""
  };
}

async function upsertPioneer(pi_uid,username,wallet_address) {
  const r = await dbQuery(`INSERT INTO pioneers(pi_uid,username,wallet_address)
    VALUES($1,$2,$3) ON CONFLICT(pi_uid) DO UPDATE SET
    username=COALESCE(EXCLUDED.username,pioneers.username),
    wallet_address=COALESCE(EXCLUDED.wallet_address,pioneers.wallet_address),
    updated_at=NOW()
    RETURNING id,pi_uid,username,wallet_address,created_at,updated_at`,
    [pi_uid,username||null,wallet_address||null]);
  return r.rows[0];
}

async function requirePiAuth(req,res,next) {
  try {
    const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,"").trim();
    if (!token) return res.status(401).json({ok:false,error:"Pi authentication required."});
    const piUser=await verifyPiAccessToken(token);
    if (!piUser.uid) return res.status(401).json({ok:false,error:"Pi UID was not returned."});
    const pioneer=await upsertPioneer(piUser.uid,piUser.username,piUser.wallet_address);
    req.piUser=piUser; req.pioneer=pioneer; req.piToken=token;
    next();
  } catch(e) {
    console.error("Pi auth:",e.message);
    res.status(401).json({ok:false,error:e.message||"Pi authentication failed."});
  }
}

async function grantPet(pi_uid,pet_code) {
  const p=await dbQuery(`SELECT pet_code,name,element,rarity,image,base_hp,base_atk,base_def
    FROM pets_catalog WHERE pet_code=$1 LIMIT 1`,[pet_code]);
  if (!p.rows.length) throw new Error("Pet not found.");
  const pioneer=await dbQuery(`SELECT id FROM pioneers WHERE pi_uid=$1 LIMIT 1`,[pi_uid]);
  if (!pioneer.rows.length) throw new Error("Pioneer not found.");
  const pet=p.rows[0], pid=pioneer.rows[0].id;
  const existing=await dbQuery(`SELECT id FROM user_pets WHERE pioneer_id=$1 AND pet_code=$2
    LIMIT 1`,[pid,pet.pet_code]);
  // A catalog pet can be bought more than once; each row is a distinct collectible.
  const r=await dbQuery(`INSERT INTO user_pets(pioneer_id,pet_code,rarity,level,xp,hp,atk,def)
    VALUES($1,$2,'Common',1,0,$3,$4,$5) RETURNING *`,
    [pid,pet.pet_code,pet.base_hp,pet.base_atk,pet.base_def]);
  return {...r.rows[0],name:pet.name,element:pet.element,image:pet.image};
}

app.get("/",(req,res)=>res.json({ok:true,app:"AMT Pet Marketplace",version:"2.0.0",network:"Pi Testnet",status:"online"}));

app.get("/api/health",async(req,res)=>{
  let database=false;
  if(pool) try{await dbQuery("SELECT 1");database=true;}catch{}
  res.json({ok:true,service:"amt-pet-marketplace",databaseConfigured:!!DATABASE_URL,
    databaseConnected:database,piApiConfigured:!!PI_API_KEY,petCount:PET_SEED.length,
    prices:{pi:PET_PI_PRICE,amt:PET_AMT_PRICE},timestamp:new Date().toISOString()});
});

app.get("/api/pets",async(req,res)=>{
  try {
    const r=await dbQuery(`SELECT pet_code,name,element,rarity,image,base_hp,base_atk,base_def,
        ${PET_PI_PRICE}::numeric AS pi_price, ${PET_PI_PRICE}::numeric AS price_pi, ${PET_AMT_PRICE}::numeric AS amt_price
      FROM pets_catalog ORDER BY CASE element WHEN 'Earth' THEN 1 WHEN 'Water' THEN 2
      WHEN 'Nature' THEN 3 WHEN 'Ice' THEN 4 WHEN 'Fire' THEN 5 WHEN 'Wind' THEN 6
      WHEN 'Thunder' THEN 7 ELSE 99 END,pet_code`);
    res.json({ok:true,count:r.rows.length,pets:r.rows});
  } catch(e) { console.error(e); res.status(500).json({ok:false,error:"Unable to load pet catalog."}); }
});

app.get("/api/pets/element/:element",async(req,res)=>{
  try {
    const r=await dbQuery(`SELECT pet_code,name,element,rarity,image,base_hp,base_atk,base_def,
        ${PET_PI_PRICE}::numeric AS pi_price, ${PET_PI_PRICE}::numeric AS price_pi, ${PET_AMT_PRICE}::numeric AS amt_price
      FROM pets_catalog WHERE LOWER(element)=LOWER($1) ORDER BY pet_code`,[req.params.element]);
    res.json({ok:true,element:req.params.element,count:r.rows.length,pets:r.rows});
  } catch(e) { res.status(500).json({ok:false,error:"Unable to load pets."}); }
});

app.get("/api/pets/:petCode",async(req,res)=>{
  try {
    const r=await dbQuery(`SELECT pet_code,name,element,rarity,image,base_hp,base_atk,base_def,
        ${PET_PI_PRICE}::numeric AS pi_price, ${PET_PI_PRICE}::numeric AS price_pi, ${PET_AMT_PRICE}::numeric AS amt_price
      FROM pets_catalog WHERE pet_code=$1 LIMIT 1`,[req.params.petCode]);
    if(!r.rows.length) return res.status(404).json({ok:false,error:"Pet not found."});
    res.json({ok:true,pet:r.rows[0]});
  } catch(e) { res.status(500).json({ok:false,error:"Unable to load pet."}); }
});

app.post("/api/auth/verify",requirePiAuth,async(req,res)=>{
  res.json({ok:true,uid:req.piUser.uid,username:req.piUser.username,
    walletAddress:req.piUser.wallet_address||null,wallet_address:req.piUser.wallet_address||null,
    pioneer:req.pioneer});
});

app.post("/api/pioneers",async(req,res)=>{
  try {
    const {pi_uid,username,wallet_address}=req.body||{};
    if(!pi_uid) return res.status(400).json({ok:false,error:"pi_uid is required."});
    const pioneer=await upsertPioneer(pi_uid,username,wallet_address);
    res.json({ok:true,pioneer});
  } catch(e) { console.error(e);res.status(500).json({ok:false,error:"Unable to save Pioneer."}); }
});

app.get("/api/pioneers/:pi_uid",async(req,res)=>{
  try {
    const r=await dbQuery(`SELECT id,pi_uid,username,wallet_address,created_at,updated_at
      FROM pioneers WHERE pi_uid=$1 LIMIT 1`,[req.params.pi_uid]);
    if(!r.rows.length) return res.status(404).json({ok:false,error:"Pioneer not found."});
    res.json({ok:true,pioneer:r.rows[0]});
  } catch(e) { res.status(500).json({ok:false,error:"Unable to load Pioneer."}); }
});

app.get("/api/my-pets/:pi_uid",async(req,res)=>{
  try {
    const r=await dbQuery(`SELECT up.id,up.pet_code,pc.name,pc.element,pc.image,up.rarity,up.level,
      up.xp,up.hp,up.atk,up.def,up.created_at,up.updated_at
      FROM user_pets up JOIN pioneers p ON p.id=up.pioneer_id
      JOIN pets_catalog pc ON pc.pet_code=up.pet_code
      WHERE p.pi_uid=$1 ORDER BY up.created_at DESC`,[req.params.pi_uid]);
    res.json({ok:true,count:r.rows.length,pets:r.rows});
  } catch(e) { res.status(500).json({ok:false,error:"Unable to load Pioneer pets."}); }
});

/* Create/record a Pi payment intent. The client creates the payment with Pi SDK;
   this endpoint validates the requested pet and records the payment id. */
app.post("/api/payments/pi/prepare",requirePiAuth,async(req,res)=>{
  try {
    const {payment_id,pet_code}=req.body||{};
    if(!payment_id||!pet_code) return res.status(400).json({ok:false,error:"payment_id and pet_code are required."});
    const pet=await dbQuery("SELECT pet_code,name FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[pet_code]);
    if(!pet.rows.length) return res.status(404).json({ok:false,error:"Pet not found."});
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id));
    const amount=String(payment.amount ?? "");
    const memo=String(payment.memo||"");
    const metadata=payment.metadata||{};
    if(Number(amount)!==Number(PET_PI_PRICE)) return res.status(400).json({ok:false,error:`Payment amount must be ${PET_PI_PRICE} Pi Test.`});
    if(metadata.pet_code && metadata.pet_code!==pet_code) return res.status(400).json({ok:false,error:"Payment pet does not match."});
    await dbQuery(`INSERT INTO pet_payments(payment_id,pi_uid,username,pet_code,currency,amount,status)
      VALUES($1,$2,$3,$4,'PI',$5,'CREATED')
      ON CONFLICT(payment_id) DO UPDATE SET pet_code=EXCLUDED.pet_code,updated_at=NOW()`,
      [payment_id,req.piUser.uid,req.piUser.username,pet_code,Number(PET_PI_PRICE)]);
    res.json({ok:true,paymentId:payment_id,pet_code,amount:Number(PET_PI_PRICE),currency:"Pi",status:"CREATED"});
  } catch(e) { console.error("prepare pi:",e);res.status(400).json({ok:false,error:e.message||"Unable to prepare Pi payment."}); }
});

app.post("/api/payments/pi/approve",requirePiAuth,async(req,res)=>{
  try {
    const {payment_id,pet_code}=req.body||{};
    if(!payment_id||!pet_code) return res.status(400).json({ok:false,error:"payment_id and pet_code are required."});
    const row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1",[payment_id,req.piUser.uid]);
    if(!row.rows.length) return res.status(404).json({ok:false,error:"Payment intent not found. Prepare it first."});
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id));
    if(Number(payment.amount)!==Number(PET_PI_PRICE)) return res.status(400).json({ok:false,error:`Payment amount is not ${PET_PI_PRICE} Pi Test.`});
    const approved=await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/approve",{method:"POST"});
    await dbQuery("UPDATE pet_payments SET status='APPROVED',updated_at=NOW() WHERE payment_id=$1",[payment_id]);
    res.json({ok:true,paymentId:payment_id,status:"APPROVED",pi:approved});
  } catch(e) { console.error("approve pi:",e);res.status(400).json({ok:false,error:e.message||"Pi approval failed."}); }
});

app.post("/api/payments/pi/recover",requirePiAuth,async(req,res)=>{
  try {
    const {payment_id}=req.body||{};
    if(!payment_id) return res.status(400).json({ok:false,error:"payment_id is required."});
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id));
    const row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1",[payment_id,req.piUser.uid]);
    if(!row.rows.length) return res.status(404).json({ok:false,error:"Pending payment is not registered by this app."});
    if(row.rows[0].status==="COMPLETED") return res.json({ok:true,status:"COMPLETED",message:"Payment already completed."});
    const transactionId=payment.transaction?.txid||payment.txid||"";
    const status=payment.status||{};
    if(status.cancelled===true || status.cancelled===1) {
      await dbQuery("UPDATE pet_payments SET status='CANCELLED',updated_at=NOW() WHERE payment_id=$1",[payment_id]);
      return res.status(409).json({ok:false,status:"CANCELLED",error:"Pi payment was cancelled."});
    }
    if(!transactionId) return res.status(409).json({ok:false,status:"PENDING",error:"Pi transaction is not available yet."});
    await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/complete",{method:"POST",body:JSON.stringify({txid:transactionId})});
    const pet=await grantPet(req.piUser.uid,row.rows[0].pet_code);
    await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW() WHERE payment_id=$2`,[transactionId,payment_id]);
    res.json({ok:true,status:"COMPLETED",paymentId:payment_id,transactionId,pet});
  } catch(e) { console.error("recover pi:",e);res.status(400).json({ok:false,error:e.message||"Pending payment recovery failed."}); }
});

app.post("/api/payments/pi/complete",requirePiAuth,async(req,res)=>{
  try {
    const {payment_id,pet_code,txid}=req.body||{};
    if(!payment_id||!pet_code) return res.status(400).json({ok:false,error:"payment_id and pet_code are required."});
    const row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1",[payment_id,req.piUser.uid]);
    if(!row.rows.length) return res.status(404).json({ok:false,error:"Payment intent not found."});
    if(row.rows[0].status==="COMPLETED") {
      return res.json({ok:true,status:"COMPLETED",message:"Payment already completed; pet ownership already granted."});
    }
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id));
    const transactionId=txid||payment.transaction?.txid||payment.txid||"";
    const status=payment.status||{};
    if(!transactionId) {
      return res.status(409).json({ok:false,error:"Pi transaction ID is not available yet. Please wait for the blockchain transaction."});
    }
    if(status.cancelled===true || status.cancelled===1) {
      return res.status(409).json({ok:false,error:"Pi payment was cancelled."});
    }

    // IMPORTANT: Pi requires the developer server to confirm completion
    // through the Pi API after the blockchain transaction is available.
    const completed=await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/complete",{
      method:"POST",
      body:JSON.stringify({txid:transactionId})
    });

    const pet=await grantPet(req.piUser.uid,pet_code);
    await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW()
      WHERE payment_id=$2`,[transactionId,payment_id]);
    res.json({ok:true,status:"COMPLETED",paymentId:payment_id,transactionId,pet});
  } catch(e) { console.error("complete pi:",e);res.status(400).json({ok:false,error:e.message||"Pi completion verification failed."}); }
});

/* Recover/complete a payment reported by Pi SDK as incomplete/pending. */
app.post("/api/payments/pi/recover",requirePiAuth,async(req,res)=>{
  try {
    const {payment_id,pet_code}=req.body||{};
    if(!payment_id) return res.status(400).json({ok:false,error:"payment_id is required."});

    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id));
    const row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1",[payment_id]);
    const metadata=payment.metadata||{};
    const resolvedPetCode=pet_code||metadata.pet_code||row.rows[0]?.pet_code;
    if(!resolvedPetCode) return res.status(400).json({ok:false,error:"Pet code is missing from the pending payment."});

    const pet=await dbQuery("SELECT pet_code,name FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[resolvedPetCode]);
    if(!pet.rows.length) return res.status(404).json({ok:false,error:"Pet not found for pending payment."});

    if(row.rows.length && row.rows[0].pi_uid!==req.piUser.uid) {
      return res.status(403).json({ok:false,error:"This payment belongs to another Pioneer."});
    }

    if(!row.rows.length) {
      await dbQuery(`INSERT INTO pet_payments(payment_id,pi_uid,username,pet_code,currency,amount,status)
        VALUES($1,$2,$3,$4,'PI',$5,'CREATED')
        ON CONFLICT(payment_id) DO NOTHING`,
        [payment_id,req.piUser.uid,req.piUser.username,resolvedPetCode,Number(payment.amount||PET_PI_PRICE)]);
    }

    if(Number(payment.amount)!==Number(PET_PI_PRICE)) {
      return res.status(400).json({ok:false,error:`Pending payment amount is not ${PET_PI_PRICE} Pi Test.`});
    }
    const status=payment.status||{};
    if(status.cancelled===true || status.cancelled===1) {
      return res.status(409).json({ok:false,error:"Pi pending payment was cancelled."});
    }

    const transactionId=payment.transaction?.txid||payment.txid||"";
    if(!transactionId) {
      return res.status(409).json({ok:false,error:"Pending payment has no blockchain transaction ID yet. Please wait for Pi to finish the transaction."});
    }

    if(!(row.rows.length && row.rows[0].status==="COMPLETED")) {
      await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/complete",{
        method:"POST",
        body:JSON.stringify({txid:transactionId})
      });
      const fresh=await dbQuery("SELECT status FROM pet_payments WHERE payment_id=$1 LIMIT 1",[payment_id]);
      if(!fresh.rows.length || fresh.rows[0].status!=="COMPLETED") {
        const petOwned=await grantPet(req.piUser.uid,resolvedPetCode);
        await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW()
          WHERE payment_id=$2`,[transactionId,payment_id]);
        return res.json({ok:true,status:"COMPLETED",paymentId:payment_id,transactionId,pet:petOwned,recovered:true});
      }
    }
    res.json({ok:true,status:"COMPLETED",paymentId:payment_id,transactionId,recovered:true});
  } catch(e) {
    console.error("recover pi:",e);
    res.status(400).json({ok:false,error:e.message||"Unable to recover pending Pi payment."});
  }
});

/* Pi SDK server callbacks can hit these endpoints without the browser.
   They verify the payment with Pi before granting ownership. */
app.post("/api/payments/pi/callback",async(req,res)=>{
  try {
    const {payment_id,txid}=req.body||{};
    if(!payment_id) return res.status(400).json({ok:false,error:"payment_id is required."});
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id));
    const row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1",[payment_id]);
    if(!row.rows.length) return res.status(404).json({ok:false,error:"Payment intent not found."});
    if(row.rows[0].status!=="COMPLETED") {
      const transactionId=txid||payment.transaction?.txid||payment.txid||"";
      const status=payment.status||{};
      if(status.cancelled===true || status.cancelled===1) {
        return res.status(409).json({ok:false,error:"Pi payment was cancelled."});
      }
      if(transactionId) {
        await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/complete",{
          method:"POST",
          body:JSON.stringify({txid:transactionId})
        });
        const pet=await grantPet(row.rows[0].pi_uid,row.rows[0].pet_code);
        await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW()
          WHERE payment_id=$2`,[transactionId,payment_id]);
        return res.json({ok:true,status:"COMPLETED",pet});
      }
    }
    res.json({ok:true,status:row.rows[0].status});
  } catch(e) { console.error("callback:",e);res.status(400).json({ok:false,error:e.message||"Callback verification failed."}); }
});

/* AMT button is intentionally not a fake balance deduction. A real AMT Testnet
   transfer must be verified against the actual AMT asset/transaction mechanism
   before ownership is granted. */
app.post("/api/payments/amt/prepare",requirePiAuth,async(req,res)=>{
  try {
    const {pet_code}=req.body||{};
    const pet=await dbQuery("SELECT pet_code,name FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[pet_code]);
    if(!pet.rows.length) return res.status(404).json({ok:false,error:"Pet not found."});
    res.json({ok:true,pet_code,amount:PET_AMT_PRICE,currency:AMT_ASSET_CODE,
      status:"READY_FOR_VERIFIED_AMT_TRANSFER",
      message:"AMT Test payment is prepared. No ownership is granted until a real AMT Testnet transfer is verified server-side."});
  } catch(e) { res.status(400).json({ok:false,error:e.message}); }
});

app.post("/api/dev/give-pet",async(req,res)=>{
  try {
    const {pi_uid,pet_code,username,wallet_address}=req.body||{};
    if(!pi_uid||!pet_code) return res.status(400).json({ok:false,error:"pi_uid and pet_code are required."});
    await upsertPioneer(pi_uid,username,wallet_address);
    const pet=await grantPet(pi_uid,pet_code);
    res.json({ok:true,message:"Pet added to Pioneer collection.",pet});
  } catch(e) { console.error(e);res.status(500).json({ok:false,error:"Unable to give pet."}); }
});

app.use((req,res)=>res.status(404).json({ok:false,error:"Endpoint not found."}));

async function startServer() {
  try {
    await initializeDatabase();
    await seedPetCatalog();
    app.listen(PORT,()=>{
      console.log("======================================");
      console.log("       AMT PET MARKETPLACE");
      console.log("======================================");
      console.log(`Server running on port ${PORT}`);
      console.log(`Database configured: ${!!DATABASE_URL}`);
      console.log(`Pi API key configured: ${!!PI_API_KEY}`);
      console.log(`Pet catalog: ${PET_SEED.length} pets`);
      console.log("Pi network: Testnet");
      console.log("Pet Pi price: "+PET_PI_PRICE);
      console.log("Pet AMT price: 100");
      console.log("======================================");
    });
  } catch(e) { console.error("SERVER STARTUP ERROR:",e);process.exit(1); }
}
startServer();
