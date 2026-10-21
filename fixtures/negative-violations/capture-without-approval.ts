export async function processPayment(orderId: string) {
  // Blind capture call without checking status === 'APPROVED'
  return ordersController.captureOrder({ id: orderId });
}
