import { SERVER_CATALOG } from '@paypal-gateway/shared';

export class HardenedOrderService {
  async handlePurchase(catalogId: string, quantity: number, paypalClient: any) {
    const item = SERVER_CATALOG[catalogId];
    if (!item) throw new Error("Invalid catalog item");
    const amount = item.unitPrice * quantity;
    const createRequestId = "IDEM-" + Date.now();

    const order = await paypalClient.createOrder({
      body: { amount },
      paypalRequestId: createRequestId
    });

    return order;
  }

  async handleCapture(orderId: string, paypalClient: any) {
    const order = await paypalClient.getOrder(orderId);
    if (order.status !== 'APPROVED') {
      throw new Error("Order not approved by buyer");
    }
    const captureRequestId = "IDEM-CAP-" + Date.now();
    return paypalClient.captureOrder({ id: orderId, paypalRequestId: captureRequestId });
  }
}
