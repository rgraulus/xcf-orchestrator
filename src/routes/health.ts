import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/healthz', async () => {
    return {
      ok: true,
      service: 'xcf-orchestrator',
    };
  });

  app.get('/readyz', async () => {
    return {
      ok: true,
      ready: true,
      service: 'xcf-orchestrator',
    };
  });
}
