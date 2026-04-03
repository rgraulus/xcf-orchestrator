import Fastify from 'fastify';
import dotenv from 'dotenv';
import { healthRoutes } from './routes/health.ts';
import { loadEnv } from './config/env.ts';

dotenv.config();

const env = loadEnv();

const app = Fastify({
  logger: true,
});

async function start() {
  await healthRoutes(app);

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`xcf-orchestrator listening on http://localhost:${env.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
