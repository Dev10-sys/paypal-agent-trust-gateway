export async function webhookHandler(req: any, res: any) {
  // Missing signature verification and event deduplication
  const event = req.body;
  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    fulfillOrder(event.resource.custom_id);
  }
  res.status(200).send("OK");
}
