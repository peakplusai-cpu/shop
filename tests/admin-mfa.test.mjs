import assert from 'node:assert/strict';
import test from 'node:test';

import { base32, totpAt } from '../scripts/generate-admin-mfa.mjs';

test('Base32 encodes the RFC 4648 sample', () => {
  assert.equal(base32(Buffer.from('foobar')), 'MZXW6YTBOI');
});

test('HOTP primitive matches RFC 4226 counter 1', () => {
  const secret = Buffer.from('12345678901234567890');
  assert.equal(totpAt(secret, 1), '287082');
});
