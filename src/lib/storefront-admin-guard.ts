import { NextResponse, type NextRequest } from 'next/server';

import {
  STOREFRONT_ADMIN_COOKIE,
  isStorefrontAdminIpAllowed,
  verifyStorefrontAdminCookie,
} from '@/lib/storefront-admin-cookie';

const LOGIN_PREFIX = '/shop/admin/login';

export function guardStorefrontAdminRoute(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/shop/admin')) return null;
  if (pathname.startsWith(LOGIN_PREFIX)) return null;

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    null;

  if (!isStorefrontAdminIpAllowed(ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const cookie = request.cookies.get(STOREFRONT_ADMIN_COOKIE)?.value;
  if (!verifyStorefrontAdminCookie(cookie)) {
    const login = new URL(LOGIN_PREFIX, request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return null;
}
