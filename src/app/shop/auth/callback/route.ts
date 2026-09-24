import { NextResponse } from 'next/server';

import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/shop';
  try {
    const parsed = new URL(value, 'https://storefront.invalid');
    if (parsed.origin !== 'https://storefront.invalid') return '/shop';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/shop';
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeRedirectPath(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/shop/login', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.redirect(new URL('/shop/login', request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[storefront/auth] code exchange failed:', error.message);
    const login = new URL('/shop/login', request.url);
    login.searchParams.set('error', 'oauth_callback_failed');
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, request.url));
}
