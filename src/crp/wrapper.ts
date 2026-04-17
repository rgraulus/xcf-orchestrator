import type { CrpClient } from './client.js';
import { resolveConcordiumChain } from '../chainId.js';
import type {
  CrpPaymentSearchItem,
  CrpReceiptPayload,
  CrpSearchPaymentsFailure,
  SettlementReadinessInput,
  SettlementReadinessResult,
} from './types.js';

export interface CrpWrapper {
  isSettlementReady(input: SettlementReadinessInput): Promise<SettlementReadinessResult>;
}

function resolveSettlementInputChain(input: SettlementReadinessInput) {
  const raw = input.chain_id ?? input.network;
  if (!raw) {
    return null;
  }
  return resolveConcordiumChain(raw);
}

function assetMatches(
  expected: SettlementReadinessInput['asset'],
  actual: CrpReceiptPayload['asset'],
): boolean {
  if (!expected) {
    return true;
  }

  if (!actual) {
    return false;
  }

  if (expected.type && actual.type && expected.type !== actual.type) {
    return false;
  }

  if (expected.tokenId && actual.tokenId && expected.tokenId !== actual.tokenId) {
    return false;
  }

  if (
    typeof expected.decimals === 'number' &&
    typeof actual.decimals === 'number' &&
    expected.decimals !== actual.decimals
  ) {
    return false;
  }

  return true;
}

function deriveMatchedBy(
  input: SettlementReadinessInput,
  item: CrpPaymentSearchItem,
): Array<'nonce' | 'merchantId' | 'txHash' | 'network' | 'asset'> {
  const matchedBy: Array<'nonce' | 'merchantId' | 'txHash' | 'network' | 'asset'> = [];
  const resolved = resolveSettlementInputChain(input);
  const expectedNetwork = resolved?.networkAlias ?? input.network;

  if (item.nonce === input.nonce) {
    matchedBy.push('nonce');
  }

  if (item.merchantId === input.merchantId) {
    matchedBy.push('merchantId');
  }

  if (expectedNetwork && item.network === expectedNetwork) {
    matchedBy.push('network');
  }

  const actualTxHash = item.receipt?.payload?.txHash;
  if (input.txHash && actualTxHash && input.txHash === actualTxHash) {
    matchedBy.push('txHash');
  }

  if (assetMatches(input.asset, item.receipt?.payload?.asset)) {
    matchedBy.push('asset');
  }

  return matchedBy;
}

function classifyMatch(item: CrpPaymentSearchItem): {
  ready: boolean;
  tier: SettlementReadinessResult['tier'];
  reason: SettlementReadinessResult['reason'];
  txHash: string | null;
  finalized: boolean | null;
  paymentStatus: string | null;
} {
  const txHash = item.receipt?.payload?.txHash ?? null;
  const finalized = item.receipt?.payload?.settlement?.finalized ?? null;
  const paymentStatus = item.status ?? null;

  if (finalized === true) {
    return {
      ready: true,
      tier: 'FINALIZED',
      reason: 'settlement_finalized',
      txHash,
      finalized,
      paymentStatus,
    };
  }

  if (paymentStatus === 'fulfilled') {
    return {
      ready: false,
      tier: 'CONFIRMED',
      reason: 'settlement_confirmed',
      txHash,
      finalized,
      paymentStatus,
    };
  }

  return {
    ready: false,
    tier: 'SEEN_UNCONFIRMED',
    reason: 'settlement_seen_unconfirmed',
    txHash,
    finalized,
    paymentStatus,
  };
}

function isCorrelated(input: SettlementReadinessInput, item: CrpPaymentSearchItem): boolean {
  const resolved = resolveSettlementInputChain(input);
  const expectedNetwork = resolved?.networkAlias ?? input.network;

  if (item.nonce !== input.nonce) {
    return false;
  }

  if (item.merchantId !== input.merchantId) {
    return false;
  }

  if (!expectedNetwork || item.network !== expectedNetwork) {
    return false;
  }

  if (!assetMatches(input.asset, item.receipt?.payload?.asset)) {
    return false;
  }

  if (input.txHash) {
    const actualTxHash = item.receipt?.payload?.txHash;
    if (actualTxHash && actualTxHash !== input.txHash) {
      return false;
    }
  }

  return true;
}

function mapClientFailureToReadiness(
  failure: CrpSearchPaymentsFailure,
): SettlementReadinessResult {
  if (failure.kind === 'unreachable') {
    return {
      ok: true,
      ready: false,
      tier: 'NOT_SEEN',
      reason: 'crp_unavailable',
    };
  }

  if (failure.kind === 'http_error') {
    return {
      ok: true,
      ready: false,
      tier: 'NOT_SEEN',
      reason: 'crp_http_error',
    };
  }

  return {
    ok: true,
    ready: false,
    tier: 'NOT_SEEN',
    reason: 'crp_invalid_response',
  };
}

export function createCrpWrapper(client: CrpClient): CrpWrapper {
  return {
    async isSettlementReady(input: SettlementReadinessInput): Promise<SettlementReadinessResult> {
      const resolved = resolveSettlementInputChain(input);

      if (!input.nonce || !input.merchantId || !resolved) {
        return {
          ok: true,
          ready: false,
          tier: 'NOT_SEEN',
          reason: 'correlation_insufficient',
        };
      }

      const searchResult = await client.searchPayments({
        merchantId: input.merchantId,
        nonce: input.nonce,
        network: resolved.networkAlias,
        tokenId: input.asset?.tokenId,
        limit: 10,
      });

      if (!searchResult.ok) {
        return mapClientFailureToReadiness(searchResult);
      }

      const matches = (searchResult.data.matches ?? []).filter((item) => isCorrelated(input, item));

      if (matches.length === 0) {
        return {
          ok: true,
          ready: false,
          tier: 'NOT_SEEN',
          reason: 'settlement_not_found',
        };
      }

      if (matches.length > 1) {
        return {
          ok: true,
          ready: false,
          tier: 'NOT_SEEN',
          reason: 'settlement_ambiguous',
        };
      }

      const match = matches[0];
      const classification = classifyMatch(match);

      return {
        ok: true,
        ready: classification.ready,
        tier: classification.tier,
        reason: classification.reason,
        evidence: {
          source: 'crp',
          txHash: classification.txHash,
          paymentStatus: classification.paymentStatus,
          finalized: classification.finalized,
          matchedBy: deriveMatchedBy(input, match),
        },
      };
    },
  };
}
