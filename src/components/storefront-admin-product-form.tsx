'use client';

import { useState } from 'react';

type StorefrontAdminProductFormProps = {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel: string;
  initial?: {
    slug: string;
    title: string;
    description: string;
    price: number;
    main_image_url: string;
    creem_product_id: string | null;
  };
};

const inputClass =
  'w-full border-[0.5px] border-zinc-800 bg-black px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[#D4AF37]/50';

export function StorefrontAdminProductForm({
  action,
  submitLabel,
  initial,
}: StorefrontAdminProductFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Field label="Slug (URL)" name="slug" defaultValue={initial?.slug} placeholder="my-product-name" />
      <Field label="Title" name="title" defaultValue={initial?.title} />
      <label className="block">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Description</span>
        <textarea
          name="description"
          rows={5}
          defaultValue={initial?.description}
          className={`${inputClass} mt-2 resize-y`}
          required
        />
      </label>
      <Field
        label="Price (USD)"
        name="price"
        type="number"
        step="0.01"
        defaultValue={initial?.price?.toString()}
      />
      <Field
        label="Image URL"
        name="main_image_url"
        defaultValue={initial?.main_image_url}
        placeholder="https://..."
      />
      <Field
        label="Creem product id (prod_…)"
        name="creem_product_id"
        defaultValue={initial?.creem_product_id ?? ''}
        placeholder="Optional if set in env"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="border-[0.5px] border-[#D4AF37] px-6 py-2.5 text-[10px] uppercase tracking-[0.24em] text-[#E4C85B] hover:bg-[#D4AF37] hover:text-black disabled:opacity-50"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? 'text'}
        step={props.step}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        required={props.name !== 'creem_product_id'}
        className={`${inputClass} mt-2`}
      />
    </label>
  );
}
