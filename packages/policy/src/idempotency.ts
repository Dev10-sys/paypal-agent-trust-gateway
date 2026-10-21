import { createHash, randomUUID } from 'node:crypto';
import { IdempotencyRecord } from '@paypal-gateway/shared';

export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const keyValues = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k])
  );
  return '{' + keyValues.join(',') + '}';
}

export function computePayloadHash(payload: any): string {
  const canonical = canonicalJsonStringify(payload);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function generateOperationId(): string {
  return `op_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export function generateIdempotencyKey(
  operationId: string,
  action: 'CREATE_ORDER' | 'CAPTURE_ORDER'
): string {
  const cleanOp = operationId.replace(/[^A-Za-z0-9_-]/g, '');
  const prefix = action === 'CREATE_ORDER' ? 'REQ-CREATE' : 'REQ-CAPTURE';
  return `${prefix}-${cleanOp}`;
}

export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}
