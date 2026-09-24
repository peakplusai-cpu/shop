'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  isStorefrontAdminIpAllowed,
  readClientIpFromHeaders,
} from '@/lib/storefront-admin-cookie';
import {
  clearStorefrontAdminSession,
  createStorefrontAdminSession,
  isStorefrontAdminAuthenticated,
  isStorefrontAdminEnabled,
  verifyStorefrontAdminPassword,
  verifyStorefrontAdminTotp,
} from '@/lib/storefront-admin-session';
import { headers } from 'next/headers';
import {
  consumeStorefrontRateLimit,
  resetStorefrontRateLimit,
} from '@/lib/storefront-rate-limit';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';
import {
  createCjOrder,
  formatCjError,
  getCjOrder,
  isCjConfigured,
  isCjOrderNotFound,
} from '@/lib/cj';
import { mapCjOrderStatus } from '@/lib/cj-helpers';
import type { Database } from '@/types/database';

const productSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: lowercase letters, numbers, hyphens'),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  price: z.coerce.number().min(0).max(99_999_999.99).multipleOf(0.01),
  main_image_url: z
    .string()
    .url()
    .refine((value) => value.startsWith('https://'), 'Image URL must use HTTPS'),
  creem_product_id: z
    .string()
    .regex(/^prod_[A-Za-z0-9]+$/, 'Invalid Creem product ID')
    .optional(),
  cj_vid: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Invalid CJ variant ID')
    .optional(),
  cj_logistic_name: z.string().min(1).max(50).optional(),
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin() {
  if (!(await isStorefrontAdminAuthenticated())) {
    redirect('/shop/admin/login');
  }
}

export async function loginStorefrontAdmin(
  formData: FormData,
): Promise<{ error?: string } | void> {
  if (!isStorefrontAdminEnabled()) {
    return { error: 'Set STOREFRONT_ADMIN_PASSWORD in .env.local first.' };
  }

  const headerStore = await headers();
  const ip = readClientIpFromHeaders(headerStore);
  if (!isStorefrontAdminIpAllowed(ip)) {
    return { error: 'Access denied from this network.' };
  }

  const rateLimit = await consumeStorefrontRateLimit({
    scope: 'admin-login',
    identifier: ip,
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (!rateLimit.allowed) {
    if (rateLimit.reason === 'missing_config') {
      return {
        error:
          'Vercel is missing STOREFONT_SUPABASE_URL or STOREFONT_SUPABASE_SERVICE_ROLE_KEY.',
      };
    }
    if (rateLimit.reason === 'rpc_error') {
      return {
        error:
          'Rate limit could not reach Supabase. Run migrations 031 and 032, then redeploy.',
      };
    }
    return {
      error: rateLimit.unavailable
        ? 'Login protection is temporarily unavailable.'
        : 'Too many sign-in attempts. Try again in 15 minutes.',
    };
  }

  const password = String(formData.get('password') ?? '');
  const totp = String(formData.get('totp') ?? '').trim();
  if (
    !verifyStorefrontAdminPassword(password) ||
    !verifyStorefrontAdminTotp(totp)
  ) {
    return { error: 'Invalid password or authentication code.' };
  }

  await resetStorefrontRateLimit({
    scope: 'admin-login',
    identifier: ip,
  });
  await createStorefrontAdminSession();
  redirect('/shop/admin');
}

export async function logoutStorefrontAdmin() {
  await clearStorefrontAdminSession();
  redirect('/shop/admin/login');
}

export async function createStorefrontProduct(formData: FormData) {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    slug: String(formData.get('slug') ?? '').trim().toLowerCase(),
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    price: formData.get('price'),
    main_image_url: String(formData.get('main_image_url') ?? '').trim(),
    creem_product_id: String(formData.get('creem_product_id') ?? '').trim() || undefined,
    cj_vid: String(formData.get('cj_vid') ?? '').trim() || undefined,
    cj_logistic_name:
      String(formData.get('cj_logistic_name') ?? '').trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid product data.' };
  }

  const data = parsed.data;
  const admin = createStorefrontAdminClient();
  const { error } = await admin.from('products').insert({
    slug: data.slug,
    title: data.title,
    description: data.description,
    price: data.price,
    main_image_url: data.main_image_url,
    creem_link: 'https://www.creem.io',
    creem_product_id: data.creem_product_id ?? null,
    cj_vid: data.cj_vid ?? null,
    cj_logistic_name: data.cj_logistic_name ?? null,
  });

  if (error) {
    console.error('[storefront/admin] create failed:', error.message);
    return { error: error.message.includes('unique') ? 'Slug already exists.' : 'Could not save product.' };
  }

  revalidatePath('/shop');
  revalidatePath('/shop/admin');
  revalidatePath(`/products/${data.slug}`);
  redirect('/shop/admin');
}

export async function updateStorefrontProduct(id: string, formData: FormData) {
  await requireAdmin();
  if (!UUID_PATTERN.test(id)) return { error: 'Invalid product id.' };

  const parsed = productSchema.safeParse({
    slug: String(formData.get('slug') ?? '').trim().toLowerCase(),
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    price: formData.get('price'),
    main_image_url: String(formData.get('main_image_url') ?? '').trim(),
    creem_product_id: String(formData.get('creem_product_id') ?? '').trim() || undefined,
    cj_vid: String(formData.get('cj_vid') ?? '').trim() || undefined,
    cj_logistic_name:
      String(formData.get('cj_logistic_name') ?? '').trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid product data.' };
  }

  const data = parsed.data;
  const admin = createStorefrontAdminClient();
  const { data: updated, error } = await admin
    .from('products')
    .update({
      slug: data.slug,
      title: data.title,
      description: data.description,
      price: data.price,
      main_image_url: data.main_image_url,
      creem_product_id: data.creem_product_id ?? null,
      cj_vid: data.cj_vid ?? null,
      cj_logistic_name: data.cj_logistic_name ?? null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[storefront/admin] update failed:', error.message);
    return { error: 'Could not update product.' };
  }
  if (!updated) return { error: 'Product no longer exists.' };

  revalidatePath('/shop');
  revalidatePath('/shop/admin');
  revalidatePath(`/products/${data.slug}`);
  redirect('/shop/admin');
}

export async function setStorefrontProductActive(
  id: string,
  active: boolean,
) {
  await requireAdmin();
  if (!UUID_PATTERN.test(id)) {
    redirect('/shop/admin?error=Invalid%20product%20id.');
  }

  const admin = createStorefrontAdminClient();
  const { data: updated, error } = await admin
    .from('products')
    .update({ active })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[storefront/admin] availability update failed:', error.message);
    redirect('/shop/admin?error=Could%20not%20update%20product%20availability.');
  }
  if (!updated) {
    redirect('/shop/admin?error=Product%20no%20longer%20exists.');
  }

  revalidatePath('/shop');
  revalidatePath('/shop/admin');
  redirect('/shop/admin');
}

function ordersError(message: string): never {
  redirect(`/shop/admin/orders?error=${encodeURIComponent(message)}`);
}

async function persistCjOrderDetail(
  orderId: string,
  detail: Awaited<ReturnType<typeof getCjOrder>>,
): Promise<string | null> {
  const now = new Date().toISOString();
  const admin = createStorefrontAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from('orders')
    .select('status, shipped_at, cj_submitted_at')
    .eq('id', orderId)
    .maybeSingle();
  if (lookupError || !existing) {
    return lookupError?.message ?? 'Order no longer exists.';
  }

  const updates: Database['public']['Tables']['orders']['Update'] = {
    cj_fulfillment_order_id: detail.orderId,
    cj_error: null,
    cj_submission_started_at: null,
    cj_submitted_at: existing.cj_submitted_at ?? now,
    cj_last_synced_at: now,
  };
  const cjStatus = detail.subStatus || detail.status;
  if (cjStatus) updates.cj_status = cjStatus;
  if (detail.trackingProvider) {
    updates.cj_tracking_provider = detail.trackingProvider;
  }
  if (detail.trackingUrl) updates.cj_tracking_url = detail.trackingUrl;
  if (detail.requestId) updates.cj_request_id = detail.requestId;
  if (detail.sandbox !== null) updates.cj_sandbox = detail.sandbox;
  if (detail.trackingNumber) {
    updates.tracking_number = detail.trackingNumber;
  }
  const mappedStatus = mapCjOrderStatus(detail.status);
  if (mappedStatus) {
    updates.status = mappedStatus;
    updates.shipped_at = existing.shipped_at ?? now;
  }

  const { error } = await admin
    .from('orders')
    .update(updates)
    .eq('id', orderId);
  return error?.message ?? null;
}

export async function submitStorefrontOrderToCj(id: string) {
  await requireAdmin();
  if (!UUID_PATTERN.test(id)) ordersError('Invalid order id.');
  if (!isCjConfigured()) ordersError('CJ API is not configured.');

  const admin = createStorefrontAdminClient();
  const { data: order, error } = await admin
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !order) ordersError('Order could not be loaded.');
  if (order.status !== 'paid') ordersError('Only paid orders can be sent to CJ.');
  if (order.cj_fulfillment_order_id) {
    redirect('/shop/admin/orders');
  }

  const required = [
    order.cj_vid,
    order.cj_logistic_name,
    order.shipping_email,
    order.shipping_customer_name,
    order.shipping_phone,
    order.shipping_country_code,
    order.shipping_country,
    order.shipping_province,
    order.shipping_city,
    order.shipping_address,
    order.shipping_zip,
  ];
  if (required.some((value) => !value?.trim())) {
    ordersError('CJ product mapping or shipping address is incomplete.');
  }

  if (order.cj_submission_started_at) {
    let recoveredExisting = false;
    let recoveryPersistError: string | null = null;
    try {
      const recovered = await getCjOrder(order.id);
      recoveryPersistError = await persistCjOrderDetail(order.id, recovered);
      recoveredExisting = !recoveryPersistError;
    } catch (recoveryError) {
      if (!isCjOrderNotFound(recoveryError)) {
        ordersError(formatCjError(recoveryError));
      }
      const lockAge =
        Date.now() - new Date(order.cj_submission_started_at).getTime();
      if (lockAge < 2 * 60 * 1000) {
        ordersError('CJ submission is still in progress. Try again shortly.');
      }
      await admin
        .from('orders')
        .update({ cj_submission_started_at: null })
        .eq('id', id)
        .is('cj_fulfillment_order_id', null);
    }
    if (recoveryPersistError) {
      ordersError('CJ order was found but could not be saved.');
    }
    if (recoveredExisting) redirect('/shop/admin/orders');
  }

  const startedAt = new Date().toISOString();
  const { data: locked, error: lockError } = await admin
    .from('orders')
    .update({
      cj_submission_started_at: startedAt,
      cj_error: null,
    })
    .eq('id', id)
    .eq('status', 'paid')
    .is('cj_submission_started_at', null)
    .is('cj_fulfillment_order_id', null)
    .select('id')
    .maybeSingle();
  if (lockError || !locked) {
    ordersError('CJ submission is already in progress.');
  }

  let createdDetail: Awaited<ReturnType<typeof createCjOrder>> | null = null;
  let submissionError: unknown;
  try {
    createdDetail = await createCjOrder({
      orderNumber: order.id,
      vid: order.cj_vid!,
      logisticName: order.cj_logistic_name!,
      createdAt: order.created_at,
      address: {
        customerName: order.shipping_customer_name!,
        phone: order.shipping_phone!,
        countryCode: order.shipping_country_code!,
        country: order.shipping_country!,
        province: order.shipping_province!,
        city: order.shipping_city!,
        county: order.shipping_county ?? undefined,
        address: order.shipping_address!,
        address2: order.shipping_address2 ?? undefined,
        zip: order.shipping_zip!,
        houseNumber: order.shipping_house_number ?? undefined,
        email: order.shipping_email!,
      },
    });
  } catch (error) {
    submissionError = error;
  }

  if (!createdDetail) {
    let recoveredAfterFailure = false;
    let confirmedNotFound = false;
    let reconciliationError: unknown;
    try {
      const recovered = await getCjOrder(order.id);
      const persistError = await persistCjOrderDetail(order.id, recovered);
      recoveredAfterFailure = !persistError;
    } catch (error) {
      confirmedNotFound = isCjOrderNotFound(error);
      if (!confirmedNotFound) reconciliationError = error;
    }
    if (recoveredAfterFailure) redirect('/shop/admin/orders');
    const message = reconciliationError
      ? `CJ create result is unknown; retry is locked to prevent a duplicate. ${formatCjError(reconciliationError)}`
      : formatCjError(submissionError);
    await admin
      .from('orders')
      .update({
        ...(confirmedNotFound ? { cj_submission_started_at: null } : {}),
        cj_error: message,
      })
      .eq('id', order.id)
      .is('cj_fulfillment_order_id', null);
    ordersError(message);
  }

  const persistError = await persistCjOrderDetail(order.id, createdDetail);
  if (persistError) {
    console.error('[storefront/cj] created order persistence failed:', persistError);
    ordersError('CJ order was created but could not be saved. Send again to reconcile it.');
  }

  revalidatePath('/shop/admin/orders');
  redirect('/shop/admin/orders');
}

export async function syncStorefrontCjOrder(id: string) {
  await requireAdmin();
  if (!UUID_PATTERN.test(id)) ordersError('Invalid order id.');

  const admin = createStorefrontAdminClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, cj_fulfillment_order_id')
    .eq('id', id)
    .maybeSingle();
  if (!order?.cj_fulfillment_order_id) {
    ordersError('This order has not been sent to CJ.');
  }

  let detail: Awaited<ReturnType<typeof getCjOrder>>;
  try {
    detail = await getCjOrder(order.cj_fulfillment_order_id);
  } catch (syncError) {
    ordersError(formatCjError(syncError));
  }
  const persistError = await persistCjOrderDetail(order.id, detail);
  if (persistError) ordersError('CJ status could not be saved.');

  revalidatePath('/shop/admin/orders');
  revalidatePath(`/orders/${id}/track`);
  redirect('/shop/admin/orders');
}

export async function markStorefrontOrderShipped(
  id: string,
  formData: FormData,
) {
  await requireAdmin();
  if (!UUID_PATTERN.test(id)) {
    redirect('/shop/admin/orders?error=Invalid%20order%20id.');
  }

  const trackingNumber = String(formData.get('tracking_number') ?? '').trim();
  if (!trackingNumber || trackingNumber.length > 120) {
    redirect(
      '/shop/admin/orders?error=Enter%20a%20valid%20tracking%20number.',
    );
  }

  const admin = createStorefrontAdminClient();
  const { data: updated, error } = await admin
    .from('orders')
    .update({
      status: 'shipped',
      tracking_number: trackingNumber,
      shipped_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'paid')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[storefront/admin] ship order failed:', error.message);
    redirect('/shop/admin/orders?error=Could%20not%20ship%20order.');
  }
  if (!updated) {
    redirect(
      '/shop/admin/orders?error=Order%20is%20not%20eligible%20for%20manual%20shipping.',
    );
  }

  revalidatePath('/shop/admin/orders');
  revalidatePath(`/orders/${id}/track`);
  redirect('/shop/admin/orders');
}
