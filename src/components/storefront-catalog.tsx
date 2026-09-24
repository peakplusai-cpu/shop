'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { PublicStorefrontProduct } from '@/lib/storefront';

type StorefrontCatalogProps = {
  brandName: string;
  products: PublicStorefrontProduct[];
  preview?: boolean;
};

type SortOption = 'featured' | 'newest' | 'price-low' | 'price-high';

function price(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function StorefrontCatalog({
  brandName,
  products,
  preview,
}: StorefrontCatalogProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('featured');

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized
      ? products.filter((product) =>
          `${product.title} ${product.description}`
            .toLowerCase()
            .includes(normalized),
        )
      : [...products];

    if (sort === 'newest') {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    if (sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') filtered.sort((a, b) => b.price - a.price);

    return filtered;
  }, [products, query, sort]);

  return (
    <main className="min-h-screen bg-black text-zinc-50">
      {preview && (
        <p className="border-b-[0.5px] border-[#D4AF37]/30 bg-zinc-950 px-4 py-2 text-center text-[10px] tracking-[0.08em] text-stone-500">
          Preview catalog · Connect the storefront database before launch
        </p>
      )}

      <header className="sticky top-0 z-30 border-b-[0.5px] border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/enter"
            className="font-serif text-xl font-light tracking-[0.08em] text-white sm:text-2xl"
          >
            {brandName}
          </Link>
          <nav className="flex items-center gap-6">
            <a
              href="#collection"
              className="hidden text-[10px] uppercase tracking-[0.24em] text-zinc-400 transition hover:text-[#D4AF37] sm:block"
            >
              Collection
            </a>
            <ShoppingBag
              aria-label="Shopping bag"
              className="h-4 w-4 text-[#D4AF37]"
            />
          </nav>
        </div>
      </header>

      <section className="relative flex min-h-[52vh] items-end overflow-hidden border-b-[0.5px] border-white/10 px-5 pb-16 pt-24 sm:px-8 lg:px-12 lg:pb-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(212,175,55,0.13),transparent_30%),linear-gradient(135deg,#050505_0%,#090909_55%,#030303_100%)]"
        />
        <div
          aria-hidden
          className="absolute right-[12%] top-16 h-72 w-72 rounded-full border-[0.5px] border-[#D4AF37]/15 blur-[1px] sm:h-96 sm:w-96"
        />
        <div className="relative mx-auto w-full max-w-[1500px]">
          <p className="text-[10px] uppercase tracking-[0.42em] text-[#D4AF37]">
            The private collection
          </p>
          <h1 className="mt-7 max-w-4xl font-serif text-5xl font-light leading-[0.98] tracking-[-0.035em] text-white sm:text-7xl lg:text-8xl">
            Objects chosen
            <br />
            with intention.
          </h1>
          <p className="mt-8 max-w-lg text-sm font-light leading-7 text-stone-500">
            A considered edit of exceptional pieces. Discover the one that
            speaks to you.
          </p>
        </div>
      </section>

      <section
        id="collection"
        className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="flex flex-col justify-between gap-6 border-b-[0.5px] border-white/10 pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#D4AF37]">
              Shop all
            </p>
            <h2 className="mt-3 font-serif text-3xl font-light sm:text-4xl">
              The Collection
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search collection"
                className="h-10 w-full border-[0.5px] border-zinc-800 bg-black pl-9 pr-9 text-xs text-zinc-200 sm:w-56"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              aria-label="Sort products"
              className="h-10 border-[0.5px] border-zinc-800 bg-black px-3 text-xs text-zinc-400"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {visibleProducts.length ? (
          <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
                  <Image
                    src={product.main_image_url}
                    alt={product.title}
                    fill
                    priority={index < 3}
                    unoptimized
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.035] group-hover:opacity-90"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.06]" />
                  <span className="absolute bottom-4 right-4 translate-y-2 border-[0.5px] border-[#D4AF37]/60 bg-black/80 px-4 py-2 text-[9px] uppercase tracking-[0.2em] text-[#D4AF37] opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    View piece
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-5">
                  <div>
                    <h3 className="font-serif text-xl font-light text-zinc-100 transition group-hover:text-[#E4C85B]">
                      {product.title}
                    </h3>
                    <p className="mt-2 line-clamp-1 text-xs font-light text-zinc-600">
                      {product.description}
                    </p>
                  </div>
                  <p className="shrink-0 pt-1 text-xs tracking-[0.08em] text-stone-400">
                    {price(product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-28 text-center">
            <p className="font-serif text-2xl font-light text-zinc-500">
              No pieces found
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#D4AF37]"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      <footer className="border-t-[0.5px] border-white/10 px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-zinc-700 sm:flex-row">
          <span>{brandName}</span>
          <span>Secure checkout · Worldwide delivery</span>
        </div>
      </footer>
    </main>
  );
}
