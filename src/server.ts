import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({
  logger: true,
});

const PORT = Number(process.env.PORT || 8090);

app.get('/healthz', async () => {
  return {
    ok: true,
    service: 'xcf-orchestrator',
  };
});

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`xcf-orchestrator listening on http://localhost:${PORT}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
