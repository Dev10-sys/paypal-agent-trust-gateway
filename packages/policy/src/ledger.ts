import { DatabaseSync } from 'node:sqlite';
import {
  IdempotencyRecord,
  OperationState,
  PurchaseProposal,
  WebhookEventRecord,
} from '@paypal-gateway/shared';
import {
  computePayloadHash,
  generateIdempotencyKey,
  IdempotencyConflictError,
} from './idempotency.js';
import { OperationStateMachine } from './state-machine.js';

export class GatewayLedger {
  private db: DatabaseSync;

  constructor(dbPath: string = ':memory:') {
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS operations (
        operationId TEXT PRIMARY KEY,
        catalogId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        totalAmount REAL NOT NULL,
        currency TEXT NOT NULL,
        payee TEXT,
        action TEXT NOT NULL,
        state TEXT NOT NULL,
        payloadHash TEXT NOT NULL,
        createRequestId TEXT NOT NULL,
        captureRequestId TEXT,
        paypalOrderId TEXT,
        paypalApprovalUrl TEXT,
        paypalCaptureId TEXT,
        approvingActor TEXT,
        denialReason TEXT,
        rawOrderResponseRedacted TEXT,
        rawCaptureResponseRedacted TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS idempotency_keys (
        requestId TEXT PRIMARY KEY,
        operationId TEXT NOT NULL,
        action TEXT NOT NULL,
        payloadHash TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL,
        responsePayloadRedacted TEXT
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        eventId TEXT PRIMARY KEY,
        eventType TEXT NOT NULL,
        summary TEXT NOT NULL,
        resourceId TEXT,
        signatureVerified INTEGER NOT NULL,
        processed INTEGER NOT NULL,
        firstSeenAt TEXT NOT NULL,
        processedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS policy_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operationId TEXT NOT NULL,
        decision TEXT NOT NULL,
        reasons TEXT NOT NULL,
        evaluatedRules TEXT NOT NULL,
        evaluatedAt TEXT NOT NULL
      );
    `);
  }

  public saveOperation(op: PurchaseProposal): void {
    const existing = this.getOperation(op.operationId);
    if (!existing) {
      const stmt = this.db.prepare(`
        INSERT INTO operations (
          operationId, catalogId, quantity, totalAmount, currency, payee,
          action, state, payloadHash, createRequestId, captureRequestId,
          paypalOrderId, paypalApprovalUrl, paypalCaptureId, approvingActor,
          denialReason, rawOrderResponseRedacted, rawCaptureResponseRedacted,
          createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
      stmt.run(
        op.operationId,
        op.catalogId,
        op.quantity,
        op.totalAmount,
        op.currency,
        op.payee || null,
        op.action,
        op.state,
        op.payloadHash,
        op.createRequestId,
        op.captureRequestId || null,
        op.paypalOrderId || null,
        op.paypalApprovalUrl || null,
        op.paypalCaptureId || null,
        op.approvingActor || null,
        op.denialReason || null,
        op.rawOrderResponseRedacted ? JSON.stringify(op.rawOrderResponseRedacted) : null,
        op.rawCaptureResponseRedacted ? JSON.stringify(op.rawCaptureResponseRedacted) : null,
        op.createdAt,
        op.updatedAt
      );
    } else {
      const stmt = this.db.prepare(`
        UPDATE operations SET
          state = ?,
          captureRequestId = ?,
          paypalOrderId = ?,
          paypalApprovalUrl = ?,
          paypalCaptureId = ?,
          approvingActor = ?,
          denialReason = ?,
          rawOrderResponseRedacted = ?,
          rawCaptureResponseRedacted = ?,
          updatedAt = ?
        WHERE operationId = ?
      `);
      stmt.run(
        op.state,
        op.captureRequestId || existing.captureRequestId || null,
        op.paypalOrderId || existing.paypalOrderId || null,
        op.paypalApprovalUrl || existing.paypalApprovalUrl || null,
        op.paypalCaptureId || existing.paypalCaptureId || null,
        op.approvingActor || existing.approvingActor || null,
        op.denialReason || existing.denialReason || null,
        op.rawOrderResponseRedacted
          ? JSON.stringify(op.rawOrderResponseRedacted)
          : existing.rawOrderResponseRedacted
            ? JSON.stringify(existing.rawOrderResponseRedacted)
            : null,
        op.rawCaptureResponseRedacted
          ? JSON.stringify(op.rawCaptureResponseRedacted)
          : existing.rawCaptureResponseRedacted
            ? JSON.stringify(existing.rawCaptureResponseRedacted)
            : null,
        op.updatedAt,
        op.operationId
      );
    }
  }

  public getOperation(operationId: string): PurchaseProposal | undefined {
    const stmt = this.db.prepare(`SELECT * FROM operations WHERE operationId = ?`);
    const row: any = stmt.get(operationId);
    if (!row) return undefined;

    return {
      operationId: row.operationId,
      catalogId: row.catalogId,
      quantity: row.quantity,
      totalAmount: row.totalAmount,
      currency: row.currency,
      payee: row.payee || undefined,
      action: row.action,
      state: row.state as OperationState,
      payloadHash: row.payloadHash,
      createRequestId: row.createRequestId,
      captureRequestId: row.captureRequestId || undefined,
      paypalOrderId: row.paypalOrderId || undefined,
      paypalApprovalUrl: row.paypalApprovalUrl || undefined,
      paypalCaptureId: row.paypalCaptureId || undefined,
      approvingActor: row.approvingActor || undefined,
      denialReason: row.denialReason || undefined,
      rawOrderResponseRedacted: row.rawOrderResponseRedacted
        ? JSON.parse(row.rawOrderResponseRedacted)
        : undefined,
      rawCaptureResponseRedacted: row.rawCaptureResponseRedacted
        ? JSON.parse(row.rawCaptureResponseRedacted)
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  public listOperations(): PurchaseProposal[] {
    const stmt = this.db.prepare(`SELECT * FROM operations ORDER BY createdAt DESC`);
    const rows = stmt.all() as any[];
    return rows.map((row) => ({
      operationId: row.operationId,
      catalogId: row.catalogId,
      quantity: row.quantity,
      totalAmount: row.totalAmount,
      currency: row.currency,
      payee: row.payee || undefined,
      action: row.action,
      state: row.state as OperationState,
      payloadHash: row.payloadHash,
      createRequestId: row.createRequestId,
      captureRequestId: row.captureRequestId || undefined,
      paypalOrderId: row.paypalOrderId || undefined,
      paypalApprovalUrl: row.paypalApprovalUrl || undefined,
      paypalCaptureId: row.paypalCaptureId || undefined,
      approvingActor: row.approvingActor || undefined,
      denialReason: row.denialReason || undefined,
      rawOrderResponseRedacted: row.rawOrderResponseRedacted
        ? JSON.parse(row.rawOrderResponseRedacted)
        : undefined,
      rawCaptureResponseRedacted: row.rawCaptureResponseRedacted
        ? JSON.parse(row.rawCaptureResponseRedacted)
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  public transitionOperationState(
    operationId: string,
    newState: OperationState,
    actor: string,
    extraUpdates: Partial<PurchaseProposal> = {}
  ): PurchaseProposal {
    const op = this.getOperation(operationId);
    if (!op) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    OperationStateMachine.assertTransition(op.state, newState, actor);

    const updated: PurchaseProposal = {
      ...op,
      ...extraUpdates,
      state: newState,
      approvingActor: actor,
      updatedAt: new Date().toISOString(),
    };

    this.saveOperation(updated);
    return updated;
  }

  /**
   * Idempotency Registration & Collision Detection
   * Generates or fetches an existing idempotency record.
   * If existing record has identical payloadHash -> safe retry allowed!
   * If existing record has differing payloadHash -> rejects with IdempotencyConflictError!
   */
  public acquireIdempotencyKey(
    operationId: string,
    action: 'CREATE_ORDER' | 'CAPTURE_ORDER',
    payload: any
  ): { key: string; isRetry: boolean } {
    const key = generateIdempotencyKey(operationId, action);
    const payloadHash = computePayloadHash(payload);

    const stmt = this.db.prepare(`SELECT * FROM idempotency_keys WHERE requestId = ?`);
    const existing: any = stmt.get(key);

    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        throw new IdempotencyConflictError(
          `IDEMPOTENCY_PAYLOAD_MISMATCH: Key '${key}' is already bound to payload hash '${existing.payloadHash}'. ` +
            `Attempted retry with conflicting payload hash '${payloadHash}'. Changing request payload with the same idempotency key is prohibited.`
        );
      }
      return { key, isRetry: true };
    }

    // Persist new key before sending API request
    const insertStmt = this.db.prepare(`
      INSERT INTO idempotency_keys (
        requestId, operationId, action, payloadHash, createdAt, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      key,
      operationId,
      action,
      payloadHash,
      new Date().toISOString(),
      'PENDING'
    );

    return { key, isRetry: false };
  }

  public completeIdempotencyKey(key: string, responsePayloadRedacted?: string): void {
    const stmt = this.db.prepare(`
      UPDATE idempotency_keys SET
        status = 'COMPLETED',
        responsePayloadRedacted = ?
      WHERE requestId = ?
    `);
    stmt.run(responsePayloadRedacted || null, key);
  }

  public getIdempotencyRecord(key: string): IdempotencyRecord | undefined {
    const stmt = this.db.prepare(`SELECT * FROM idempotency_keys WHERE requestId = ?`);
    const row: any = stmt.get(key);
    if (!row) return undefined;
    return {
      requestId: row.requestId,
      operationId: row.operationId,
      action: row.action as any,
      payloadHash: row.payloadHash,
      createdAt: row.createdAt,
      status: row.status as any,
      responsePayloadRedacted: row.responsePayloadRedacted || undefined,
    };
  }

  /**
   * Webhook deduplication and signature verification recording
   */
  public recordWebhookEvent(event: {
    eventId: string;
    eventType: string;
    summary: string;
    resourceId?: string;
    signatureVerified: boolean;
  }): { isDuplicate: boolean; record: WebhookEventRecord } {
    const stmt = this.db.prepare(`SELECT * FROM webhook_events WHERE eventId = ?`);
    const existing: any = stmt.get(event.eventId);

    if (existing) {
      return {
        isDuplicate: true,
        record: {
          eventId: existing.eventId,
          eventType: existing.eventType,
          summary: existing.summary,
          resourceId: existing.resourceId || undefined,
          signatureVerified: Boolean(existing.signatureVerified),
          processed: Boolean(existing.processed),
          firstSeenAt: existing.firstSeenAt,
          processedAt: existing.processedAt || undefined,
        },
      };
    }

    const now = new Date().toISOString();
    const insertStmt = this.db.prepare(`
      INSERT INTO webhook_events (
        eventId, eventType, summary, resourceId, signatureVerified, processed, firstSeenAt, processedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      event.eventId,
      event.eventType,
      event.summary,
      event.resourceId || null,
      event.signatureVerified ? 1 : 0,
      1,
      now,
      now
    );

    return {
      isDuplicate: false,
      record: {
        eventId: event.eventId,
        eventType: event.eventType,
        summary: event.summary,
        resourceId: event.resourceId,
        signatureVerified: event.signatureVerified,
        processed: true,
        firstSeenAt: now,
        processedAt: now,
      },
    };
  }

  public recordPolicyAudit(
    operationId: string,
    decision: 'ALLOWED' | 'DENIED',
    reasons: string[],
    evaluatedRules: Record<string, any>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO policy_audit_log (
        operationId, decision, reasons, evaluatedRules, evaluatedAt
      ) VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      operationId,
      decision,
      JSON.stringify(reasons),
      JSON.stringify(evaluatedRules),
      new Date().toISOString()
    );
  }

  public close(): void {
    this.db.close();
  }
}
