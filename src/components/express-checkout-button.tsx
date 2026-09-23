'use client';

import { useState } from 'react';

type ExpressCheckoutButtonProps = {
  slug: string;
  disabled?: boolean;
};

export function ExpressCheckoutButton({
  slug,
  disabled,
}: ExpressCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/storefront/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? 'Checkout unavailable. Please try again.');
        return;
      }

      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-12 w-full">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleCheckout}
        className="group inline-flex min-h-14 w-full items-center justify-center border-[0.5px] border-[#D4AF37] px-5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#E4C85B] transition duration-500 hover:bg-[#D4AF37] hover:text-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-4 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40 sm:text-[11px]"
      >
        {loading
          ? 'Opening secure checkout…'
          : 'EXPRESS CHECKOUT (Apple Pay / Credit Card)'}
      </button>
      {error && (
        <p className="mt-3 text-center text-xs font-light text-red-400/90">
          {error}
        </p>
      )}
    </div>
  );
}
