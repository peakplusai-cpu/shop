import type { ReactNode } from 'react';

export default function ShopAdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-black text-zinc-50">{children}</div>;
}
