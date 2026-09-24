'use client';

import { useState } from 'react';

import { loginStorefrontAdmin } from '@/app/shop/admin/actions';

export function StorefrontAdminLoginForm({
  mfaRequired,
}: {
  mfaRequired: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await loginStorefrontAdmin(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-4">
      <input
        type="password"
        name="password"
        required
        placeholder="Admin password"
        className="w-full border-[0.5px] border-zinc-800 bg-black px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
      />
      {mfaRequired && (
        <input
          type="text"
          name="totp"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="6-digit authentication code"
          className="w-full border-[0.5px] border-zinc-800 bg-black px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]/50"
        />
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full border-[0.5px] border-[#D4AF37] py-2.5 text-[10px] uppercase tracking-[0.22em] text-[#E4C85B] hover:bg-[#D4AF37] hover:text-black disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Enter admin'}
      </button>
    </form>
  );
}
