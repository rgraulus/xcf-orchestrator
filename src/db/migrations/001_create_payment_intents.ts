import type { Pool } from 'pg';

export const migration001CreatePaymentIntents = {
  id: '001_create_payment_intents',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        challenge_id TEXT PRIMARY KEY,
        nonce TEXT NOT NULL,
        merchant_id TEXT NOT NULL,
        amount TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },
};
