import pg from 'pg';
import type { Env } from '../config/env.ts';
import { migration001CreatePaymentIntents } from './migrations/001_create_payment_intents.ts';
import { migration002CreatePaymentProofs } from './migrations/002_create_payment_proofs.ts';

const { Pool } = pg;

export type DbClient = {
  configured: boolean;
  pool?: Pool;
};

export type PaymentIntentRecord = {
  challengeId: string;
  nonce: string;
  merchantId: string;
  amount: string;
  status: string;
  createdAt: string;
};

type Migration = {
  id: string;
  up: (pool: Pool) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  migration001CreatePaymentIntents,
  migration002CreatePaymentProofs,
];

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

export async function runMigrations(db: DbClient): Promise<void> {
  if (!db.pool) {
    return;
  }

  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const migration of MIGRATIONS) {
    const existing = await db.pool.query<{ id: string }>(
      `SELECT id FROM schema_migrations WHERE id = $1`,
      [migration.id]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      continue;
    }

    await migration.up(db.pool);

    await db.pool.query(
      `INSERT INTO schema_migrations (id) VALUES ($1)`,
      [migration.id]
    );
  }
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

export async function insertPaymentProof(
  db: DbClient,
  input: {
    challengeId: string;
    proofType: string;
    proofPayload: unknown;
  }
): Promise<void> {
  if (!db.pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  await db.pool.query(
    `
      INSERT INTO payment_proofs (
        challenge_id,
        proof_type,
        proof_payload
      )
      VALUES ($1, $2, $3)
    `,
    [
      input.challengeId,
      input.proofType,
      JSON.stringify(input.proofPayload),
    ]
  );
}

export async function paymentProofExists(
  db: DbClient,
  challengeId: string
): Promise<boolean> {
  if (!db.pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const result = await db.pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM payment_proofs
        WHERE challenge_id = $1
      ) AS exists
    `,
    [challengeId]
  );

  return Boolean(result.rows[0]?.exists);
}
