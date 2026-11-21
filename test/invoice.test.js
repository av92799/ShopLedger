const test = require('node:test');
const assert = require('node:assert/strict');
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

test('REGRESSION CP4: capped coupon and mixed HSN invoice exactly match checkout', () => {
  const items = [{ price: 2000, qty: 1, hsn: '1006' }, { price: 240, qty: 1, hsn: '0405' }];
  const checkout = pricing.computeTotals(items, 'SAVE10');
  const actual = invoice.computeInvoiceFigures({ items, coupon: 'SAVE10' });
  assert.equal(actual.discount, 150);
  for (const key of ['subtotal', 'discount', 'tax', 'total']) assert.equal(actual[key], checkout[key], key);
  assert.deepEqual(actual.rows.map(row => row.gstPercent), [5, 12]);
});

// CP3 characterizes the already-fixed working tree. These are synthetic fixtures,
// modeled on the workshop examples, not records loaded from the application store.
const cases = [
  { id: 1001, coupon: '', items: [
    { name: '5% staple', price: 90, qty: 1, hsn: '1006' },
    { name: '12% dairy', price: 260, qty: 2, hsn: '0405' }
  ], expected: [610, 0, 66.9, 676.9] },
  { id: 1002, coupon: 'SAVE10', items: [
    { name: '5% staple', price: 640, qty: 1, hsn: '1006' },
    { name: '5% oil', price: 190, qty: 2, hsn: '1512' }
  ], expected: [1020, 102, 45.9, 963.9] },
  { id: 1004, coupon: 'SAVE10', items: [
    { name: '5% bulk oil', price: 1120, qty: 2, hsn: '1508' }
  ], expected: [2240, 150, 104.5, 2194.5] },
  { id: 1008, coupon: '', items: [
    { name: '18% beverage', price: 250, qty: 2, hsn: '0902' }
  ], expected: [500, 0, 90, 590] }
];

for (const order of cases) {
  test(`CURRENT BEHAVIOUR: #${order.id} invoice agrees with checkout (earlier fix retained)`, () => {
    const before = JSON.stringify(order);
    const actual = invoice.computeInvoiceFigures(order);
    const checkout = pricing.computeTotals(order.items, order.coupon);
    const fields = ['subtotal', 'discount', 'tax', 'total'];
    assert.deepEqual(fields.map(k => actual[k]), order.expected);
    assert.deepEqual(fields.map(k => checkout[k]), order.expected);
    assert.equal(Math.round((actual.cgst + actual.sgst) * 100), Math.round(actual.tax * 100));
    assert.equal(Math.round(actual.rows.reduce((s, r) => s + r.lineTax, 0) * 100), Math.round(actual.tax * 100));
    assert.doesNotMatch(invoice.render({ ...order, total: actual.total }), /Accountant Reconciliation Notice/);
    assert.equal(JSON.stringify(order), before);
  });
}

test('CURRENT BEHAVIOUR: explicit zero, fractional and percentage GST rates', () => {
  const items = [0, 0.12, 18].map(gstRate => ({ price: 100, qty: 1, hsn: '1006', gstRate }));
  const result = invoice.computeInvoiceFigures({ items });
  assert.deepEqual(result.rows.map(r => r.gstPercent), [0, 12, 18]);
  assert.equal(result.tax, 30);
  assert.equal(result.total, pricing.computeTotals(items, '').total);
});

test('CURRENT BEHAVIOUR: coupon normalization, eligibility and empty invoice', () => {
  assert.equal(invoice.computeInvoiceFigures({ ...cases[1], coupon: ' save10 ' }).total, 963.9);
  const items = [{ price: 100, qty: 1, hsn: '1006' }];
  for (const coupon of ['SAVE10', 'DIWALI20', 'UNKNOWN']) {
    assert.equal(invoice.computeInvoiceFigures({ items, coupon }).discount, 0);
  }
  assert.equal(invoice.computeInvoiceFigures({ items: [] }).total, 0);
});
