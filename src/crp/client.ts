import type { CrpPaymentSearchResponse } from './types.js';

export type SearchPaymentsParams = {
  merchantId: string;
  nonce: string;
  network: string;
  tokenId?: string;
  limit?: number;
};

export interface CrpClient {
  searchPayments(params: SearchPaymentsParams): Promise<CrpPaymentSearchResponse>;
}

export function createCrpClient(baseUrl: string): CrpClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  return {
    async searchPayments(params: SearchPaymentsParams): Promise<CrpPaymentSearchResponse> {
      const url = new URL(`${normalizedBaseUrl}/v1/crp/payments/search`);
      url.searchParams.set('merchantId', params.merchantId);
      url.searchParams.set('nonce', params.nonce);
      url.searchParams.set('network', params.network);
      url.searchParams.set('limit', String(params.limit ?? 10));

      if (params.tokenId) {
        url.searchParams.set('tokenId', params.tokenId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CRP search failed: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as CrpPaymentSearchResponse;
    },
  };
}
