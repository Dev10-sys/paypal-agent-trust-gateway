import requests
import json

class PayPalClient:
    def __init__(self, client_id, secret, context):
        self.client_id = client_id
        self.secret = secret
        self.context = context
        self.base_url = "https://api-m.sandbox.paypal.com"

    def build_headers(self):
        headers = {
            "Authorization": f"Bearer {self.client_id}",
            "Content-Type": "application/json",
            "User-Agent": "PayPal-Agent-Toolkit/Python"
        }
        return headers

    def post(self, uri, payload):
        url = f"{self.base_url}{uri}"
        headers = self.build_headers()
        response = requests.post(url, headers=headers, json=payload)
        return response.json()
