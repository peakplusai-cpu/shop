import 'server-only';

import { createHash } from 'node:crypto';

import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; unavailable?: boolean };

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL_ENV);
}

export function readRequestIp(request: Request): string | null {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0]?.trim() || null;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',').at(-1)?.trim() || null;
}

function anonymize(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function consumeStorefrontRateLimit(input: {
  scope: 'admin-login' | 'checkout';
  identifier: string | null;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const identifier = input.identifier?.trim();
  if (!identifier) {
    if (!isProductionRuntime()) return { allowed: true };
    console.error('[storefront/rate-limit] trusted client IP missing');
    return {
      allowed: false,
      retryAfterSeconds: 60,
      unavailable: true,
    };
  }
  const key = `${input.scope}:${anonymize(identifier)}`;

  try {
    const admin = createStorefrontAdminClient();
    const { data, error } = await admin.rpc('consume_storefront_rate_limit', {
      p_key: key,
      p_limit: input.limit,
      p_window_seconds: input.windowSeconds,
    });

    if (error) throw error;
    return data
      ? { allowed: true }
      : { allowed: false, retryAfterSeconds: input.windowSeconds };
  } catch (error) {
    console.error(
      '[storefront/rate-limit] check failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    // Local previews remain usable before migrations are installed. Hosted
    // deployments fail closed so a missing limiter cannot silently expose
    // checkout or admin login.
    if (!isProductionRuntime()) return { allowed: true };
    return {
      allowed: false,
      retryAfterSeconds: 60,
      unavailable: true,
    };
  }
}
