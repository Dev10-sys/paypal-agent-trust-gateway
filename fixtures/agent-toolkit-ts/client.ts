export class PayPalClient {
  private _context: any;

  constructor(context: any) {
    this._context = context;
  }

  public async post(url: string, data: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this._context.request_id) {
      headers['PayPal-Request-Id'] = this._context.request_id;
    }
    return fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
  }
}
