import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { updateStorefrontProduct } from '@/app/shop/admin/actions';
import { StorefrontAdminProductForm } from '@/components/storefront-admin-product-form';
import { isStorefrontAdminAuthenticated } from '@/lib/storefront-admin-session';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditStorefrontProductPage({ params }: EditPageProps) {
  if (!(await isStorefrontAdminAuthenticated())) {
    redirect('/shop/admin/login');
  }

  const { id } = await params;
  const { data: product } = await createStorefrontAdminClient()
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!product) notFound();

  const boundUpdate = updateStorefrontProduct.bind(null, id);

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link
        href="/shop/admin"
        className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 hover:text-[#D4AF37]"
      >
        ← Products
      </Link>
      <h1 className="mt-6 font-serif text-3xl font-light">Edit product</h1>
      <div className="mt-10">
        <StorefrontAdminProductForm
          action={boundUpdate}
          submitLabel="Save changes"
          initial={{
            slug: product.slug,
            title: product.title,
            description: product.description,
            price: Number(product.price),
            main_image_url: product.main_image_url,
            creem_product_id: product.creem_product_id,
          }}
        />
      </div>
    </main>
  );
}
