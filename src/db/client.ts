import pg from 'pg';
import type { Env } from '../config/env.ts';

const { Pool } = pg;

export type DbClient = {
  configured: boolean;
  pool?: InstanceType<typeof Pool>;
};

export type PaymentIntentRecord = {
  challengeId: string;
  nonce: string;
  merchantId: string;
  amount: string;
  status: string;
  createdAt: string;
};

export function createDbClient(env: Env): DbClient {
  if (!env.DATABASE_URL) {
    return {
      configured: false,
    };
  }

  return {
    configured: true,
    pool: new Pool({
      connectionString: env.DATABASE_URL,
    }),
  };
}

export async function ensureSchema(db: DbClient): Promise<void> {
  if (!db.pool) {
    return;
  }

  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      challenge_id TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      merchant_id TEXT NOT NULL,
      amount TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function checkDbReady(db: DbClient): Promise<boolean> {
  if (!db.pool) {
    return true;
  }

  try {
    await db.pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function insertPaymentIntent(
  db: DbClient,
  input: {
    challengeId: string;
    nonce: string;
    merchantId: string;
    amount: string;
    status?: string;
  }
): Promise<PaymentIntentRecord> {
  if (!db.pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const result = await db.pool.query<{
    challenge_id: string;
    nonce: string;
    merchant_id: string;
    amount: string;
    status: string;
    created_at: Date;
  }>(
    `
      INSERT INTO payment_intents (
        challenge_id,
        nonce,
        merchant_id,
        amount,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        challenge_id,
        nonce,
        merchant_id,
        amount,
        status,
        created_at
    `,
    [
      input.challengeId,
      input.nonce,
      input.merchantId,
      input.amount,
      input.status ?? 'ISSUED',
    ]
  );

  const row = result.rows[0];

  return {
    challengeId: row.challenge_id,
    nonce: row.nonce,
    merchantId: row.merchant_id,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export async function getPaymentIntentByChallengeId(
  db: DbClient,
  challengeId: string
): Promise<PaymentIntentRecord | null> {
  if (!db.pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const result = await db.pool.query<{
    challenge_id: string;
    nonce: string;
    merchant_id: string;
    amount: string;
    status: string;
    created_at: Date;
  }>(
    `
      SELECT
        challenge_id,
        nonce,
        merchant_id,
        amount,
        status,
        created_at
      FROM payment_intents
      WHERE challenge_id = $1
    `,
    [challengeId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    challengeId: row.challenge_id,
    nonce: row.nonce,
    merchantId: row.merchant_id,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}
