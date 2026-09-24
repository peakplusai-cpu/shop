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
      '/shop/admin/orders?error=Only%20paid%20orders%20can%20be%20shipped.',
    );
  }

  revalidatePath('/shop/admin/orders');
  revalidatePath(`/orders/${id}/track`);
  redirect('/shop/admin/orders');
}
