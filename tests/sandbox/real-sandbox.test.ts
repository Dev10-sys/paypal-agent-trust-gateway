import { describe, it, expect } from 'vitest';
import { PayPalClientAdapter } from '../../packages/paypal-adapter/src/paypal-client-adapter.js';

describe('Opt-In Real PayPal Sandbox Tests', () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const hasCredentials = Boolean(clientId && clientSecret);

  it('1. Rejects production environment configuration unconditionally', () => {
    expect(() => {
      new PayPalClientAdapter({
        clientId: 'any_id',
        clientSecret: 'any_secret',
        environment: 'production' as any,
      });
    }).toThrow(/SECURITY_VIOLATION/);
  });

  it.skipIf(!hasCredentials)(
    '2. Executes live PayPal Sandbox order creation and status check with real credentials',
    async () => {
      const adapter = new PayPalClientAdapter({
        clientId: clientId!,
        clientSecret: clientSecret!,
        environment: 'sandbox',
      });

      const order = await adapter.createOrder({
        paypalRequestId: `TEST-SANDBOX-${Date.now()}`,
        totalAmount: 10.0,
        currency: 'USD',
        description: 'Opt-in Sandbox Integration Test',
        customId: `TEST-OP-${Date.now()}`,
      });

      expect(order.orderId).toBeDefined();
      expect(order.status).toBe('CREATED');
      expect(order.approvalUrl).toBeDefined();

      const details = await adapter.getOrder(order.orderId);
      expect(details.orderId).toBe(order.orderId);
      expect(details.status).toBe('CREATED');
    }
  );
});
