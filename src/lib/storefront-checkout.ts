import 'server-only';

import {
  createStorefrontCreemCheckout,
  getStorefrontPublicOrigin,
} from '@/lib/storefront-creem';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';
import type { StorefrontProduct } from '@/lib/storefront';

function resolveCreemProductId(product: StorefrontProduct): string | null {
  return product.creem_product_id?.trim() || null;
}

export async function startStorefrontCheckout(input: {
  product: StorefrontProduct;
  customerEmail?: string;
}): Promise<{ url: string } | { error: string; status: number }> {
  const creemProductId = resolveCreemProductId(input.product);
  if (!creemProductId) {
    return {
      error:
        'Set a Creem product ID on this product before enabling checkout.',
      status: 503,
    };
  }

  const admin = createStorefrontAdminClient();
  const { data: order, error: insertError } = await admin
    .from('orders')
    .insert({
      product_id: input.product.id,
      status: 'pending',
      customer_email: input.customerEmail?.trim().toLowerCase() || null,
      product_title: input.product.title,
      amount_cents: Math.round(Number(input.product.price) * 100),
      currency: 'USD',
      creem_product_id: creemProductId,
    })
    .select('id')
    .single();

  if (insertError || !order) {
    console.error('[storefront/checkout] order insert failed:', insertError?.message);
    return { error: 'Could not create order.', status: 500 };
  }

  let origin: string;
  try {
    origin = getStorefrontPublicOrigin();
  } catch (error) {
    console.error(
      '[storefront/checkout] invalid public origin:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return { error: 'Storefront URL is not configured correctly.', status: 503 };
  }
  const successUrl = `${origin}/orders/${order.id}/track`;
  const checkout = await createStorefrontCreemCheckout({
    creemProductId,
    orderId: order.id,
    successUrl,
    customerEmail: input.customerEmail,
  });

  if (!checkout.url) {
    // Keep the pending order: Creem may have accepted the checkout even when
    // its response was interrupted. A later signed webhook must still be able
    // to reconcile this order.
    return {
      error: checkout.error ?? 'Creem checkout failed.',
      status: 502,
    };
  }

  if (checkout.checkoutId) {
    const { error: checkoutIdError } = await admin
      .from('orders')
      .update({ creem_checkout_id: checkout.checkoutId })
      .eq('id', order.id);
    if (checkoutIdError) {
      console.error(
        '[storefront/checkout] checkout id persistence failed:',
        checkoutIdError.message,
      );
    }
  }

  return { url: checkout.url };
}
