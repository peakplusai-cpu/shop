import type { Metadata } from 'next';

import { ProductLanding } from '@/components/product-landing';
import { StorefrontSetup } from '@/components/storefront-setup';
import { loadDefaultStorefrontProduct } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop — Private Edition',
  description: 'Premium single-product storefront.',
};

export default async function ShopPage() {
  const result = await loadDefaultStorefrontProduct();

  if (result.status === 'setup') {
    return <StorefrontSetup reason={result.reason} />;
  }

  if (result.status === 'not_found') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-stone-400">
        找不到這個商品
      </main>
    );
  }

  return (
    <ProductLanding product={result.product} preview={result.preview} />
  );
}
