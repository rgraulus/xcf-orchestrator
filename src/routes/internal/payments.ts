import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../../db/client.ts';
import { assertInternalAuth } from '../../auth/internal.ts';
import {
  getPaymentIntentByChallengeId,
  insertPaymentIntent,
} from '../../db/client.ts';

type CreateIntentBody = {
  challengeId: string;
  nonce: string;
  merchantId: string;
  amount: string;
};

export async function internalPaymentRoutes(
  app: FastifyInstance,
  db: DbClient,
  internalApiKey?: string
) {
  app.post('/internal/payments/intents', async (request, reply) => {
    if (!assertInternalAuth(request, reply, internalApiKey)) {
      return;
    }

    const body = request.body as Partial<CreateIntentBody> | undefined;

    if (
      !body?.challengeId ||
      !body?.nonce ||
      !body?.merchantId ||
      !body?.amount
    ) {
      reply.code(400);
      return {
        ok: false,
        error: 'invalid_request',
        message:
          'challengeId, nonce, merchantId, and amount are required.',
      };
    }

    try {
      const intent = await insertPaymentIntent(db, {
        challengeId: body.challengeId,
        nonce: body.nonce,
        merchantId: body.merchantId,
        amount: body.amount,
      });

      reply.code(201);
      return {
        ok: true,
        intent,
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: 'intent_insert_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  app.get('/internal/payments/:challengeId', async (request, reply) => {
    if (!assertInternalAuth(request, reply, internalApiKey)) {
      return;
    }

    const { challengeId } = request.params as { challengeId: string };

    try {
      const intent = await getPaymentIntentByChallengeId(db, challengeId);

      if (!intent) {
        reply.code(404);
        return {
          ok: false,
          error: 'not_found',
          challengeId,
        };
      }

      return {
        ok: true,
        intent,
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: 'intent_lookup_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
