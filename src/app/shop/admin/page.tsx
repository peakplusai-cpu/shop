import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  logoutStorefrontAdmin,
  setStorefrontProductActive,
} from '@/app/shop/admin/actions';
import { isStorefrontAdminAuthenticated } from '@/lib/storefront-admin-session';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products — Shop Admin',
  robots: { index: false, follow: false },
};

export default async function ShopAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isStorefrontAdminAuthenticated())) {
    redirect('/shop/admin/login');
  }
  const { error: actionError } = await searchParams;

  const { data: products, error } = await createStorefrontAdminClient()
    .from('products')
    .select('id, slug, title, price, active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[storefront/admin] list failed:', error.message);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {actionError && (
        <p className="mb-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {actionError}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4AF37]">Store admin</p>
          <h1 className="mt-2 font-serif text-3xl font-light">Products</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/shop/admin/orders"
            className="border border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400 hover:border-[#D4AF37]/40"
          >
            Orders
          </Link>
          <Link
            href="/shop/admin/products/new"
            className="border-[0.5px] border-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-[#E4C85B] hover:bg-[#D4AF37] hover:text-black"
          >
            + New product
          </Link>
          <form action={logoutStorefrontAdmin}>
            <button
              type="submit"
              className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-300"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      <ul className="mt-10 divide-y divide-zinc-900">
        {(products ?? []).map((product) => (
          <li
            key={product.id}
            className="flex flex-wrap items-center justify-between gap-4 py-5"
          >
            <div>
              <p className="font-medium text-zinc-100">{product.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                /products/{product.slug} · ${Number(product.price).toFixed(2)}
                {!product.active && ' · Archived'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/shop/admin/products/${product.id}/edit`}
                className="border border-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400 hover:border-[#D4AF37]/40"
              >
                Edit
              </Link>
              <Link
                href={`/products/${product.slug}`}
                className="border border-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-400 hover:border-[#D4AF37]/40"
              >
                View
              </Link>
              <form
                action={setStorefrontProductActive.bind(
                  null,
                  product.id,
                  !product.active,
                )}
              >
                <button
                  type="submit"
                  className="border border-zinc-900 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 hover:border-[#D4AF37]/40"
                >
                  {product.active ? 'Archive' : 'Restore'}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {!products?.length && (
        <p className="mt-12 text-center text-sm text-zinc-600">
          No products yet.{' '}
          <Link href="/shop/admin/products/new" className="text-[#D4AF37] underline-offset-4 hover:underline">
            Add your first product
          </Link>
        </p>
      )}
    </main>
  );
}
