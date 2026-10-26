// Run from the repository root: node --test backend/tests/payments.test.cjs
// Load the real route with isolated dependencies: no .env, SDK calls or database.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const Fastify = require('fastify');
const ts = require('typescript');

const orderId = '11111111-1111-4111-8111-111111111111';
const paymentId = '123456';
const filename = path.join(__dirname, '../src/routes/payments.ts');
const compiledRoute = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

async function setup(t, options = {}) {
  const order = { id: orderId, total: 1000, payment_status: 'pendiente' };
  const payment = {
    id: Number(paymentId), external_reference: orderId,
    transaction_amount: 1000, currency_id: 'CLP', status: 'approved',
    ...options.payment,
  };
  const writes = [];
  const lookups = [];
  let attempts = 0;
  const supabase = {
    from(table) {
      assert.equal(table, 'orders');
      return {
        select(columns) {
          assert.equal(columns, 'id,total,payment_status');
          return {
            eq(column, value) {
              assert.equal(column, 'id');
              assert.equal(value, orderId);
              return {
                async single() {
                  if (options.readError) return { data: null, error: options.readError };
                  return { data: { ...order }, error: null };
                },
              };
            },
          };
        },
        update(payload) {
          attempts++;
          const outcome = options.outcomes?.[attempts - 1];
          return {
            eq(column, value) {
              assert.equal(column, 'id');
              assert.equal(value, orderId);
              return {
                select(columns) {
                  assert.equal(columns, 'id');
                  return {
                    async single() {
                      if (outcome instanceof Error) throw outcome;
                      if (outcome) return outcome;
                      // Persist only successful writes, so retries read real mock state.
                      const saved = JSON.parse(JSON.stringify(payload));
                      Object.assign(order, saved);
                      writes.push(saved);
                      return { data: { id: orderId }, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  const sdk = {
    MercadoPagoConfig: class {},
    Payment: class {
      async get(request) {
        lookups.push(request.id);
        assert.equal(request.id, paymentId);
        return payment;
      }
    },
    Preference: class {
      create() { throw new Error('Unexpected preference request'); }
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiledRoute, {
    module, exports: module.exports, URL,
    process: { env: { MERCADOPAGO_ACCESS_TOKEN: 'SYNTHETIC_TEST_TOKEN' } },
    require(name) {
      if (name === 'mercadopago') return sdk;
      if (name === '../plugins/supabase') return { supabase };
      if (name === 'zod') return require('zod');
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  const app = Fastify({ logger: false });
  t.after(() => app.close());
  await app.register(module.exports.default, { prefix: '/api' });
  await app.ready();
  return {
    order, writes, lookups,
    attempts: () => attempts,
    notify: () => app.inject({
      method: 'POST', url: '/api/payments/mercadopago/webhook',
      payload: { type: 'payment', data: { id: paymentId } },
    }),
  };
}

test('successful persistence acknowledges the webhook after saving the payment', async t => {
  const fixture = await setup(t);
  const response = await fixture.notify();
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { received: true });
  assert.deepEqual(fixture.writes, [{
    payment_status: 'aprobado', status: 'pagado', mp_payment_id: paymentId,
  }]);
  assert.deepEqual(fixture.lookups, [paymentId]);
});

test('a Supabase update error returns 500 without acknowledging persistence', async t => {
  const fixture = await setup(t, {
    outcomes: [{ data: null, error: { code: 'XX000', message: 'Synthetic write failure' } }],
  });
  const response = await fixture.notify();
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { received: false });
  assert.equal(fixture.order.payment_status, 'pendiente');
  assert.equal(fixture.writes.length, 0);
});

test('an exception during the update returns 500 without leaking internal errors', async t => {
  const fixture = await setup(t, { outcomes: [new Error('Synthetic connection failure')] });
  const response = await fixture.notify();
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { received: false });
  assert.equal(fixture.order.payment_status, 'pendiente');
  assert.equal(fixture.writes.length, 0);
});

test('retry after a transient failure persists successfully before acknowledging', async t => {
  const fixture = await setup(t, {
    outcomes: [{ data: null, error: { code: '08006', message: 'Synthetic transient failure' } }],
  });
  const first = await fixture.notify();
  assert.equal(first.statusCode, 500);
  assert.deepEqual(first.json(), { received: false });
  assert.equal(fixture.order.payment_status, 'pendiente');
  const retry = await fixture.notify();
  assert.equal(retry.statusCode, 200);
  assert.deepEqual(retry.json(), { received: true });
  assert.equal(fixture.attempts(), 2);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.order.payment_status, 'aprobado');
});

test('an update that affects no order is not acknowledged as persisted', async t => {
  const fixture = await setup(t, {
    outcomes: [{ data: null, error: { code: 'PGRST116', message: 'No row updated' } }],
  });
  assert.equal((await fixture.notify()).statusCode, 500);
  assert.equal(fixture.writes.length, 0);
});

test('a missing write confirmation also returns 500', async t => {
  const fixture = await setup(t, { outcomes: [{ data: null, error: null }] });
  assert.equal((await fixture.notify()).statusCode, 500);
  assert.equal(fixture.writes.length, 0);
});

test('a transient read error is retriable rather than treated as a missing order', async t => {
  const fixture = await setup(t, { readError: { code: '08006', message: 'Synthetic read failure' } });
  const response = await fixture.notify();
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), { received: false });
  assert.equal(fixture.attempts(), 0);
});

test('a genuinely missing order preserves the existing no-op response', async t => {
  const fixture = await setup(t, { readError: { code: 'PGRST116', message: 'No order' } });
  assert.equal((await fixture.notify()).statusCode, 200);
  assert.equal(fixture.attempts(), 0);
});

for (const [name, payment] of [
  ['amount', { transaction_amount: 999 }],
  ['currency', { currency_id: 'USD' }],
  ['missing order reference', { external_reference: null }],
]) {
  test(`existing ${name} validation prevents any write`, async t => {
    const fixture = await setup(t, { payment });
    assert.equal((await fixture.notify()).statusCode, 200);
    assert.equal(fixture.attempts(), 0);
  });
}
