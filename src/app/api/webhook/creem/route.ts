import { NextResponse } from 'next/server';

import { verifyStorefrontCreemSignature } from '@/lib/storefront-creem';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

const COMPLETED_EVENTS = new Set([
  // Creem's current event name and the session-style name accepted for
  // forward compatibility with checkout integrations.
  'checkout.completed',
  'checkout.session.completed',
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? value
    : null;
}

function parseCheckoutEvent(rawBody: string): {
  eventId: string;
  eventType: string;
  orderId: string | null;
  checkoutId: string | null;
  providerOrderId: string | null;
  requestId: string | null;
  productId: string | null;
  productPriceCents: number | null;
  amountPaidCents: number | null;
  currency: string | null;
  mode: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
} | null {
  try {
    const payload = asObject(JSON.parse(rawBody));
    if (!payload) return null;

    const eventId = readString(payload.id);
    const eventType =
      readString(payload.eventType) ?? readString(payload.type);
    const data = asObject(payload.data);
    const object = asObject(payload.object) ?? asObject(data?.object);
    if (!eventId || !eventType || !object) return null;

    const metadata = asObject(object.metadata);
    const customer = asObject(object.customer);
    const order = asObject(object.order);
    const productValue = object.product;
    const product = asObject(productValue);
    const orderMetadata = asObject(order?.metadata);
    const orderCustomer = asObject(order?.customer);

    return {
      eventId,
      eventType,
      orderId:
        readString(metadata?.order_id) ??
        readString(orderMetadata?.order_id),
      checkoutId: readString(object.id),
      providerOrderId: readString(order?.id),
      requestId: readString(object.request_id),
      productId:
        readString(order?.product) ??
        readString(product?.id) ??
        readString(productValue),
      productPriceCents: readNumber(product?.price),
      amountPaidCents:
        readNumber(order?.amount_paid) ?? readNumber(order?.amount),
      currency:
        readString(order?.currency)?.toUpperCase() ??
        readString(product?.currency)?.toUpperCase() ??
        null,
      mode:
        readString(object.mode)?.toLowerCase() ??
        readString(order?.mode)?.toLowerCase() ??
        null,
      paymentStatus: readString(order?.status)?.toLowerCase() ?? null,
      customerEmail:
        readString(customer?.email) ??
        readString(orderCustomer?.email) ??
        readString(object.customer_email) ??
        readString(object.email),
    };
  } catch {
    return null;
  }
}

function isExpectedCreemMode(mode: string | null): boolean {
  if (!mode) return false;
  const testMode = process.env.CREEM_TEST_MODE?.trim().toLowerCase() === 'true';
  return testMode
    ? mode === 'test' || mode === 'local'
    : mode === 'local' || mode === 'live' || mode === 'production';
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > 256_000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 256_000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  // Creem signs the exact raw request body with HMAC-SHA256. Never parse or
  // mutate the body before this constant-time verification.
  if (!verifyStorefrontCreemSignature(rawBody, request.headers.get('creem-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  const event = parseCheckoutEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  if (!COMPLETED_EVENTS.has(event.eventType)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  if (!event.orderId || !UUID_PATTERN.test(event.orderId)) {
    return NextResponse.json(
      { error: 'A valid metadata.order_id is required.' },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createStorefrontAdminClient();
  } catch (error) {
    console.error(
      '[storefront/creem] database configuration failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return NextResponse.json(
      { error: 'Webhook processing is unavailable.' },
      { status: 503 },
    );
  }

  const { data: existingOrder, error: lookupError } = await admin
    .from('orders')
    .select(
      'id, status, amount_cents, currency, creem_product_id, creem_checkout_id, creem_order_id',
    )
    .eq('id', event.orderId)
    .maybeSingle();

  if (lookupError) {
    console.error('[storefront/creem] order lookup failed:', lookupError.message);
    return NextResponse.json(
      { error: 'Unable to verify order.' },
      { status: 500 },
    );
  }
  if (!existingOrder) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  if (existingOrder.status !== 'pending') {
    // Replayed webhooks and shipped orders are acknowledged without allowing a
    // stale event to move fulfillment backwards.
    return NextResponse.json({
      received: true,
      processed: false,
      reason: 'already_processed',
    });
  }

  if (
    !event.checkoutId ||
    !event.providerOrderId ||
    !event.productId ||
    event.productPriceCents === null ||
    event.amountPaidCents === null ||
    !event.currency ||
    !event.paymentStatus ||
    !event.mode
  ) {
    return NextResponse.json(
      { error: 'Payment integrity fields are missing.' },
      { status: 400 },
    );
  }

  const mismatches: string[] = [];
  if (event.requestId && event.requestId !== existingOrder.id) {
    mismatches.push('request_id');
  }
  if (event.productId !== existingOrder.creem_product_id) {
    mismatches.push('product_id');
  }
  if (event.productPriceCents !== existingOrder.amount_cents) {
    mismatches.push('product_price');
  }
  if (event.amountPaidCents < existingOrder.amount_cents) {
    mismatches.push('amount_paid');
  }
  if (event.currency !== existingOrder.currency.toUpperCase()) {
    mismatches.push('currency');
  }
  if (event.paymentStatus !== 'paid') mismatches.push('payment_status');
  if (!isExpectedCreemMode(event.mode)) mismatches.push('mode');
  if (
    existingOrder.creem_checkout_id &&
    existingOrder.creem_checkout_id !== event.checkoutId
  ) {
    mismatches.push('checkout_id');
  }
  if (
    existingOrder.creem_order_id &&
    existingOrder.creem_order_id !== event.providerOrderId
  ) {
    mismatches.push('order_id');
  }

  if (mismatches.length) {
    console.error(
      '[storefront/creem] payment integrity mismatch:',
      event.eventId,
      mismatches.join(','),
    );
    return NextResponse.json(
      { error: 'Payment does not match the local order.' },
      { status: 409 },
    );
  }

  const updates: Database['public']['Tables']['orders']['Update'] = {
    status: 'paid',
    paid_at: new Date().toISOString(),
    amount_paid_cents: event.amountPaidCents,
    creem_checkout_id: event.checkoutId,
    creem_order_id: event.providerOrderId,
    creem_event_id: event.eventId,
  };
  if (event.customerEmail) {
    updates.customer_email = event.customerEmail.toLowerCase();
  }

  const { data: updatedOrder, error: updateError } = await admin
    .from('orders')
    .update(updates)
    .eq('id', event.orderId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('[storefront/creem] order update failed:', updateError.message);
    return NextResponse.json(
      { error: 'Unable to update order.' },
      { status: 500 },
    );
  }
  if (!updatedOrder) {
    return NextResponse.json({
      received: true,
      processed: false,
      reason: 'already_processed',
    });
  }

  return NextResponse.json({ received: true, processed: true });
}
