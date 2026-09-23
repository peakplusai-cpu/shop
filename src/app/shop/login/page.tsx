import type { Metadata } from 'next';
import Link from 'next/link';

import { StorefrontLoginForm } from '@/components/storefront-login-form';
import { getStorefrontBrandName } from '@/lib/storefront-brand';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function ShopLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-6">
      <Link
        href="/enter"
        className="absolute left-6 top-6 text-[10px] uppercase tracking-[0.3em] text-zinc-600 transition hover:text-[#D4AF37]"
      >
        ← {getStorefrontBrandName()}
      </Link>
      <StorefrontLoginForm />
    </main>
  );
}
