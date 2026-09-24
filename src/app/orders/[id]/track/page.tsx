import type { Metadata } from 'next';
import { Check, PackageCheck, Plane, Truck } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { ComponentType } from 'react';

import { OrderLiveRefresh } from '@/components/order-live-refresh';
import { addBusinessDays, getOrderById } from '@/lib/storefront';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private Order Tracking',
  description: 'Securely track the progress of your order.',
  robots: { index: false, follow: false },
};

type TrackingPageProps = {
  params: Promise<{ id: string }>;
};

type TimelineStep = {
  label: string;
  detail?: string;
  state: 'complete' | 'current' | 'upcoming';
  icon: ComponentType<{ className?: string }>;
};

function timelineForStatus(
  status: 'pending' | 'paid' | 'shipped' | 'delivered',
  carrier: string | null,
): TimelineStep[] {
  if (status === 'delivered') {
    return [
      { label: 'Order Confirmed', state: 'complete', icon: Check },
      { label: 'Processed', state: 'complete', icon: PackageCheck },
      {
        label: 'In Transit',
        detail: carrier || 'Carrier shipment',
        state: 'complete',
        icon: Plane,
      },
      { label: 'Delivered', state: 'complete', icon: Truck },
    ];
  }

  if (status === 'shipped') {
    return [
      { label: 'Order Confirmed', state: 'complete', icon: Check },
      { label: 'Processed', state: 'complete', icon: PackageCheck },
      {
        label: 'In Transit to Destination Country',
        detail: carrier || 'Carrier shipment',
        state: 'current',
        icon: Plane,
      },
      { label: 'Out for Delivery', state: 'upcoming', icon: Truck },
    ];
  }

  if (status === 'paid') {
    return [
      { label: 'Order Confirmed', state: 'complete', icon: Check },
      {
        label: 'Preparing / Processing',
        detail: 'Your piece is being prepared for dispatch.',
        state: 'current',
        icon: PackageCheck,
      },
    ];
  }

  return [
    {
      label: 'Awaiting Payment Confirmation',
      detail: 'This page will update automatically after checkout.',
      state: 'current',
      icon: Check,
    },
  ];
}

export default async function TrackingPage({ params }: TrackingPageProps) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const steps = timelineForStatus(
    order.status,
    order.cj_tracking_provider || order.cj_logistic_name,
  );
  const trackingUrl = safeTrackingUrl(order.cj_tracking_url);
  const fulfillmentStartedAt =
    order.shipped_at ?? order.paid_at ?? order.created_at;
  const estimatedDelivery = addBusinessDays(
    new Date(fulfillmentStartedAt),
    order.status === 'shipped' || order.status === 'delivered' ? 7 : 10,
  ).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-12 text-zinc-50 sm:px-8 sm:py-20">
      <OrderLiveRefresh />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.09),transparent_38%)]"
      />

      <div className="relative mx-auto max-w-3xl">
        <header className="text-center">
          <p className="text-[9px] font-medium uppercase tracking-[0.45em] text-[#D4AF37]">
            Private Client Service
          </p>
          <h1 className="mt-7 font-serif text-4xl font-light tracking-[-0.02em] text-white sm:text-5xl">
            Your order&apos;s journey
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-sm font-light leading-6 text-stone-500">
            A discreet, live view of your order from confirmation to arrival.
          </p>
        </header>

        <section className="mt-14 border-[0.5px] border-[#D4AF37]/45 bg-zinc-950/45 p-7 backdrop-blur sm:mt-20 sm:p-12">
          <div className="flex flex-col justify-between gap-5 border-b-[0.5px] border-[#D4AF37]/20 pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600">
                Order reference
              </p>
              <p className="mt-2 font-mono text-xs tracking-[0.08em] text-stone-300">
                {order.id}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600">
                Current status
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">
                {order.status === 'delivered'
                  ? 'Delivered'
                  : order.status === 'shipped'
                  ? 'In transit'
                  : order.status === 'paid'
                    ? 'Processing'
                    : 'Pending'}
              </p>
            </div>
          </div>

          <ol className="mt-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = step.state !== 'upcoming';
              const isLast = index === steps.length - 1;

              return (
                <li
                  key={step.label}
                  className="relative grid grid-cols-[2.25rem_1fr] gap-5 pb-10 last:pb-0"
                >
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[17px] top-9 h-[calc(100%-1.4rem)] w-px ${
                        step.state === 'complete'
                          ? 'bg-[#D4AF37]'
                          : 'bg-zinc-800'
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-[0.5px] ${
                      active
                        ? 'border-[#D4AF37] bg-black text-[#D4AF37]'
                        : 'border-zinc-800 bg-black text-zinc-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="pt-1">
                    <p
                      className={`text-sm tracking-[0.04em] ${
                        active ? 'text-zinc-100' : 'text-zinc-600'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.detail && (
                      <p
                        className={`mt-2 text-xs font-light ${
                          active ? 'text-stone-500' : 'text-zinc-700'
                        }`}
                      >
                        {step.detail}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {(order.status === 'shipped' || order.status === 'delivered') &&
            order.tracking_number && (
            <div className="mt-10 border-t-[0.5px] border-[#D4AF37]/20 pt-7">
              <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-600">
                Carrier tracking number
              </p>
              <p className="mt-2 font-mono text-sm tracking-[0.12em] text-zinc-200">
                {order.tracking_number}
              </p>
              {trackingUrl && (
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]"
                >
                  Open carrier tracking
                </a>
              )}
            </div>
          )}
        </section>

        <div className="mt-9 text-center">
          <p className="text-[9px] uppercase tracking-[0.32em] text-zinc-600">
            Estimated delivery
          </p>
          <p className="mt-3 font-serif text-lg italic text-[#D4AF37]">
            {estimatedDelivery}
          </p>
          <p className="mt-4 text-[10px] tracking-[0.12em] text-zinc-700">
            Updates refresh automatically every 30 seconds.
          </p>
        </div>
      </div>
    </main>
  );
}

function safeTrackingUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
