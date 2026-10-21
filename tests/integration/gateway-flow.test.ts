import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../../apps/api/src/server.js';
import { MockAiProvider } from '../../apps/api/src/ai-provider.js';

describe('End-to-End Guarded Payment & Idempotency Flow Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer({
      ledgerPath: ':memory:',
      useMockPayPal: true,
      aiProvider: new MockAiProvider(),
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Health check returns gateway sandbox status and mock AI mode', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.isSandboxEnforced).toBe(true);
    expect(body.isMockAi).toBe(true);
  });

  it('2. AI intent parsing maps natural language to server catalog without inventing prices', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/parse-intent',
      payload: { prompt: 'Create a $10 Ads Basic order' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.parsedIntent.catalogId).toBe('ads_basic');
    expect(body.parsedIntent.quantity).toBe(1);
    expect(body.totalAmount).toBe(10.0);
    expect(body.policyResult.allowed).toBe(true);
  });

  it('3. Complete guarded lifecycle: propose -> merchant approve -> sandbox order -> buyer approve -> capture', async () => {
    // A. Propose purchase
    const propRes = await app.inject({
      method: 'POST',
      url: '/api/orders/propose',
      payload: {
        catalogId: 'ads_basic',
        quantity: 1,
        buyerContext: 'E2E Integration Test',
      },
    });

    expect(propRes.statusCode).toBe(200);
    const propBody = JSON.parse(propRes.body);
    const opId = propBody.proposal.operationId;
    expect(propBody.proposal.state).toBe('PROPOSED');
    expect(propBody.proposal.createRequestId).toBeDefined();

    // B. Capture attempt before approval MUST be rejected
    const earlyCapRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/capture-paypal`,
    });
    expect(earlyCapRes.statusCode).toBe(404); // Not ready / no active paypal order yet

    // C. Merchant explicitly approves
    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/merchant-approve`,
      payload: { actor: 'Merchant Security Admin' },
    });
    expect(approveRes.statusCode).toBe(200);
    const approveBody = JSON.parse(approveRes.body);
    expect(approveBody.operation.state).toBe('MERCHANT_APPROVED');

    // D. Create PayPal Sandbox Order
    const createOrderRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/create-paypal`,
    });
    expect(createOrderRes.statusCode).toBe(200);
    const createOrderBody = JSON.parse(createOrderRes.body);
    expect(createOrderBody.operation.state).toBe('ORDER_CREATED');
    expect(createOrderBody.orderId).toBeDefined();
    expect(createOrderBody.approvalUrl).toContain('sandbox.paypal.com');

    // E. Capture attempt when order is CREATED but buyer has NOT approved must fail
    const captureBeforeBuyerApproval = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/capture-paypal`,
    });
    expect(captureBeforeBuyerApproval.statusCode).toBe(400);
    expect(captureBeforeBuyerApproval.body).toContain('SECURITY_REJECTION');

    // F. Simulate Buyer completing approval in PayPal Sandbox
    const buyerApproveRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/simulate-buyer-approval`,
    });
    expect(buyerApproveRes.statusCode).toBe(200);
    const buyerApproveBody = JSON.parse(buyerApproveRes.body);
    expect(buyerApproveBody.operation.state).toBe('BUYER_APPROVED');

    // G. Capture succeeds now that state is BUYER_APPROVED
    const captureRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/capture-paypal`,
    });
    expect(captureRes.statusCode).toBe(200);
    const captureBody = JSON.parse(captureRes.body);
    expect(captureBody.operation.state).toBe('CAPTURED');
    expect(captureBody.captureId).toBeDefined();
    expect(captureBody.operation.captureRequestId).toBeDefined();

    // H. Verify distinct request IDs for create vs capture
    expect(captureBody.operation.createRequestId).not.toBe(
      captureBody.operation.captureRequestId
    );

    // I. Test Idempotency Retry: identical payload reuses key successfully
    const retryRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/test-retry`,
      payload: { action: 'CREATE_ORDER', tamperPayload: false },
    });
    expect(retryRes.statusCode).toBe(200);
    const retryBody = JSON.parse(retryRes.body);
    expect(retryBody.isRetry).toBe(true);

    // J. Test Idempotency Retry: tampered payload triggers 409 conflict
    const tamperRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${opId}/test-retry`,
      payload: { action: 'CREATE_ORDER', tamperPayload: true },
    });
    expect(tamperRes.statusCode).toBe(409);
    expect(tamperRes.body).toContain('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('4. Webhook processing deduplicates duplicate events', async () => {
    const payload = {
      id: 'WH-EVENT-INTEGRATION-99',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      summary: 'Capture settled',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/api/webhooks/paypal',
      headers: {
        'paypal-transmission-sig': 'mock_sig_123',
        'paypal-auth-algo': 'SHA256withRSA',
      },
      payload,
    });
    expect(first.statusCode).toBe(200);
    expect(JSON.parse(first.body).status).toBe('PROCESSED');

    const second = await app.inject({
      method: 'POST',
      url: '/api/webhooks/paypal',
      headers: {
        'paypal-transmission-sig': 'mock_sig_123',
        'paypal-auth-algo': 'SHA256withRSA',
      },
      payload,
    });
    expect(second.statusCode).toBe(200);
    expect(JSON.parse(second.body).status).toBe('DUPLICATE_IGNORED');
  });
});
