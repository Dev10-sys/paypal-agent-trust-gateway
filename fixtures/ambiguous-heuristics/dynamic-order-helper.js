function dynamicCapture(orderId, client) {
  // State check may happen inside opaque dynamic middleware
  return client.captureOrder(orderId);
}
