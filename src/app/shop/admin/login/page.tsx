import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StorefrontAdminLoginForm } from '@/components/storefront-admin-login-form';
import {
  isStorefrontAdminAuthenticated,
  isStorefrontAdminEnabled,
} from '@/lib/storefront-admin-session';

export const metadata: Metadata = {
  title: 'Shop Admin',
  robots: { index: false, follow: false },
};

export default async function ShopAdminLoginPage() {
  if (await isStorefrontAdminAuthenticated()) {
    redirect('/shop/admin');
  }

  const enabled = isStorefrontAdminEnabled();

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-zinc-50">
      <div className="w-full max-w-sm border-[0.5px] border-[#D4AF37]/40 bg-zinc-950 p-8">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4AF37]">Store admin</p>
        <h1 className="mt-4 font-serif text-2xl font-light">Sign in</h1>

        {!enabled ? (
          <p className="mt-6 text-sm font-light leading-6 text-stone-500">
            Add <code className="text-zinc-400">STOREFRONT_ADMIN_PASSWORD=your-password</code> to{' '}
            <code className="text-zinc-400">.env.local</code>, restart{' '}
            <code className="text-zinc-400">npm run dev</code>, then refresh.
          </p>
        ) : (
          <StorefrontAdminLoginForm />
        )}

        <Link
          href="/shop"
          className="mt-8 block text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-[#D4AF37]"
        >
          ← Back to shop
        </Link>
      </div>
    </main>
  );
}
