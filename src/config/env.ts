export type Env = {
  PORT: number;
  DATABASE_URL?: string;
  CRP_BASE_URL?: string;
  GATEWAY_BASE_URL?: string;
  INTERNAL_API_KEY?: string;
};

export function loadEnv(): Env {
  const PORT = Number(process.env.PORT || 8090);

  if (Number.isNaN(PORT)) {
    throw new Error('Invalid PORT');
  }

  return {
    PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    CRP_BASE_URL: process.env.CRP_BASE_URL,
    GATEWAY_BASE_URL: process.env.GATEWAY_BASE_URL,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  };
}
