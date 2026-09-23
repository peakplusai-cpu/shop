import { createHmac, timingSafeEqual } from 'crypto';

export const STOREFRONT_ADMIN_COOKIE = 'storefront_admin_session';

function sessionSecret(): string | null {
  return (
    process.env.STOREFRONT_ADMIN_SECRET?.trim() ||
    process.env.STOREFRONT_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
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

  const [token, signature] = cookieValue.split('.');
  if (!token || !signature || !/^[a-f0-9]+$/i.test(token)) return false;

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
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip')?.trim() || null;
}
