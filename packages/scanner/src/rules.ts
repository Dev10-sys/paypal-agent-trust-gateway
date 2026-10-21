import { AuditFinding, Classification, ConfidenceLevel, FindingSeverity } from '@paypal-gateway/shared';

export interface RuleDefinition {
  id: string;
  title: string;
  classification: Classification;
  defaultSeverity: FindingSeverity;
  defaultConfidence: ConfidenceLevel;
  whyItMatters: string;
  remediation: string;
  testSuggestion: string;
  sourceLinks: string[];
}

export const SCANNER_RULES: Record<string, RuleDefinition> = {
  DEP_FLOATING_VERSION: {
    id: 'DEP_FLOATING_VERSION',
    title: 'Floating Dependency Version in Manifest',
    classification: 'CODE_FACT',
    defaultSeverity: 'MEDIUM',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'Specifying unpinned or floating versions (such as "latest" or "*") causes non-reproducible builds ' +
      'and automatically incorporates upstream changes or unexpected breaking modifications without explicit audit.',
    remediation:
      'Pin the dependency to a concrete immutable release tag or exact semver version (e.g. "@paypal/agent-toolkit": "1.0.4").',
    testSuggestion:
      'Run a lockfile audit or dependency-check in CI to verify that all dependencies resolve to pinned semantic versions.',
    sourceLinks: [
      'https://github.com/paypal/paypal-mcp-server/blob/main/package.json',
      'https://docs.npmjs.com/about-semantic-versioning',
    ],
  },

  LOCKFILE_ABSENT: {
    id: 'LOCKFILE_ABSENT',
    title: 'Missing Package Lockfile',
    classification: 'CODE_FACT',
    defaultSeverity: 'MEDIUM',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'Absence of a lockfile (package-lock.json, pnpm-lock.yaml, yarn.lock, or poetry.lock) allows transitively resolved ' +
      'packages to drift between development, staging, and production environments.',
    remediation:
      'Generate and commit a deterministic lockfile using your package manager (e.g. pnpm install, npm install).',
    testSuggestion:
      'Add a CI check verifying lockfile presence and consistency (e.g., npm ci or pnpm install --frozen-lockfile).',
    sourceLinks: [
      'https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json',
      'https://pnpm.io/git#lockfiles',
    ],
  },

  AGENT_TOOL_GRANT_UNRESTRICTED: {
    id: 'AGENT_TOOL_GRANT_UNRESTRICTED',
    title: 'Unrestricted Agent / MCP Tool Grants Configuration',
    classification: 'CODE_FACT',
    defaultSeverity: 'MEDIUM',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'Granting all capabilities (--tools=all or wildcard action grants) gives AI agents unrestricted access ' +
      'to high-risk operations (e.g. orders.create, orders.capture, payments.createRefund, disputes.create). ' +
      'This is an operator configuration choice that warrants principle-of-least-privilege review.',
    remediation:
      'Restrict agent tool flags to the specific minimal set needed for the workflow (e.g. --tools=invoices.get,orders.get).',
    testSuggestion:
      'Test agent tool initialization with explicit, narrow tool arrays and verify prohibited actions reject cleanly.',
    sourceLinks: [
      'https://github.com/paypal/paypal-mcp-server/blob/main/src/index.ts#L104',
      'https://github.com/paypal/agent-toolkit/blob/main/typescript/src/shared/configuration.ts',
    ],
  },

  ENV_PRODUCTION_SELECTOR: {
    id: 'ENV_PRODUCTION_SELECTOR',
    title: 'Operator Production Environment Selector Detected',
    classification: 'CODE_FACT',
    defaultSeverity: 'LOW',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'The configuration surface allows selecting production environment via command-line flags or environment variables. ' +
      'This is an operator-configurable capability, not a vulnerability in itself, but requires explicit guardrails to prevent accidental live charges.',
    remediation:
      'Introduce a merchant-side gateway or explicit gate requiring confirmed production approval and hard limits before pointing to Live.',
    testSuggestion:
      'Assert that default configurations strictly target Sandbox and that production mode is rejected unless explicitly authorized.',
    sourceLinks: [
      'https://github.com/paypal/paypal-mcp-server/blob/main/src/index.ts#L55',
    ],
  },

  PAYPAL_POST_MISSING_IDEMPOTENCY: {
    id: 'PAYPAL_POST_MISSING_IDEMPOTENCY',
    title: 'PayPal State-Changing POST Without Explicit Idempotency Key',
    classification: 'CODE_FACT',
    defaultSeverity: 'HIGH',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'Network timeouts or retries on state-changing PayPal POST calls (create order, capture, refund) without ' +
      'a unique PayPal-Request-Id header can cause duplicate charges or authorizations on the payment processor.',
    remediation:
      'Generate and pass a stable per-operation idempotency key using the PayPal-Request-Id header or the official SDK paypalRequestId parameter.',
    testSuggestion:
      'Simulate network timeout on order creation and capture; assert that the retry sends the exact same PayPal-Request-Id and receives cached response.',
    sourceLinks: [
      'https://developer.paypal.com/api/rest/requests/#idempotency',
      'https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/main/src/controllers/ordersController.ts#L102',
      'https://github.com/paypal/agent-toolkit/blob/main/python/paypal_agent_toolkit/shared/paypal_client.py#L37',
    ],
  },

  PAYPAL_STATIC_REQUEST_ID: {
    id: 'PAYPAL_STATIC_REQUEST_ID',
    title: 'Context-Level or Static Request ID Shared Across Requests',
    classification: 'CODE_FACT',
    defaultSeverity: 'HIGH',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'Sharing a single context-level request_id across multiple distinct operations causes subsequent operations ' +
      'to collide with PayPal idempotency cache, returning cached results or failing with idempotency errors.',
    remediation:
      'Generate a distinct, unique idempotency key per logical PayPal operation (e.g. unique keys for create vs capture).',
    testSuggestion:
      'Execute two distinct purchase flows through the same client context; verify each operation receives a unique PayPal-Request-Id.',
    sourceLinks: [
      'https://github.com/paypal/agent-toolkit/blob/main/typescript/src/shared/client.ts#L122',
      'https://developer.paypal.com/api/rest/requests/#idempotency',
    ],
  },

  PRICE_CLIENT_CONTROLLED: {
    id: 'PRICE_CLIENT_CONTROLLED',
    title: 'Price or Currency Accepted Directly From Client or AI Input',
    classification: 'CODE_FACT',
    defaultSeverity: 'CRITICAL',
    defaultConfidence: 'HIGH',
    whyItMatters:
      'Accepting payment amount or currency directly from client requests or LLM tool arguments allows ' +
      'price tampering, parameter manipulation, or hallucinated zero-dollar / discounted orders.',
    remediation:
      'Resolve pricing and currency strictly on the backend using a server-owned catalog or verified cart database.',
    testSuggestion:
      'Submit a payment proposal with a client-supplied price differing from the server catalog; verify deterministic rejection.',
    sourceLinks: [
      'https://developer.paypal.com/api/rest/integration/orders-api',
      'https://github.com/paypal/AI-Toolkit/blob/main/commands/doctor.md',
    ],
  },

  CAPTURE_WITHOUT_APPROVAL_CHECK: {
    id: 'CAPTURE_WITHOUT_APPROVAL_CHECK',
    title: 'Capture Call Without Observable Buyer-Approved State Check',
    classification: 'INFERENCE_REQUIRES_TEST',
    defaultSeverity: 'HIGH',
    defaultConfidence: 'HEURISTIC',
    whyItMatters:
      'Calling orders.capture without prior server-side verification of the order state (status === "APPROVED") ' +
      'fails PayPal processing or relies dangerously on unvalidated browser redirect signals. (Review required; requires runtime test).',
    remediation:
      'Query PayPal order details via getOrder prior to capture and verify that the status is APPROVED before issuing capture.',
    testSuggestion:
      'Attempt to trigger capture on an order in CREATED state; verify that the application halts and requires buyer approval first.',
    sourceLinks: [
      'https://developer.paypal.com/api/rest/integration/orders-api#capture-order',
      'https://github.com/paypal/agent-toolkit/blob/main/python/README.md#L151',
    ],
  },

  WEBHOOK_MISSING_VERIFICATION: {
    id: 'WEBHOOK_MISSING_VERIFICATION',
    title: 'PayPal Webhook Handler Missing Signature Verification or Event Deduplication',
    classification: 'INFERENCE_REQUIRES_TEST',
    defaultSeverity: 'HIGH',
    defaultConfidence: 'MEDIUM',
    whyItMatters:
      'Webhook endpoints that do not verify PayPal transmission signatures or deduplicate event IDs ' +
      'are susceptible to forged payment fulfillment events and duplicate replay attacks.',
    remediation:
      'Implement PayPal webhook signature verification (using PayPal SDK or /v1/notifications/verify-webhook-signature) and persist event IDs for deduplication.',
    testSuggestion:
      'Send a forged webhook payload and assert 401/403 rejection; replay a valid webhook and assert duplicate processing is skipped.',
    sourceLinks: [
      'https://developer.paypal.com/api/rest/webhooks/rest-webhooks-security/',
      'https://developer.paypal.com/api/rest/webhooks/',
    ],
  },

  MOBILE_CHECKSUM_NOT_PROVENANCE: {
    id: 'MOBILE_CHECKSUM_NOT_PROVENANCE',
    title: 'Binary Checksum Present in Mobile Package Manifest',
    classification: 'CODE_FACT',
    defaultSeverity: 'INFO',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'The package manifest specifies a versioned binary artifact URL and SHA-256 checksum. ' +
      'A checksum guarantees download integrity against bit rot or tampering in transit, but does not by itself prove author provenance or code-signing chain validity.',
    remediation:
      'Verify digital signature and code-signing certificate validity alongside package checksum verification.',
    testSuggestion:
      'Verify that artifact builds validate code signatures during CI packaging (e.g., codesign --verify).',
    sourceLinks: [
      'https://github.com/paypal/paypal-risk-ios/blob/main/Package.swift#L6',
      'https://github.com/braintree/braintree_ios/issues/1857',
    ],
  },

  HISTORICAL_BUILD_INCIDENT: {
    id: 'HISTORICAL_BUILD_INCIDENT',
    title: 'Historical Build / Trust Incident Reference',
    classification: 'PUBLIC_ISSUE_REPORT',
    defaultSeverity: 'INFO',
    defaultConfidence: 'CONFIRMED',
    whyItMatters:
      'Historical issue report (e.g. Braintree iOS #1857 PPRiskMagnes certificate revocation). ' +
      'This represents a resolved trust/certificate expiration event fixed in maintainer releases (7.11.0+), not a compromised artifact.',
    remediation:
      'Ensure modern dependency versions (braintree_ios >= 7.11.0 or modern paypal-risk-ios) are maintained.',
    testSuggestion:
      'Verify modern SDK release versions build cleanly on current Xcode / toolchains.',
    sourceLinks: [
      'https://github.com/braintree/braintree_ios/issues/1857',
      'https://github.com/paypal/paypal-ios/releases/tag/3.1.0',
    ],
  },

  CRYPTO_INVENTORY: {
    id: 'CRYPTO_INVENTORY',
    title: 'Cryptographic Inventory / Post-Quantum Readiness',
    classification: 'UNKNOWN',
    defaultSeverity: 'INFO',
    defaultConfidence: 'UNKNOWN',
    whyItMatters:
      'Public repositories expose classical cryptographic primitives (e.g. SHA-256, RSA/ECDSA in TLS/signatures). ' +
      'Internal PayPal Post-Quantum Cryptography (PQC) or hybrid TLS migration status is not observable from public repositories; labeled as UNKNOWN.',
    remediation:
      'Track NIST FIPS 203/204/205 standards for post-quantum hybrid key exchange as industry standards evolve.',
    testSuggestion:
      'Inspect TLS connection ciphersuites on sandbox and production gateway endpoints.',
    sourceLinks: [
      'https://www.nist.gov/news-events/news/2024/08/announcing-approval-three-federal-information-processing-standards-fips',
    ],
  },
};
