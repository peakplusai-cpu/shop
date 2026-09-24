import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

import { getCreemApiBase, getCreemApiKey, getCreemWebhookSecret } from '@/lib/creem';
import { getAppOrigin } from '@/lib/env';

export function getStorefrontCreemApiKey(): string | null {
  return (
    process.env.STOREFRONT_CREEM_API_KEY?.trim() ||
    getCreemApiKey() ||
    null
  );
}

export function getStorefrontCreemWebhookSecret(): string | null {
  return (
    process.env.STOREFRONT_CREEM_WEBHOOK_SECRET?.trim() ||
    getCreemWebhookSecret() ||
    null
  );
}

export function getStorefrontPublicOrigin(): string {
  const configured = (
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    getAppOrigin()
  ).replace(/\/$/, '');
  const url = new URL(configured);
  if (
    process.env.NODE_ENV === 'production' &&
    url.protocol !== 'https:'
  ) {
    throw new Error('NEXT_PUBLIC_STOREFRONT_URL must use HTTPS in production.');
  }
  return url.origin;
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
}): Promise<{ url: string | null; checkoutId?: string; error?: string }> {
  const apiKey = getStorefrontCreemApiKey();
  if (!apiKey) {
    return {
      url: null,
      error: 'Missing STOREFRONT_CREEM_API_KEY or CREEM_API_KEY.',
    };
  }

  let response: Response;
  try {
    response = await fetch(`${getCreemApiBase()}/v1/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        product_id: input.creemProductId,
        request_id: input.orderId,
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
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'Creem API timed out.'
        : 'Creem API is unreachable.';
    console.error('[storefront/checkout] Creem request failed:', message);
    return { url: null, error: message };
  }

  const json = (await response.json().catch(() => null)) as
    | {
        id?: string;
        checkout_url?: string;
        message?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !json?.checkout_url) {
    const error =
      json?.message ??
      json?.error ??
      `Creem API returned HTTP ${response.status}`;
    console.error('[storefront/checkout] Creem error:', error);
    return { url: null, error };
  }

  return { url: json.checkout_url, checkoutId: json.id };
}
