import Link from 'next/link';

type StorefrontSetupProps = {
  reason: 'schema_missing' | 'not_configured' | 'empty_catalog';
};

const COPY: Record<
  StorefrontSetupProps['reason'],
  { title: string; lines: string[] }
> = {
  schema_missing: {
    title: '商店資料庫尚未建立',
    lines: [
      '在「商店專用」Supabase 專案 → SQL Editor',
      '貼上並執行：supabase/storefront_commercial.sql',
      '完成後刷新此頁。',
    ],
  },
  not_configured: {
    title: '商用設定未完成',
    lines: [
      '1. 新建「只給商店用」的 Supabase 專案，執行 supabase/storefront_commercial.sql',
      '2. .env.local 填入 STOREFRONT_SUPABASE_URL、STOREFRONT_SUPABASE_SERVICE_ROLE_KEY',
      '3. 填入 STOREFRONT_CREEM_PRODUCT_ID、CREEM_API_KEY（或 STOREFRONT_CREEM_API_KEY）',
      '4. 重啟 npm run dev，本地商用測試加 STOREFRONT_COMMERCIAL=true',
    ],
  },
  empty_catalog: {
    title: '尚無上架商品',
    lines: [
      '在 products 表確認有商品，並設定 creem_product_id 或 env STOREFRONT_CREEM_PRODUCT_ID。',
    ],
  },
};

export function StorefrontSetup({ reason }: StorefrontSetupProps) {
  const { title, lines } = COPY[reason];

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-zinc-50">
      <div className="max-w-md border-[0.5px] border-[#D4AF37]/50 bg-zinc-950/80 p-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37]">
          Storefront
        </p>
        <h1 className="mt-6 font-serif text-2xl font-light text-white">{title}</h1>
        <div className="mx-auto my-8 h-px w-12 bg-[#D4AF37]" />
        <ul className="space-y-3 text-left text-sm font-light leading-6 text-stone-400">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-zinc-600">
          本地預覽網址：{' '}
          <Link href="/shop" className="text-[#D4AF37] underline-offset-4 hover:underline">
            /shop
          </Link>
          {' · '}
          <Link
            href="/products/nomad-leather-sleeve"
            className="text-[#D4AF37] underline-offset-4 hover:underline"
          >
            /products/nomad-leather-sleeve
          </Link>
        </p>
      </div>
    </main>
  );
}
