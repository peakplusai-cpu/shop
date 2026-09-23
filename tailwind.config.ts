import type { Config } from 'tailwindcss';

const config: Config = {
  // No darkMode class toggle needed — we use explicit zinc/amber colors throughout
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        card: '#0f0f12',
        'card-border': '#27272a',
        muted: '#71717a',
        gold: {
          DEFAULT: '#d4af37',
          dim: '#9a7b1a',
          light: '#f0c040',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-subtle':
          'linear-gradient(to right,#8080800a 1px,transparent 1px),linear-gradient(to bottom,#8080800a 1px,transparent 1px)',
      },
      backgroundSize: {
        grid: '4rem 4rem',
      },
    },
  },
  plugins: [],
};

export default config;
