import Fastify from 'fastify';
import dotenv from 'dotenv';
import { loadEnv } from './config/env.js';
import { createDbClient, runMigrations } from './db/client.js';
import { healthRoutes } from './routes/health.js';
import { internalPaymentRoutes } from './routes/internal/payments.js';

dotenv.config();

const env = loadEnv();
const db = createDbClient(env);

const app = Fastify({
  logger: true,
  requestIdHeader: 'x-correlation-id',
});

app.addHook('onRequest', async (request, reply) => {
  reply.header('x-correlation-id', request.id);
});

async function start() {
  await runMigrations(db);
  await healthRoutes(app, db);
  await internalPaymentRoutes(app, db, env.INTERNAL_API_KEY);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`xcf-orchestrator listening on http://localhost:${env.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
