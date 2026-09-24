import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countryNameForCode,
  officialCountryName,
} from '../src/lib/storefront-countries.ts';
import {
  FULFILLMENT_EMAIL_MAX,
  isValidFulfillmentPhone,
} from '../src/lib/storefront-shipping-rules.ts';

test('maps known ISO country codes for CJ', () => {
  assert.equal(countryNameForCode('tw'), 'Taiwan');
  assert.equal(countryNameForCode('US'), 'United States');
  assert.equal(countryNameForCode('ZZ'), null);
  assert.equal(officialCountryName('us', 'Ignored'), 'United States');
  assert.equal(officialCountryName('ZZ', 'Custom'), 'Custom');
});

test('keeps emails inside the CJ field limit', () => {
  assert.equal(FULFILLMENT_EMAIL_MAX, 50);
  assert.ok('buyer@example.com'.length <= FULFILLMENT_EMAIL_MAX);
  assert.ok(`${'a'.repeat(40)}@example.com`.length > FULFILLMENT_EMAIL_MAX);
});

test('requires a usable phone number', () => {
  assert.equal(isValidFulfillmentPhone('+12025550123'), true);
  assert.equal(isValidFulfillmentPhone('12-34'), false);
});
