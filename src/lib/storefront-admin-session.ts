import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

import {
  STOREFRONT_ADMIN_COOKIE,
  verifyStorefrontAdminCookie,
} from '@/lib/storefront-admin-cookie';

const COOKIE_NAME = STOREFRONT_ADMIN_COOKIE;
const MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionSecret(): string | null {
  return (
    process.env.STOREFRONT_ADMIN_SECRET?.trim() ||
    process.env.STOREFRONT_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

export function getStorefrontAdminPassword(): string | null {
  return process.env.STOREFRONT_ADMIN_PASSWORD?.trim() || null;
}

export function isStorefrontAdminEnabled(): boolean {
  return Boolean(getStorefrontAdminPassword() && sessionSecret());
}

function signToken(payload: string): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('Admin session secret missing');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export async function createStorefrontAdminSession(): Promise<void> {
  const token = randomBytes(24).toString('hex');
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
