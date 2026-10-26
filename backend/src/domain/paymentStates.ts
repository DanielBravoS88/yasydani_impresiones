import type { Payment } from 'mercadopago';

/** Dominio puro para Checkout Pro / Payments API. No conectado al webhook.
 * Los resultados son decisiones, nunca escrituras ni movimientos de inventario.
 * S06 deberá persistir observaciones y aplicar estas decisiones atómicamente.
 * Referencia: https://www.mercadopago.com.mx/developers/es/docs/checkout-api-payments/response-handling/query-results
 */
type SDKPayment = Awaited<ReturnType<Payment['get']>>;
type ProviderFields = Pick<SDKPayment, 'id' | 'external_reference' | 'currency_id'
  | 'status' | 'status_detail' | 'transaction_amount' | 'transaction_amount_refunded'
  | 'refunds' | 'date_last_updated'>;
// Acepta estructuralmente Payment.get(), sin confiar en los tipos del proveedor.
export type PaymentInput = { readonly [K in keyof ProviderFields]?: unknown };

export type PaymentState = 'pendiente' | 'en_proceso' | 'autorizado' | 'aprobado'
  | 'rechazado' | 'cancelado' | 'parcialmente_reembolsado' | 'reembolsado'
  | 'en_disputa' | 'contracargo';

export interface PaymentContext {
  readonly orderId: string;
  readonly totalClp: number;
}

export interface NormalizedRefund {
  readonly refundId: string;
  readonly paymentId: string;
  readonly amountClp: number;
  readonly providerStatus: string;
}

export interface NormalizedPayment {
  readonly paymentId: string;
  readonly orderId: string;
  readonly currency: 'CLP';
  readonly providerStatus: string;
  readonly providerStatusDetail: string | null;
  readonly providerUpdatedAt: string | null;
  readonly state: PaymentState;
  readonly amountClp: number;
  readonly refundedClp: number;
  readonly refunds: readonly NormalizedRefund[];
  readonly requiresReview: boolean;
}

export type PaymentIssue = 'invalid_context' | 'invalid_payment' | 'invalid_id'
  | 'reference_mismatch' | 'currency_mismatch' | 'invalid_amount' | 'amount_mismatch'
  | 'invalid_refunded_amount' | 'invalid_refund' | 'duplicate_refund'
  | 'refund_total_mismatch' | 'inconsistent_refund_state' | 'unknown_status'
  | 'invalid_timestamp' | 'transaction_mismatch' | 'unexpected_transition'
  | 'refund_regression' | 'refund_history_changed';

export interface PaymentObservation {
  readonly paymentId: string | null;
  readonly providerStatus: string | null;
  readonly providerStatusDetail: string | null;
}

export type NormalizationResult =
  | { readonly ok: true; readonly payment: NormalizedPayment }
  | { readonly ok: false; readonly issue: PaymentIssue; readonly observation: PaymentObservation };

export interface TransitionResult {
  readonly accepted: boolean;
  readonly payment: NormalizedPayment | null;
  readonly issue: PaymentIssue | null;
  /** El futuro adaptador debe conservar esta observación incluso si se rechaza. */
  readonly observation: PaymentObservation;
}

/** Pesos CLP exactos, sin redondeos, formatos locales, exponentes ni coerciones. */
export function parseClpAmount(value: unknown): number | null {
  if (typeof value === 'string') {
    if (!/^(?:0|[1-9]\d*)(?:\.0{1,2})?$/.test(value)) return null;
    value = Number(value);
  }
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function identifier(value: unknown): string | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) ? value : null;
}

const providerStates: Readonly<Record<string, PaymentState>> = {
  pending: 'pendiente', in_process: 'en_proceso', authorized: 'autorizado',
  approved: 'aprobado', rejected: 'rechazado', cancelled: 'cancelado',
  refunded: 'reembolsado', in_mediation: 'en_disputa', charged_back: 'contracargo',
};

/** Requiere el acumulado y el detalle de devoluciones confirmadas coherentes.
 * Una respuesta incompleta se deriva a conciliación; nunca se completa con ceros.
 * Los estados de este módulo no son nuevos valores persistidos en orders.
 */
export function normalizePayment(input: PaymentInput, context: PaymentContext): NormalizationResult {
  const validInput = input && typeof input === 'object' && !Array.isArray(input);
  const observation: PaymentObservation = {
    paymentId: validInput ? identifier(input.id) : null,
    providerStatus: validInput && typeof input.status === 'string' ? input.status : null,
    providerStatusDetail: validInput && typeof input.status_detail === 'string' ? input.status_detail : null,
  };
  const reject = (issue: PaymentIssue): NormalizationResult => ({ ok: false, issue, observation });
  if (!context || typeof context.orderId !== 'string' || !context.orderId.trim()
    || parseClpAmount(context.totalClp) === null || context.totalClp <= 0) return reject('invalid_context');
  if (!validInput) return reject('invalid_payment');
  if (!observation.paymentId) return reject('invalid_id');
  if (input.external_reference !== context.orderId) return reject('reference_mismatch');
  if (input.currency_id !== 'CLP') return reject('currency_mismatch');
  const amount = parseClpAmount(input.transaction_amount);
  if (amount === null || amount === 0) return reject('invalid_amount');
  if (amount !== context.totalClp) return reject('amount_mismatch');
  // No se interpreta la ausencia del acumulado como cero: faltaría evidencia.
  const refunded = parseClpAmount(input.transaction_amount_refunded);
  if (refunded === null || refunded > amount) return reject('invalid_refunded_amount');
  if (input.date_last_updated !== undefined && input.date_last_updated !== null
    && (typeof input.date_last_updated !== 'string'
      || !Number.isFinite(Date.parse(input.date_last_updated)))) return reject('invalid_timestamp');
  if (typeof input.status !== 'string' || !Object.hasOwn(providerStates, input.status)) return reject('unknown_status');
  if (input.status_detail === 'partially_refunded' && input.status !== 'approved') return reject('inconsistent_refund_state');
  if (input.status_detail === 'refunded' && input.status !== 'refunded') return reject('inconsistent_refund_state');
  let state = providerStates[input.status];
  if (input.status === 'approved') {
    if (refunded === amount || (input.status_detail === 'partially_refunded' && refunded === 0)) {
      return reject('inconsistent_refund_state');
    }
    if (refunded > 0) state = 'parcialmente_reembolsado';
  } else if (input.status === 'refunded') {
    if (refunded !== amount) return reject('inconsistent_refund_state');
  } else if (!['in_mediation', 'charged_back'].includes(input.status) && refunded !== 0) {
    return reject('inconsistent_refund_state');
  }
  if (input.refunds !== undefined && !Array.isArray(input.refunds)) return reject('invalid_refund');
  const refunds: NormalizedRefund[] = [];
  const ids = new Set<string>();
  let confirmedRefunds = 0n;
  let requiresReview = input.status === 'approved'
    && !['accredited', 'partially_refunded'].includes(observation.providerStatusDetail ?? '');
  for (const raw of input.refunds ?? []) {
    if (!raw || typeof raw !== 'object') return reject('invalid_refund');
    const refundId = identifier(raw.id);
    const refundAmount = parseClpAmount(raw.amount);
    if (!refundId || refundAmount === null || refundAmount === 0 || refundAmount > amount
      || typeof raw.status !== 'string' || !raw.status
      || identifier(raw.payment_id) !== observation.paymentId) return reject('invalid_refund');
    if (ids.has(refundId)) return reject('duplicate_refund');
    ids.add(refundId);
    refunds.push({ refundId, paymentId: observation.paymentId, amountClp: refundAmount, providerStatus: raw.status });
    if (raw.status === 'approved') confirmedRefunds += BigInt(refundAmount);
    else requiresReview = true; // Pendiente/desconocido: no contarlo como dinero devuelto.
  }
  if (confirmedRefunds !== BigInt(refunded)) return reject('refund_total_mismatch');
  return { ok: true, payment: {
    paymentId: observation.paymentId, orderId: context.orderId, currency: 'CLP',
    providerStatus: input.status, providerStatusDetail: observation.providerStatusDetail,
    providerUpdatedAt: typeof input.date_last_updated === 'string' ? input.date_last_updated : null,
    state, amountClp: amount, refundedClp: refunded, refunds, requiresReview,
  } };
}

/** Reglas comerciales aprobadas; no sustituyen bloqueo/deduplicación de S06. */
const transitions: Readonly<Record<PaymentState, readonly PaymentState[]>> = {
  pendiente: ['en_proceso', 'autorizado', 'aprobado', 'rechazado', 'cancelado'],
  en_proceso: ['autorizado', 'aprobado', 'rechazado', 'cancelado'],
  autorizado: ['aprobado', 'cancelado'],
  aprobado: ['parcialmente_reembolsado', 'reembolsado', 'en_disputa', 'contracargo'],
  parcialmente_reembolsado: ['reembolsado', 'en_disputa', 'contracargo'],
  en_disputa: ['aprobado', 'parcialmente_reembolsado', 'reembolsado', 'contracargo'],
  contracargo: [], rechazado: [], cancelado: [], reembolsado: [],
};

/** Transiciones no previstas, incluso saltos de etapas, requieren conciliación.
 * No usa el orden de llegada como evidencia de frescura (responsabilidad S06).
 */
export function transitionPayment(previous: NormalizedPayment | null, next: NormalizationResult): TransitionResult {
  const observation: PaymentObservation = next.ok
    ? { paymentId: next.payment.paymentId, providerStatus: next.payment.providerStatus,
      providerStatusDetail: next.payment.providerStatusDetail }
    : next.observation;
  const reject = (issue: PaymentIssue): TransitionResult => ({ accepted: false, payment: previous, issue, observation });
  if (!next.ok) return reject(next.issue);
  const candidate = next.payment;
  if (previous) {
    if (candidate.paymentId !== previous.paymentId || candidate.orderId !== previous.orderId
      || candidate.amountClp !== previous.amountClp || candidate.currency !== previous.currency) {
      return reject('transaction_mismatch');
    }
    if (candidate.refundedClp < previous.refundedClp) return reject('refund_regression');
    for (const old of previous.refunds) {
      const current = candidate.refunds.find(refund => refund.refundId === old.refundId);
      if (!current || current.amountClp !== old.amountClp || current.paymentId !== old.paymentId
        || (old.providerStatus === 'approved' && current.providerStatus !== 'approved')) {
        return reject('refund_history_changed');
      }
    }
    if (candidate.state !== previous.state && !transitions[previous.state].includes(candidate.state)) {
      return reject('unexpected_transition');
    }
  }
  return { accepted: true, payment: candidate, issue: null, observation };
}

export interface PaymentSummary {
  readonly status: PaymentState | 'sin_pago_confirmado' | 'requiere_revision';
  readonly paymentIds: readonly string[];
  readonly refundIds: readonly string[];
  readonly requiresReview: boolean;
  readonly possibleDuplicateCharge: boolean;
  readonly canStartPreparation: boolean;
}

/** Recibe una sola instantánea aceptada por transacción, no una lista de eventos.
 * La conciliación la debe comprobar el futuro adaptador; por defecto no habilita
 * preparación. Este módulo no acredita autenticidad, frescura ni persistencia.
 * No devuelve acciones de cancelación, reembolso o reposición de stock.
 */
export function summarizePayments(
  payments: readonly NormalizedPayment[], context: PaymentContext,
  reconciliation: { readonly verified: boolean; readonly hasUnresolvedObservations?: boolean } = { verified: false },
): PaymentSummary {
  const paymentIds = payments.map(payment => payment.paymentId);
  const refundIds = payments.flatMap(payment => payment.refunds.map(refund => refund.refundId));
  // No elegir arbitrariamente entre dos instantáneas del mismo pago (S06).
  const ambiguous = new Set(paymentIds).size !== paymentIds.length;
  const invalidContext = !context || !context.orderId || parseClpAmount(context.totalClp) === null || context.totalClp <= 0;
  const invalidPayment = payments.some(payment => payment.orderId !== context?.orderId
    || payment.currency !== 'CLP' || payment.amountClp !== context?.totalClp);
  const successful = payments.filter(payment => ['aprobado', 'parcialmente_reembolsado', 'reembolsado'].includes(payment.state));
  const possibleDuplicateCharge = successful.length > 1;
  const dispute = payments.find(payment => payment.state === 'contracargo')
    ?? payments.find(payment => payment.state === 'en_disputa');
  const requiresReview = Boolean(invalidContext || invalidPayment || ambiguous || possibleDuplicateCharge
    || dispute || reconciliation.hasUnresolvedObservations || payments.some(payment => payment.requiresReview));
  const waiting = payments.find(payment => payment.state === 'autorizado')
    ?? payments.find(payment => payment.state === 'en_proceso')
    ?? payments.find(payment => payment.state === 'pendiente');
  const status = invalidContext || invalidPayment || ambiguous || possibleDuplicateCharge ? 'requiere_revision'
    : dispute?.state ?? successful[0]?.state ?? waiting?.state ?? 'sin_pago_confirmado';
  return {
    status, paymentIds, refundIds, requiresReview, possibleDuplicateCharge,
    canStartPreparation: reconciliation.verified && !requiresReview
      && successful.length === 1 && successful[0].state === 'aprobado' && successful[0].refundedClp === 0,
  };
}
