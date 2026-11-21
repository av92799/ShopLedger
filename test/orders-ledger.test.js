const test = require('node:test');
const assert = require('node:assert/strict');
const orders = require('../lib/orders');
const dates = require('../lib/dates');
const ledger = require('../lib/ledger');

test('REGRESSION CP4 review: overflowing settlement is rejected without mutation', () => {
  const db = account();
  const before = JSON.stringify(db);
  assert.equal(ledger.recordSettlement(db, 1, '1e308').ok, false);
  assert.equal(JSON.stringify(db), before);
});

test('REGRESSION CP4: newest-first history and string settlement preserve correct balance', () => {
  assert.deepEqual(orders.list(history()).map(o => o.id), [1008, 1004, 1001]);
  assert.deepEqual(orders.list(history(), { from: '2022-01-01', to: '2022-03-15' }).map(o => o.id), [1008, 1004]);
  const result = ledger.recordSettlement(account(), 1, '500');
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
});

// Synthetic, fresh in-memory data only; never call store or load business data.
function history() {
  return { orders: [
    { id: 1004, date: '30/01/2022', customer: 'Example A', coupon: 'SAVE10' },
    { id: 1001, date: '28/12/2021', customer: 'Example B' },
    { id: 1008, date: '15/03/2022', customer: 'Example C', status: 'pending' }
  ] };
}
function account() {
  return { nextSettlementId: 501, settlements: [], customers: [
    { id: 1, name: 'Meera fixture', openingBalance: 450, totalBilled: 1982.01,
      totalSettled: 1200, balance: 1232.01 }
  ] };
}

test('CURRENT BEHAVIOUR: mixed dates sort newest first without modifying input', () => {
  const db = history();
  const before = JSON.stringify(db);
  assert.deepEqual(orders.list(db).map(o => o.id), [1008, 1004, 1001]);
  assert.equal(JSON.stringify(db), before);
  assert.deepEqual(orders.list(db, { search: 'save10', status: 'completed' }).map(o => o.id), [1004]);
  assert.deepEqual(orders.list(db, { status: 'pending' }).map(o => o.id), [1008]);
});

test('CURRENT BEHAVIOUR: ISO date-picker filters use inclusive calendar boundaries', () => {
  const db = history();
  assert.deepEqual(orders.list(db, { from: '2022-01-01', to: '2022-03-15' }).map(o => o.id), [1008, 1004]);
  assert.deepEqual(orders.list(db, { from: '2022-01-30', to: '2022-01-30' }).map(o => o.id), [1004]);
  assert.deepEqual(orders.list(db, { to: '2021-12-28' }).map(o => o.id), [1001]);
  assert.deepEqual(orders.list(db, { from: '15/03/2022' }).map(o => o.id), [1008]);
  assert.equal(orders.list(db, { from: '2022-03-15', to: '2022-01-01' }).length, 0);
});

test('CURRENT BEHAVIOUR: date keys validate dates and fiscal-year boundaries', () => {
  assert.equal(dates.normalizeDateKey('15/03/2022'), '2022-03-15');
  assert.equal(dates.normalizeDateKey(' 5/1/2022 '), '2022-01-05');
  assert.equal(dates.normalizeDateKey('2024-02-29'), '2024-02-29');
  for (const value of ['', 'bad', '31/02/2022', '29/02/2023', '2022-13-01']) {
    assert.equal(dates.normalizeDateKey(value), '');
  }
  assert.equal(dates.getFiscalYear('31/03/2022'), 'FY21-22');
  assert.equal(dates.getFiscalYear('2022-04-01'), 'FY22-23');
});

test('CURRENT BEHAVIOUR: invalid stored dates sort last and are excluded by date filters', () => {
  const db = { orders: [{ id: 1, date: 'bad' }, { id: 2, date: '01/01/2022' }, { id: 3, date: '2022-01-01' }] };
  assert.deepEqual(orders.list(db).map(o => o.id), [2, 3, 1]);
  assert.deepEqual(orders.list(db, { to: '2022-01-01' }).map(o => o.id), [2, 3]);
  assert.deepEqual(orders.list(db, { from: 'invalid' }), []);
});

for (const amount of [500, '500']) {
  test(`CURRENT BEHAVIOUR: ${typeof amount} 500 settlement gives 1700 settled and 732.01 due`, () => {
    const db = account();
    const result = ledger.recordSettlement(db, 1, amount, 'upi', 'CP3');
    assert.equal(result.ok, true);
    assert.equal(result.customer.totalSettled, 1700);
    assert.equal(result.customer.balance, 732.01);
    assert.equal(result.settlement.amount, 500);
    assert.equal(db.nextSettlementId, 502);
    assert.equal(db.settlements.length, 1);
    assert.equal(ledger.listCustomers(db)[0].balance, 732.01);
  });
}

test('CURRENT BEHAVIOUR: zero, negative and non-numeric settlements fail without mutation', () => {
  for (const amount of [0, -500, 'abc', '500abc', '', ' ', undefined, null, NaN, Infinity, 'Infinity', true, [], {}, '0.001']) {
    const db = account();
    const before = JSON.stringify(db);
    assert.equal(ledger.recordSettlement(db, 1, amount).ok, false, String(amount));
    assert.equal(JSON.stringify(db), before);
  }
  assert.equal(ledger.recordSettlement(account(), 999, 500).ok, false);
});

test('CURRENT BEHAVIOUR: decimal settlements accumulate without string concatenation', () => {
  const db = account();
  db.customers[0].totalSettled = '1200';
  assert.equal(ledger.recordSettlement(db, 1, '0.10').customer.totalSettled, 1200.1);
  assert.equal(ledger.recordSettlement(db, 1, '0.20').customer.totalSettled, 1200.3);
});
