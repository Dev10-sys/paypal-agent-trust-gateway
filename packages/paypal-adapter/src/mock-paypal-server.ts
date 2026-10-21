import { redactObject } from '@paypal-gateway/shared';
import {
  CreateOrderParams,
  CreateOrderResult,
  GetOrderResult,
  CaptureOrderParams,
  CaptureOrderResult,
} from './types.js';

interface MockOrderRecord {
  id: string;
  createRequestId: string;
  captureRequestId?: string;
  totalAmount: number;
  currency: string;
  description: string;
  customId: string;
  status: 'CREATED' | 'APPROVED' | 'COMPLETED' | 'VOIDED';
  captureId?: string;
  createdAt: string;
}

export class MockPayPalAdapter {
  private orders: Map<string, MockOrderRecord> = new Map();
  private requestHistory: Map<string, { bodyHash: string; response: any }> = new Map();

  constructor() {}

  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!params.paypalRequestId) {
      throw new Error('MISSING_IDEMPOTENCY_KEY: Cannot call PayPal createOrder without a stable paypalRequestId.');
    }

    const bodyString = `${params.currency}_${params.totalAmount}_${params.customId}`;
    const previous = this.requestHistory.get(params.paypalRequestId);

    if (previous) {
      if (previous.bodyHash !== bodyString) {
        throw new Error(
          `IDEMPOTENCY_CONFLICT: PayPal-Request-Id '${params.paypalRequestId}' already used with differing payload.`
        );
      }
      return previous.response;
    }

    const orderId = `MOCK-ORDER-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    const orderRecord: MockOrderRecord = {
      id: orderId,
      createRequestId: params.paypalRequestId,
      totalAmount: params.totalAmount,
      currency: params.currency,
      description: params.description,
      customId: params.customId,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
    };

    this.orders.set(orderId, orderRecord);

    const result: CreateOrderResult = {
      orderId,
      status: 'CREATED',
      approvalUrl,
      rawResponseRedacted: redactObject({
        id: orderId,
        status: 'CREATED',
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: params.customId,
            amount: { currency_code: params.currency, value: params.totalAmount.toFixed(2) },
          },
        ],
        links: [
          { href: approvalUrl, rel: 'approve', method: 'GET' },
          { href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, rel: 'self', method: 'GET' },
          { href: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, rel: 'capture', method: 'POST' },
        ],
      }),
    };

    this.requestHistory.set(params.paypalRequestId, {
      bodyHash: bodyString,
      response: result,
    });

    return result;
  }

  public async getOrder(orderId: string): Promise<GetOrderResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`RESOURCE_NOT_FOUND: Order '${orderId}' not found in mock PayPal store.`);
    }

    return {
      orderId: order.id,
      status: order.status,
      intent: 'CAPTURE',
      rawResponseRedacted: redactObject({
        id: order.id,
        status: order.status,
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.customId,
            amount: { currency_code: order.currency, value: order.totalAmount.toFixed(2) },
          },
        ],
      }),
    };
  }

  /**
   * Simulates the buyer authenticating in PayPal Sandbox and giving consent.
   * Changes status from 'CREATED' -> 'APPROVED'.
   */
  public simulateBuyerApproval(orderId: string): { orderId: string; status: string } {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`RESOURCE_NOT_FOUND: Order '${orderId}' not found.`);
    }

    if (order.status !== 'CREATED') {
      throw new Error(`Cannot simulate buyer approval for order in status '${order.status}'. Must be 'CREATED'.`);
    }

    order.status = 'APPROVED';
    return { orderId: order.id, status: order.status };
  }

  public async captureOrder(params: CaptureOrderParams): Promise<CaptureOrderResult> {
    if (!params.paypalRequestId) {
      throw new Error('MISSING_IDEMPOTENCY_KEY: Cannot call PayPal captureOrder without a stable paypalRequestId.');
    }

    const order = this.orders.get(params.orderId);
    if (!order) {
      throw new Error(`RESOURCE_NOT_FOUND: Order '${params.orderId}' not found.`);
    }

    // Backend order state verification
    if (order.status !== 'APPROVED') {
      throw new Error(
        `BUYER_APPROVAL_REQUIRED: Order '${params.orderId}' cannot be captured because PayPal state is '${order.status}'. ` +
          `The buyer must complete authorization in PayPal Sandbox and the state must reach 'APPROVED' before capture.`
      );
    }

    // Check capture idempotency
    const captureHistory = this.requestHistory.get(params.paypalRequestId);
    if (captureHistory) {
      return captureHistory.response;
    }

    const captureId = `MOCK-CAPTURE-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    order.status = 'COMPLETED';
    order.captureId = captureId;
    order.captureRequestId = params.paypalRequestId;

    const result: CaptureOrderResult = {
      orderId: order.id,
      captureId,
      status: 'COMPLETED',
      rawResponseRedacted: redactObject({
        id: order.id,
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: captureId,
                  status: 'COMPLETED',
                  amount: { currency_code: order.currency, value: order.totalAmount.toFixed(2) },
                },
              ],
            },
          },
        ],
      }),
    };

    this.requestHistory.set(params.paypalRequestId, {
      bodyHash: `capture_${params.orderId}`,
      response: result,
    });

    return result;
  }

  public clear(): void {
    this.orders.clear();
    this.requestHistory.clear();
  }
}
