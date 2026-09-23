import 'server-only';

import {
  createStorefrontCreemCheckout,
  getStorefrontCreemProductId,
  getStorefrontPublicOrigin,
} from '@/lib/storefront-creem';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';
import type { StorefrontProduct } from '@/lib/storefront';

function resolveCreemProductId(product: StorefrontProduct): string | null {
  return product.creem_product_id?.trim() || getStorefrontCreemProductId();
}

export async function startStorefrontCheckout(input: {
  product: StorefrontProduct;
  customerEmail?: string;
}): Promise<{ url: string } | { error: string; status: number }> {
  const creemProductId = resolveCreemProductId(input.product);
  if (!creemProductId) {
    return {
      error:
        'Set creem_product_id on the product row or STOREFRONT_CREEM_PRODUCT_ID in env.',
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
    })
    .select('id')
    .single();

  if (insertError || !order) {
    console.error('[storefront/checkout] order insert failed:', insertError?.message);
    return { error: 'Could not create order.', status: 500 };
  }

  const origin = getStorefrontPublicOrigin();
  const successUrl = `${origin}/orders/${order.id}/track`;
  const checkout = await createStorefrontCreemCheckout({
    creemProductId,
    orderId: order.id,
    successUrl,
    customerEmail: input.customerEmail,
  });

  if (!checkout.url) {
    await admin.from('orders').delete().eq('id', order.id);
    return {
      error: checkout.error ?? 'Creem checkout failed.',
      status: 502,
    };
  }

  return { url: checkout.url };
}
