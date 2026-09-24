import { createHmac, timingSafeEqual } from 'node:crypto';

export const STOREFRONT_ADMIN_COOKIE = 'storefront_admin_session';
const MAX_SESSION_AGE_MS = 12 * 60 * 60 * 1000;

function sessionSecret(): string | null {
  return process.env.STOREFRONT_ADMIN_SECRET?.trim() || null;
}

function signToken(payload: string): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyStorefrontAdminCookie(
  cookieValue: string | undefined | null,
): boolean {
  if (!cookieValue) return false;

  const [token, signature, extra] = cookieValue.split('.');
  if (
    !token ||
    !signature ||
    extra ||
    !/^v1_\d{13}_[a-f0-9]{48}$/i.test(token) ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return false;
  }

  const issuedAt = Number(token.split('_')[1]);
  const age = Date.now() - issuedAt;
  if (!Number.isFinite(issuedAt) || age < -60_000 || age > MAX_SESSION_AGE_MS) {
    return false;
  }

  const expected = signToken(token);
  if (!expected) return false;

  try {
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isStorefrontAdminIpAllowed(
  clientIp: string | null | undefined,
): boolean {
  const raw = process.env.STOREFRONT_ADMIN_ALLOWED_IPS?.trim();
  if (!raw) return true;

  const allowed = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!allowed.length) return true;

  const ip = clientIp?.trim();
  if (!ip) return false;
  return allowed.includes(ip);
}

export function readClientIp(request: Request): string | null {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0]?.trim() || null;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  // Generic trusted reverse proxies append their observed peer to the right.
  // Deployments must strip client-supplied forwarding headers at the edge.
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',').at(-1)?.trim() || null;
}
