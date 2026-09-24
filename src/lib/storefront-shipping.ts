import { z } from 'zod';

import { officialCountryName } from './storefront-countries';
import {
  FULFILLMENT_EMAIL_MAX,
  isValidFulfillmentPhone,
} from './storefront-shipping-rules';

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default('');

export const storefrontShippingSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email('Enter a valid email.')
      .max(FULFILLMENT_EMAIL_MAX, 'Email must be 50 characters or fewer for fulfillment.'),
    customerName: requiredText('Full name', 50),
    phone: requiredText('Phone', 20).refine(
      isValidFulfillmentPhone,
      'Enter a valid phone number.',
    ),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Choose a destination country.'),
    country: optionalText(50),
    province: requiredText('State / province', 50),
    city: requiredText('City', 50),
    county: optionalText(50),
    address: requiredText('Address', 500),
    address2: optionalText(500),
    zip: requiredText('Postal code', 20),
    houseNumber: optionalText(20),
  })
  .strict()
  .transform((value) => ({
    ...value,
    country: officialCountryName(value.countryCode, value.country),
  }))
  .refine((value) => Boolean(value.country), {
    message: 'Choose a destination country.',
    path: ['countryCode'],
  });

export type StorefrontShippingInput = z.output<typeof storefrontShippingSchema>;
