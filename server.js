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
const AMT_RECEIVER = process.env.AMT_RECEIVER || process.env.AMT_DISTRIBUTOR ||
  "GAVFYNEHSTW4P65DM75P4TYAC6PNO5A6LGSYSGEFNN3O7A23XHWABSBP";
const AMT_HORIZON_URL = process.env.AMT_HORIZON_URL || "https://api.testnet.minepi.com";

app.use(cors({origin:"*",methods:["GET","POST","OPTIONS"],allowedHeaders:["Content-Type","Authorization"]}));
app.use(express.json({limit:"1mb"}));

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false}});
  pool.on("error",e=>console.error("PostgreSQL pool error:",e));
}
async function dbQuery(text,params=[]) {
  if (!pool) throw new Error("DATABASE_URL is not configured.");
  return pool.query(text,params);
}

/* 70-PET CATALOG */
const PET_SEED = [
["earth-01","Terrax","Earth","terrax.png",120,20,22],["earth-02","Rockhorn","Earth","rockhorn.png",125,19,24],
["earth-03","Stonefist","Earth","stonefist.png",130,22,25],["earth-04","Earthdrake","Earth","earthdrake.png",128,23,23],
["earth-05","Boulderlynx","Earth","boulderlynx.png",118,24,20],["earth-06","Terrapin","Earth","terrapin.png",140,16,28],
["earth-07","Gravelpaw","Earth","gravelpaw.png",115,21,21],["earth-08","Pebblix","Earth","pebblix.png",110,18,20],
["earth-09","Mountainhoof","Earth","mountainhoof.png",145,18,30],["earth-10","Terroscale","Earth","terroscale.png",135,25,24],
["water-01","Aqualis","Water","aqualis.png",110,23,18],["water-02","Tideback","Water","tideback.png",135,18,27],
["water-03","Oceanix","Water","oceanix.png",125,24,20],["water-04","Neptunox","Water","neptunox.png",130,27,21],
["water-05","Jellyfin","Water","jellyfin.png",105,19,19],["water-06","Sharky","Water","sharky.png",120,29,17],
["water-07","Seapony","Water","seapony.png",115,22,21],["water-08","Krakenling","Water","krakenling.png",140,26,23],
["water-09","Riptide","Water","riptide.png",118,30,18],["water-10","Abyssal","Water","abyssal.png",145,28,25],
["nature-01","Leaflyn","Nature","leaflyn.png",115,20,22],["nature-02","Treetle","Nature","treetle.png",130,18,27],
["nature-03","Sylvann","Nature","sylvann.png",120,25,20],["nature-04","Verdira","Nature","verdira.png",118,23,23],
["nature-05","Bloomtail","Nature","bloomtail.png",112,21,22],["nature-06","Groveon","Nature","groveon.png",128,22,25],
["nature-07","Nutty","Nature","nutty.png",108,19,20],["nature-08","Flora","Nature","flora.png",110,26,19],
["nature-09","Forestfang","Nature","forestfang.png",125,28,21],["nature-10","Everbloom","Nature","everbloom.png",138,25,26],
["ice-01","Frostbite","Ice","frostbite.png",115,24,21],["ice-02","Glaciard","Ice","glaciard.png",130,20,27],
["ice-03","Snowwing","Ice","snowwing.png",108,27,18],["ice-04","Frostdrake","Ice","frostdrake.png",135,28,24],
["ice-05","Chillpengu","Ice","chillpengu.png",105,19,20],["ice-06","Frostwolf","Ice","frostwolf.png",125,30,21],
["ice-07","Icetusk","Ice","icetusk.png",142,22,29],["ice-08","Frostseal","Ice","frostseal.png",120,21,25],
["ice-09","Glacieron","Ice","glacieron.png",132,26,26],["ice-10","Frostbear","Ice","frostbear.png",150,24,31],
["fire-01","Flammy","Fire","flammy.png",108,27,17],["fire-02","Pyroclaw","Fire","pyroclaw.png",115,30,18],
["fire-03","Blazewing","Fire","blazewing.png",110,32,17],["fire-04","Infernox","Fire","infernox.png",128,31,21],
["fire-05","Phoenixia","Fire","phoenixia.png",125,34,20],["fire-06","Magmortar","Fire","magmortar.png",145,28,28],
["fire-07","Salamorra","Fire","salamorra.png",130,33,23],["fire-08","Emberhorn","Fire","emberhorn.png",120,29,22],
["fire-09","Flamefang","Fire","flamefang.png",118,35,19],["fire-10","Pyromite","Fire","pyromite.png",135,32,25],
["wind-01","Zephyrin","Wind","zephyrin.png",105,25,18],["wind-02","Skyflare","Wind","skyflare.png",110,29,17],
["wind-03","Windrake","Wind","windrake.png",125,30,21],["wind-04","Aerolith","Wind","aerolith.png",115,26,22],
["wind-05","Skywhisp","Wind","skywhisp.png",100,24,16],["wind-06","Stormtalon","Wind","stormtalon.png",120,34,19],
["wind-07","Cloudstride","Wind","cloudstride.png",112,28,20],["wind-08","Breezeling","Wind","breezeling.png",102,23,18],
["wind-09","Tornadope","Wind","tornadope.png",118,33,18],["wind-10","Zephyria","Wind","zephyria.png",130,31,23],
["thunder-01","Voltix","Thunder","voltix.png",110,30,18],["thunder-02","Zephron","Thunder","zephron.png",115,28,19],
["thunder-03","Stormee","Thunder","stormee.png",108,32,17],["thunder-04","Thunderdrake","Thunder","thunderdrake.png",130,35,23],
["thunder-05","Sparkster","Thunder","sparkster.png",105,29,18],["thunder-06","Raihorn","Thunder","raihorn.png",140,27,30],
["thunder-07","Voltlynx","Thunder","voltlynx.png",118,34,20],["thunder-08","Electrix","Thunder","electrix.png",112,31,19],
["thunder-09","Skyshock","Thunder","skyshock.png",120,36,18],["thunder-10","Thunderix","Thunder","thunderix.png",135,38,24]
].map(([code,name,element,image,hp,atk,def])=>({code,name,element,image,hp,atk,def}));

async function initializeDatabase(){
  if(!pool){console.log("DATABASE_URL is not configured.");return;}
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

async function seedPetCatalog(){
  if(!pool)return;
  for(const p of PET_SEED){
    await dbQuery(`INSERT INTO pets_catalog
      (pet_code,name,element,rarity,image,base_hp,base_atk,base_def)
      VALUES($1,$2,$3,'Common',$4,$5,$6,$7)
      ON CONFLICT(pet_code) DO UPDATE SET name=EXCLUDED.name,element=EXCLUDED.element,
      rarity=EXCLUDED.rarity,image=EXCLUDED.image,base_hp=EXCLUDED.base_hp,
      base_atk=EXCLUDED.base_atk,base_def=EXCLUDED.base_def`,
      [p.code,p.name,p.element,p.image,p.hp,p.atk,p.def]);
  }
  console.log(`Pet catalog ready: ${PET_SEED.length} pets.`);
}

async function piFetch(path,options={}){
  if(!PI_API_KEY)throw new Error("PI_API_KEY is not configured on Render.");
  const r=await fetch(PI_API_BASE+path,{...options,headers:{
    Accept:"application/json","Content-Type":"application/json",
    Authorization:"Key "+PI_API_KEY,...(options.headers||{})}});
  const text=await r.text();let data={};
  try{data=text?JSON.parse(text):{};}catch{data={raw:text};}
  if(!r.ok){const e=new Error(data?.error||data?.message||`Pi API HTTP ${r.status}`);e.status=r.status;throw e;}
  return data;
}
async function verifyPiAccessToken(token){
  if(!token)throw new Error("Missing Pi access token.");
  const r=await fetch(PI_API_BASE+"/v2/me",{headers:{Authorization:"Bearer "+token,Accept:"application/json"}});
  const text=await r.text();let data={};
  try{data=text?JSON.parse(text):{};}catch{}
  if(!r.ok)throw new Error(data?.error||data?.message||"Pi authentication verification failed.");
  return {uid:data.uid||data.user?.uid||"",username:data.username||data.user?.username||"",
    wallet_address:data.wallet_address||data.walletAddress||data.user?.wallet_address||data.user?.walletAddress||""};
}
function isPublicStellarAddress(v){return typeof v==="string"&&/^G[A-Z2-7]{55}$/.test(v.trim().toUpperCase());}
function normalizeWallet(v){const x=String(v||"").trim().toUpperCase();return isPublicStellarAddress(x)?x:"";}

async function upsertPioneer(pi_uid,username,wallet_address){
  const incoming=normalizeWallet(wallet_address);
  if(wallet_address&&!incoming)throw new Error("Invalid Pi Testnet public wallet address.");
  const old=await dbQuery("SELECT * FROM pioneers WHERE pi_uid=$1 LIMIT 1",[pi_uid]);
  if(old.rows.length){
    const current=normalizeWallet(old.rows[0].wallet_address);
    if(current&&incoming&&current!==incoming)throw new Error("This Pioneer wallet is already synchronized and cannot be changed from this app.");
    const r=await dbQuery(`UPDATE pioneers SET username=COALESCE(NULLIF($2,''),username),
      wallet_address=COALESCE(NULLIF($3,''),wallet_address),updated_at=NOW() WHERE pi_uid=$1
      RETURNING id,pi_uid,username,wallet_address,created_at,updated_at`,[pi_uid,username||"",incoming]);
    return r.rows[0];
  }
  const r=await dbQuery(`INSERT INTO pioneers(pi_uid,username,wallet_address) VALUES($1,$2,$3)
    RETURNING id,pi_uid,username,wallet_address,created_at,updated_at`,[pi_uid,username||"",incoming||null]);
  return r.rows[0];
}

async function requirePiAuth(req,res,next){
  try{
    let token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"").trim();
    if(!token)token=String(req.body?.accessToken||req.body?.access_token||"").trim();
    if(!token)return res.status(401).json({ok:false,error:"Pi authentication required."});
    const piUser=await verifyPiAccessToken(token);
    if(!piUser.uid)return res.status(401).json({ok:false,error:"Pi UID was not returned."});
    const pioneer=await upsertPioneer(piUser.uid,piUser.username,piUser.wallet_address);
    req.piUser=piUser;req.pioneer=pioneer;req.piToken=token;next();
  }catch(e){console.error("Pi auth:",e.message);res.status(401).json({ok:false,error:e.message||"Pi authentication failed."});}
}

async function horizonGet(path){
  const r=await fetch(AMT_HORIZON_URL+path,{headers:{Accept:"application/json"}});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{};}catch{}
  if(!r.ok)throw new Error(data?.title||data?.detail||`Pi Testnet Horizon HTTP ${r.status}`);
  return data;
}
async function grantPet(pi_uid,pet_code,payment_id=null){
  const p=await dbQuery("SELECT * FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[pet_code]);
  if(!p.rows.length)throw new Error("Pet not found.");
  const u=await dbQuery("SELECT id FROM pioneers WHERE pi_uid=$1 LIMIT 1",[pi_uid]);
  if(!u.rows.length)throw new Error("Pioneer not found.");
  if(payment_id){
    const existing=await dbQuery(`SELECT up.*,pc.name,pc.element,pc.image FROM user_pets up
      JOIN pets_catalog pc ON pc.pet_code=up.pet_code WHERE up.payment_id=$1 LIMIT 1`,[payment_id]);
    if(existing.rows.length)return existing.rows[0];
  }
  const x=p.rows[0];
  const r=await dbQuery(`INSERT INTO user_pets
    (pioneer_id,pet_code,payment_id,rarity,level,xp,hp,atk,def)
    VALUES($1,$2,$3,'Common',1,0,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *`,
    [u.rows[0].id,x.pet_code,payment_id||null,x.base_hp,x.base_atk,x.base_def]);
  if(!r.rows.length&&payment_id){
    const existing=await dbQuery(`SELECT up.*,pc.name,pc.element,pc.image FROM user_pets up
      JOIN pets_catalog pc ON pc.pet_code=up.pet_code WHERE up.payment_id=$1 LIMIT 1`,[payment_id]);
    if(existing.rows.length)return existing.rows[0];
  }
  if(!r.rows.length)throw new Error("Pet could not be granted.");
  return {...r.rows[0],name:x.name,element:x.element,image:x.image};
}
function requestedPetId(req){return req.body?.pet_id||req.body?.petId||req.body?.id||null;}
async function findOwnedPet(uid,req){
  const id=requestedPetId(req),code=req.body?.pet_code||req.body?.petCode||null;
  if(!id&&!code)throw new Error("pet_id or pet_code is required.");
  const r=await dbQuery(`SELECT up.*,pc.name,pc.element,pc.image,pc.base_hp,pc.base_atk,pc.base_def
    FROM user_pets up JOIN pioneers p ON p.id=up.pioneer_id JOIN pets_catalog pc ON pc.pet_code=up.pet_code
    WHERE ${id?"up.id=$1":"up.pet_code=$1"} AND p.pi_uid=$2 ${id?"":"ORDER BY up.created_at DESC"} LIMIT 1`,
    [id?Number(id):code,uid]);
  if(!r.rows.length)throw new Error("Owned pet not found.");
  return r.rows[0];
}

app.get("/",(req,res)=>res.json({ok:true,app:"AMT Pet Marketplace",version:"2.3.0",network:"Pi Testnet",status:"online"}));
app.get("/api/health",async(req,res)=>{let db=false;try{if(pool){await dbQuery("SELECT 1");db=true;}}catch{}res.json({ok:true,databaseConfigured:!!DATABASE_URL,databaseConnected:db,piApiConfigured:!!PI_API_KEY,petCount:PET_SEED.length});});

app.get("/api/pets",async(req,res)=>{try{const r=await dbQuery("SELECT pet_code,name,element,rarity,image,base_hp,base_atk,base_def FROM pets_catalog ORDER BY pet_code");res.json({ok:true,count:r.rows.length,pets:r.rows});}catch(e){res.status(500).json({ok:false,error:e.message});}});
app.get("/api/my-pets/:uid",async(req,res)=>{try{const r=await dbQuery(`SELECT up.id,up.pet_code,pc.name,pc.element,pc.image,up.rarity,up.level,up.xp,up.hp,up.atk,up.def
FROM user_pets up JOIN pioneers p ON p.id=up.pioneer_id JOIN pets_catalog pc ON pc.pet_code=up.pet_code WHERE p.pi_uid=$1 ORDER BY up.created_at DESC`,[req.params.uid]);res.json({ok:true,count:r.rows.length,pets:r.rows});}catch(e){res.status(500).json({ok:false,error:e.message});}});

app.post("/api/auth/verify",requirePiAuth,(req,res)=>res.json({ok:true,uid:req.piUser.uid,username:req.piUser.username,
  walletAddress:req.pioneer.wallet_address||null,wallet_address:req.pioneer.wallet_address||null,pioneer:req.pioneer}));
app.get("/api/profile",requirePiAuth,async(req,res)=>{
  try{const r=await dbQuery("SELECT pi_uid,username,wallet_address,profile_image,coins,food FROM pioneers WHERE pi_uid=$1 LIMIT 1",[req.piUser.uid]);
    if(!r.rows.length)return res.status(404).json({ok:false,error:"Pioneer profile not found."});res.json({ok:true,profile:r.rows[0]});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.post("/api/profile/image",requirePiAuth,async(req,res)=>{
  try{const image=String(req.body?.image||"");if(!image.startsWith("data:image/"))return res.status(400).json({ok:false,error:"Invalid profile image."});
    if(image.length>900000)return res.status(400).json({ok:false,error:"Profile image is too large after compression."});
    await dbQuery("UPDATE pioneers SET profile_image=$1,updated_at=NOW() WHERE pi_uid=$2",[image,req.piUser.uid]);
    res.json({ok:true,message:"Profile picture saved to your Pioneer profile."});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});

async function walletBindHandler(req,res){
  try{
    const wallet=normalizeWallet(req.body?.wallet_address||req.body?.walletAddress||req.body?.address||req.piUser.wallet_address);
    if(!wallet)return res.status(400).json({ok:false,error:"Pi did not provide a valid public wallet address. Make sure wallet_address scope is requested."});
    const pioneer=await upsertPioneer(req.piUser.uid,req.piUser.username,wallet);
    res.json({ok:true,synced:true,uid:req.piUser.uid,username:req.piUser.username,wallet_address:pioneer.wallet_address,walletAddress:pioneer.wallet_address,network:"Pi Testnet"});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
}
app.post("/api/wallet/sync",requirePiAuth,walletBindHandler);
app.post("/api/wallet/bind",requirePiAuth,walletBindHandler);
app.get("/api/wallet/onchain",requirePiAuth,async(req,res)=>{
  try{
    const wallet=req.pioneer.wallet_address||"";
    if(!isPublicStellarAddress(wallet))return res.status(400).json({ok:false,error:"No synchronized public Pi Testnet wallet address found."});
    const a=await horizonGet("/accounts/"+encodeURIComponent(wallet));
    const balance=(a.balances||[]).filter(b=>b.asset_type==="credit_alphanum4"&&b.asset_code===AMT_ASSET_CODE&&b.asset_issuer===AMT_ISSUER).reduce((s,b)=>s+Number(b.balance||0),0);
    const piBalance=(a.balances||[]).filter(b=>b.asset_type==="native").reduce((s,b)=>s+Number(b.balance||0),0);
    res.json({ok:true,wallet_address:wallet,walletAddress:wallet,pi_balance:piBalance,piBalance,balance,issuer:AMT_ISSUER,asset_code:AMT_ASSET_CODE,
      amt:{wallet,asset_code:AMT_ASSET_CODE,issuer:AMT_ISSUER,balance},pi:{wallet,balance:piBalance,asset_code:"Pi"}});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});
app.get("/api/wallet/config",(req,res)=>res.json({ok:true,asset_code:AMT_ASSET_CODE,issuer:AMT_ISSUER,receiver:AMT_RECEIVER,horizon:AMT_HORIZON_URL,network:"Pi Testnet"}));

async function care(req,res){
  try{const p=await findOwnedPet(req.piUser.uid,req);const r=await dbQuery("UPDATE user_pets SET hp=$1,updated_at=NOW() WHERE id=$2 RETURNING *",[p.base_hp,p.id]);
    res.json({ok:true,action:"CARE",message:"Pet cared for successfully. HP restored.",pet:{...r.rows[0],name:p.name,element:p.element,image:p.image,max_hp:p.base_hp}});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
}
app.post("/api/care",requirePiAuth,care);app.post("/api/care/pet",requirePiAuth,care);app.post("/api/pets/care",requirePiAuth,care);

async function train(req,res){
  try{const p=await findOwnedPet(req.piUser.uid,req),gain=25,total=Number(p.xp||0)+gain,old=Number(p.level||1),level=Math.max(1,Math.floor(total/100)+1),ups=Math.max(0,level-old);
    const r=await dbQuery(`UPDATE user_pets SET xp=$1,level=$2,atk=$3,def=$4,updated_at=NOW() WHERE id=$5 RETURNING *`,
      [total,level,Number(p.atk)+ups*2,Number(p.def)+ups*2,p.id]);
    res.json({ok:true,action:"TRAIN",message:ups?`Training complete. Pet reached Level ${level}!`:"Training complete. XP gained.",xpGained:gain,levelUps:ups,pet:{...r.rows[0],name:p.name,element:p.element,image:p.image}});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
}
app.post("/api/train",requirePiAuth,train);app.post("/api/train/pet",requirePiAuth,train);app.post("/api/pets/train",requirePiAuth,train);

function battleMult(a,d){const strong={fire:"nature",nature:"water",water:"fire",wind:"earth",earth:"thunder",thunder:"wind",ice:"wind"};if(strong[String(a).toLowerCase()]===String(d).toLowerCase())return 1.15;if(strong[String(d).toLowerCase()]===String(a).toLowerCase())return .9;return 1;}
function battleScore(a,d){return Number(a.atk)*1.25+Number(a.def)*.75+Number(a.hp)*.15+Number(a.level)*5}
async function arenaBattle(req,res){
  try{
    const a=await findOwnedPet(req.piUser.uid,req),elements=["Fire","Water","Earth","Wind","Nature","Ice","Thunder"],names=["Shadow Beast","Iron Fang","Storm Bot","Flame Golem","Frost Drone","Terra Mech","Aqua Guardian"];
    const idx=Math.floor(Math.random()*names.length),element=elements[idx],baseHp=120+Math.floor(Math.random()*55),baseAtk=22+Math.floor(Math.random()*18),baseDef=18+Math.floor(Math.random()*15),level=Math.max(1,Number(a.level)+Math.floor(Math.random()*3)-1);
    const d={name:names[idx],element,level,hp:baseHp,atk:baseAtk,def:baseDef},ap=battleScore(a,d)*battleMult(a.element,d.element),dp=battleScore(d,a)*battleMult(d.element,a.element),win=ap>=dp,gain=win?35:12,total=Number(a.xp)+gain,newLevel=Math.max(1,Math.floor(total/100)+1),ups=Math.max(0,newLevel-Number(a.level));
    const u=await dbQuery(`UPDATE user_pets SET xp=$1,level=$2,atk=$3,def=$4,updated_at=NOW() WHERE id=$5 RETURNING *`,[total,newLevel,Number(a.atk)+ups*2,Number(a.def)+ups*2,a.id]);
    const coins=win?50:15,food=win?3:1;
    await dbQuery(`UPDATE pioneers SET coins=coins+$1,food=food+$2,updated_at=NOW() WHERE pi_uid=$3`,[coins,food,req.piUser.uid]);
    res.json({ok:true,mode:"ARENA",result:win?"WIN":"LOSS",message:win?`Victory! ${a.name} defeated the computer ${d.name}.`:`${a.name} lost to the computer ${d.name}.`,xpEarned:gain,coinsEarned:coins,foodEarned:food,levelUps:ups,pet:{...u.rows[0],name:a.name,element:a.element,image:a.image},opponent:{name:d.name,element:d.element,level:d.level,computer:true}});
  }catch(e){console.error("arena:",e);res.status(400).json({ok:false,error:e.message});}
}
async function adventureBattle(req,res){
  try{
    const a=await findOwnedPet(req.piUser.uid,req),q=await dbQuery(`SELECT up.*,p.id AS opponent_pioneer_id,p.pi_uid AS opponent_uid,p.username AS opponent_username,pc.name,pc.element,pc.image,pc.base_hp,pc.base_atk,pc.base_def
      FROM user_pets up JOIN pioneers p ON p.id=up.pioneer_id JOIN pets_catalog pc ON pc.pet_code=up.pet_code
      WHERE p.pi_uid<>$1 ORDER BY RANDOM() LIMIT 1`,[req.piUser.uid]);
    if(!q.rows.length)return res.status(409).json({ok:false,error:"No other Pioneer is available for Adventure yet.",message:"Another Pioneer needs to own a pet before an Adventure battle can start."});
    const d=q.rows[0],ap=battleScore(a,d)*battleMult(a.element,d.element),dp=battleScore(d,a)*battleMult(d.element,a.element),win=ap>=dp,gain=win?45:18,total=Number(a.xp)+gain,newLevel=Math.max(1,Math.floor(total/100)+1),ups=Math.max(0,newLevel-Number(a.level)),coins=win?80:25,food=win?5:2;
    const u=await dbQuery(`UPDATE user_pets SET xp=$1,level=$2,atk=$3,def=$4,updated_at=NOW() WHERE id=$5 RETURNING *`,[total,newLevel,Number(a.atk)+ups*2,Number(a.def)+ups*2,a.id]);
    await dbQuery(`INSERT INTO pet_battles(attacker_pioneer_id,attacker_pet_id,defender_pioneer_id,defender_pet_id,winner_pioneer_id,xp_earned) VALUES($1,$2,$3,$4,$5,$6)`,[req.pioneer.id,a.id,d.opponent_pioneer_id,d.id,win?req.pioneer.id:d.opponent_pioneer_id,gain]);
    await dbQuery(`UPDATE pioneers SET coins=coins+$1,food=food+$2,updated_at=NOW() WHERE pi_uid=$3`,[coins,food,req.piUser.uid]);
    res.json({ok:true,mode:"ADVENTURE",result:win?"WIN":"LOSS",message:win?`Adventure victory! You defeated Pioneer @${d.opponent_username||"Pioneer"}.`:`Adventure loss against Pioneer @${d.opponent_username||"Pioneer"}.`,xpEarned:gain,coinsEarned:coins,foodEarned:food,levelUps:ups,pet:{...u.rows[0],name:a.name,element:a.element,image:a.image},opponent:{id:d.id,name:d.name,element:d.element,image:d.image,level:d.level,username:d.opponent_username||"Pioneer",computer:false}});
  }catch(e){console.error("adventure:",e);res.status(400).json({ok:false,error:e.message});}
}
app.post("/api/battle/arena",requirePiAuth,arenaBattle);app.post("/api/battle/adventure",requirePiAuth,adventureBattle);
app.post("/api/pets/battle",requirePiAuth,arenaBattle);app.post("/api/battle",requirePiAuth,arenaBattle);app.post("/api/battle/pet",requirePiAuth,arenaBattle);

/* BREEDING -> EGG -> 24H INCUBATOR */
function rarityRank(r){return {Common:1,Rare:2,Epic:3,Legendary:4}[String(r||"Common")]||1;}
function chooseEggRarity(a,b){
  const base=Math.min(rarityRank(a.rarity),rarityRank(b.rarity));
  const bump=Math.random()<0.18?1:0;
  return Object.keys({Common:1,Rare:2,Epic:3,Legendary:4}).find(k=>({Common:1,Rare:2,Epic:3,Legendary:4}[k]===Math.min(4,base+bump)))||"Common";
}
function newEggCode(){return "AMT-EGG-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase();}
async function ownedEgg(uid,req){
  const id=req.body?.egg_id||req.body?.eggId||req.body?.id||null;
  if(!id)throw new Error("egg_id is required.");
  const r=await dbQuery(`SELECT e.*,p1.pet_code AS parent1_pet_code,p2.pet_code AS parent2_pet_code,
    c.name AS future_name,c.image AS future_image
    FROM pet_eggs e JOIN pioneers p ON p.id=e.pioneer_id
    JOIN user_pets p1 ON p1.id=e.parent1_id JOIN user_pets p2 ON p2.id=e.parent2_id
    JOIN pets_catalog c ON c.pet_code=e.future_pet_code
    WHERE e.id=$1 AND p.pi_uid=$2 LIMIT 1`,[Number(id),uid]);
  if(!r.rows.length)throw new Error("Owned egg not found.");
  return r.rows[0];
}
function normalizeEggStatus(row){
  if(row.status==="INCUBATING"&&row.hatch_ready_at&&new Date(row.hatch_ready_at).getTime()<=Date.now())return "READY";
  return row.status;
}
app.post("/api/pets/breed",requirePiAuth,async(req,res)=>{
  try{
    const p1=await findOwnedPet(req.piUser.uid,{body:{pet_id:req.body?.parent1_id}});
    const p2=await findOwnedPet(req.piUser.uid,{body:{pet_id:req.body?.parent2_id}});
    if(String(p1.id)===String(p2.id))return res.status(400).json({ok:false,error:"Choose two different parent pets."});
    const cats=await dbQuery(`SELECT * FROM pets_catalog WHERE element IN ($1,$2) ORDER BY RANDOM() LIMIT 1`,[p1.element,p2.element]);
    if(!cats.rows.length)return res.status(400).json({ok:false,error:"No compatible offspring pet is available."});
    const c=cats.rows[0],rarity=chooseEggRarity(p1,p2),eggCode=newEggCode();
    const r=await dbQuery(`INSERT INTO pet_eggs(egg_code,pioneer_id,parent1_id,parent2_id,future_pet_code,element,rarity,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,'NEW') RETURNING *`,
      [eggCode,req.pioneer.id,p1.id,p2.id,c.pet_code,c.element,rarity]);
    await dbQuery(`INSERT INTO pet_breeding(parent1_id,parent2_id,offspring_id,pioneer_id) VALUES($1,$2,NULL,$3)`,
      [p1.id,p2.id,req.pioneer.id]);
    res.json({ok:true,message:`Breeding complete! Egg ${eggCode} was created.`,egg:{...r.rows[0],future_name:c.name,future_image:c.image,incubator_hours:24}});
  }catch(e){console.error("breed:",e);res.status(400).json({ok:false,error:e.message});}
});

app.get("/api/my-eggs",requirePiAuth,async(req,res)=>{
  try{
    const r=await dbQuery(`SELECT e.*,p1.pet_code AS parent1_pet_code,p2.pet_code AS parent2_pet_code,
      c.name AS future_name,c.image AS future_image
      FROM pet_eggs e JOIN pioneers p ON p.id=e.pioneer_id
      JOIN user_pets p1 ON p1.id=e.parent1_id JOIN user_pets p2 ON p2.id=e.parent2_id
      JOIN pets_catalog c ON c.pet_code=e.future_pet_code
      WHERE p.pi_uid=$1 ORDER BY e.created_at DESC`,[req.piUser.uid]);
    const eggs=[];
    for(const row of r.rows){
      const status=normalizeEggStatus(row);
      if(status!==row.status)await dbQuery("UPDATE pet_eggs SET status='READY' WHERE id=$1",[row.id]);
      eggs.push({...row,status,ready_in_ms:status==="INCUBATING"?Math.max(0,new Date(row.hatch_ready_at).getTime()-Date.now()):0});
    }
    res.json({ok:true,count:eggs.length,eggs});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});
app.post("/api/eggs/incubate",requirePiAuth,async(req,res)=>{
  try{
    const e=await ownedEgg(req.piUser.uid,req);
    const status=normalizeEggStatus(e);
    if(status!=="NEW")return res.status(400).json({ok:false,error:`Egg status is ${status}; only NEW eggs can enter the incubator.`});
    const r=await dbQuery(`UPDATE pet_eggs SET status='INCUBATING',incubated_at=NOW(),hatch_ready_at=NOW()+INTERVAL '24 hours' WHERE id=$1 RETURNING *`,[e.id]);
    res.json({ok:true,message:`${e.egg_code} is now incubating for 24 hours.`,egg:r.rows[0]});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});
app.post("/api/eggs/hatch",requirePiAuth,async(req,res)=>{
  try{
    const e=await ownedEgg(req.piUser.uid,req),status=normalizeEggStatus(e);
    if(status!=="READY")return res.status(400).json({ok:false,error:"This egg is not ready to hatch yet."});
    const c=await dbQuery("SELECT * FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[e.future_pet_code]);
    if(!c.rows.length)throw new Error("Future pet catalog entry not found.");
    const x=c.rows[0];
    const r=await dbQuery(`INSERT INTO user_pets(pioneer_id,pet_code,rarity,level,xp,hp,atk,def)
      VALUES($1,$2,$3,1,0,$4,$5,$6) RETURNING *`,
      [req.pioneer.id,x.pet_code,e.rarity,x.base_hp,x.base_atk,x.base_def]);
    await dbQuery("UPDATE pet_eggs SET status='HATCHED',hatch_at=NOW() WHERE id=$1",[e.id]);
    res.json({ok:true,message:`Hatch complete! ${x.name} joined your pet squad.`,pet:{...r.rows[0],name:x.name,element:x.element,image:x.image,rarity:e.rarity}});
  }catch(e){console.error("hatch:",e);res.status(400).json({ok:false,error:e.message});}
});

/* SELL / PUBLIC LISTINGS */
app.post("/api/sell/list",requirePiAuth,async(req,res)=>{
  try{
    const pet=await findOwnedPet(req.piUser.uid,req),price=Number(req.body?.price_amt);
    if(!price||price<=0||price>200)return res.status(400).json({ok:false,error:"Pet price must be between 1 and 200 AMT."});
    const existing=await dbQuery("SELECT id,status FROM pet_listings WHERE pet_id=$1 LIMIT 1",[pet.id]);
    if(existing.rows.length&&existing.rows[0].status==="ACTIVE")return res.status(409).json({ok:false,error:"This pet is already listed for sale."});
    await dbQuery(`INSERT INTO pet_listings(pet_id,pioneer_id,price_amt,status) VALUES($1,$2,$3,'ACTIVE')
      ON CONFLICT(pet_id) DO UPDATE SET pioneer_id=EXCLUDED.pioneer_id,price_amt=EXCLUDED.price_amt,status='ACTIVE',updated_at=NOW()`,
      [pet.id,req.pioneer.id,price]);
    res.json({ok:true,message:`${pet.name} is now listed for ${price} AMT.`});
  }catch(e){console.error("sell list:",e);res.status(400).json({ok:false,error:e.message});}
});
app.get("/api/market/listings",async(req,res)=>{
  try{const r=await dbQuery(`SELECT l.id,l.pet_id,l.price_amt,l.status,p.username,pc.name,pc.element,pc.image,up.level,up.rarity,100 AS seller_reputation
    FROM pet_listings l JOIN user_pets up ON up.id=l.pet_id JOIN pioneers p ON p.id=l.pioneer_id JOIN pets_catalog pc ON pc.pet_code=up.pet_code
    WHERE l.status='ACTIVE' ORDER BY l.created_at DESC`);
    res.json({ok:true,count:r.rows.length,listings:r.rows});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

/* EGG MARKET */
app.post("/api/sell/egg",requirePiAuth,async(req,res)=>{
  try{
    const egg=await ownedEgg(req.piUser.uid,req),price=Number(req.body?.price_amt);
    if(!price||price<=0||price>200)return res.status(400).json({ok:false,error:"Egg price must be between 1 and 200 AMT."});
    if(["HATCHED","LISTED"].includes(egg.status))return res.status(400).json({ok:false,error:`Egg status is ${egg.status} and cannot be listed.`});
    const existing=await dbQuery("SELECT id,status FROM egg_listings WHERE egg_id=$1 LIMIT 1",[egg.id]);
    if(existing.rows.length&&existing.rows[0].status==="ACTIVE")return res.status(409).json({ok:false,error:"This egg is already listed for sale."});
    await dbQuery(`INSERT INTO egg_listings(egg_id,pioneer_id,price_amt,status) VALUES($1,$2,$3,'ACTIVE')
      ON CONFLICT(egg_id) DO UPDATE SET pioneer_id=EXCLUDED.pioneer_id,price_amt=EXCLUDED.price_amt,status='ACTIVE',updated_at=NOW()`,
      [egg.id,req.pioneer.id,price]);
    await dbQuery("UPDATE pet_eggs SET status='LISTED' WHERE id=$1",[egg.id]);
    res.json({ok:true,message:`${egg.egg_code} is now listed for ${price} AMT.`});
  }catch(e){console.error("sell egg:",e);res.status(400).json({ok:false,error:e.message});}
});
app.get("/api/market/eggs",async(req,res)=>{
  try{
    const r=await dbQuery(`SELECT l.id,l.egg_id,l.price_amt,l.status,p.username,e.egg_code,e.element,e.rarity,e.status AS egg_status,
      c.name AS future_name,c.image AS future_image
      FROM egg_listings l JOIN pet_eggs e ON e.id=l.egg_id JOIN pioneers p ON p.id=l.pioneer_id
      JOIN pets_catalog c ON c.pet_code=e.future_pet_code
      WHERE l.status='ACTIVE' ORDER BY l.created_at DESC`);
    res.json({ok:true,count:r.rows.length,listings:r.rows});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

/* PI PAYMENT RECOVERY */
app.post("/api/payments/pi/recover",async(req,res)=>{
  try{
    const body=req.body||{},dto=body.payment||{},id=String(body.payment_id||body.paymentId||dto.identifier||"").trim();
    if(!id)return res.status(400).json({ok:false,error:"payment_id is required."});
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(id));
    let row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1",[id]);
    const dbRow=row.rows[0]||null,uid=String(payment.user_uid||dto.user_uid||dbRow?.pi_uid||"").trim(),meta=payment.metadata||dto.metadata||{},code=String(meta.pet_code||meta.petCode||dbRow?.pet_code||"").trim();
    if(!uid||!code)return res.status(400).json({ok:false,error:"Incomplete Pi payment is missing user_uid or pet_code."});
    if(payment.direction&&payment.direction!=="user_to_app")return res.status(400).json({ok:false,error:"Invalid payment direction."});
    const cat=await dbQuery("SELECT pet_code FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[code]);
    if(!cat.rows.length)return res.status(404).json({ok:false,error:"Pet attached to payment was not found."});
    const expectedAmount=Number(dbRow?.amount||PET_PI_PRICE);
    if(Number(payment.amount)!==expectedAmount)return res.status(400).json({ok:false,error:"Payment amount does not match the stored pet price."});
    if(!dbRow){
      await dbQuery(`INSERT INTO pet_payments(payment_id,pi_uid,username,pet_code,currency,amount,status)
        VALUES($1,$2,'',$3,'PI',$4,'CREATED') ON CONFLICT(payment_id) DO NOTHING`,[id,uid,code,expectedAmount]);
      row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1",[id]);
    }
    if(row.rows[0].pi_uid!==uid)return res.status(403).json({ok:false,error:"Payment ownership mismatch."});
    const st=payment.status||{};
    if(st.cancelled===true||st.user_cancelled===true){
      await dbQuery("UPDATE pet_payments SET status='CANCELLED',updated_at=NOW() WHERE payment_id=$1",[id]);
      return res.json({ok:true,recovered:true,status:"CANCELLED",paymentId:id});
    }
    let after=payment;const txid=payment.transaction?.txid||dto.transaction?.txid||"";
    if(!txid)return res.status(409).json({ok:false,recovered:false,status:"PENDING",paymentId:id,message:"Payment has no blockchain transaction yet."});
    if(payment.transaction&&payment.transaction.verified===false)return res.status(409).json({ok:false,recovered:false,status:"PENDING",paymentId:id,message:"Blockchain transaction is not verified yet."});
    if(after.status?.developer_completed!==true){
      await piFetch("/v2/payments/"+encodeURIComponent(id)+"/complete",{method:"POST",body:JSON.stringify({txid})});
      after=await piFetch("/v2/payments/"+encodeURIComponent(id));
    }
    if(after.status?.developer_completed!==true)return res.status(409).json({ok:false,status:"NOT_COMPLETED",paymentId:id,message:"Pi payment is still not developer-completed."});
    const pet=await grantPet(uid,code,id);
    await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW() WHERE payment_id=$2`,[txid,id]);
    res.json({ok:true,recovered:true,status:"COMPLETED",paymentId:id,transactionId:txid,pet});
  }catch(e){console.error("recover incomplete payment:",e);res.status(400).json({ok:false,error:e.message});}
});

app.post("/api/payments/pi/prepare",requirePiAuth,async(req,res)=>{
  try{
    const {payment_id,pet_code}=req.body||{};if(!payment_id||!pet_code)return res.status(400).json({ok:false,error:"payment_id and pet_code are required."});
    const pet=await dbQuery("SELECT pet_code FROM pets_catalog WHERE pet_code=$1 LIMIT 1",[pet_code]);if(!pet.rows.length)return res.status(404).json({ok:false,error:"Pet not found."});
    await dbQuery(`INSERT INTO pet_payments(payment_id,pi_uid,username,pet_code,currency,amount,status)
      VALUES($1,$2,$3,$4,'PI',$5,'CREATED') ON CONFLICT(payment_id) DO UPDATE SET pet_code=EXCLUDED.pet_code,updated_at=NOW()`,
      [payment_id,req.piUser.uid,req.piUser.username,pet_code,Number(PET_PI_PRICE)]);
    res.json({ok:true,paymentId:payment_id,pet_code,amount:Number(PET_PI_PRICE),currency:"Pi",status:"CREATED"});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});
app.post("/api/payments/pi/approve",requirePiAuth,async(req,res)=>{
  try{
    const {payment_id}=req.body||{},row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1",[payment_id,req.piUser.uid]);
    if(!row.rows.length)return res.status(404).json({ok:false,error:"Payment intent not found."});
    const approved=await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/approve",{method:"POST"});
    await dbQuery("UPDATE pet_payments SET status='APPROVED',updated_at=NOW() WHERE payment_id=$1",[payment_id]);
    res.json({ok:true,paymentId:payment_id,status:"APPROVED",pi:approved});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});
app.post("/api/payments/pi/complete",requirePiAuth,async(req,res)=>{
  try{
    const {payment_id,pet_code,txid}=req.body||{},row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 AND pi_uid=$2 LIMIT 1",[payment_id,req.piUser.uid]);
    if(!row.rows.length)return res.status(404).json({ok:false,error:"Payment intent not found."});
    if(row.rows[0].status==="COMPLETED")return res.json({ok:true,status:"COMPLETED",message:"Payment already completed."});
    const payment=await piFetch("/v2/payments/"+encodeURIComponent(payment_id)),transactionId=txid||payment.transaction?.txid||"";
    if(!transactionId)return res.status(409).json({ok:false,error:"Pi transaction ID is not available yet."});
    if(payment.status?.cancelled===true)return res.status(409).json({ok:false,error:"Pi payment was cancelled."});
    const completed=await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/complete",{method:"POST",body:JSON.stringify({txid:transactionId})});
    const pet=await grantPet(req.piUser.uid,pet_code,payment_id);
    await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW() WHERE payment_id=$2`,[transactionId,payment_id]);
    res.json({ok:true,status:"COMPLETED",paymentId:payment_id,transactionId,pi:completed,pet});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});
app.post("/api/payments/pi/callback",async(req,res)=>{
  try{
    const {payment_id,txid}=req.body||{},row=await dbQuery("SELECT * FROM pet_payments WHERE payment_id=$1 LIMIT 1",[payment_id]);
    if(!row.rows.length)return res.status(404).json({ok:false,error:"Payment intent not found."});
    if(row.rows[0].status==="COMPLETED")return res.json({ok:true,status:"COMPLETED"});
    if(!txid)return res.status(409).json({ok:false,status:"PENDING"});
    await piFetch("/v2/payments/"+encodeURIComponent(payment_id)+"/complete",{method:"POST",body:JSON.stringify({txid})});
    const pet=await grantPet(row.rows[0].pi_uid,row.rows[0].pet_code,payment_id);
    await dbQuery(`UPDATE pet_payments SET status='COMPLETED',transaction_id=$1,completed_at=NOW(),updated_at=NOW() WHERE payment_id=$2`,[txid,payment_id]);
    res.json({ok:true,status:"COMPLETED",pet});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});

/* AMT VERIFIED TRANSFER */
async function verifyAMTTransfer(txid,from,to,amount){
  const ops=await horizonGet("/operations?transaction_hash="+encodeURIComponent(txid)+"&limit=100");
  const op=(ops._embedded?.records||[]).find(x=>x.type==="payment"&&x.asset_type==="credit_alphanum4"&&x.asset_code===AMT_ASSET_CODE&&x.asset_issuer===AMT_ISSUER&&x.source_account===from&&x.to===to&&Number(x.amount)===Number(amount));
  if(!op)throw new Error("AMT transfer not found for this wallet, receiver, asset, and amount.");
  const tx=await horizonGet("/transactions/"+encodeURIComponent(txid));if(tx.successful!==true)throw new Error("AMT transaction is not successful.");
  return op;
}
app.post("/api/payments/amt/prepare",requirePiAuth,async(req,res)=>{
  try{
    const {pet_code}=req.body||{},wallet=req.pioneer.wallet_address||"";
    if(!pet_code)return res.status(400).json({ok:false,error:"pet_code is required."});
    if(!isPublicStellarAddress(wallet))return res.status(400).json({ok:false,error:"Sync your public Pi Testnet wallet first."});
    res.json({ok:true,pet_code,amount:Number(PET_AMT_PRICE),currency:AMT_ASSET_CODE,from_wallet:wallet,receiver:AMT_RECEIVER,issuer:AMT_ISSUER,horizon:AMT_HORIZON_URL,status:"READY_FOR_VERIFIED_AMT_TRANSFER"});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});
app.post("/api/payments/amt/complete",requirePiAuth,async(req,res)=>{
  try{
    const {pet_code,txid}=req.body||{},wallet=req.pioneer.wallet_address||"";
    if(!pet_code||!txid)return res.status(400).json({ok:false,error:"pet_code and txid are required."});
    if(!isPublicStellarAddress(wallet))return res.status(400).json({ok:false,error:"Sync your public Pi Testnet wallet first."});
    const used=await dbQuery("SELECT id FROM amt_payments WHERE txid=$1 LIMIT 1",[txid]);if(used.rows.length)return res.status(409).json({ok:false,error:"This AMT transaction hash has already been used."});
    await verifyAMTTransfer(txid,wallet,AMT_RECEIVER,PET_AMT_PRICE);
    await dbQuery(`INSERT INTO amt_payments(pi_uid,pet_code,amount,asset_code,receiver,txid,status,completed_at)
      VALUES($1,$2,$3,$4,$5,$6,'COMPLETED',NOW())`,[req.piUser.uid,pet_code,Number(PET_AMT_PRICE),AMT_ASSET_CODE,AMT_RECEIVER,txid]);
    res.json({ok:true,status:"COMPLETED",transactionId:txid,pet:await grantPet(req.piUser.uid,pet_code)});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});

/* DEVELOPMENT HELPER */
app.post("/api/dev/give-pet",async(req,res)=>{
  try{
    const {pi_uid,pet_code,username,wallet_address}=req.body||{};
    if(!pi_uid||!pet_code)return res.status(400).json({ok:false,error:"pi_uid and pet_code are required."});
    await upsertPioneer(pi_uid,username,wallet_address);
    res.json({ok:true,message:"Pet added to Pioneer collection.",pet:await grantPet(pi_uid,pet_code)});
  }catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.use((req,res)=>res.status(404).json({ok:false,error:"Endpoint not found.",path:req.originalUrl}));

async function startServer(){
  try{
    await initializeDatabase();await seedPetCatalog();
    app.listen(PORT,()=>{console.log("======================================");
      console.log(" AMT PET MARKETPLACE — EGG EDITION");
      console.log("======================================");
      console.log(`Server running on port ${PORT}`);
      console.log(`Database configured: ${!!DATABASE_URL}`);
      console.log(`Pi API configured: ${!!PI_API_KEY}`);
      console.log(`Pet catalog: ${PET_SEED.length} pets`);
      console.log("Pi network: Testnet");
      console.log("Wallet sync + lock: enabled");
      console.log("Egg + 24h incubator: enabled");
      console.log("Battle: enabled");
      console.log("======================================");});
  }catch(e){console.error("SERVER STARTUP ERROR:",e);process.exit(1);}
}
startServer();
