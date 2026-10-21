import {
  Client,
  Environment,
  OrdersController,
  CheckoutPaymentIntent,
} from '@paypal/paypal-server-sdk';
import { redactObject } from '@paypal-gateway/shared';
import {
  PayPalAdapterConfig,
  CreateOrderParams,
  CreateOrderResult,
  GetOrderResult,
  CaptureOrderParams,
  CaptureOrderResult,
} from './types.js';

export class PayPalClientAdapter {
  private client: Client;
  private ordersController: OrdersController;

  constructor(config: PayPalAdapterConfig) {
    if (config.environment !== 'sandbox') {
      throw new Error(
        `SECURITY_VIOLATION: PayPal Agent Trust Gateway only permits the 'sandbox' environment. ` +
          `Production credentials or target environment '${config.environment}' is strictly prohibited.`
      );
    }

    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: config.clientId,
        oAuthClientSecret: config.clientSecret,
      },
      environment: Environment.Sandbox,
      timeout: config.timeout || 30000,
    });

    this.ordersController = new OrdersController(this.client);
  }

  /**
   * Creates a PayPal Sandbox order using official PayPal TypeScript Server SDK.
   * Passes the stable idempotency key via the official `paypalRequestId` parameter.
   */
  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!params.paypalRequestId) {
      throw new Error(
        `MISSING_IDEMPOTENCY_KEY: Cannot call PayPal createOrder without a stable paypalRequestId.`
      );
    }

    const orderBody = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          referenceId: params.customId,
          description: params.description,
          amount: {
            currencyCode: params.currency,
            value: params.totalAmount.toFixed(2),
          },
        },
      ],
      applicationContext: {
        returnUrl: params.returnUrl || 'https://localhost:3000/paypal/return',
        cancelUrl: params.cancelUrl || 'https://localhost:3000/paypal/cancel',
        userAction: 'PAY_NOW',
      },
    };

    const response = await this.ordersController.createOrder({
      body: orderBody as any,
      paypalRequestId: params.paypalRequestId,
    });

    const result = response.result as any;
    const approvalLink = result.links?.find(
      (link: any) => link.rel === 'approve' || link.rel === 'payer-action'
    )?.href;

    return {
      orderId: result.id,
      status: result.status,
      approvalUrl: approvalLink,
      rawResponseRedacted: redactObject(result),
    };
  }

  /**
   * Fetches order status directly from PayPal Sandbox to verify current state.
   */
  public async getOrder(orderId: string): Promise<GetOrderResult> {
    const response = await this.ordersController.getOrder({ id: orderId });
    const result = response.result as any;

    return {
      orderId: result.id,
      status: result.status,
      intent: result.intent,
      rawResponseRedacted: redactObject(result),
    };
  }

  /**
   * Captures an authorized/approved PayPal Sandbox order.
   * CRITICAL SECURITY RULE:
   * The backend must fetch and check the order state through PayPal before capture.
   * Buyer approval is mandatory. AI output or browser redirect alone is NOT accepted.
   */
  public async captureOrder(params: CaptureOrderParams): Promise<CaptureOrderResult> {
    if (!params.paypalRequestId) {
      throw new Error(
        `MISSING_IDEMPOTENCY_KEY: Cannot call PayPal captureOrder without a stable paypalRequestId.`
      );
    }

    // 1. Mandatory backend order state verification
    const orderDetails = await this.getOrder(params.orderId);

    if (orderDetails.status !== 'APPROVED') {
      throw new Error(
        `BUYER_APPROVAL_REQUIRED: Order '${params.orderId}' cannot be captured because PayPal state is '${orderDetails.status}'. ` +
          `The buyer must complete authorization in PayPal Sandbox and the state must reach 'APPROVED' before capture.`
      );
    }

    // 2. Perform Capture with distinct capture idempotency key
    const response = await this.ordersController.captureOrder({
      id: params.orderId,
      paypalRequestId: params.paypalRequestId,
    });

    const result = response.result as any;
    const captureId =
      result.purchaseUnits?.[0]?.payments?.captures?.[0]?.id || result.id || 'captured';

    return {
      orderId: result.id,
      captureId,
      status: result.status,
      rawResponseRedacted: redactObject(result),
    };
  }
}
