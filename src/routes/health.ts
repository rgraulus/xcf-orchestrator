import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../db/client.ts';
import { checkDbReady } from '../db/client.ts';

export async function healthRoutes(app: FastifyInstance, db: DbClient) {
  app.get('/healthz', async () => {
    return {
      ok: true,
      service: 'xcf-orchestrator',
    };
  });

  app.get('/readyz', async () => {
    const dbReady = await checkDbReady(db);

    return {
      ok: dbReady,
      ready: dbReady,
      service: 'xcf-orchestrator',
      checks: {
        process: true,
        dbConfigured: db.configured,
        dbReady,
      },
    };
  });
}
