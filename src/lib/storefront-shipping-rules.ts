export const FULFILLMENT_EMAIL_MAX = 50;

export function isValidFulfillmentPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 6;
}
