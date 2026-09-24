export function getAppOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, '')}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing NEXT_PUBLIC_STOREFRONT_URL.');
  }
  return 'http://localhost:3000';
}
