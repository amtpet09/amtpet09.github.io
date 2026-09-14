const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// CONFIGURATION PARAMS (Mula sa Envs o defaults)
const PI_API_URL = process.env.PI_API_URL || "https://api.testnet.minepi.com";
const PI_API_KEY = process.env.PI_API_KEY || "YOUR_PI_DEVELOPER_API_KEY"; // Ilagay ang API key mula sa Pi Developer Portal
const AMT_ISSUER = process.env.AMT_ISSUER || "GA...YOUR_AMT_ISSUER_ADDRESS_HERE";

// IN-MEMORY DATABASE SIMULATION (Palitan ng MongoDB/PostgreSQL kung gamit mo)
let db = {
  users: {},
  pets: [
    { id: 101, owner: "PioneerAlpha", name: "Ignis Dragon", element: "Fire", hp: 120, atk: 45, def: 30, price: 50, isListed: false },
    { id: 102, owner: "PioneerAlpha", name: "Aqua Wolf", element: "Water", hp: 100, atk: 35, def: 25, price: 30, isListed: false },
    { id: 201, owner: "PioneerBeta", name: "Terra Bear", element: "Earth", hp: 150, atk: 30, def: 50, price: 75, isListed: true }
  ],
  eggs: [
    { id: 501, owner: "PioneerAlpha", name: "Thunder Pet Egg", hatchTime: Date.now() - 1000, isHatched: false }
  ],
  payments: {}
};

// ==========================================
// 1. PI AUTHENTICATION & USER SYNC
// ==========================================
app.post('/api/auth/pi-sync', async (req, res) => {
  const { accessToken, walletAddress } = req.body;

  try {
    // 1. Verify access token with Pi Network API
    const piUserResponse = await axios.get(`${PI_API_URL}/v2/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = piUserResponse.data;
    const username = userData.username;

    // 2. Save/Update Pioneer user profile
    if (!db.users[username]) {
      db.users[username] = {
        uid: userData.uid,
        username: username,
        walletAddress: walletAddress || null,
        amtBalance: 0,
        reputation: 100,
        createdAt: new Date()
      };
    } else if (walletAddress) {
      db.users[username].walletAddress = walletAddress;
    }

    return res.json({
      success: true,
      user: db.users[username]
    });
  } catch (err) {
    console.error("Pi Sync Error:", err.response?.data || err.message);
    return res.status(401).json({ success: false, message: "Pi authentication failed" });
  }
});

// ==========================================
// 2. AMT TESTNET TRUSTLINE & BALANCE CHECK
// ==========================================
app.get('/api/wallet/amt-balance/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    // Tawagin ang Pi Horizon Testnet API para sa on-chain balance
    const response = await axios.get(`${PI_API_URL}/accounts/${walletAddress}`);
    const balances = response.data.balances || [];

    const amtAsset = balances.find(b => b.asset_code === 'AMT' || b.asset_issuer === AMT_ISSUER);

    return res.json({
      success: true,
      hasTrustline: !!amtAsset,
      balance: amtAsset ? parseFloat(amtAsset.balance) : 0
    });
  } catch (err) {
    console.error("Horizon API Error:", err.message);
    return res.json({ success: false, hasTrustline: false, balance: 0 });
  }
});

// ==========================================
// 3. PI SDK PAYMENT APPROVAL & COMPLETION (AMT MARKETPLACE)
// ==========================================

// Step A: Server Approval Callback
app.post('/api/payments/approve', async (req, res) => {
  const { paymentId } = req.body;

  try {
    // I-approve ang payment sa Pi Platform API
    await axios.post(`${PI_API_URL}/v2/payments/${paymentId}/approve`, {}, {
      headers: { Authorization: `Key ${PI_API_KEY}` }
    });

    db.payments[paymentId] = { status: 'APPROVED', approvedAt: new Date() };
    return res.json({ success: true, message: "Payment approved" });
  } catch (err) {
    console.error("Approval Error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to approve payment" });
  }
});

// Step B: Server Completion Callback & Ownership Transfer
app.post('/api/payments/complete', async (req, res) => {
  const { paymentId, txid } = req.body;

  try {
    // 1. I-complete ang payment sa Pi Platform API gamit ang TxID
    const completeRes = await axios.post(`${PI_API_URL}/v2/payments/${paymentId}/complete`, { txid }, {
      headers: { Authorization: `Key ${PI_API_KEY}` }
    });

    const paymentData = completeRes.data;
    const petId = paymentData.metadata?.petId;
    const buyerUsername = paymentData.user_uid; // O mula sa app state

    // 2. I-transfer ang Pet ownership sa Marketplace Database
    if (petId) {
      const petIndex = db.pets.findIndex(p => p.id === parseInt(petId));
      if (petIndex !== -1) {
        db.pets[petIndex].owner = buyerUsername;
        db.pets[petIndex].isListed = false; // Tanggalin sa Public Market
      }
    }

    db.payments[paymentId].status = 'COMPLETED';
    db.payments[paymentId].txid = txid;

    return res.json({ success: true, message: "Transaction completed & Pet transferred" });
  } catch (err) {
    console.error("Completion Error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, message: "Failed to complete transaction" });
  }
});

// ==========================================
// 4. EGG HATCHING ENGINE
// ==========================================
app.post('/api/eggs/hatch', (req, res) => {
  const { eggId, username } = req.body;

  const eggIndex = db.eggs.findIndex(e => e.id === parseInt(eggId) && e.owner === username);

  if (eggIndex === -1) {
    return res.status(404).json({ success: false, message: "Egg not found or not owned by user" });
  }

  const egg = db.eggs[eggIndex];

  // 1. Verify timer
  if (Date.now() < egg.hatchTime) {
    return res.status(400).json({ success: false, message: "Egg is still incubating!" });
  }

  // 2. Generate new Pet Metadata (RNG)
  const elements = ['Fire', 'Water', 'Earth', 'Wind', 'Thunder', 'Ice', 'Nature'];
  const randomElement = elements[Math.floor(Math.random() * elements.length)];
  
  const newPet = {
    id: Math.floor(100000 + Math.random() * 900000),
    owner: username,
    name: `${randomElement} Beast`,
    element: randomElement,
    hp: Math.floor(90 + Math.random() * 50),
    atk: Math.floor(30 + Math.random() * 30),
    def: Math.floor(20 + Math.random() * 25),
    price: 0,
    isListed: false
  };

  // 3. Tanggalin ang Egg sa DB at Idagdag ang Pet
  db.eggs.splice(eggIndex, 1);
  db.pets.push(newPet);

  return res.json({
    success: true,
    message: "Egg hatched successfully!",
    pet: newPet
  });
});

// ==========================================
// 5. SERVER-SIDE BATTLE ARENA ENGINE
// ==========================================
app.post('/api/battle/start', (req, res) => {
  const { petId, username } = req.body;

  const playerPet = db.pets.find(p => p.id === parseInt(petId) && p.owner === username);
  if (!playerPet) {
    return res.status(404).json({ success: false, message: "Pet not found" });
  }

  // Enemy Stats (NPC Arena Opponent)
  const enemy = { name: "Wild Mecha-Golem", hp: 120, atk: 32, def: 20 };

  let playerHp = playerPet.hp;
  let enemyHp = enemy.hp;
  let battleLogs = [];

  // Simulate battle rounds
  while (playerHp > 0 && enemyHp > 0) {
    // Player Attacks
    const pDmg = Math.max(5, playerPet.atk - Math.floor(enemy.def / 2));
    enemyHp -= pDmg;
    battleLogs.push(`${playerPet.name} dealt ${pDmg} damage to ${enemy.name}!`);

    if (enemyHp <= 0) break;

    // Enemy Counter-Attacks
    const eDmg = Math.max(5, enemy.atk - Math.floor(playerPet.def / 2));
    playerHp -= eDmg;
    battleLogs.push(`${enemy.name} counter-attacked with ${eDmg} damage!`);
  }

  const isWin = playerHp > 0;
  const rewardAmt = isWin ? 5 : 0; // 5 AMT Reward for winning

  return res.json({
    success: true,
    result: isWin ? 'VICTORY' : 'DEFEAT',
    logs: battleLogs,
    rewards: { amtCoins: rewardAmt, exp: isWin ? 50 : 10 }
  });
});

// SERVER LISTEN
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AMT Pet Marketplace Server running on port ${PORT}`);
});