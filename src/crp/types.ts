export type SettlementReadinessTier =
  | 'NOT_SEEN'
  | 'SEEN_UNCONFIRMED'
  | 'CONFIRMED'
  | 'FINALIZED';

export type SettlementReadinessReason =
  | 'settlement_not_found'
  | 'settlement_seen_unconfirmed'
  | 'settlement_confirmed'
  | 'settlement_finalized'
  | 'settlement_ambiguous'
  | 'crp_unavailable'
  | 'crp_http_error'
  | 'crp_invalid_response'
  | 'correlation_insufficient';

export type SettlementReadinessInput = {
  challengeId: string;
  nonce: string;
  merchantId: string;
  chain_id?: string;
  network?: string;
  asset?: {
    type?: string;
    tokenId?: string;
    decimals?: number;
  };
  txHash?: string | null;
};

export type SettlementReadinessEvidence = {
  source: 'crp';
  txHash?: string | null;
  paymentStatus?: string | null;
  finalized?: boolean | null;
  matchedBy: Array<'nonce' | 'merchantId' | 'txHash' | 'network' | 'asset'>;
};

export type SettlementReadinessResult = {
  ok: boolean;
  ready: boolean;
  tier: SettlementReadinessTier;
  reason: SettlementReadinessReason;
  evidence?: SettlementReadinessEvidence;
};

export type CrpReceiptPayload = {
  txHash?: string;
  settlement?: {
    network?: string;
    finalized?: boolean;
  };
  asset?: {
    type?: string;
    tokenId?: string;
    decimals?: number;
  };
};

export type CrpPaymentSearchItem = {
  merchantId?: string;
  nonce?: string;
  network?: string;
  status?: string;
  receipt?: {
    jws?: string;
    payload?: CrpReceiptPayload;
  };
};

export type CrpPaymentSearchResponse = {
  ok?: boolean;
  matches?: CrpPaymentSearchItem[];
};

export type CrpClientErrorKind =
  | 'unreachable'
  | 'http_error'
  | 'invalid_response';

export type CrpSearchPaymentsSuccess = {
  ok: true;
  data: CrpPaymentSearchResponse;
};

export type CrpSearchPaymentsFailure = {
  ok: false;
  kind: CrpClientErrorKind;
  status?: number;
  message: string;
};

export type CrpSearchPaymentsResult =
  | CrpSearchPaymentsSuccess
  | CrpSearchPaymentsFailure;
