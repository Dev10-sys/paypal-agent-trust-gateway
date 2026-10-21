export class OrdersController {
  public async ordersCreate({ body, paypalRequestId }: { body: any; paypalRequestId?: string }) {
    const mapped = { paypalRequestId };
    const req: any = { headers: {} };
    if (mapped.paypalRequestId) {
      req.header('PayPal-Request-Id', mapped.paypalRequestId);
    }
    return { id: 'MOCK_ORDER_123', status: 'CREATED' };
  }

  public async ordersCapture({ id, paypalRequestId }: { id: string; paypalRequestId?: string }) {
    const mapped = { paypalRequestId };
    const req: any = { headers: {} };
    if (mapped.paypalRequestId) {
      req.header('PayPal-Request-Id', mapped.paypalRequestId);
    }
    return { id, status: 'COMPLETED' };
  }
}
