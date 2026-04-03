import type { FastifyReply, FastifyRequest } from 'fastify';

export function assertInternalAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  expectedApiKey?: string
): boolean {
  if (!expectedApiKey) {
    return true;
  }

  const providedApiKey = request.headers['x-internal-api-key'];

  if (providedApiKey !== expectedApiKey) {
    reply.code(401).send({
      ok: false,
      error: 'unauthorized',
      message: 'Missing or invalid internal API key.',
    });
    return false;
  }

  return true;
}
