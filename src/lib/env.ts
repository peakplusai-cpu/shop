export const PRODUCTION_APP_URL = 'https://peakplusai.com';

export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    (process.env.VERCEL_ENV === 'production'
      ? PRODUCTION_APP_URL
      : 'http://localhost:3000')
  ).replace(/\/$/, '');
}
