'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createStorefrontBrowserClient } from '@/lib/supabase/storefront-browser';

export function StorefrontLoginForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authEnabled = Boolean(
    process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_STOREFRONT_SUPABASE_ANON_KEY,
  );

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (!authEnabled) return;

    const client = createStorefrontBrowserClient();
    if (!client) return;

    setLoading(true);
    setMessage(null);

    const origin = window.location.origin;
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/shop/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Check your email for a secure sign-in link.');
  }

  return (
    <div className="w-full max-w-md border-[0.5px] border-[#D4AF37]/40 bg-zinc-950/80 p-10">
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37]">
        Client access
      </p>
      <h1 className="mt-6 font-serif text-3xl font-light text-white">Sign in</h1>
      <p className="mt-4 text-sm font-light leading-6 text-stone-500">
        Optional. Guest checkout is always available — order tracking uses your
        confirmation link.
      </p>

      {authEnabled ? (
        <form onSubmit={sendMagicLink} className="mt-8 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full border-[0.5px] border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]/60"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full border-[0.5px] border-[#D4AF37] py-3 text-[10px] uppercase tracking-[0.24em] text-[#E4C85B] transition hover:bg-[#D4AF37] hover:text-black disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-xs leading-6 text-zinc-600">
          To enable login: Supabase (shop project) → Authentication → enable
          Email, then add{' '}
          <code className="text-zinc-400">NEXT_PUBLIC_STOREFRONT_SUPABASE_URL</code>{' '}
          and{' '}
          <code className="text-zinc-400">NEXT_PUBLIC_STOREFRONT_SUPABASE_ANON_KEY</code>{' '}
          to <code className="text-zinc-400">.env.local</code>.
        </p>
      )}

      {message && (
        <p className="mt-4 text-center text-xs text-stone-400">{message}</p>
      )}

      <Link
        href="/shop"
        className="mt-10 block text-center text-[10px] uppercase tracking-[0.22em] text-zinc-500 transition hover:text-[#D4AF37]"
      >
        Continue as guest → Shop
      </Link>
    </div>
  );
}
