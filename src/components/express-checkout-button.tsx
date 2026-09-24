'use client';

import { useState } from 'react';

import { STOREFRONT_COUNTRIES } from '@/lib/storefront-countries';

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

  async function handleCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || loading) return;
    setLoading(true);
    setError(null);

    try {
      const form = new FormData(event.currentTarget);
      const shipping = {
        email: String(form.get('email') ?? ''),
        customerName: String(form.get('customerName') ?? ''),
        phone: String(form.get('phone') ?? ''),
        countryCode: String(form.get('countryCode') ?? '').toUpperCase(),
        province: String(form.get('province') ?? ''),
        city: String(form.get('city') ?? ''),
        county: String(form.get('county') ?? ''),
        address: String(form.get('address') ?? ''),
        address2: String(form.get('address2') ?? ''),
        zip: String(form.get('zip') ?? ''),
        houseNumber: String(form.get('houseNumber') ?? ''),
      };
      const response = await fetch('/api/storefront/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, shipping }),
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
    <form onSubmit={handleCheckout} className="mt-12 w-full space-y-4">
      <div className="border-y border-zinc-900 py-5">
        <p className="mb-4 text-[9px] uppercase tracking-[0.24em] text-zinc-500">
          Shipping details
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckoutField name="customerName" label="Full name" autoComplete="name" maxLength={50} />
          <CheckoutField name="email" label="Email" type="email" autoComplete="email" maxLength={50} />
          <CheckoutField name="phone" label="Phone" type="tel" autoComplete="tel" maxLength={20} />
          <label className="block">
            <span className="sr-only">Country</span>
            <select
              name="countryCode"
              required
              defaultValue=""
              autoComplete="country"
              className="w-full border border-zinc-900 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-[#D4AF37]/50"
            >
              <option value="" disabled>
                Country
              </option>
              {STOREFRONT_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <CheckoutField name="province" label="State / province" autoComplete="address-level1" maxLength={50} />
          <CheckoutField name="city" label="City" autoComplete="address-level2" maxLength={50} />
          <CheckoutField name="county" label="County (optional)" autoComplete="address-level3" maxLength={50} required={false} />
          <CheckoutField name="address" label="Street address" autoComplete="address-line1" maxLength={500} />
          <CheckoutField name="houseNumber" label="House no. (optional)" maxLength={20} required={false} />
          <CheckoutField name="address2" label="Apartment / unit (optional)" autoComplete="address-line2" maxLength={500} required={false} />
          <CheckoutField name="zip" label="Postal code" autoComplete="postal-code" maxLength={20} />
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled || loading}
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
      <p className="text-center text-[10px] font-light leading-5 text-zinc-700">
        Shipping details are used only for payment and order fulfillment.
      </p>
    </form>
  );
}

function CheckoutField({
  label,
  required = true,
  ...inputProps
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  maxLength: number;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        {...inputProps}
        required={required}
        placeholder={label}
        className="w-full border border-zinc-900 bg-zinc-950 px-3 py-2.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-[#D4AF37]/50"
      />
    </label>
  );
}
