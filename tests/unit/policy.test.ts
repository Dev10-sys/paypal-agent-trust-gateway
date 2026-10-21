import { describe, it, expect, beforeEach } from 'vitest';
import {
  PolicyEngine,
  GatewayLedger,
  OperationStateMachine,
  IdempotencyConflictError,
  generateOperationId,
  generateIdempotencyKey,
  computePayloadHash,
} from '@paypal-gateway/policy';
import {
  SERVER_CATALOG,
  redactString,
  redactObject,
} from '@paypal-gateway/shared';

describe('Policy Engine & Gateway State Machine Unit Tests', () => {
  let engine: PolicyEngine;
  let ledger: GatewayLedger;

  beforeEach(() => {
    engine = new PolicyEngine({
      allowedActions: ['orders.create', 'orders.capture'],
      maxAmountPerOperation: 50.0,
      allowedCurrencies: ['USD', 'EUR'],
      enforceSandboxOnly: true,
      requireMerchantApproval: true,
    });
    ledger = new GatewayLedger(':memory:');
  });

  it('1. Policy allows a permitted USD 10 order (ads_basic)', () => {
    const result = engine.evaluateProposal({
      catalogId: 'ads_basic',
      quantity: 1,
      action: 'orders.create',
      environment: 'sandbox',
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.evaluatedRules['ACTION_ALLOW_CHECK'].pass).toBe(true);
    expect(result.evaluatedRules['TRANSACTION_AMOUNT_CAP'].pass).toBe(true);
  });

  it('2. Policy denies over-limit amount ($250 exceeds $50 cap)', () => {
    const result = engine.evaluateProposal({
      catalogId: 'enterprise_addon', // unitPrice 250
      quantity: 1,
      action: 'orders.create',
      environment: 'sandbox',
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('exceeds merchant policy cap'))).toBe(true);
    expect(result.evaluatedRules['TRANSACTION_AMOUNT_CAP'].pass).toBe(false);
  });

  it('3. Policy denies unsupported currency (e.g. JPY)', () => {
    const result = engine.evaluateProposal({
      catalogId: 'ads_basic',
      quantity: 1,
      currency: 'JPY',
      action: 'orders.create',
      environment: 'sandbox',
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes("Currency 'JPY' is not allowed"))).toBe(true);
  });

  it('4. Policy denies non-catalog item', () => {
    const result = engine.evaluateProposal({
      catalogId: 'unregistered_item_999',
      quantity: 1,
      action: 'orders.create',
      environment: 'sandbox',
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('Invalid or inactive catalog ID'))).toBe(true);
  });

  it('5. Policy denies unauthorized or disabled action', () => {
    const result = engine.evaluateProposal({
      catalogId: 'ads_basic',
      quantity: 1,
      action: 'payments.createRefund', // not in allowedActions
      environment: 'sandbox',
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('prohibited'))).toBe(true);
  });

  it('6. Policy denies production mode (enforceSandboxOnly)', () => {
    const result = engine.evaluateProposal({
      catalogId: 'ads_basic',
      quantity: 1,
      action: 'orders.create',
      environment: 'production',
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('Production environment is strictly rejected'))).toBe(true);
  });

  it('7. AI-proposed price cannot override server catalog', () => {
    const result = engine.evaluateProposal({
      catalogId: 'ads_basic', // authoritative price is 10
      quantity: 1,
      clientReportedPrice: 1.0, // Attempted price override to $1.00!
      action: 'orders.create',
      environment: 'sandbox',
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons.some((r) => r.includes('price override detected'))).toBe(true);
    expect(result.evaluatedRules['TAMPER_PREVENTION'].pass).toBe(false);
  });

  it('8. Same logical operation retry reuses its persisted PayPal request ID', () => {
    const opId = generateOperationId();
    const payload = { opId, catalogId: 'ads_basic', quantity: 1, total: 10 };

    const first = ledger.acquireIdempotencyKey(opId, 'CREATE_ORDER', payload);
    expect(first.isRetry).toBe(false);
    expect(first.key).toMatch(/^REQ-CREATE-/);

    const second = ledger.acquireIdempotencyKey(opId, 'CREATE_ORDER', payload);
    expect(second.isRetry).toBe(true);
    expect(second.key).toBe(first.key);
  });

  it('9. New logical operation gets a different request ID', () => {
    const opId1 = generateOperationId();
    const opId2 = generateOperationId();

    const key1 = generateIdempotencyKey(opId1, 'CREATE_ORDER');
    const key2 = generateIdempotencyKey(opId2, 'CREATE_ORDER');

    expect(key1).not.toBe(key2);
  });

  it('10. Same request ID with changed payload hash is rejected with conflict error', () => {
    const opId = generateOperationId();
    const originalPayload = { opId, amount: 10 };
    const tamperedPayload = { opId, amount: 999 };

    ledger.acquireIdempotencyKey(opId, 'CREATE_ORDER', originalPayload);

    expect(() => {
      ledger.acquireIdempotencyKey(opId, 'CREATE_ORDER', tamperedPayload);
    }).toThrow(IdempotencyConflictError);
  });

  it('11. Capture is strictly denied before buyer approval', () => {
    expect(() => {
      OperationStateMachine.assertTransition('ORDER_CREATED', 'CAPTURED', 'Attacker');
    }).toThrow(/ILLEGAL_PAYMENT_CAPTURE_ATTEMPT/);

    expect(() => {
      OperationStateMachine.assertTransition('PROPOSED', 'CAPTURED', 'Attacker');
    }).toThrow();
  });

  it('12. Duplicate webhook event ID is processed only once', () => {
    const event = {
      eventId: 'WH-TEST-EVENT-001',
      eventType: 'PAYMENT.CAPTURE.COMPLETED',
      summary: 'Payment capture completed',
      signatureVerified: true,
    };

    const first = ledger.recordWebhookEvent(event);
    expect(first.isDuplicate).toBe(false);
    expect(first.record.processed).toBe(true);

    const second = ledger.recordWebhookEvent(event);
    expect(second.isDuplicate).toBe(true);
  });

  it('13. Secret-looking values are redacted from logs and reports', () => {
    const secretText = 'Authorization: Bearer A21AA1234567890abcdef1234567890 and secret="super_secret_client_token_xyz"';
    const redacted = redactString(secretText);

    expect(redacted).not.toContain('A21AA1234567890abcdef1234567890');
    expect(redacted).toContain('[REDACTED_ACCESS_TOKEN]');

    const secretObj = {
      client_secret: 'super_secret_value',
      access_token: 'A21AA99999999999999999999999999',
      orderId: 'ORDER-123',
    };
    const redactedObj = redactObject(secretObj);

    expect(redactedObj.client_secret).toBe('[REDACTED_SECRET]');
    expect(redactedObj.orderId).toBe('ORDER-123');
  });
});
