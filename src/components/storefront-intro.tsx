'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type StorefrontIntroProps = {
  brandName: string;
};

export function StorefrontIntro({ brandName }: StorefrontIntroProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-6 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.12),transparent_45%)]"
      />

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 h-px w-32 origin-center bg-[#D4AF37]"
      />

      <motion.p
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.42em' }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="text-[10px] uppercase text-[#D4AF37]"
      >
        Private Collection
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="mt-6 text-center font-serif text-4xl font-light tracking-[-0.02em] sm:text-5xl"
      >
        {brandName}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        className="mt-8 max-w-sm text-center text-sm font-light leading-6 text-stone-500"
      >
        Crafted for those who decide in a moment and remember forever.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-14 flex flex-col items-center gap-4 sm:flex-row"
      >
        <Link
          href="/shop"
          className="min-w-[220px] border-[0.5px] border-[#D4AF37] px-8 py-3 text-center text-[10px] uppercase tracking-[0.28em] text-[#E4C85B] transition hover:bg-[#D4AF37] hover:text-black"
        >
          Enter the collection
        </Link>
        <Link
          href="/shop/login"
          className="text-[10px] uppercase tracking-[0.22em] text-zinc-600 transition hover:text-[#D4AF37]"
        >
          Sign in
        </Link>
      </motion.div>
    </main>
  );
}
