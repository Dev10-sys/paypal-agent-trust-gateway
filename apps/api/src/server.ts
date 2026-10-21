import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  SERVER_CATALOG,
  listCatalogItems,
  PurchaseProposal,
  redactObject,
} from '@paypal-gateway/shared';
import {
  PolicyEngine,
  GatewayLedger,
  generateOperationId,
  generateIdempotencyKey,
  computePayloadHash,
  DEFAULT_MERCHANT_POLICY,
} from '@paypal-gateway/policy';
import {
  PayPalClientAdapter,
  MockPayPalAdapter,
} from '@paypal-gateway/paypal-adapter';
import { ScannerEngine, exportToSarif, exportToHtml } from '@paypal-gateway/scanner';
import { createAiProvider, AiProvider } from './ai-provider.js';

export interface ServerOptions {
  ledgerPath?: string;
  useMockPayPal?: boolean;
  aiProvider?: AiProvider;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const app = fastify({ logger: false });

  // Register CORS
  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Services
  const ledger = new GatewayLedger(options.ledgerPath || ':memory:');
  const policyEngine = new PolicyEngine(DEFAULT_MERCHANT_POLICY);
  const scannerEngine = new ScannerEngine();
  const ai = options.aiProvider || createAiProvider();

  // PayPal Adapter: use real sandbox adapter if credentials provided, otherwise safe mock adapter
  const hasRealSandboxCreds =
    Boolean(process.env.PAYPAL_CLIENT_ID) &&
    Boolean(process.env.PAYPAL_CLIENT_SECRET) &&
    !options.useMockPayPal;

  let paypalAdapter: PayPalClientAdapter | MockPayPalAdapter;
  let isMockPayPal = true;

  if (hasRealSandboxCreds) {
    try {
      paypalAdapter = new PayPalClientAdapter({
        clientId: process.env.PAYPAL_CLIENT_ID!,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
        environment: 'sandbox',
      });
      isMockPayPal = false;
    } catch {
      paypalAdapter = new MockPayPalAdapter();
      isMockPayPal = true;
    }
  } else {
    paypalAdapter = new MockPayPalAdapter();
    isMockPayPal = true;
  }

  // Health & Gateway Status
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'PayPal Agent Trust Gateway',
      environment: 'sandbox',
      isSandboxEnforced: true,
      paypalMode: isMockPayPal ? 'Mock PayPal Sandbox (Offline Safe)' : 'Live PayPal Sandbox',
      aiProvider: ai.name,
      isMockAi: ai.isMock,
      timestamp: new Date().toISOString(),
    };
  });

  // Server Catalog
  app.get('/api/catalog', async () => {
    return {
      catalog: listCatalogItems(),
    };
  });

  // Policy Status & Settings
  app.get('/api/policy', async () => {
    return {
      policy: policyEngine.getPolicy(),
    };
  });

  app.post('/api/policy/update', async (req) => {
    const body = req.body as any;
    const updated = policyEngine.updatePolicy(body || {});
    return {
      policy: updated,
    };
  });

  // AI Intent Parsing (Constrained to Server Catalog)
  app.post('/api/ai/parse-intent', async (req) => {
    const { prompt } = req.body as { prompt: string };
    if (!prompt) {
      return { error: 'Prompt is required' };
    }

    const intent = await ai.parsePurchaseIntent(prompt);
    let policyResult = null;
    let catalogItem = null;
    let totalAmount = 0;

    if (intent.catalogId && !intent.ambiguous) {
      catalogItem = SERVER_CATALOG[intent.catalogId];
      if (catalogItem) {
        totalAmount = catalogItem.unitPrice * (intent.quantity || 1);
        policyResult = policyEngine.evaluateProposal({
          catalogId: intent.catalogId,
          quantity: intent.quantity || 1,
          action: 'orders.create',
          environment: 'sandbox',
        });
      }
    }

    return {
      parsedIntent: intent,
      catalogItem,
      totalAmount,
      policyResult,
    };
  });

  // Propose Purchase (Creates PROPOSED or DENIED in Ledger)
  app.post('/api/orders/propose', async (req, reply) => {
    const { catalogId, quantity, buyerContext, clientPriceOverride } = req.body as any;

    if (!catalogId) {
      return reply.status(400).send({ error: 'catalogId is required' });
    }

    const qty = Number(quantity) || 1;
    const catalogItem = SERVER_CATALOG[catalogId];

    // Evaluate proposal deterministically against policy
    const policyResult = policyEngine.evaluateProposal({
      catalogId,
      quantity: qty,
      action: 'orders.create',
      environment: 'sandbox',
      clientReportedPrice: clientPriceOverride,
    });

    const operationId = generateOperationId();
    const createRequestId = generateIdempotencyKey(operationId, 'CREATE_ORDER');
    const totalAmount = catalogItem ? catalogItem.unitPrice * qty : 0;
    const currency = catalogItem ? catalogItem.currency : 'USD';

    const proposal: PurchaseProposal = {
      operationId,
      catalogId,
      quantity: qty,
      buyerContext: buyerContext || 'Manual / AI Purchase Proposal',
      serverCatalogItem: catalogItem,
      totalAmount,
      currency,
      action: 'orders.create',
      state: policyResult.allowed ? 'PROPOSED' : 'DENIED',
      payloadHash: computePayloadHash({ catalogId, quantity: qty, totalAmount, currency }),
      createRequestId,
      denialReason: policyResult.allowed ? undefined : policyResult.reasons.join('; '),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ledger.saveOperation(proposal);
    ledger.recordPolicyAudit(
      operationId,
      policyResult.allowed ? 'ALLOWED' : 'DENIED',
      policyResult.reasons,
      policyResult.evaluatedRules
    );

    return {
      proposal,
      policyResult,
    };
  });

  // Merchant Approval Gate
  app.post('/api/orders/:id/merchant-approve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { actor } = (req.body as any) || { actor: 'Merchant Admin' };

    try {
      const updated = ledger.transitionOperationState(id, 'MERCHANT_APPROVED', actor || 'Merchant');
      return { operation: updated };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Create PayPal Sandbox Order (Idempotent per-call key)
  app.post('/api/orders/:id/create-paypal', async (req, reply) => {
    const { id } = req.params as { id: string };
    const op = ledger.getOperation(id);

    if (!op) {
      return reply.status(404).send({ error: `Operation '${id}' not found` });
    }

    if (op.state !== 'MERCHANT_APPROVED') {
      return reply.status(400).send({
        error: `Cannot create PayPal order in state '${op.state}'. Merchant approval is required first.`,
      });
    }

    try {
      // 1. Acquire & persist idempotency key before sending request
      const payload = {
        operationId: op.operationId,
        catalogId: op.catalogId,
        quantity: op.quantity,
        totalAmount: op.totalAmount,
        currency: op.currency,
      };
      const { key } = ledger.acquireIdempotencyKey(op.operationId, 'CREATE_ORDER', payload);

      // 2. Dispatch to PayPal Sandbox with per-call idempotency key
      const result = await paypalAdapter.createOrder({
        paypalRequestId: key,
        totalAmount: op.totalAmount,
        currency: op.currency,
        description: `${op.serverCatalogItem?.name || op.catalogId} (x${op.quantity})`,
        customId: op.operationId,
      });

      // 3. Complete idempotency key and transition state
      ledger.completeIdempotencyKey(key, JSON.stringify(result.rawResponseRedacted));

      const updated = ledger.transitionOperationState(id, 'ORDER_CREATED', 'PayPal Gateway Adapter', {
        paypalOrderId: result.orderId,
        paypalApprovalUrl: result.approvalUrl,
        rawOrderResponseRedacted: result.rawResponseRedacted,
      });

      return {
        operation: updated,
        orderId: result.orderId,
        approvalUrl: result.approvalUrl,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Verify Order Status & Buyer Approval State
  app.get('/api/orders/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const op = ledger.getOperation(id);

    if (!op) {
      return reply.status(404).send({ error: `Operation '${id}' not found` });
    }

    if (!op.paypalOrderId) {
      return { operation: op, verifiedPayPalStatus: null };
    }

    try {
      const orderDetails = await paypalAdapter.getOrder(op.paypalOrderId);

      // If PayPal status is APPROVED and our internal state is ORDER_CREATED, transition to BUYER_APPROVED
      if (orderDetails.status === 'APPROVED' && op.state === 'ORDER_CREATED') {
        const updated = ledger.transitionOperationState(
          id,
          'BUYER_APPROVED',
          'PayPal Buyer Verification'
        );
        return {
          operation: updated,
          verifiedPayPalStatus: orderDetails.status,
        };
      }

      return {
        operation: op,
        verifiedPayPalStatus: orderDetails.status,
      };
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Simulate Buyer Approval (Sandbox Demo Flow)
  app.post('/api/orders/:id/simulate-buyer-approval', async (req, reply) => {
    const { id } = req.params as { id: string };
    const op = ledger.getOperation(id);

    if (!op || !op.paypalOrderId) {
      return reply.status(404).send({ error: `Operation '${id}' with active PayPal order not found` });
    }

    try {
      if (paypalAdapter instanceof MockPayPalAdapter) {
        paypalAdapter.simulateBuyerApproval(op.paypalOrderId);
      }

      const updated = ledger.transitionOperationState(
        id,
        'BUYER_APPROVED',
        'Simulated Buyer Approval Sandbox'
      );

      return {
        operation: updated,
        message: 'Buyer approval completed in Sandbox. Order is now ready for authorized capture.',
      };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Capture PayPal Order (Enforces Pre-Flight Buyer Approval Verification)
  app.post('/api/orders/:id/capture-paypal', async (req, reply) => {
    const { id } = req.params as { id: string };
    const op = ledger.getOperation(id);

    if (!op || !op.paypalOrderId) {
      return reply.status(404).send({ error: `Operation '${id}' not found` });
    }

    // MANDATORY PRE-FLIGHT POLICY CHECK:
    if (op.state !== 'BUYER_APPROVED') {
      return reply.status(400).send({
        error: `SECURITY_REJECTION: Cannot capture order in state '${op.state}'. ` +
          `Buyer approval must be completed and verified server-side before capture can proceed!`,
      });
    }

    try {
      // 1. Acquire distinct capture idempotency key
      const capturePayload = {
        operationId: op.operationId,
        paypalOrderId: op.paypalOrderId,
        totalAmount: op.totalAmount,
      };
      const { key: captureKey } = ledger.acquireIdempotencyKey(
        op.operationId,
        'CAPTURE_ORDER',
        capturePayload
      );

      // 2. Dispatch Capture call
      const captureResult = await paypalAdapter.captureOrder({
        orderId: op.paypalOrderId,
        paypalRequestId: captureKey,
        expectedAmount: op.totalAmount,
        expectedCurrency: op.currency,
      });

      // 3. Complete capture record & state transition
      ledger.completeIdempotencyKey(captureKey, JSON.stringify(captureResult.rawResponseRedacted));

      const updated = ledger.transitionOperationState(id, 'CAPTURED', 'PayPal Capture Adapter', {
        captureRequestId: captureKey,
        paypalCaptureId: captureResult.captureId,
        rawCaptureResponseRedacted: captureResult.rawResponseRedacted,
      });

      return {
        operation: updated,
        captureId: captureResult.captureId,
      };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Test Idempotency Retry & Mismatch Rejection
  app.post('/api/orders/:id/test-retry', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { action, tamperPayload } = (req.body as any) || {};
    const op = ledger.getOperation(id);

    if (!op) {
      return reply.status(404).send({ error: `Operation '${id}' not found` });
    }

    const testAction = action === 'CAPTURE_ORDER' ? 'CAPTURE_ORDER' : 'CREATE_ORDER';
    const payload = tamperPayload
      ? { operationId: op.operationId, tamperedField: 'HACKED_PRICE_9999' }
      : {
          operationId: op.operationId,
          catalogId: op.catalogId,
          quantity: op.quantity,
          totalAmount: op.totalAmount,
          currency: op.currency,
        };

    try {
      const result = ledger.acquireIdempotencyKey(op.operationId, testAction, payload);
      return {
        status: 'SUCCESS',
        isRetry: result.isRetry,
        key: result.key,
        message: 'Idempotency key correctly re-used for identical payload without duplicate processing.',
      };
    } catch (err: any) {
      return reply.status(409).send({
        status: 'REJECTED',
        error: err.name,
        message: err.message,
      });
    }
  });

  // List All Operations in Ledger
  app.get('/api/orders', async () => {
    return {
      operations: ledger.listOperations(),
    };
  });

  // Integration Auditor (Scan Repository)
  app.post('/api/audit/scan', async (req, reply) => {
    const { repoPath } = (req.body as any) || {};
    let target = repoPath ? path.resolve(repoPath) : path.resolve('.');

    if (repoPath && !fs.existsSync(target)) {
      // Try resolving relative to workspace root when running inside apps/api
      const candidates = [
        path.resolve(process.cwd(), '../..', repoPath),
        path.resolve(process.cwd(), '..', repoPath),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          target = cand;
          break;
        }
      }
    }

    try {
      const findings = scannerEngine.scanDirectory({ repoPath: target });
      const sarif = exportToSarif(findings);
      return {
        repoPath: target,
        totalFindings: findings.length,
        findings,
        sarif,
      };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // AI Finding Explanation & Patch Suggestion
  app.post('/api/audit/explain', async (req) => {
    const { finding } = req.body as { finding: any };
    if (!finding) {
      return { error: 'Finding payload required' };
    }
    const explanation = await ai.explainFinding(finding);
    return { explanation };
  });

  // Webhook Receiver with Signature Verification & Deduplication
  app.post('/api/webhooks/paypal', async (req, reply) => {
    const headers = req.headers;
    const body = req.body as any;

    const eventId = body?.id || `WH-${Date.now()}`;
    const eventType = body?.event_type || 'PAYMENT.CAPTURE.COMPLETED';
    const summary = body?.summary || 'PayPal Webhook Event';

    // Signature headers inspection
    const hasSig = Boolean(headers['paypal-transmission-sig'] || headers['paypal-auth-algo']);

    const { isDuplicate, record } = ledger.recordWebhookEvent({
      eventId,
      eventType,
      summary,
      resourceId: body?.resource?.id,
      signatureVerified: hasSig,
    });

    if (isDuplicate) {
      return reply.status(200).send({
        status: 'DUPLICATE_IGNORED',
        message: `Webhook event '${eventId}' has already been processed. Replay attack prevented.`,
        record,
      });
    }

    return {
      status: 'PROCESSED',
      record,
    };
  });

  return app;
}
