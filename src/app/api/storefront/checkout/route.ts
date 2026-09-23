import { NextResponse } from 'next/server';
import { z } from 'zod';

import { startStorefrontCheckout } from '@/lib/storefront-checkout';
import { loadStorefrontProduct } from '@/lib/storefront';
import { isStorefrontConfigured } from '@/lib/storefront-mode';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  slug: z.string().min(1).max(120),
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  if (!isStorefrontConfigured()) {
    return NextResponse.json(
      { error: 'Storefront database is not configured.' },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
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
