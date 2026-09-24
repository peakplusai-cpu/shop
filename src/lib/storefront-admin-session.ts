import 'server-only';

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { cookies, headers } from 'next/headers';

import {
  STOREFRONT_ADMIN_COOKIE,
  isStorefrontAdminIpAllowed,
  readClientIp,
  verifyStorefrontAdminCookie,
} from '@/lib/storefront-admin-cookie';

const COOKIE_NAME = STOREFRONT_ADMIN_COOKIE;
const MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionSecret(): string | null {
  return process.env.STOREFRONT_ADMIN_SECRET?.trim() || null;
}

export function getStorefrontAdminPassword(): string | null {
  return process.env.STOREFRONT_ADMIN_PASSWORD?.trim() || null;
}

function getStorefrontAdminTotpSecret(): string | null {
  return process.env.STOREFRONT_ADMIN_TOTP_SECRET?.trim() || null;
}

function hasSecureStorefrontAdminTotpSecret(): boolean {
  const normalized = getStorefrontAdminTotpSecret()
    ?.toUpperCase()
    .replace(/[\s=-]/g, '');
  return Boolean(
    normalized &&
      normalized.length >= 26 &&
      /^[A-Z2-7]+$/.test(normalized) &&
      normalized !== 'JBSWY3DPEHPK3PXP',
  );
}

export function isStorefrontAdminMfaRequired(): boolean {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL_ENV);
}

export function isStorefrontAdminEnabled(): boolean {
  const password = getStorefrontAdminPassword();
  const hasStrongPassword =
    Boolean(password) && (!isStorefrontAdminMfaRequired() || password!.length >= 16);
  return Boolean(
    hasStrongPassword &&
      sessionSecret() &&
      (!isStorefrontAdminMfaRequired() ||
        hasSecureStorefrontAdminTotpSecret()),
  );
}

function signToken(payload: string): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('Admin session secret missing');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function createStorefrontAdminSession(): Promise<void> {
  const token = `v1_${Date.now()}_${randomBytes(24).toString('hex')}`;
  const signature = signToken(token);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${token}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/shop/admin',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearStorefrontAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/shop/admin',
    maxAge: 0,
  });
}

export async function isStorefrontAdminAuthenticated(): Promise<boolean> {
  if (!isStorefrontAdminEnabled()) return false;

  const headerStore = await headers();
  const ip = readClientIp(new Request('http://local', { headers: headerStore }));
  if (!isStorefrontAdminIpAllowed(ip)) return false;

  const cookieStore = await cookies();
  return verifyStorefrontAdminCookie(cookieStore.get(COOKIE_NAME)?.value);
}

export function verifyStorefrontAdminPassword(password: string): boolean {
  const expected = getStorefrontAdminPassword();
  if (!expected) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function decodeBase32(value: string): Buffer | null {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = value.toUpperCase().replace(/[\s=-]/g, '');
  if (!normalized || /[^A-Z2-7]/.test(normalized)) return null;

  let bits = '';
  for (const character of normalized) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return bytes.length ? Buffer.from(bytes) : null;
}

function totpAt(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, '0');
}

export function verifyStorefrontAdminTotp(code: string): boolean {
  if (!isStorefrontAdminMfaRequired() && !getStorefrontAdminTotpSecret()) {
    return true;
  }

  const secretValue = getStorefrontAdminTotpSecret();
  if (
    !secretValue ||
    (isStorefrontAdminMfaRequired() &&
      !hasSecureStorefrontAdminTotpSecret()) ||
    !/^\d{6}$/.test(code)
  ) {
    return false;
  }
  const secret = decodeBase32(secretValue);
  if (!secret) return false;

  const supplied = Buffer.from(code);
  const counter = Math.floor(Date.now() / 30_000);
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(totpAt(secret, counter + drift));
    if (
      supplied.length === expected.length &&
      timingSafeEqual(supplied, expected)
    ) {
      return true;
    }
  }
  return false;
}
