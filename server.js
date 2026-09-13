"use strict";

/*
 * ============================================================
 * ALBERTO MARKETPLACE TOKEN (AMT)
 * PI TESTNET MINING BACKEND
 *
 * IMPORTANT:
 * - Existing AMT mining/ledger functions are preserved.
 * - Pi user authentication is verified server-side.
 * - Pi username is used as the referral identifier.
 * - Maximum direct referrals per Pioneer: 5.
 * - Referral rewards are NOT credited on Testnet.
 * - Referral activity is recorded for future Mainnet rules.
 * ============================================================
 */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT || 10000);

const PI_API_BASE = (
  process.env.PI_API_BASE || "https://api.minepi.com"
).trim().replace(/\/+$/, "");

const PI_API_KEY = (
  process.env.PI_API_KEY || ""
).trim();

const AMT_MINING_RATE = Number(
  process.env.AMT_MINING_RATE || "0.01"
);

const MINING_DURATION_SECONDS = 24 * 60 * 60;
const MAXIMUM_BASE_REWARD = Number(
  (AMT_MINING_RATE * 24).toFixed(8)
);

const MAX_DIRECT_REFERRALS = 5;

/* Test Marketplace: private owner-only pet for Pi Testnet payment testing. */
const MARKET_TEST_OWNER_PI_UID = (process.env.MARKET_TEST_OWNER_PI_UID || "").trim();
const MARKET_TEST_OWNER_USERNAME = (process.env.MARKET_TEST_OWNER_USERNAME || "").trim().toLowerCase();
const MARKET_TEST_PRICE_PI = Number(process.env.MARKET_TEST_PRICE_PI || "0.1");
const MARKET_TEST_PRODUCT_ID = "amt-test-pet-001";

if (!Number.isFinite(MARKET_TEST_PRICE_PI) || MARKET_TEST_PRICE_PI <= 0) {
  console.error("MARKET_TEST_PRICE_PI must be a positive number.");
  process.exit(1);
}

if (!Number.isFinite(AMT_MINING_RATE) || AMT_MINING_RATE < 0) {
  console.error("AMT_MINING_RATE must be a valid non-negative number.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sendError(res, status, error, code = null) {
  const response = { success: false, error };
  if (code) response.code = code;
  return res.status(status).json(response);
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      pi_uid TEXT UNIQUE NOT NULL,
      username TEXT,
      kyc_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (kyc_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS amt_wallets (
      id SERIAL PRIMARY KEY,
      member_id INTEGER UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      wallet_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
      wallet_address TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mining_sessions (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED')),
      rate NUMERIC(30,8) NOT NULL,
      claimed_amount NUMERIC(30,8) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS amt_ledger (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      amount NUMERIC(30,8) NOT NULL,
      type TEXT NOT NULL,
      reference TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      referred_member_id INTEGER UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','INACTIVE')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS security_circle (
      id SERIAL PRIMARY KEY,
      owner_member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','INACTIVE')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (owner_member_id, member_id)
    );
  `);

  /* PRIVATE TEST MARKETPLACE PAYMENTS */
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_payments (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      payment_id TEXT UNIQUE NOT NULL,
      product_id TEXT NOT NULL,
      amount NUMERIC(20,7) NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATED',
      transaction_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_purchases (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      payment_id TEXT UNIQUE NOT NULL,
      transaction_id TEXT,
      amount NUMERIC(20,7) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_marketplace_payments_member
    ON marketplace_payments(member_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_member
    ON marketplace_purchases(member_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_mining_member_status
    ON mining_sessions(member_id, status);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_ledger_member
    ON amt_ledger(member_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_referral_referrer
    ON referrals(referrer_member_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_security_owner
    ON security_circle(owner_member_id);
  `);

  console.log("AMT PostgreSQL database initialized.");
}

async function verifyPiAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== "string") {
    const error = new Error("Missing Pi access token.");
    error.statusCode = 400;
    throw error;
  }

  const endpoint = `${PI_API_BASE}/v2/me`;
  let response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
  } catch (error) {
    console.error("Pi API connection error:", error.message);
    const apiError = new Error("Unable to contact Pi Platform API.");
    apiError.statusCode = 502;
    throw apiError;
  }

  const data = await readJsonResponse(response);

  if (!response.ok) {
    const error = new Error(
      `Pi access token verification failed: HTTP ${response.status}`
    );
    error.statusCode = response.status === 401 ? 401 : 502;
    error.piStatus = response.status;
    error.piResponse = data;
    throw error;
  }

  if (!data || typeof data.uid !== "string" || !data.uid) {
    const error = new Error(
      "Pi API response did not contain a valid UID."
    );
    error.statusCode = 502;
    throw error;
  }

  return {
    uid: data.uid,
    username:
      typeof data.username === "string" ? data.username : null,
    credentials: data.credentials || null
  };
}

async function getAuthenticatedMember(accessToken) {
  const piUser = await verifyPiAccessToken(accessToken);

  const result = await pool.query(
    `
    INSERT INTO members (pi_uid, username)
    VALUES ($1, $2)
    ON CONFLICT (pi_uid)
    DO UPDATE SET
      username = EXCLUDED.username,
      updated_at = NOW()
    RETURNING id, pi_uid, username, kyc_status
    `,
    [piUser.uid, piUser.username]
  );

  const member = result.rows[0];

  await pool.query(
    `
    INSERT INTO amt_wallets (member_id, wallet_status)
    VALUES ($1, 'NOT_CONNECTED')
    ON CONFLICT (member_id) DO NOTHING
    `,
    [member.id]
  );

  return member;
}

/*
 * ============================================================
 * HEALTH / ROOT
 * ============================================================
 */

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      success: true,
      service: "AMT Backend",
      network: "Pi Testnet",
      database: "connected",
      piApiBase: PI_API_BASE,
      maxDirectReferrals: MAX_DIRECT_REFERRALS,
      status: "healthy"
    });
  } catch (error) {
    console.error("Database health error:", error.message);
    return res.status(500).json({
      success: false,
      service: "AMT Backend",
      network: "Pi Testnet",
      database: "error",
      status: "unhealthy"
    });
  }
});

app.get("/", (req, res) => {
  return res.json({
    app: "Alberto Marketplace Token",
    symbol: "AMT",
    network: "Pi Testnet",
    environment: "TESTNET",
    piApiBase: PI_API_BASE,
    miningRate: `${AMT_MINING_RATE} AMT/hour`,
    miningDuration: "24 hours",
    maximumBaseReward: MAXIMUM_BASE_REWARD,
    maxDirectReferrals: MAX_DIRECT_REFERRALS,
    referralReward: "PENDING_FOR_MAINNET",
    status: "ONLINE"
  });
});

/*
 * ============================================================
 * AUTH / PROFILE / KYC / WALLET
 * ============================================================
 */

app.post("/api/auth/verify", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    return res.json({
      success: true,
      user: {
        uid: member.pi_uid,
        username: member.username
      },
      kyc: { status: member.kyc_status }
    });
  } catch (error) {
    console.error("Pi authentication verification error:", error.message);
    return sendError(
      res,
      error.statusCode || 401,
      "Pi account verification failed.",
      error.piStatus ? `PI_HTTP_${error.piStatus}` : null
    );
  }
});

app.post("/api/profile", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    const walletResult = await pool.query(
      `
      SELECT wallet_status, wallet_address
      FROM amt_wallets
      WHERE member_id = $1
      `,
      [member.id]
    );

    const wallet = walletResult.rows[0] || null;

    return res.json({
      success: true,
      profile: {
        uid: member.pi_uid,
        username: member.username,
        kycStatus: member.kyc_status,
        walletStatus: wallet?.wallet_status || "NOT_CONNECTED",
        walletAddress: wallet?.wallet_address || null
      }
    });
  } catch (error) {
    console.error("Profile error:", error.message);
    return sendError(
      res,
      error.statusCode || 401,
      "Profile authentication failed."
    );
  }
});

app.post("/api/kyc/status", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    return res.json({
      success: true,
      kyc: {
        status: member.kyc_status,
        miningAllowed: true,
        migrationEligible: member.kyc_status === "VERIFIED",
        protectedTransactionsEligible: member.kyc_status === "VERIFIED"
      }
    });
  } catch (error) {
    console.error("KYC status error:", error.message);
    return sendError(
      res,
      error.statusCode || 401,
      "Unable to read KYC status."
    );
  }
});

app.post("/api/wallet", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    const balanceResult = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM amt_ledger
      WHERE member_id = $1
      `,
      [member.id]
    );

    const walletResult = await pool.query(
      `
      SELECT wallet_status, wallet_address
      FROM amt_wallets
      WHERE member_id = $1
      `,
      [member.id]
    );

    const balance = Number(balanceResult.rows[0].balance);
    const wallet = walletResult.rows[0] || null;

    return res.json({
      success: true,
      network: "Pi Testnet",
      wallet: {
        amt: Number(balance.toFixed(8)),
        walletStatus: wallet?.wallet_status || "NOT_CONNECTED",
        walletAddress: wallet?.wallet_address || null
      }
    });
  } catch (error) {
    console.error("Wallet error:", error.message);
    return sendError(
      res,
      error.statusCode || 500,
      "Could not load AMT wallet."
    );
  }
});

/*
 * ============================================================
 * MINING
 * Existing mining behavior is preserved.
 * ============================================================
 */

app.post("/api/mining/start", async (req, res) => {
  let client = null;
  let transactionStarted = false;

  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const active = await client.query(
      `
      SELECT *
      FROM mining_sessions
      WHERE member_id = $1
      AND status = 'ACTIVE'
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
      `,
      [member.id]
    );

    if (active.rows.length > 0) {
      await client.query("COMMIT");
      transactionStarted = false;

      const currentSession = active.rows[0];

      return res.json({
        success: true,
        status: "ALREADY_MINING",
        session: {
          id: currentSession.id,
          startedAt: currentSession.started_at,
          endsAt: currentSession.ends_at,
          rate: Number(currentSession.rate)
        }
      });
    }

    const startedAt = new Date();
    const endsAt = new Date(
      startedAt.getTime() + MINING_DURATION_SECONDS * 1000
    );

    const sessionResult = await client.query(
      `
      INSERT INTO mining_sessions
      (member_id, started_at, ends_at, status, rate)
      VALUES ($1, $2, $3, 'ACTIVE', $4)
      RETURNING id, started_at, ends_at, rate
      `,
      [member.id, startedAt, endsAt, AMT_MINING_RATE]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const session = sessionResult.rows[0];

    return res.json({
      success: true,
      status: "MINING_STARTED",
      kycStatus: member.kyc_status,
      session: {
        id: session.id,
        startedAt: session.started_at,
        endsAt: session.ends_at,
        rate: Number(session.rate),
        maximumBaseReward: MAXIMUM_BASE_REWARD
      }
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Mining rollback error:", rollbackError.message);
      }
    }

    console.error("Start mining error:", error.message);

    return sendError(
      res,
      error.statusCode || 500,
      "Could not start mining."
    );
  } finally {
    if (client) client.release();
  }
});

app.post("/api/mining/status", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    const result = await pool.query(
      `
      SELECT *
      FROM mining_sessions
      WHERE member_id = $1
      AND status = 'ACTIVE'
      ORDER BY id DESC
      LIMIT 1
      `,
      [member.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        mining: false,
        message: "No active mining session."
      });
    }

    const session = result.rows[0];
    const now = Date.now();
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ends_at).getTime();
    const current = Math.min(Math.max(now, start), end);
    const elapsedSeconds = (current - start) / 1000;
    const rate = Number(session.rate);

    const earned = Math.min(
      rate * (elapsedSeconds / 3600),
      rate * 24
    );

    const completed = now >= end;

    return res.json({
      success: true,
      mining: true,
      completed,
      session: {
        id: session.id,
        startedAt: session.started_at,
        endsAt: session.ends_at,
        rate,
        earned: Number(earned.toFixed(8)),
        maximumBaseReward: Number((rate * 24).toFixed(8)),
        claimAvailable: completed
      }
    });
  } catch (error) {
    console.error("Mining status error:", error.message);
    return sendError(
      res,
      error.statusCode || 500,
      "Could not read mining status."
    );
  }
});

app.post("/api/mining/claim", async (req, res) => {
  let client = null;
  let transactionStarted = false;

  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `
      SELECT *
      FROM mining_sessions
      WHERE member_id = $1
      AND status = 'ACTIVE'
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
      `,
      [member.id]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(
        res,
        404,
        "No active mining session.",
        "NO_ACTIVE_SESSION"
      );
    }

    const session = result.rows[0];
    const now = Date.now();
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ends_at).getTime();

    if (now < end) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      const remainingSeconds = Math.ceil((end - now) / 1000);

      return res.status(403).json({
        success: false,
        code: "MINING_NOT_COMPLETE",
        message:
          "The 24-hour mining session must finish before the reward can be claimed.",
        remainingSeconds
      });
    }

    const rate = Number(session.rate);

    const grossEarned = Math.min(
      rate * 24,
      MAXIMUM_BASE_REWARD
    );

    const claimable = Number(
      (
        grossEarned -
        Number(session.claimed_amount)
      ).toFixed(8)
    );

    if (claimable <= 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.json({
        success: true,
        claimed: 0,
        message: "No new AMT reward is available."
      });
    }

    const reference =
      `MINING-${session.id}-${crypto.randomBytes(8).toString("hex")}`;

    await client.query(
      `
      INSERT INTO amt_ledger
      (member_id, amount, type, reference)
      VALUES ($1, $2, 'MINING_REWARD', $3)
      `,
      [member.id, claimable, reference]
    );

    const newClaimed = Number(
      (
        Number(session.claimed_amount) +
        claimable
      ).toFixed(8)
    );

    await client.query(
      `
      UPDATE mining_sessions
      SET claimed_amount = $1,
          status = 'COMPLETED'
      WHERE id = $2
      `,
      [newClaimed, session.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      success: true,
      claimed: claimable,
      sessionStatus: "COMPLETED",
      message:
        "AMT Testnet mining reward recorded in the ledger."
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Claim rollback error:", rollbackError.message);
      }
    }

    console.error("Claim reward error:", error.message);

    return sendError(
      res,
      error.statusCode || 500,
      "Could not record AMT mining reward."
    );
  } finally {
    if (client) client.release();
  }
});

/*
 * ============================================================
 * REFERRAL
 *
 * Pi username = referral identifier.
 * Maximum 5 direct referrals.
 * No Testnet reward is created.
 * ============================================================
 */

app.post("/api/referral/auto-link", async (req, res) => {
  let client = null;
  let transactionStarted = false;

  try {
    const { accessToken, referralUsername } = req.body || {};

    const member = await getAuthenticatedMember(accessToken);

    const cleanUsername =
      typeof referralUsername === "string"
        ? referralUsername.trim()
        : "";

    if (!cleanUsername) {
      return res.json({
        success: true,
        status: "NO_REFERRAL",
        linked: false,
        message: "No referral username was supplied."
      });
    }

    if (
      member.username &&
      cleanUsername.toLowerCase() === member.username.toLowerCase()
    ) {
      return sendError(
        res,
        400,
        "A member cannot refer themselves.",
        "SELF_REFERRAL"
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const referrerResult = await client.query(
      `
      SELECT id, pi_uid, username
      FROM members
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1
      `,
      [cleanUsername]
    );

    if (referrerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.json({
        success: true,
        status: "REFERRER_NOT_FOUND",
        linked: false,
        message:
          "The referral Pioneer has not been registered in AMT yet."
      });
    }

    const referrer = referrerResult.rows[0];

    if (Number(referrer.id) === Number(member.id)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return sendError(
        res,
        400,
        "A member cannot refer themselves.",
        "SELF_REFERRAL"
      );
    }

    const existing = await client.query(
      `
      SELECT id, referrer_member_id
      FROM referrals
      WHERE referred_member_id = $1
      LIMIT 1
      `,
      [member.id]
    );

    if (existing.rows.length > 0) {
      await client.query("COMMIT");
      transactionStarted = false;

      return res.json({
        success: true,
        status: "ALREADY_LINKED",
        linked: false,
        message: "This account already has a referral relationship."
      });
    }

    const countResult = await client.query(
      `
      SELECT COUNT(*)::INTEGER AS count
      FROM referrals
      WHERE referrer_member_id = $1
      AND status = 'ACTIVE'
      `,
      [referrer.id]
    );

    const referralCount = Number(countResult.rows[0].count);

    if (referralCount >= MAX_DIRECT_REFERRALS) {
      await client.query("COMMIT");
      transactionStarted = false;

      return res.json({
        success: true,
        status: "REFERRER_LIMIT_REACHED",
        linked: false,
        limit: MAX_DIRECT_REFERRALS,
        message:
          "This Pioneer already has the maximum number of direct referrals."
      });
    }

    await client.query(
      `
      INSERT INTO referrals
      (referrer_member_id, referred_member_id, status)
      VALUES ($1, $2, 'ACTIVE')
      `,
      [referrer.id, member.id]
    );

    /*
     * Automatically place the invited Pioneer in the
     * referrer's AMT Security Circle.
     */
    await client.query(
      `
      INSERT INTO security_circle
      (owner_member_id, member_id, status)
      VALUES ($1, $2, 'ACTIVE')
      ON CONFLICT (owner_member_id, member_id)
      DO UPDATE SET status = 'ACTIVE'
      `,
      [referrer.id, member.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      success: true,
      status: "REFERRAL_LINKED",
      linked: true,
      referrer: {
        username: referrer.username
      },
      securityCircleAdded: true,
      referralCount: referralCount + 1,
      maxDirectReferrals: MAX_DIRECT_REFERRALS,
      rewardStatus: "PENDING_FOR_MAINNET",
      message:
        "Referral relationship recorded. No Testnet reward was created."
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Referral rollback error:",
          rollbackError.message
        );
      }
    }

    console.error("Referral auto-link error:", error.message);

    return sendError(
      res,
      error.statusCode || 500,
      "Could not create referral relationship."
    );
  } finally {
    if (client) client.release();
  }
});

/*
 * Compatibility endpoint.
 * Existing clients can still use a member ID if needed.
 */
app.post("/api/referral/link", async (req, res) => {
  try {
    const { accessToken, referralMemberId } = req.body || {};

    if (!referralMemberId) {
      return sendError(
        res,
        400,
        "referralMemberId is required."
      );
    }

    const member = await getAuthenticatedMember(accessToken);

    const referrer = await pool.query(
      `
      SELECT id, pi_uid, username
      FROM members
      WHERE id = $1
      LIMIT 1
      `,
      [referralMemberId]
    );

    if (referrer.rows.length === 0) {
      return sendError(
        res,
        404,
        "Referral member not found."
      );
    }

    if (Number(referrer.rows[0].id) === Number(member.id)) {
      return sendError(
        res,
        400,
        "A member cannot refer themselves."
      );
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM referrals
      WHERE referred_member_id = $1
      LIMIT 1
      `,
      [member.id]
    );

    if (existing.rows.length > 0) {
      return sendError(
        res,
        409,
        "This account already has a referral relationship."
      );
    }

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::INTEGER AS count
      FROM referrals
      WHERE referrer_member_id = $1
      AND status = 'ACTIVE'
      `,
      [referrer.rows[0].id]
    );

    if (
      Number(countResult.rows[0].count) >=
      MAX_DIRECT_REFERRALS
    ) {
      return sendError(
        res,
        409,
        "This Pioneer already has the maximum number of direct referrals.",
        "REFERRER_LIMIT_REACHED"
      );
    }

    await pool.query(
      `
      INSERT INTO referrals
      (referrer_member_id, referred_member_id)
      VALUES ($1, $2)
      `,
      [referrer.rows[0].id, member.id]
    );

    await pool.query(
      `
      INSERT INTO security_circle
      (owner_member_id, member_id)
      VALUES ($1, $2)
      ON CONFLICT (owner_member_id, member_id)
      DO UPDATE SET status = 'ACTIVE'
      `,
      [referrer.rows[0].id, member.id]
    );

    return res.json({
      success: true,
      status: "REFERRAL_LINKED",
      rewardStatus: "PENDING_FOR_MAINNET"
    });
  } catch (error) {
    console.error("Referral error:", error.message);
    return sendError(
      res,
      error.statusCode || 500,
      "Could not create referral relationship."
    );
  }
});

/*
 * Referral dashboard:
 * returns the current user's Pi username, direct referrals,
 * active miners and future Mainnet reward status.
 */
app.post("/api/referral/status", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const owner = await getAuthenticatedMember(accessToken);

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.status,
        r.created_at,
        m.username,
        m.pi_uid,
        EXISTS (
          SELECT 1
          FROM mining_sessions ms
          WHERE ms.member_id = m.id
          AND ms.status = 'ACTIVE'
          AND ms.ends_at > NOW()
        ) AS mining
      FROM referrals r
      JOIN members m
        ON m.id = r.referred_member_id
      WHERE r.referrer_member_id = $1
      AND r.status = 'ACTIVE'
      ORDER BY r.created_at ASC
      `,
      [owner.id]
    );

    const referrals = result.rows.map((row) => ({
      username: row.username || "Pi Pioneer",
      mining: Boolean(row.mining),
      status: row.mining ? "MINING" : "NOT_MINING",
      joinedAt: row.created_at
    }));

    return res.json({
      success: true,
      referral: {
        username: owner.username || null,
        maxDirectReferrals: MAX_DIRECT_REFERRALS,
        count: referrals.length,
        activeMiners: referrals.filter((r) => r.mining).length,
        rewardStatus: "PENDING_FOR_MAINNET",
        rewardMessage:
          "Referral rewards are reserved for future Mainnet rules. No Testnet reward is credited.",
        referrals
      }
    });
  } catch (error) {
    console.error("Referral status error:", error.message);
    return sendError(
      res,
      error.statusCode || 500,
      "Could not load referral status."
    );
  }
});

/*
 * ============================================================
 * SECURITY CIRCLE
 * ============================================================
 */

app.post("/api/security-circle/add", async (req, res) => {
  try {
    const { accessToken, memberId } = req.body || {};

    if (!memberId) {
      return sendError(res, 400, "memberId is required.");
    }

    const owner = await getAuthenticatedMember(accessToken);

    if (Number(memberId) === Number(owner.id)) {
      return sendError(
        res,
        400,
        "A member cannot add themselves to their Security Circle."
      );
    }

    const target = await pool.query(
      `
      SELECT id
      FROM members
      WHERE id = $1
      LIMIT 1
      `,
      [memberId]
    );

    if (target.rows.length === 0) {
      return sendError(
        res,
        404,
        "Security Circle member not found."
      );
    }

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::INTEGER AS count
      FROM security_circle
      WHERE owner_member_id = $1
      AND status = 'ACTIVE'
      `,
      [owner.id]
    );

    if (
      Number(countResult.rows[0].count) >=
      MAX_DIRECT_REFERRALS
    ) {
      return sendError(
        res,
        409,
        `Security Circle limit is ${MAX_DIRECT_REFERRALS} members.`,
        "SECURITY_CIRCLE_LIMIT"
      );
    }

    await pool.query(
      `
      INSERT INTO security_circle
      (owner_member_id, member_id)
      VALUES ($1, $2)
      ON CONFLICT (owner_member_id, member_id)
      DO UPDATE SET status = 'ACTIVE'
      `,
      [owner.id, memberId]
    );

    return res.json({
      success: true,
      status: "SECURITY_CIRCLE_ADDED",
      message: "Security Circle member recorded."
    });
  } catch (error) {
    console.error("Security Circle error:", error.message);
    return sendError(
      res,
      error.statusCode || 500,
      "Could not update Security Circle."
    );
  }
});

app.post("/api/security-circle/status", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const owner = await getAuthenticatedMember(accessToken);

    const result = await pool.query(
      `
      SELECT
        sc.member_id,
        m.username,
        m.kyc_status,
        EXISTS (
          SELECT 1
          FROM mining_sessions ms
          WHERE ms.member_id = m.id
          AND ms.status = 'ACTIVE'
          AND ms.ends_at > NOW()
        ) AS mining
      FROM security_circle sc
      JOIN members m
        ON m.id = sc.member_id
      WHERE sc.owner_member_id = $1
      AND sc.status = 'ACTIVE'
      ORDER BY sc.id ASC
      `,
      [owner.id]
    );

    const members = result.rows.map((row) => ({
      memberId: row.member_id,
      username: row.username || "Pi Pioneer",
      kycStatus: row.kyc_status,
      mining: Boolean(row.mining),
      status: row.mining ? "MINING" : "NOT_MINING"
    }));

    return res.json({
      success: true,
      securityCircle: {
        enabled: members.length > 0,
        count: members.length,
        limit: MAX_DIRECT_REFERRALS,
        members
      }
    });
  } catch (error) {
    console.error("Security Circle status error:", error.message);
    return sendError(
      res,
      error.statusCode || 500,
      "Could not load Security Circle."
    );
  }
});

/*
 * ============================================================
 * PRIVATE TEST MARKETPLACE + REAL PI TESTNET PAYMENT FLOW
 * ============================================================
 *
 * The single test pet is visible only to the configured owner.
 * The Pi payment is real Testnet Pi, not an AMT ledger simulation.
 * Set MARKET_TEST_OWNER_PI_UID (preferred) or
 * MARKET_TEST_OWNER_USERNAME in Render before testing.
 */

function isMarketTestOwner(member) {
  if (MARKET_TEST_OWNER_PI_UID) {
    return member.pi_uid === MARKET_TEST_OWNER_PI_UID;
  }
  if (MARKET_TEST_OWNER_USERNAME) {
    return String(member.username || "").toLowerCase() === MARKET_TEST_OWNER_USERNAME;
  }
  return false;
}

function requirePiServerKey() {
  if (!PI_API_KEY) {
    const error = new Error("PI_API_KEY is not configured on the AMT backend.");
    error.statusCode = 503;
    throw error;
  }
}

async function piServerRequest(path, method = "GET", body = undefined) {
  requirePiServerKey();

  const options = {
    method,
    headers: {
      Authorization: `Key ${PI_API_KEY}`,
      Accept: "application/json"
    }
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${PI_API_BASE}${path}`, options);
  } catch (error) {
    const apiError = new Error("Unable to contact Pi Payments API.");
    apiError.statusCode = 502;
    throw apiError;
  }

  const data = await readJsonResponse(response);
  if (!response.ok) {
    const error = new Error(`Pi Payments API failed: HTTP ${response.status}`);
    error.statusCode = response.status === 401 ? 502 : response.status;
    error.piResponse = data;
    throw error;
  }

  return data;
}

app.post("/api/market/test-product", async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    const member = await getAuthenticatedMember(accessToken);

    if (!isMarketTestOwner(member)) {
      return res.status(403).json({
        success: false,
        code: "PRIVATE_TEST_MARKET",
        message: "This private Test Buy item is not available for this account."
      });
    }

    const purchaseResult = await pool.query(
      `SELECT payment_id, transaction_id, amount, created_at
       FROM marketplace_purchases
       WHERE member_id = $1 AND product_id = $2
       ORDER BY id DESC LIMIT 10`,
      [member.id, MARKET_TEST_PRODUCT_ID]
    );

    return res.json({
      success: true,
      network: "Pi Testnet",
      privateTest: true,
      product: {
        id: MARKET_TEST_PRODUCT_ID,
        name: "Alberto Test Pet",
        description: "Private marketplace test item for the owner account.",
        pricePi: MARKET_TEST_PRICE_PI,
        currency: "Pi",
        image: "🐾",
        testOnly: true
      },
      purchases: purchaseResult.rows
    });
  } catch (error) {
    console.error("Test marketplace product error:", error.message);
    return sendError(res, error.statusCode || 500, "Could not load the private test product.");
  }
});

app.post("/api/market/payment/approve", async (req, res) => {
  try {
    const { accessToken, paymentId } = req.body || {};
    if (!paymentId || typeof paymentId !== "string") {
      return sendError(res, 400, "paymentId is required.");
    }

    const member = await getAuthenticatedMember(accessToken);
    if (!isMarketTestOwner(member)) {
      return sendError(res, 403, "Private Test Buy is not available for this account.", "PRIVATE_TEST_MARKET");
    }

    const payment = await piServerRequest(`/v2/payments/${encodeURIComponent(paymentId)}`);
    const amount = Number(payment?.amount);
    const memo = String(payment?.memo || "");
    const metadata = payment?.metadata || {};

    if (!Number.isFinite(amount) || Math.abs(amount - MARKET_TEST_PRICE_PI) > 0.0000001) {
      return sendError(res, 400, "Payment amount does not match the private test product.", "INVALID_AMOUNT");
    }
    if (metadata.productId !== MARKET_TEST_PRODUCT_ID) {
      return sendError(res, 400, "Payment product does not match the private test product.", "INVALID_PRODUCT");
    }
    if (memo !== "Alberto Test Pet") {
      return sendError(res, 400, "Payment memo does not match the private test product.", "INVALID_MEMO");
    }

    await pool.query(
      `INSERT INTO marketplace_payments (member_id, payment_id, product_id, amount, status)
       VALUES ($1, $2, $3, $4, 'APPROVAL_PENDING')
       ON CONFLICT (payment_id) DO UPDATE SET updated_at = NOW()`,
      [member.id, paymentId, MARKET_TEST_PRODUCT_ID, MARKET_TEST_PRICE_PI]
    );

    await piServerRequest(`/v2/payments/${encodeURIComponent(paymentId)}/approve`, "POST");

    await pool.query(
      `UPDATE marketplace_payments SET status = 'APPROVED', updated_at = NOW() WHERE payment_id = $1`,
      [paymentId]
    );

    return res.json({ success: true, status: "APPROVED", paymentId });
  } catch (error) {
    console.error("Test marketplace approval error:", error.message);
    return sendError(res, error.statusCode || 500, "Could not approve the Pi Testnet payment.", error.piResponse?.error?.code || null);
  }
});

app.post("/api/market/payment/complete", async (req, res) => {
  try {
    const { accessToken, paymentId, txid } = req.body || {};
    if (!paymentId || typeof paymentId !== "string" || !txid || typeof txid !== "string") {
      return sendError(res, 400, "paymentId and txid are required.");
    }

    const member = await getAuthenticatedMember(accessToken);
    if (!isMarketTestOwner(member)) {
      return sendError(res, 403, "Private Test Buy is not available for this account.", "PRIVATE_TEST_MARKET");
    }

    const pending = await pool.query(
      `SELECT id, member_id, product_id, amount, status
       FROM marketplace_payments
       WHERE payment_id = $1 AND member_id = $2
       LIMIT 1`,
      [paymentId, member.id]
    );

    if (pending.rows.length === 0) {
      return sendError(res, 404, "Payment session was not created by this account.", "PAYMENT_NOT_FOUND");
    }

    const payment = pending.rows[0];
    if (payment.product_id !== MARKET_TEST_PRODUCT_ID || Number(payment.amount) !== MARKET_TEST_PRICE_PI) {
      return sendError(res, 400, "Stored payment does not match the test product.", "PAYMENT_MISMATCH");
    }

    if (payment.status === "COMPLETED") {
      return res.json({ success: true, status: "COMPLETED", paymentId, txid });
    }

    const completion = await piServerRequest(
      `/v2/payments/${encodeURIComponent(paymentId)}/complete`,
      "POST",
      { txid }
    );

    const verifiedTxid = String(completion?.transaction?.txid || completion?.transaction?.id || txid);

    await pool.query(
      `UPDATE marketplace_payments
       SET status = 'COMPLETED', transaction_id = $1, updated_at = NOW()
       WHERE payment_id = $2`,
      [verifiedTxid, paymentId]
    );

    await pool.query(
      `INSERT INTO marketplace_purchases
       (member_id, product_id, payment_id, transaction_id, amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (payment_id) DO NOTHING`,
      [member.id, MARKET_TEST_PRODUCT_ID, paymentId, verifiedTxid, MARKET_TEST_PRICE_PI]
    );

    return res.json({
      success: true,
      status: "COMPLETED",
      paymentId,
      transactionId: verifiedTxid,
      product: "Alberto Test Pet",
      network: "Pi Testnet"
    });
  } catch (error) {
    console.error("Test marketplace completion error:", error.message);
    return sendError(res, error.statusCode || 500, "Could not complete the Pi Testnet payment.", error.piResponse?.error?.code || null);
  }
});

/*
 * ============================================================
 * SERVER START
 * ============================================================
 */

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log("==========================================");
      console.log("Alberto Marketplace Token (AMT)");
      console.log("Pi Testnet Mining Backend");
      console.log("Server running on port:", PORT);
      console.log("Pi API:", PI_API_BASE);
      console.log("Pi /me endpoint:", `${PI_API_BASE}/v2/me`);
      console.log(
        "PI_API_KEY configured:",
        PI_API_KEY ? "YES" : "NO"
      );
      console.log(
        "AMT mining rate:",
        AMT_MINING_RATE,
        "AMT/hour"
      );
      console.log("Mining duration:", "24 hours");
      console.log(
        "Maximum base reward:",
        MAXIMUM_BASE_REWARD,
        "AMT/session"
      );
      console.log(
        "Maximum direct referrals:",
        MAX_DIRECT_REFERRALS
      );
      console.log(
        "Referral reward:",
        "PENDING_FOR_MAINNET"
      );
      console.log("KYC required for mining:", "NO");
      console.log("==========================================");
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
