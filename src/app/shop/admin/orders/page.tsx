import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  markStorefrontOrderShipped,
  submitStorefrontOrderToCj,
  syncStorefrontCjOrder,
} from '@/app/shop/admin/actions';
import { ConfirmActionButton } from '@/components/confirm-action-button';
import { isStorefrontAdminAuthenticated } from '@/lib/storefront-admin-session';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';

export const dynamic = 'force-dynamic';

export default async function StorefrontOrdersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await isStorefrontAdminAuthenticated())) {
    redirect('/shop/admin/login');
  }
  const { error: actionError } = await searchParams;

  const { data: orders, error } = await createStorefrontAdminClient()
    .from('orders')
    .select(
      'id, status, product_title, amount_cents, amount_paid_cents, currency, customer_email, tracking_number, created_at, paid_at, shipping_email, shipping_customer_name, shipping_phone, shipping_country_code, shipping_country, shipping_province, shipping_city, shipping_county, shipping_address, shipping_address2, shipping_zip, shipping_house_number, cj_vid, cj_logistic_name, cj_fulfillment_order_id, cj_status, cj_tracking_provider, cj_tracking_url, cj_error, cj_sandbox, cj_submission_started_at, cj_last_synced_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[storefront/admin] order list failed:', error.message);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-end justify-between border-b border-zinc-800 pb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4AF37]">
            Store admin
          </p>
          <h1 className="mt-2 font-serif text-3xl font-light">Orders</h1>
        </div>
        <Link
          href="/shop/admin"
          className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-[#D4AF37]"
        >
          Products
        </Link>
      </div>

      {actionError && (
        <p className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
          {actionError}
        </p>
      )}
      {error && (
        <p className="mt-6 text-sm text-red-300">
          Orders could not be loaded.
        </p>
      )}

      <ul className="mt-8 divide-y divide-zinc-900">
        {(orders ?? []).map((order) => (
          <li key={order.id} className="grid gap-4 py-6 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-medium text-zinc-100">{order.product_title}</p>
                <span className="text-[9px] uppercase tracking-[0.18em] text-[#D4AF37]">
                  {order.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {(order.amount_cents / 100).toLocaleString('en-US', {
                  style: 'currency',
                  currency: order.currency,
                })}
                {' · '}
                {order.shipping_email ??
                  order.customer_email ??
                  'Email unavailable'}
              </p>
              {order.amount_paid_cents !== null &&
                order.amount_paid_cents !== order.amount_cents && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Paid:{' '}
                    {(order.amount_paid_cents / 100).toLocaleString('en-US', {
                      style: 'currency',
                      currency: order.currency,
                    })}
                  </p>
                )}
              <p className="mt-1 font-mono text-[10px] text-zinc-700">
                {order.id}
              </p>
              {order.tracking_number && (
                <p className="mt-2 text-xs text-zinc-400">
                  Tracking: {order.tracking_number}
                  {order.cj_tracking_provider
                    ? ` · ${order.cj_tracking_provider}`
                    : ''}
                </p>
              )}
              {order.shipping_customer_name && (
                <address className="mt-3 text-xs not-italic leading-5 text-zinc-500">
                  {order.shipping_customer_name} · {order.shipping_phone}
                  <br />
                  {[
                    order.shipping_address,
                    order.shipping_house_number,
                    order.shipping_address2,
                    order.shipping_city,
                    order.shipping_county,
                    order.shipping_province,
                    order.shipping_zip,
                    order.shipping_country,
                    order.shipping_country_code,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </address>
              )}
              {order.cj_fulfillment_order_id && (
                <p className="mt-2 text-xs text-zinc-500">
                  CJ: {order.cj_fulfillment_order_id}
                  {' · '}
                  {order.cj_status ?? 'submitted'}
                  {order.cj_sandbox ? ' · SANDBOX' : ''}
                </p>
              )}
              {order.cj_error && (
                <p className="mt-2 max-w-xl text-xs text-red-400">
                  CJ: {order.cj_error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href={`/orders/${order.id}/track`}
                className="border border-zinc-800 px-3 py-2 text-[9px] uppercase tracking-wider text-zinc-400"
              >
                View
              </Link>
              {order.status === 'paid' &&
                !order.cj_fulfillment_order_id &&
                order.cj_vid &&
                order.cj_logistic_name && (
                  <ConfirmActionButton
                    action={submitStorefrontOrderToCj.bind(null, order.id)}
                    label="Send to CJ"
                    confirmText="Create this paid order in CJ? Sandbox mode will not ship real goods."
                    className="border border-[#D4AF37]/60 px-3 py-2 text-[9px] uppercase tracking-wider text-[#D4AF37]"
                  />
                )}
              {order.cj_fulfillment_order_id && (
                <form action={syncStorefrontCjOrder.bind(null, order.id)}>
                  <button
                    type="submit"
                    className="border border-zinc-800 px-3 py-2 text-[9px] uppercase tracking-wider text-zinc-400"
                  >
                    Sync CJ
                  </button>
                </form>
              )}
              {order.status === 'paid' &&
                !order.cj_fulfillment_order_id &&
                !order.cj_submission_started_at && (
                <form
                  action={markStorefrontOrderShipped.bind(null, order.id)}
                  className="flex gap-2"
                >
                  <input
                    name="tracking_number"
                    required
                    maxLength={120}
                    placeholder="Tracking number"
                    className="w-44 border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-200"
                  />
                  <button
                    type="submit"
                    className="border border-[#D4AF37]/60 px-3 py-2 text-[9px] uppercase tracking-wider text-[#D4AF37]"
                  >
                    Mark shipped
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!error && !orders?.length && (
        <p className="py-16 text-center text-sm text-zinc-600">No orders yet.</p>
      )}
    </main>
  );
}
