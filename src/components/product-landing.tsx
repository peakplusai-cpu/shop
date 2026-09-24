import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { ExpressCheckoutButton } from '@/components/express-checkout-button';
import { FadeIn } from '@/components/fade-in';
import type { StorefrontProduct } from '@/lib/storefront';

type ProductLandingProps = {
  product: StorefrontProduct;
  preview?: boolean;
};

export function ProductLanding({ product, preview }: ProductLandingProps) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(product.price);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_30%,rgba(212,175,55,0.07),transparent_34%)]"
      />

      {preview && (
        <p className="relative z-10 border-b-[0.5px] border-[#D4AF37]/30 bg-zinc-950/90 px-4 py-2.5 text-center text-[11px] font-light tracking-wide text-stone-400">
          本地預覽模式（尚未連資料庫）· 畫面已可給客戶看 · 真實收款再設定即可
        </p>
      )}

      <Link
        href="/shop"
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 border-[0.5px] border-white/10 bg-black/60 px-4 py-2 text-[9px] uppercase tracking-[0.22em] text-zinc-400 backdrop-blur transition hover:border-[#D4AF37]/50 hover:text-[#D4AF37] sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-3 w-3" />
        All products
      </Link>

      <div className="relative mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative flex min-h-[58vh] items-center justify-center border-b-[0.5px] border-[#D4AF37]/25 p-5 sm:p-10 lg:min-h-screen lg:border-b-0 lg:border-r-[0.5px] lg:p-16">
          <FadeIn className="relative h-[48vh] w-full max-w-3xl overflow-hidden bg-zinc-950 sm:h-[66vh] lg:h-[78vh]">
            <Image
              src={product.main_image_url}
              alt={product.title}
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover transition-transform duration-[1600ms] ease-out hover:scale-[1.015]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]"
            />
          </FadeIn>
        </section>

        <section className="flex items-center px-7 py-16 sm:px-14 lg:px-16 xl:px-24">
          <FadeIn className="w-full max-w-xl" delay={0.15}>
            <p className="mb-8 text-[10px] font-medium uppercase tracking-[0.42em] text-[#D4AF37]">
              Private Edition
            </p>
            <h1 className="max-w-lg font-serif text-4xl font-light leading-[1.08] tracking-[-0.025em] text-zinc-50 sm:text-5xl xl:text-6xl">
              {product.title}
            </h1>

            <div className="my-9 h-px w-16 bg-[#D4AF37]" />

            <p className="text-xl font-light tracking-[0.08em] text-zinc-100">
              {formattedPrice}
            </p>
            <p className="mt-8 max-w-md whitespace-pre-line text-sm font-light leading-7 text-stone-400 sm:text-[15px]">
              {product.description}
            </p>

            <ExpressCheckoutButton slug={product.slug} disabled={preview} />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              <span>Encrypted payment</span>
              <span aria-hidden="true" className="h-3 w-px bg-[#D4AF37]/35" />
              <span>Worldwide delivery</span>
            </div>
            {!preview && (
              <p className="mt-8 text-center text-[10px] text-zinc-700">
                <a href="/shop" className="hover:text-[#D4AF37]">
                  Collection
                </a>
              </p>
            )}
          </FadeIn>
        </section>
      </div>
    </main>
  );
}
