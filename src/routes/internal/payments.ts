import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../../db/client.js';
import { assertInternalAuth } from '../../auth/internal.js';
import {
  getLatestPaymentSettlementByChallengeId,
  getPaymentIntentByChallengeId,
  insertPaymentIntent,
  insertPaymentProof,
  insertPaymentSettlement,
  paymentProofExists,
} from '../../db/client.js';

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


  app.post('/internal/payments/proof', async (request, reply) => {
    if (!assertInternalAuth(request, reply, internalApiKey)) {
      return;
    }

    const body = request.body as
      | {
          challengeId?: string;
          proofType?: string;
          proofPayload?: unknown;
        }
      | undefined;

    if (!body?.challengeId || !body?.proofType || !body?.proofPayload) {
      reply.code(400);
      return {
        ok: false,
        error: 'invalid_request',
        message: 'challengeId, proofType, and proofPayload are required.',
      };
    }

    try {
      const intent = await getPaymentIntentByChallengeId(
        db,
        body.challengeId
      );

      if (!intent) {
        reply.code(404);
        return {
          ok: false,
          error: 'intent_not_found',
          challengeId: body.challengeId,
        };
      }

      await insertPaymentProof(db, {
        challengeId: body.challengeId,
        proofType: body.proofType,
        proofPayload: body.proofPayload,
      });

      return {
        ok: true,
        accepted: true,
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: 'proof_insert_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  app.post('/internal/payments/release-check', async (request, reply) => {
    if (!assertInternalAuth(request, reply, internalApiKey)) {
      return;
    }

    const body = request.body as
      | {
          challengeId?: string;
        }
      | undefined;

    if (!body?.challengeId) {
      reply.code(400);
      return {
        ok: false,
        error: 'invalid_request',
        message: 'challengeId is required.',
      };
    }

    try {
      const intent = await getPaymentIntentByChallengeId(db, body.challengeId);

      if (!intent) {
        reply.code(404);
        return {
          ok: false,
          error: 'intent_not_found',
          challengeId: body.challengeId,
        };
      }

      const ready = await paymentProofExists(db, body.challengeId);

      return {
        ok: true,
        ready,
        reason: ready ? 'proof_present' : 'proof_missing',
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: 'release_check_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  app.post('/internal/settlements', async (request, reply) => {
    if (!assertInternalAuth(request, reply, internalApiKey)) {
      return;
    }

    const body = request.body as
      | {
          challengeId?: string;
          settlementStatus?: string;
          settlementPayload?: unknown;
        }
      | undefined;

    if (!body?.challengeId || !body?.settlementStatus || !body?.settlementPayload) {
      reply.code(400);
      return {
        ok: false,
        error: 'invalid_request',
        message: 'challengeId, settlementStatus, and settlementPayload are required.',
      };
    }

    try {
      const intent = await getPaymentIntentByChallengeId(db, body.challengeId);

      if (!intent) {
        reply.code(404);
        return {
          ok: false,
          error: 'intent_not_found',
          challengeId: body.challengeId,
        };
      }

      await insertPaymentSettlement(db, {
        challengeId: body.challengeId,
        settlementStatus: body.settlementStatus,
        settlementPayload: body.settlementPayload,
      });

      return {
        ok: true,
        accepted: true,
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: 'settlement_insert_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  app.get('/internal/settlements/:challengeId', async (request, reply) => {
    if (!assertInternalAuth(request, reply, internalApiKey)) {
      return;
    }

    const { challengeId } = request.params as { challengeId: string };

    try {
      const settlement = await getLatestPaymentSettlementByChallengeId(
        db,
        challengeId
      );

      if (!settlement) {
        reply.code(404);
        return {
          ok: false,
          error: 'settlement_not_found',
          challengeId,
        };
      }

      return {
        ok: true,
        settlement,
      };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: 'settlement_lookup_failed',
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
