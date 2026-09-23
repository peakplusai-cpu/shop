import Link from 'next/link';
import { redirect } from 'next/navigation';

import { createStorefrontProduct } from '@/app/shop/admin/actions';
import { StorefrontAdminProductForm } from '@/components/storefront-admin-product-form';
import { isStorefrontAdminAuthenticated } from '@/lib/storefront-admin-session';

export default async function NewStorefrontProductPage() {
  if (!(await isStorefrontAdminAuthenticated())) {
    redirect('/shop/admin/login');
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link
        href="/shop/admin"
        className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 hover:text-[#D4AF37]"
      >
        ← Products
      </Link>
      <h1 className="mt-6 font-serif text-3xl font-light">New product</h1>
      <div className="mt-10">
        <StorefrontAdminProductForm
          action={createStorefrontProduct}
          submitLabel="Publish product"
        />
      </div>
    </main>
  );
}
