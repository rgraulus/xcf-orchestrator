import type { Pool } from 'pg';

export const migration002CreatePaymentProofs = {
  id: '002_create_payment_proofs',
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_proofs (
        id SERIAL PRIMARY KEY,
        challenge_id TEXT NOT NULL,
        proof_type TEXT NOT NULL,
        proof_payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },
};
