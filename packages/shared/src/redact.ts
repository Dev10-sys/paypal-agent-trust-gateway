const SENSITIVE_KEY_PATTERNS = [
  /access_token/i,
  /client_secret/i,
  /authorization/i,
  /secret/i,
  /password/i,
  /api[_-]?key/i,
  /card_number/i,
  /cvv/i,
  /security_code/i,
  /refresh_token/i,
];

export function redactString(str: string): string {
  if (!str) return str;
  let redacted = str;

  // Redact PayPal token pattern first
  redacted = redacted.replace(/A21AA[A-Za-z0-9_\-]{20,}/g, '[REDACTED_ACCESS_TOKEN]');

  // Redact Bearer tokens
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9_\-\.]{8,}/gi, 'Bearer [REDACTED_TOKEN]');

  // Redact Basic auth
  redacted = redacted.replace(/Basic\s+[A-Za-z0-9+/=]{10,}/gi, 'Basic [REDACTED_AUTH]');

  // Redact credit card numbers
  redacted = redacted.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD_NUMBER]');

  // Redact inline secrets e.g. secret="xyz"
  redacted = redacted.replace(/(?:secret|token|key)\s*[:=]\s*["']?([A-Za-z0-9_\-]{16,})["']?/gi, 'secret="[REDACTED_SECRET]"');

  return redacted;
}

export function redactObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return redactString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        result[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactObject(value);
      } else if (typeof value === 'string') {
        result[key] = redactString(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}
