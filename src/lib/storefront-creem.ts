import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

import { getCreemApiBase, getCreemApiKey, getCreemWebhookSecret } from '@/lib/creem';
import { getAppOrigin } from '@/lib/env';

export function getStorefrontCreemApiKey(): string | null {
  return (
    process.env.STOREFRONT_CREEM_API_KEY?.trim() ||
    getCreemApiKey() ||
    null
  );
}

export function getStorefrontCreemProductId(): string | null {
  return process.env.STOREFRONT_CREEM_PRODUCT_ID?.trim() || null;
}

export function getStorefrontCreemWebhookSecret(): string | null {
  return (
    process.env.STOREFRONT_CREEM_WEBHOOK_SECRET?.trim() ||
    getCreemWebhookSecret() ||
    null
  );
}

export function getStorefrontPublicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    getAppOrigin()
  ).replace(/\/$/, '');
}

export function verifyStorefrontCreemSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = getStorefrontCreemWebhookSecret();
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const receivedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function createStorefrontCreemCheckout(input: {
  creemProductId: string;
  orderId: string;
  successUrl: string;
  customerEmail?: string;
}): Promise<{ url: string | null; error?: string }> {
  const apiKey = getStorefrontCreemApiKey();
  if (!apiKey) {
    return {
      url: null,
      error: 'Missing STOREFRONT_CREEM_API_KEY or CREEM_API_KEY.',
    };
  }

  const response = await fetch(`${getCreemApiBase()}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      product_id: input.creemProductId,
      request_id: randomUUID(),
      customer: input.customerEmail
        ? { email: input.customerEmail }
        : undefined,
      success_url: input.successUrl,
      metadata: {
        order_id: input.orderId,
        storefront: 'true',
      },
    }),
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as
    | { checkout_url?: string; message?: string; error?: string }
    | null;

  if (!response.ok || !json?.checkout_url) {
    const error =
      json?.message ??
      json?.error ??
      `Creem API returned HTTP ${response.status}`;
    console.error('[storefront/checkout] Creem error:', error);
    return { url: null, error };
  }

  return { url: json.checkout_url };
}
