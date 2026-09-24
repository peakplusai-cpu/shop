import type { Metadata } from 'next';

import { StorefrontCatalog } from '@/components/storefront-catalog';
import { StorefrontSetup } from '@/components/storefront-setup';
import { getStorefrontBrandName } from '@/lib/storefront-brand';
import { loadStorefrontProducts } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop the Collection',
  description: 'Explore the complete private collection.',
};

export default async function ShopPage() {
  const result = await loadStorefrontProducts();

  if (result.status === 'setup') {
    return <StorefrontSetup reason={result.reason} />;
  }

  return (
    <StorefrontCatalog
      brandName={getStorefrontBrandName()}
      products={result.products}
      preview={result.preview}
    />
  );
}
