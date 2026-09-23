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

function parseCheckoutEvent(rawBody: string): {
  eventType: string;
  orderId: string | null;
  customerEmail: string | null;
} | null {
  try {
    const payload = asObject(JSON.parse(rawBody));
    if (!payload) return null;

    const eventType =
      readString(payload.eventType) ?? readString(payload.type);
    const data = asObject(payload.data);
    const object = asObject(payload.object) ?? asObject(data?.object);
    if (!eventType || !object) return null;

    const metadata = asObject(object.metadata);
    const customer = asObject(object.customer);
    const order = asObject(object.order);
    const orderMetadata = asObject(order?.metadata);
    const orderCustomer = asObject(order?.customer);

    return {
      eventType,
      orderId:
        readString(metadata?.order_id) ??
        readString(orderMetadata?.order_id),
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

export async function POST(request: Request) {
  const rawBody = await request.text();

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

  const updates: Database['public']['Tables']['orders']['Update'] = {
    status: 'paid',
  };
  if (event.customerEmail) {
    updates.customer_email = event.customerEmail.toLowerCase();
  }

  const admin = createStorefrontAdminClient();
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
    const { data: existingOrder, error: lookupError } = await admin
      .from('orders')
      .select('status')
      .eq('id', event.orderId)
      .maybeSingle();

    if (lookupError) {
      console.error(
        '[storefront/creem] order lookup failed:',
        lookupError.message,
      );
      return NextResponse.json(
        { error: 'Unable to verify order.' },
        { status: 500 },
      );
    }
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Replayed webhooks and shipped orders are acknowledged without allowing a
    // stale event to move fulfillment backwards.
    return NextResponse.json({
      received: true,
      processed: false,
      reason: 'already_processed',
    });
  }

  return NextResponse.json({ received: true, processed: true });
}
