import 'server-only';

import { z } from 'zod';

import {
  isCjProductionLocked,
  parseFreightLogisticNames,
  resolveLogisticName,
  storeOrderTimeSeconds,
} from '@/lib/cj-helpers';

const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const REQUEST_TIMEOUT_MS = 20_000;

const envelopeSchema = z.object({
  code: z.number(),
  result: z.boolean().optional(),
  success: z.boolean().optional(),
  message: z.string().optional(),
  requestId: z.string().optional(),
  data: z.unknown().nullable(),
});

const tokenDataSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiryDate: z.string().optional(),
});

const createOrderDataSchema = z.object({
  orderId: z.coerce.string().min(1),
  orderStatus: z.string().nullish(),
});

const orderDetailSchema = z.object({
  orderId: z.coerce.string().min(1),
  orderStatus: z.string().nullish(),
  subStatus: z.string().nullish(),
  trackNumber: z.string().nullish(),
  trackingProvider: z.string().nullish(),
  trackingUrl: z.string().nullish(),
  isSandbox: z.coerce.number().optional(),
});

export type CjShippingAddress = {
  customerName: string;
  phone: string;
  countryCode: string;
  country: string;
  province: string;
  city: string;
  county?: string;
  address: string;
  address2?: string;
  zip: string;
  houseNumber?: string;
  email: string;
};

export type CjOrderDetail = {
  orderId: string;
  status: string | null;
  subStatus: string | null;
  trackingNumber: string | null;
  trackingProvider: string | null;
  trackingUrl: string | null;
  sandbox: boolean | null;
  requestId: string | null;
};

export class CjApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'CjApiError';
  }
}

let cachedAccessToken:
  | { token: string; expiresAt: number }
  | undefined;
const freightCache = new Map<string, { expiresAt: number; names: string[] }>();

function optionalEnv(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export function isCjSandboxMode(): boolean {
  return optionalEnv('CJ_SANDBOX')?.toLowerCase() !== 'false';
}

export function isCjConfigured(): boolean {
  return Boolean(optionalEnv('CJ_ACCESS_TOKEN') || optionalEnv('CJ_API_KEY'));
}

function assertProductionOptIn(): void {
  if (
    isCjProductionLocked(
      optionalEnv('CJ_SANDBOX'),
      optionalEnv('CJ_PRODUCTION_ENABLED'),
    )
  ) {
    throw new CjApiError(
      'CJ production fulfillment is locked. Set CJ_PRODUCTION_ENABLED=true only after sandbox verification.',
    );
  }
}

async function readEnvelope(response: Response) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CjApiError(`CJ returned invalid JSON (HTTP ${response.status}).`);
  }

  const parsed = envelopeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CjApiError(`CJ returned an unexpected response (HTTP ${response.status}).`);
  }
  const envelope = parsed.data;
  if (
    !response.ok ||
    envelope.code !== 200 ||
    envelope.result === false ||
    envelope.success === false
  ) {
    throw new CjApiError(
      envelope.message || `CJ request failed (HTTP ${response.status}).`,
      envelope.code,
      envelope.requestId,
    );
  }
  return envelope;
}

async function getAccessToken(forceApiKey = false): Promise<string> {
  const configuredToken = optionalEnv('CJ_ACCESS_TOKEN');
  if (configuredToken && !forceApiKey) return configuredToken;

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const apiKey = optionalEnv('CJ_API_KEY');
  if (!apiKey) {
    throw new CjApiError('CJ_ACCESS_TOKEN or CJ_API_KEY is not configured.');
  }

  const response = await fetch(`${CJ_API_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const envelope = await readEnvelope(response);
  const tokenData = tokenDataSchema.safeParse(envelope.data);
  if (!tokenData.success) {
    throw new CjApiError(
      'CJ authentication succeeded without a usable access token.',
      envelope.code,
      envelope.requestId,
    );
  }

  const parsedExpiry = Date.parse(tokenData.data.accessTokenExpiryDate ?? '');
  cachedAccessToken = {
    token: tokenData.data.accessToken,
    expiresAt: Number.isFinite(parsedExpiry)
      ? parsedExpiry
      : Date.now() + 23 * 60 * 60 * 1000,
  };
  return cachedAccessToken.token;
}

async function requestWithToken(
  path: string,
  token: string,
  init?: RequestInit,
) {
  const response = await fetch(`${CJ_API_BASE}${path}`, {
    ...init,
    headers: {
      'CJ-Access-Token': token,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return readEnvelope(response);
}

async function cjFetch(
  path: string,
  init?: RequestInit,
): Promise<Awaited<ReturnType<typeof readEnvelope>>> {
  const token = await getAccessToken();
  try {
    return await requestWithToken(path, token, init);
  } catch (error) {
    if (
      error instanceof CjApiError &&
      error.code === 1600001 &&
      optionalEnv('CJ_API_KEY')
    ) {
      cachedAccessToken = undefined;
      const refreshedToken = await getAccessToken(true);
      return requestWithToken(path, refreshedToken, init);
    }
    throw error;
  }
}

export async function createCjOrder(input: {
  orderNumber: string;
  vid: string;
  logisticName: string;
  address: CjShippingAddress;
  createdAt: string;
}): Promise<CjOrderDetail> {
  assertProductionOptIn();
  const sandbox = isCjSandboxMode();
  const fromCountryCode =
    optionalEnv('CJ_FROM_COUNTRY_CODE')?.toUpperCase() || 'CN';

  const envelope = await cjFetch('/shopping/order/createOrderV3', {
    method: 'POST',
    body: JSON.stringify({
      orderNumber: input.orderNumber,
      shippingZip: input.address.zip,
      shippingCountryCode: input.address.countryCode,
      shippingCountry: input.address.country,
      shippingProvince: input.address.province,
      shippingCity: input.address.city,
      shippingCounty: input.address.county || '',
      shippingPhone: input.address.phone,
      shippingCustomerName: input.address.customerName,
      shippingAddress: input.address.address,
      shippingAddress2: input.address.address2 || '',
      houseNumber: input.address.houseNumber || '',
      email: input.address.email,
      logisticName: input.logisticName,
      fromCountryCode,
      platform: 'Api',
      storeName: optionalEnv('CJ_STORE_NAME') || undefined,
      storeOrderTime: storeOrderTimeSeconds(input.createdAt),
      shopLogisticsType: 2,
      orderFlow: 1,
      payType: 3,
      isSandbox: sandbox ? 1 : 0,
      products: [
        {
          vid: input.vid,
          quantity: 1,
          storeLineItemId: input.orderNumber,
        },
      ],
    }),
  });
  const data = createOrderDataSchema.safeParse(envelope.data);
  if (!data.success) {
    throw new CjApiError(
      'CJ created the order but returned no order ID.',
      envelope.code,
      envelope.requestId,
    );
  }
  return {
    orderId: data.data.orderId,
    status: data.data.orderStatus ?? null,
    subStatus: null,
    trackingNumber: null,
    trackingProvider: null,
    trackingUrl: null,
    sandbox,
    requestId: envelope.requestId ?? null,
  };
}

export async function getCjOrder(orderId: string): Promise<CjOrderDetail> {
  const envelope = await cjFetch(
    `/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`,
  );
  const data = orderDetailSchema.safeParse(envelope.data);
  if (!data.success) {
    throw new CjApiError(
      'CJ returned an order response without a usable order ID.',
      envelope.code,
      envelope.requestId,
    );
  }
  return {
    orderId: data.data.orderId,
    status: data.data.orderStatus ?? null,
    subStatus: data.data.subStatus ?? null,
    trackingNumber: data.data.trackNumber || null,
    trackingProvider: data.data.trackingProvider || null,
    trackingUrl: data.data.trackingUrl || null,
    sandbox:
      data.data.isSandbox === undefined
        ? null
        : data.data.isSandbox === 1,
    requestId: envelope.requestId ?? null,
  };
}

export async function resolveCjLogisticName(input: {
  vid: string;
  logisticName: string;
  countryCode: string;
  zip: string;
  houseNumber?: string;
}): Promise<string | null> {
  const fromCountryCode =
    optionalEnv('CJ_FROM_COUNTRY_CODE')?.toUpperCase() || 'CN';
  const cacheKey = [
    fromCountryCode,
    input.countryCode,
    input.zip,
    input.vid,
  ].join(':');
  const cached = freightCache.get(cacheKey);
  let names: string[];

  if (cached && cached.expiresAt > Date.now()) {
    names = cached.names;
  } else {
    const envelope = await cjFetch('/logistic/freightCalculate', {
      method: 'POST',
      body: JSON.stringify({
        startCountryCode: fromCountryCode,
        endCountryCode: input.countryCode,
        zip: input.zip,
        houseNumber: input.houseNumber || '',
        shippingMode: 2,
        products: [{ quantity: 1, vid: input.vid }],
      }),
    });
    const namesFromApi = parseFreightLogisticNames(envelope.data);
    if (!namesFromApi) {
      throw new CjApiError(
        'CJ returned an invalid freight response.',
        envelope.code,
        envelope.requestId,
      );
    }
    names = namesFromApi;
    freightCache.set(cacheKey, {
      names,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
  }

  return resolveLogisticName(names, input.logisticName);
}

export function isCjOrderNotFound(error: unknown): boolean {
  return (
    error instanceof CjApiError &&
    (error.code === 1603100 ||
      (error.code === 1600300 &&
        error.message.toLowerCase().includes('order not found')))
  );
}

export function formatCjError(error: unknown): string {
  if (error instanceof CjApiError) {
    return [error.message, error.requestId ? `Request ${error.requestId}` : null]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 500);
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'CJ request timed out.';
  }
  return 'CJ request failed.';
}
