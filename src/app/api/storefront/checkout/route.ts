import { NextResponse } from 'next/server';
import { z } from 'zod';

import { startStorefrontCheckout } from '@/lib/storefront-checkout';
import { loadStorefrontProduct } from '@/lib/storefront';
import { isStorefrontConfigured } from '@/lib/storefront-mode';
import {
  consumeStorefrontRateLimit,
  readRequestIp,
} from '@/lib/storefront-rate-limit';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.string().email().max(320).optional(),
}).strict();

export async function POST(request: Request) {
  if (!isStorefrontConfigured()) {
    return NextResponse.json(
      { error: 'Storefront database is not configured.' },
      { status: 503 },
    );
  }

  const rateLimit = await consumeStorefrontRateLimit({
    scope: 'checkout',
    identifier: readRequestIp(request),
    limit: 8,
    windowSeconds: 10 * 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.unavailable
          ? 'Checkout protection is temporarily unavailable.'
          : 'Too many checkout attempts. Please try again later.',
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > 4096) {
    return NextResponse.json({ error: 'Request body too large.' }, { status: 413 });
  }

  let json: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) {
      return NextResponse.json(
        { error: 'Request body too large.' },
        { status: 413 },
      );
    }
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 });
  }

  const loaded = await loadStorefrontProduct(parsed.data.slug);
  if (loaded.status !== 'ok' || loaded.preview) {
    return NextResponse.json({ error: 'Product not available.' }, { status: 404 });
  }

  const result = await startStorefrontCheckout({
    product: loaded.product,
    customerEmail: parsed.data.email,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url });
}
