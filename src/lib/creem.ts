const CREEM_PRODUCTION_API = 'https://api.creem.io';
const CREEM_TEST_API = 'https://test-api.creem.io';

export function getCreemApiBase(): string {
  return process.env.CREEM_TEST_MODE?.trim().toLowerCase() === 'true'
    ? CREEM_TEST_API
    : CREEM_PRODUCTION_API;
}

export function getCreemApiKey(): string | null {
  return process.env.CREEM_API_KEY?.trim() || null;
}

export function getCreemWebhookSecret(): string | null {
  return process.env.CREEM_WEBHOOK_SECRET?.trim() || null;
}
