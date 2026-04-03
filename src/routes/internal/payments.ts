import type { FastifyInstance } from 'fastify';

export async function internalPaymentRoutes(app: FastifyInstance) {
  app.post('/internal/payments/intents', async () => {
    return {
      ok: true,
      accepted: false,
      status: 'not_implemented',
      message: 'Intent creation scaffold only; persistence not implemented yet.',
    };
  });

  app.get('/internal/payments/:challengeId', async (request) => {
    const { challengeId } = request.params as { challengeId: string };

    return {
      ok: true,
      challengeId,
      status: 'not_implemented',
      message: 'Payment status scaffold only; persistence not implemented yet.',
    };
  });
}
