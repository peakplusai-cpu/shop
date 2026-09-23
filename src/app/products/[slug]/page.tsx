import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { ProductLanding } from '@/components/product-landing';
import { StorefrontSetup } from '@/components/storefront-setup';
import { loadStorefrontProduct } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

const loadProduct = cache(loadStorefrontProduct);

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProduct(slug);

  if (result.status !== 'ok') return { title: 'Product not found' };

  const { product } = result;

  return {
    title: `${product.title} — Private Edition`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description,
      images: [product.main_image_url],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await loadProduct(slug);

  if (result.status === 'setup') {
    return <StorefrontSetup reason={result.reason} />;
  }
  if (result.status === 'not_found') notFound();

  return (
    <ProductLanding product={result.product} preview={result.preview} />
  );
}
