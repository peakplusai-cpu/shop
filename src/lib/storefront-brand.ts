export function getStorefrontBrandName(): string {
  return process.env.NEXT_PUBLIC_STOREFRONT_BRAND?.trim() || 'Your Maison';
}
