import 'server-only';

import {
  createStorefrontCreemCheckout,
  getStorefrontPublicOrigin,
} from '@/lib/storefront-creem';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';
import type { StorefrontProduct } from '@/lib/storefront';
import type { StorefrontShippingInput } from '@/lib/storefront-shipping';
import {
  formatCjError,
  isCjConfigured,
  resolveCjLogisticName,
} from '@/lib/cj';

function resolveCreemProductId(product: StorefrontProduct): string | null {
  return product.creem_product_id?.trim() || null;
}

export async function startStorefrontCheckout(input: {
  product: StorefrontProduct;
  shipping: StorefrontShippingInput;
}): Promise<{ url: string } | { error: string; status: number }> {
  const creemProductId = resolveCreemProductId(input.product);
  if (!creemProductId) {
    return {
      error:
        'Set a Creem product ID on this product before enabling checkout.',
      status: 503,
    };
  }

  const cjVid = input.product.cj_vid?.trim();
  const cjLogisticName =
    input.product.cj_logistic_name?.trim() ||
    process.env.CJ_DEFAULT_LOGISTIC_NAME?.trim();
  if (!cjVid || !cjLogisticName) {
    return {
      error: 'Fulfillment is not configured for this product.',
      status: 503,
    };
  }
  if (!isCjConfigured()) {
    return {
      error: 'Fulfillment is temporarily unavailable.',
      status: 503,
    };
  }

  let resolvedLogisticName: string;
  try {
    const available = await resolveCjLogisticName({
      vid: cjVid,
      logisticName: cjLogisticName,
      countryCode: input.shipping.countryCode,
      zip: input.shipping.zip,
      houseNumber: input.shipping.houseNumber || undefined,
    });
    if (!available) {
      return {
        error: 'This shipping method is unavailable for the destination.',
        status: 422,
      };
    }
    resolvedLogisticName = available;
  } catch (error) {
    console.error('[storefront/cj] freight validation failed:', formatCjError(error));
    return {
      error: 'Shipping availability could not be verified. Please try again.',
      status: 503,
    };
  }

  const admin = createStorefrontAdminClient();
  const { data: order, error: insertError } = await admin
    .from('orders')
    .insert({
      product_id: input.product.id,
      status: 'pending',
      customer_email: input.shipping.email.toLowerCase(),
      product_title: input.product.title,
      amount_cents: Math.round(Number(input.product.price) * 100),
      currency: 'USD',
      creem_product_id: creemProductId,
      cj_vid: cjVid,
      cj_logistic_name: resolvedLogisticName,
      shipping_email: input.shipping.email.toLowerCase(),
      shipping_customer_name: input.shipping.customerName,
      shipping_phone: input.shipping.phone,
      shipping_country_code: input.shipping.countryCode,
      shipping_country: input.shipping.country,
      shipping_province: input.shipping.province,
      shipping_city: input.shipping.city,
      shipping_county: input.shipping.county || null,
      shipping_address: input.shipping.address,
      shipping_address2: input.shipping.address2 || null,
      shipping_zip: input.shipping.zip,
      shipping_house_number: input.shipping.houseNumber || null,
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
    customerEmail: input.shipping.email,
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
