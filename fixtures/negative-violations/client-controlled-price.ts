export async function handleCheckout(req: any, res: any) {
  const amount = req.body.amount; // VULNERABILITY: trusting client amount
  const order = await paypal.createOrder({ amount });
  res.json(order);
}
