import type { Env } from '../config/env.ts';

export type DbClient = {
  configured: boolean;
  connectionString?: string;
};

export function createDbClient(env: Env): DbClient {
  return {
    configured: Boolean(env.DATABASE_URL),
    connectionString: env.DATABASE_URL,
  };
}

export async function checkDbReady(_db: DbClient): Promise<boolean> {
  // Stage 2.3 scaffold only:
  // no real DB connection yet, just a readiness placeholder.
  return true;
}
