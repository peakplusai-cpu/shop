import type { StorefrontProduct } from '@/lib/storefront';

/** Built-in preview product — no database required for local design review. */
export const DEMO_STOREFRONT_PRODUCT: StorefrontProduct = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'nomad-leather-sleeve',
  title: 'Nomad Leather Sleeve',
  description:
    'Hand-finished full-grain leather. Minimal silhouette, maximum presence — designed for the traveler who moves quietly and arrives with intention.',
  price: 289,
  main_image_url:
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1600&q=80',
  creem_link: 'https://www.creem.io',
  creem_product_id: null,
  cj_vid: null,
  cj_logistic_name: null,
  active: true,
  created_at: new Date(0).toISOString(),
};

export function isDemoProductSlug(slug: string): boolean {
  return slug === DEMO_STOREFRONT_PRODUCT.slug;
}
