import type { CrpSearchPaymentsResult } from './types.js';

export type SearchPaymentsParams = {
  merchantId: string;
  nonce: string;
  network: string;
  tokenId?: string;
  limit?: number;
};

export interface CrpClient {
  searchPayments(params: SearchPaymentsParams): Promise<CrpSearchPaymentsResult>;
}

export function createCrpClient(baseUrl: string): CrpClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return {
    async searchPayments(params: SearchPaymentsParams): Promise<CrpSearchPaymentsResult> {
      const url = new URL(`${normalizedBaseUrl}/v1/crp/payments/search`);
      url.searchParams.set('merchantId', params.merchantId);
      url.searchParams.set('nonce', params.nonce);
      url.searchParams.set('network', params.network);
      url.searchParams.set('limit', String(params.limit ?? 10));

      if (params.tokenId) {
        url.searchParams.set('tokenId', params.tokenId);
      }

      let response: Response;
      try {
        response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            accept: 'application/json',
          },
        });
      } catch (error) {
        return {
          ok: false,
          kind: 'unreachable',
          message: error instanceof Error ? error.message : 'Unknown fetch error',
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          kind: 'http_error',
          status: response.status,
          message: `CRP search failed: ${response.status} ${response.statusText}`,
        };
      }

      try {
        const json = await response.json();

        if (json === null || typeof json !== 'object') {
          return {
            ok: false,
            kind: 'invalid_response',
            message: 'CRP search returned a non-object JSON payload',
          };
        }

        if ('matches' in json && !Array.isArray((json as { matches?: unknown }).matches)) {
          return {
            ok: false,
            kind: 'invalid_response',
            message: 'CRP search returned a non-array matches field',
          };
        }

        return {
          ok: true,
          data: json as import('./types.js').CrpPaymentSearchResponse,
        };
      } catch (error) {
        return {
          ok: false,
          kind: 'invalid_response',
          message: error instanceof Error ? error.message : 'Invalid JSON response',
        };
      }
    },
  };
}
