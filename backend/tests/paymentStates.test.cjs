// Desde backend: node --test tests/paymentStates.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.join(__dirname, '../src/domain/paymentStates.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUnderTest = { exports: {} };
// Un import de SDK en tiempo de ejecución, Supabase o dotenv haría fallar la carga.
vm.runInNewContext(compiled, {
  module: moduleUnderTest, exports: moduleUnderTest.exports,
  require(name) { throw new Error(`Domain must not load runtime dependencies: ${name}`); },
}, { filename });
const { parseClpAmount, normalizePayment, transitionPayment, summarizePayments } = moduleUnderTest.exports;
const context = Object.freeze({ orderId: 'synthetic-order', totalClp: 20000 });
const raw = (overrides = {}) => ({
  id: 101, external_reference: context.orderId, currency_id: 'CLP',
  status: 'approved', status_detail: 'accredited',
  transaction_amount: 20000, transaction_amount_refunded: 0, refunds: [],
  date_last_updated: '2026-10-25T12:00:00Z', ...overrides,
});
const refund = (id, amount, overrides = {}) => ({
  id, payment_id: 101, amount, status: 'approved', ...overrides,
});
const snapshot = input => {
  const result = normalizePayment(input, context);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.payment;
};
const partial = (extra = {}) => raw({
  status_detail: 'partially_refunded', transaction_amount_refunded: 5000,
  refunds: [refund(201, 5000)], ...extra,
});
const totalRefund = () => raw({
  status: 'refunded', status_detail: 'refunded', transaction_amount_refunded: 20000,
  refunds: [refund(201, 20000)],
});
const plain = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

for (const [value, expected] of [[0, 0], [20000, 20000], ['20000', 20000], ['20000.00', 20000],
  ['0.0', 0], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]]) {
  test(`CLP parses ${JSON.stringify(value)} exactly`, () => assert.equal(parseClpAmount(value), expected));
}
for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, true,
  '', ' ', '20.000', '20,000', '20000.01', '1e4', '-1', ' 20000', '020000', '9007199254740992']) {
  test(`CLP rejects ${String(value)} (${typeof value}) without rounding/coercion`, () => {
    assert.equal(parseClpAmount(value), null);
  });
}

for (const [provider, detail, expected] of [
  ['pending', 'pending_waiting_transfer', 'pendiente'],
  ['in_process', 'pending_review_manual', 'en_proceso'],
  ['authorized', 'pending_capture', 'autorizado'],
  ['approved', 'accredited', 'aprobado'],
  ['rejected', 'cc_rejected_insufficient_amount', 'rechazado'],
  ['cancelled', 'expired', 'cancelado'],
  ['in_mediation', 'pending', 'en_disputa'],
  ['charged_back', 'in_process', 'contracargo'],
]) {
  test(`Payments API ${provider} maps to ${expected} with original detail/identity`, () => {
    const payment = snapshot(raw({ status: provider, status_detail: detail }));
    assert.equal(payment.state, expected);
    assert.equal(payment.providerStatus, provider);
    assert.equal(payment.providerStatusDetail, detail);
    assert.equal(payment.paymentId, '101');
    assert.equal(payment.providerUpdatedAt, '2026-10-25T12:00:00Z');
  });
}
test('full refund is represented financially without inventing an order operation', () => {
  const payment = snapshot(totalRefund());
  assert.equal(payment.state, 'reembolsado');
  assert.equal(payment.amountClp, 20000);
  assert.equal(payment.refundedClp, 20000);
  assert.equal(payment.refunds[0].refundId, '201');
});
test('multiple partial refunds preserve each ID, original amount and confirmed cumulative amount', () => {
  const payment = snapshot(partial({ refunds: [refund(201, 2000), refund(202, 3000)] }));
  assert.equal(payment.state, 'parcialmente_reembolsado');
  assert.equal(payment.amountClp, 20000);
  assert.equal(payment.refundedClp, 5000);
  assert.equal(payment.amountClp - payment.refundedClp, 15000);
  assert.deepEqual(plain(payment.refunds).map(r => r.refundId), ['201', '202']);
});
test('numeric strings keep exact monetary values and large string transaction IDs', () => {
  const payment = snapshot(raw({ id: '9007199254740993', transaction_amount: '20000.00', transaction_amount_refunded: '0' }));
  assert.equal(payment.paymentId, '9007199254740993');
  assert.equal(payment.amountClp, 20000);
});

for (const invalid of [null, undefined, [], 'payment']) {
  test(`invalid payment container ${JSON.stringify(invalid)} fails safely`, () => {
    const result = normalizePayment(invalid, context);
    assert.equal(result.ok, false);
    assert.equal(result.issue, 'invalid_payment');
  });
}
for (const invalid of [null, { orderId: '', totalClp: 20000 },
  { ...context, totalClp: 0 }, { ...context, totalClp: 20000.5 }]) {
  test(`invalid order context ${JSON.stringify(invalid)} fails safely`, () => {
    const result = normalizePayment(raw(), invalid);
    assert.equal(result.ok, false);
    assert.equal(result.issue, 'invalid_context');
  });
}

for (const status of ['new_provider_status', 'processed', 'canceled', 'partially_refunded', 'APPROVED', '__proto__', null, undefined]) {
  test(`unknown/Orders API status ${String(status)} preserves the previous valid payment for review`, () => {
    const previous = freeze(snapshot(raw()));
    const decision = transitionPayment(previous, normalizePayment(raw({ status }), context));
    assert.equal(decision.accepted, false);
    assert.equal(decision.issue, 'unknown_status');
    assert.equal(decision.payment, previous);
    assert.equal(decision.observation.paymentId, '101');
    assert.equal(decision.observation.providerStatus, status ?? null);
  });
}

for (const [name, overrides, issue] of [
  ['unsafe numeric payment ID', { id: Number.MAX_SAFE_INTEGER + 1 }, 'invalid_id'],
  ['missing payment ID', { id: undefined }, 'invalid_id'],
  ['Orders API identifier', { id: 'ORD123' }, 'invalid_id'],
  ['another order', { external_reference: 'other-order' }, 'reference_mismatch'],
  ['another currency', { currency_id: 'USD' }, 'currency_mismatch'],
  ['missing amount', { transaction_amount: undefined }, 'invalid_amount'],
  ['zero amount', { transaction_amount: 0 }, 'invalid_amount'],
  ['amount different from the order', { transaction_amount: 19999 }, 'amount_mismatch'],
  ['fractional pesos', { transaction_amount: 20000.5 }, 'invalid_amount'],
  ['missing refund cumulative', { transaction_amount_refunded: undefined }, 'invalid_refunded_amount'],
  ['negative refunded amount', { transaction_amount_refunded: -1 }, 'invalid_refunded_amount'],
  ['excessive refunded amount', { transaction_amount_refunded: 20001 }, 'invalid_refunded_amount'],
  ['partial detail without a refund', { status_detail: 'partially_refunded' }, 'inconsistent_refund_state'],
  ['partial marked as total', { status: 'refunded', status_detail: 'refunded', transaction_amount_refunded: 5000 }, 'inconsistent_refund_state'],
  ['total refund still marked approved', { transaction_amount_refunded: 20000 }, 'inconsistent_refund_state'],
  ['refunded detail on approved status', { status_detail: 'refunded' }, 'inconsistent_refund_state'],
  ['bad timestamp', { date_last_updated: 'not-a-date' }, 'invalid_timestamp'],
  ['bad refund container', { refunds: {} }, 'invalid_refund'],
]) {
  test(`invalid observation: ${name}`, () => {
    const result = normalizePayment(raw(overrides), context);
    assert.equal(result.ok, false);
    assert.equal(result.issue, issue);
  });
}

for (const [name, refunds, issue] of [
  ['missing individual refunds', [], 'refund_total_mismatch'],
  ['missing refund ID', [refund(undefined, 5000)], 'invalid_refund'],
  ['another payment', [refund(201, 5000, { payment_id: 102 })], 'invalid_refund'],
  ['duplicate refund', [refund(201, 2500), refund(201, 2500)], 'duplicate_refund'],
  ['mismatching cumulative', [refund(201, 4000)], 'refund_total_mismatch'],
  ['invalid amount', [refund(201, 0)], 'invalid_refund'],
  ['missing status', [refund(201, 5000, { status: undefined })], 'invalid_refund'],
]) {
  test(`refund integrity: ${name}`, () => {
    const result = normalizePayment(partial({ refunds }), context);
    assert.equal(result.ok, false);
    assert.equal(result.issue, issue);
  });
}
test('a pending refund is traced, needs review and does not count as returned money', () => {
  const payment = snapshot(raw({ refunds: [refund(201, 5000, { status: 'in_process' })] }));
  assert.equal(payment.state, 'aprobado');
  assert.equal(payment.refundedClp, 0);
  assert.equal(payment.refunds[0].providerStatus, 'in_process');
  assert.equal(payment.requiresReview, true);
  assert.equal(summarizePayments([payment], context, { verified: true }).canStartPreparation, false);
});
test('an unfamiliar approved detail is retained for review, not silently released for preparation', () => {
  const payment = snapshot(raw({ status_detail: 'new_detail' }));
  assert.equal(payment.requiresReview, true);
  assert.equal(payment.providerStatusDetail, 'new_detail');
  assert.equal(summarizePayments([payment], context, { verified: true }).canStartPreparation, false);
});
test('unknown refund status is preserved for review rather than counted as approved', () => {
  const payment = snapshot(raw({ refunds: [refund(201, 5000, { status: 'new_status' })] }));
  assert.equal(payment.requiresReview, true);
  assert.equal(payment.refundedClp, 0);
  assert.equal(payment.refunds[0].providerStatus, 'new_status');
});

for (const [oldStatus, newStatus] of [
  ['pending', 'in_process'], ['pending', 'authorized'], ['pending', 'approved'],
  ['in_process', 'approved'], ['authorized', 'approved'], ['authorized', 'cancelled'],
  ['pending', 'rejected'], ['in_process', 'cancelled'],
]) {
  test(`explicit transition ${oldStatus} -> ${newStatus}`, () => {
    const previous = snapshot(raw({ status: oldStatus }));
    const decision = transitionPayment(previous, normalizePayment(raw({ status: newStatus }), context));
    assert.equal(decision.accepted, true);
    assert.equal(decision.payment.providerStatus, newStatus);
  });
}
for (const [oldStatus, newStatus] of [
  ['approved', 'rejected'], ['approved', 'cancelled'], ['approved', 'pending'],
  ['approved', 'authorized'], ['rejected', 'approved'], ['cancelled', 'approved'],
]) {
  test(`unsafe transition ${oldStatus} -> ${newStatus} keeps previous state`, () => {
    const previous = snapshot(raw({ status: oldStatus }));
    const decision = transitionPayment(previous, normalizePayment(raw({ status: newStatus }), context));
    assert.equal(decision.accepted, false);
    assert.equal(decision.issue, 'unexpected_transition');
    assert.equal(decision.payment, previous);
  });
}
test('an observation cannot overwrite a different transaction', () => {
  const previous = snapshot(raw());
  const decision = transitionPayment(previous, normalizePayment(raw({ id: 102 }), context));
  assert.equal(decision.accepted, false);
  assert.equal(decision.issue, 'transaction_mismatch');
  assert.equal(decision.payment.paymentId, '101');
  assert.equal(decision.observation.paymentId, '102');
});
test('first observation can be refunded without synthesizing an earlier sale', () => {
  const result = transitionPayment(null, normalizePayment(totalRefund(), context));
  assert.equal(result.accepted, true);
  assert.equal(result.payment.state, 'reembolsado');
});

test('an approved transaction can become partially or fully refunded without order effects', () => {
  const approved = snapshot(raw());
  for (const input of [partial(), totalRefund()]) {
    const decision = transitionPayment(approved, normalizePayment(input, context));
    assert.equal(decision.accepted, true);
    assert.equal(summarizePayments([decision.payment], context, { verified: true }).canStartPreparation, false);
  }
});

test('a skipped financial stage is retained as an observation for reconciliation', () => {
  const pending = snapshot(raw({ status: 'pending' }));
  const result = transitionPayment(pending, normalizePayment(totalRefund(), context));
  assert.equal(result.accepted, false);
  assert.equal(result.issue, 'unexpected_transition');
  assert.equal(result.payment, pending);
  assert.equal(result.observation.providerStatus, 'refunded');
});
test('partial refund growth replaces a cumulative snapshot; repetition never adds money again', () => {
  const previous = freeze(snapshot(partial()));
  const input = freeze(partial({ transaction_amount_refunded: 8000, refunds: [refund(201, 5000), refund(202, 3000)] }));
  const candidate = normalizePayment(input, context);
  const first = transitionPayment(previous, candidate);
  const repeated = transitionPayment(first.payment, candidate);
  assert.equal(first.accepted, true);
  assert.equal(repeated.accepted, true);
  assert.equal(repeated.payment.refundedClp, 8000);
  assert.equal(repeated.payment.refunds.length, 2);
  assert.equal(previous.refundedClp, 5000);
});
test('partial refund can complete to total while preserving individual refunds', () => {
  const previous = snapshot(partial());
  const result = transitionPayment(previous, normalizePayment(raw({
    status: 'refunded', status_detail: 'refunded', transaction_amount_refunded: 20000,
    refunds: [refund(201, 5000), refund(202, 15000)],
  }), context));
  assert.equal(result.accepted, true);
  assert.equal(result.payment.state, 'reembolsado');
});
test('refund regression preserves confirmed money and IDs', () => {
  const previous = snapshot(partial());
  const result = transitionPayment(previous, normalizePayment(raw(), context));
  assert.equal(result.accepted, false);
  assert.equal(result.issue, 'refund_regression');
  assert.equal(result.payment, previous);
});
test('replacing an existing refund ID is rejected even if the total is unchanged', () => {
  const previous = snapshot(partial());
  const result = transitionPayment(previous, normalizePayment(partial({ refunds: [refund(202, 5000)] }), context));
  assert.equal(result.accepted, false);
  assert.equal(result.issue, 'refund_history_changed');
});
test('dispute resolution preserves earlier partial refunds', () => {
  const previous = snapshot(partial());
  const disputed = transitionPayment(previous, normalizePayment(partial({ status: 'in_mediation', status_detail: 'pending' }), context));
  assert.equal(disputed.accepted, true);
  assert.equal(disputed.payment.state, 'en_disputa');
  const resolved = transitionPayment(disputed.payment, normalizePayment(partial(), context));
  assert.equal(resolved.accepted, true);
  assert.equal(resolved.payment.state, 'parcialmente_reembolsado');
  assert.equal(resolved.payment.refundedClp, 5000);
});
for (const detail of ['in_process', 'settled', 'reimbursed']) {
  test(`chargeback detail ${detail} remains traced and requires manual review`, () => {
    const payment = snapshot(raw({ status: 'charged_back', status_detail: detail }));
    const summary = summarizePayments([payment], context, { verified: true });
    assert.equal(payment.providerStatusDetail, detail);
    assert.equal(summary.status, 'contracargo');
    assert.equal(summary.requiresReview, true);
    assert.equal(summary.canStartPreparation, false);
  });
}

for (const status of ['rejected', 'cancelled', 'pending']) {
  test(`another ${status} attempt cannot undo an approved payment`, () => {
    const approved = freeze(snapshot(raw()));
    const other = freeze(snapshot(raw({ id: 102, status })));
    for (const attempts of [[approved, other], [other, approved]]) {
      const result = summarizePayments(attempts, context, { verified: true });
      assert.equal(result.status, 'aprobado');
      assert.equal(result.canStartPreparation, true);
      assert.equal(result.possibleDuplicateCharge, false);
      assert.equal(result.paymentIds.length, 2);
    }
  });
}
test('an approved payment requires explicit reconciliation before preparation', () => {
  const payments = [snapshot(raw())];
  assert.equal(summarizePayments(payments, context).canStartPreparation, false);
  assert.equal(summarizePayments(payments, context, { verified: true }).canStartPreparation, true);
});
test('unresolved observations preserve approval but pause new preparation', () => {
  const result = summarizePayments([snapshot(raw())], context, { verified: true, hasUnresolvedObservations: true });
  assert.equal(result.status, 'aprobado');
  assert.equal(result.requiresReview, true);
  assert.equal(result.canStartPreparation, false);
});
test('two approved IDs flag a possible duplicate charge for manual review', () => {
  const result = summarizePayments([snapshot(raw()), snapshot(raw({ id: 102 }))], context, { verified: true });
  assert.equal(result.status, 'requiere_revision');
  assert.equal(result.possibleDuplicateCharge, true);
  assert.equal(result.canStartPreparation, false);
  assert.deepEqual(plain(result.paymentIds), ['101', '102']);
});

test('a dispute on another captured attempt pauses preparation without hiding either transaction', () => {
  const result = summarizePayments([
    snapshot(raw()), snapshot(raw({ id: 102, status: 'in_mediation', status_detail: 'pending' })),
  ], context, { verified: true });
  assert.equal(result.status, 'en_disputa');
  assert.equal(result.requiresReview, true);
  assert.equal(result.canStartPreparation, false);
  assert.deepEqual(plain(result.paymentIds), ['101', '102']);
});

test('a rejected retry does not erase a partially refunded transaction or its refunds', () => {
  const result = summarizePayments([
    snapshot(raw({ id: 102, status: 'rejected' })), snapshot(partial()),
  ], context, { verified: true });
  assert.equal(result.status, 'parcialmente_reembolsado');
  assert.equal(result.canStartPreparation, false);
  assert.deepEqual(plain(result.refundIds), ['201']);
});
test('two snapshots of one payment are ambiguous; the domain does not pick a last arrival', () => {
  const approved = snapshot(raw());
  const result = summarizePayments([approved, approved], context, { verified: true });
  assert.equal(result.status, 'requiere_revision');
  assert.equal(result.canStartPreparation, false);
});
for (const [name, input] of [
  ['pending', raw({ status: 'pending' })], ['processing', raw({ status: 'in_process' })],
  ['authorized', raw({ status: 'authorized' })], ['partial refund', partial()],
  ['total refund', totalRefund()], ['dispute', raw({ status: 'in_mediation', status_detail: 'pending' })],
]) {
  test(`${name} cannot start preparation automatically even when reconciled`, () => {
    assert.equal(summarizePayments([snapshot(input)], context, { verified: true }).canStartPreparation, false);
  });
}
test('only failed attempts do not fabricate a cancellation of the commercial order', () => {
  const result = summarizePayments([
    snapshot(raw({ status: 'rejected' })), snapshot(raw({ id: 102, status: 'cancelled' })),
  ], context, { verified: true });
  assert.equal(result.status, 'sin_pago_confirmado');
  assert.equal(result.canStartPreparation, false);
});
test('summary rejects mixing payments from another order or amount', () => {
  const payment = snapshot(raw());
  assert.equal(summarizePayments([payment], { ...context, orderId: 'other' }, { verified: true }).requiresReview, true);
  assert.equal(summarizePayments([payment], { ...context, totalClp: 10000 }, { verified: true }).canStartPreparation, false);
});
test('normalization, transitions and summaries do not mutate caller data and are deterministic', () => {
  const input = freeze(partial());
  const first = normalizePayment(input, context);
  const again = normalizePayment(input, context);
  assert.deepEqual(plain(first), plain(again));
  const payment = freeze(first.payment);
  const before = JSON.stringify(payment);
  transitionPayment(payment, again);
  summarizePayments(Object.freeze([payment]), context, Object.freeze({ verified: true }));
  assert.equal(JSON.stringify(payment), before);
});
