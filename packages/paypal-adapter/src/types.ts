export interface PayPalAdapterConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox'; // strictly sandbox
  timeout?: number;
}

export interface CreateOrderParams {
  paypalRequestId: string;
  totalAmount: number;
  currency: string;
  description: string;
  customId: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateOrderResult {
  orderId: string;
  status: string;
  approvalUrl?: string;
  rawResponseRedacted: any;
}

export interface GetOrderResult {
  orderId: string;
  status: string;
  intent: string;
  rawResponseRedacted: any;
}

export interface CaptureOrderParams {
  orderId: string;
  paypalRequestId: string;
  expectedAmount?: number;
  expectedCurrency?: string;
}

export interface CaptureOrderResult {
  orderId: string;
  captureId: string;
  status: string;
  rawResponseRedacted: any;
}
