import type { Metadata } from 'next';

import { StorefrontIntro } from '@/components/storefront-intro';

export const metadata: Metadata = {
  title: 'Enter — Private Collection',
  robots: { index: true, follow: true },
};

export default function EnterPage() {
  const brandName =
    process.env.NEXT_PUBLIC_STOREFRONT_BRAND?.trim() || 'Your Maison';

  return <StorefrontIntro brandName={brandName} />;
}
