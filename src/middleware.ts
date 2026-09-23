import { NextResponse, type NextRequest } from 'next/server';

import { guardStorefrontAdminRoute } from '@/lib/storefront-admin-guard';

export function middleware(request: NextRequest) {
  const guard = guardStorefrontAdminRoute(request);
  if (guard) return guard;
  return NextResponse.next();
}

export const config = {
  matcher: ['/shop/admin/:path*'],
};
