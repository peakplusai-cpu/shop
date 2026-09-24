import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isCjProductionLocked,
  mapCjOrderStatus,
  parseFreightLogisticNames,
  resolveLogisticName,
  storeOrderTimeSeconds,
} from '../src/lib/cj-helpers.ts';

test('resolves logistics names without case or spacing noise', () => {
  assert.equal(
    resolveLogisticName(
      ['CJPacket Ordinary', 'YunExpress'],
      'cjpacket   ordinary',
    ),
    'CJPacket Ordinary',
  );
  assert.equal(resolveLogisticName(['YunExpress'], 'PostNL'), null);
});

test('parses freight arrays and list wrappers', () => {
  assert.deepEqual(
    parseFreightLogisticNames([{ logisticName: 'USPS+' }, { logisticName: '' }]),
    ['USPS+'],
  );
  assert.deepEqual(
    parseFreightLogisticNames({ list: [{ logisticName: ' PostNL ' }] }),
    ['PostNL'],
  );
  assert.equal(parseFreightLogisticNames({ unexpected: true }), null);
});

test('never sends a future store order timestamp', () => {
  const now = Date.parse('2026-09-24T02:00:00.000Z');
  assert.equal(
    storeOrderTimeSeconds('2026-09-24T03:00:00.000Z', now),
    Math.floor(now / 1000),
  );
  assert.equal(
    storeOrderTimeSeconds('2026-09-24T01:00:00.000Z', now),
    Math.floor(Date.parse('2026-09-24T01:00:00.000Z') / 1000),
  );
});

test('locks production until both flags are set', () => {
  assert.equal(isCjProductionLocked(undefined, undefined), false);
  assert.equal(isCjProductionLocked('true', undefined), false);
  assert.equal(isCjProductionLocked('false', undefined), true);
  assert.equal(isCjProductionLocked('false', 'true'), false);
});

test('maps only terminal CJ statuses onto shop fulfillment', () => {
  assert.equal(mapCjOrderStatus('CREATED'), null);
  assert.equal(mapCjOrderStatus('SHIPPED'), 'shipped');
  assert.equal(mapCjOrderStatus('DELIVERED'), 'delivered');
});
