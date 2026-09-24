import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StorefrontAdminLoginForm } from '@/components/storefront-admin-login-form';
import {
  isStorefrontAdminAuthenticated,
  isStorefrontAdminEnabled,
  isStorefrontAdminMfaRequired,
} from '@/lib/storefront-admin-session';

export const dynamic = 'force-dynamic';

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
            Configure a password of at least 16 characters, a dedicated admin
            session secret, and a TOTP secret in the deployment environment.
          </p>
        ) : (
          <StorefrontAdminLoginForm
            mfaRequired={isStorefrontAdminMfaRequired()}
          />
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
