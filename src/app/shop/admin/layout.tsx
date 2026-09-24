import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function ShopAdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-black text-zinc-50">{children}</div>;
}
