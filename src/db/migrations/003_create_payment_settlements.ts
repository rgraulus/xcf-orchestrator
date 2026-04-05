import type { Pool } from 'pg';

export const migration003CreatePaymentSettlements = {
  id: '003_create_payment_settlements',
  up: async (pool: Pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_settlements (
        id BIGSERIAL PRIMARY KEY,
        challenge_id TEXT NOT NULL REFERENCES payment_intents(challenge_id) ON DELETE CASCADE,
        settlement_status TEXT NOT NULL,
        settlement_payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_settlements_challenge_id
      ON payment_settlements (challenge_id);
    `);
  },
};
