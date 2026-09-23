'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { isStorefrontAdminIpAllowed, readClientIp } from '@/lib/storefront-admin-cookie';
import {
  clearStorefrontAdminSession,
  createStorefrontAdminSession,
  isStorefrontAdminAuthenticated,
  isStorefrontAdminEnabled,
  verifyStorefrontAdminPassword,
} from '@/lib/storefront-admin-session';
import { headers } from 'next/headers';
import { createStorefrontAdminClient } from '@/lib/supabase/storefront-admin';

const productSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: lowercase letters, numbers, hyphens'),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  price: z.coerce.number().min(0),
  main_image_url: z.string().url(),
  creem_product_id: z.string().optional(),
});

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
  const ip = readClientIp(
    new Request('http://local', { headers: headerStore }),
  );
  if (!isStorefrontAdminIpAllowed(ip)) {
    return { error: 'Access denied from this network.' };
  }

  const password = String(formData.get('password') ?? '');
  if (!verifyStorefrontAdminPassword(password)) {
    return { error: 'Incorrect password.' };
  }

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
  const { error } = await admin
    .from('products')
    .update({
      slug: data.slug,
      title: data.title,
      description: data.description,
      price: data.price,
      main_image_url: data.main_image_url,
      creem_product_id: data.creem_product_id ?? null,
    })
    .eq('id', id);

  if (error) {
    return { error: 'Could not update product.' };
  }

  revalidatePath('/shop');
  revalidatePath('/shop/admin');
  revalidatePath(`/products/${data.slug}`);
  redirect('/shop/admin');
}

export async function deleteStorefrontProduct(id: string) {
  await requireAdmin();
  const admin = createStorefrontAdminClient();
  await admin.from('products').delete().eq('id', id);
  revalidatePath('/shop');
  revalidatePath('/shop/admin');
  redirect('/shop/admin');
}
