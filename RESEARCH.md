# RESEARCH.md — PayPal Agent Trust Gateway

Evidence Classification per Project Spec: CODE_FACT | PUBLIC_ISSUE_REPORT | INFERENCE_REQUIRES_TEST | UNKNOWN

---

## CODE_FACT Evidence

Facts directly observed in publicly available source code, with exact path references.

### CF-1: Agent Toolkit TypeScript — Boolean Action Configuration
- **Source**: `paypal/agent-toolkit/typescript/src/shared/configuration.ts`
- **Finding**: The visible action configuration surface exposes per-action boolean flags (e.g., `createOrder: true`). No amount-cap or payee-allowlist is present in this configuration surface.
- **Implication**: Amount-based policy must be enforced by the application layer, not the toolkit action configuration.
- **Classification**: CODE_FACT
- **Scanner rule**: Documented in benchmark fixture `fixtures/agent-toolkit-ts/`

### CF-2: Agent Toolkit TypeScript — Context-Level Request ID
- **Source**: `paypal/agent-toolkit/typescript/src/shared/client.ts`
- **Finding**: The client maps `this._context.request_id` to `PayPal-Request-Id`. This is a context-level key, not a per-operation unique key. If the same context is used for multiple API calls, the same ID would be sent.
- **Classification**: CODE_FACT
- **Scanner rule**: `PAYPAL_STATIC_REQUEST_ID` — flags `this._context.request_id` usage
- **Source link**: https://github.com/paypal/agent-toolkit/blob/main/typescript/src/shared/client.ts

### CF-3: Agent Toolkit Python — build_headers Missing PayPal-Request-Id
- **Source**: `paypal/agent-toolkit/python/paypal_agent_toolkit/shared/paypal_client.py`
- **Finding**: `build_headers()` constructs Authorization, Content-Type, and User-Agent headers. The reviewed path did not include `PayPal-Request-Id` in the header builder or the `post()` call path.
- **Classification**: CODE_FACT
- **Scanner rule**: `PAYPAL_POST_MISSING_IDEMPOTENCY` — flags Python client build_headers without idempotency header
- **Source link**: https://github.com/paypal/agent-toolkit/blob/main/python/paypal_agent_toolkit/shared/paypal_client.py

### CF-4: Agent Toolkit Python — Buyer Approval in README
- **Source**: `paypal/agent-toolkit/python/README.md`
- **Finding**: The README explicitly documents a buyer approval step before invoking `pay_order`. The approved workflow includes: create order -> share approval link -> After approval by user, invoke pay_order.
- **Classification**: CODE_FACT (positive evidence of buyer approval awareness)
- **Impact on scanner**: Scanner MUST NOT report "no buyer approval" from this documented flow. This is a positive control in `fixtures/agent-toolkit-py/README.md`.
- **Source link**: https://github.com/paypal/agent-toolkit/blob/main/python/README.md

### CF-5: PayPal MCP Server — Floating Dependency
- **Source**: `paypal/paypal-mcp-server/package.json`
- **Finding**: `"@paypal/agent-toolkit": "latest"` — uses floating `latest` version.
- **Classification**: CODE_FACT (reproducibility / supply-chain hygiene issue, not malware or compromise)
- **Scanner rule**: `DEP_FLOATING_VERSION`
- **Source link**: https://github.com/paypal/paypal-mcp-server/blob/main/package.json

### CF-6: PayPal MCP Server — Tool Grant Configuration
- **Source**: `paypal/paypal-mcp-server/src/index.ts`
- **Finding**: Accepts `--tools=all` flag, enabling all registered tools. Has a production environment selector.
- **Classification**: CODE_FACT — these are operator-configurable choices, not vulnerabilities by themselves
- **Scanner rule**: `AGENT_TOOL_GRANT_UNRESTRICTED`, `ENV_PRODUCTION_SELECTOR`
- **Source link**: https://github.com/paypal/paypal-mcp-server/blob/main/src/index.ts

### CF-7: PayPal TypeScript Server SDK — Per-Call idempotency (POSITIVE CONTROL)
- **Source**: `paypal/PayPal-TypeScript-Server-SDK/src/controllers/ordersController.ts`
- **Finding**: The SDK accepts `paypalRequestId` per `createOrder`/`captureOrder` call via `req.header('PayPal-Request-Id', mapped.paypalRequestId)`. This is a positive integration-hardening control.
- **Classification**: CODE_FACT (positive control — correct implementation)
- **Scanner rule**: This must NOT be flagged by `PAYPAL_POST_MISSING_IDEMPOTENCY`. Verified as passing benchmark.
- **Source link**: https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/main/src/controllers/ordersController.ts

### CF-8: PayPal Risk iOS — Versioned Binary Checksum
- **Source**: `paypal/paypal-risk-ios/Package.swift`
- **Finding**: Contains `packageChecksum` for versioned binary targets. Checksum is present; this verifies integrity of the downloaded binary artifact.
- **Boundary**: Checksum presence ≠ sigstore provenance or SLSA attestation. These are separate supply-chain concepts.
- **Classification**: CODE_FACT
- **Scanner rule**: `MOBILE_CHECKSUM_NOT_PROVENANCE`
- **Source link**: https://github.com/paypal/paypal-risk-ios/blob/main/Package.swift

---

## PUBLIC_ISSUE_REPORT Evidence

Facts from public GitHub issues, changelogs, or release notes. Historical; resolved status noted.

### PI-1: Braintree iOS — PPRiskMagnes Certificate Revocation Build Incident
- **Source**: https://github.com/braintree/braintree_ios/issues/1857
- **Finding**: GitHub issue #1857 documents a PPRiskMagnes build failure caused by certificate revocation. The maintainer acknowledged and documented the fix in version 7.11.0.
- **Status**: RESOLVED — documented fix applied.
- **Classification**: PUBLIC_ISSUE_REPORT (historical resolved trust/build incident)
- **Scanner rule**: `HISTORICAL_BUILD_INCIDENT` — clearly marked as historical, not active compromise
- **Source link**: https://github.com/braintree/braintree_ios/issues/1857

### PI-2: PayPal iOS 3.1.0 Release
- **Source**: https://github.com/paypal/paypal-ios/releases/tag/3.1.0
- **Finding**: Release notes document migration and dependency updates including Risk SDK. Used as fixture for release history analysis.
- **Classification**: PUBLIC_ISSUE_REPORT (informational historical release)

---

## INFERENCE_REQUIRES_TEST Evidence

Patterns inferred from static analysis that require runtime testing to confirm or deny.

### IT-1: Capture Path Without Buyer Approval Verification
- **Finding**: Static analysis can identify capture calls without an observable buyer-approved state check. However, state could be verified in a wrapper, middleware, or external service not visible in the scanned file.
- **Correct classification**: INFERENCE_REQUIRES_TEST — not "confirmed vulnerability"
- **Scanner behavior**: Reports as `CAPTURE_WITHOUT_APPROVAL_CHECK` with `INFERENCE_REQUIRES_TEST` classification. Wording says "review required" not "vulnerable."

### IT-2: Webhook Signature Verification
- **Finding**: Static analysis can detect webhook handlers lacking observable signature verification. However, verification could occur in middleware or a separate interceptor.
- **Classification**: INFERENCE_REQUIRES_TEST
- **Scanner rule**: `WEBHOOK_MISSING_VERIFICATION`

---

## UNKNOWN Evidence

Areas where evidence is absent from reviewed repositories. Not claimed as negative proof.

### UK-1: Post-Quantum Cryptography Status
- **Finding**: No evidence in reviewed PayPal repositories establishes PayPal's internal PQC/TLS migration status.
- **Classification**: UNKNOWN — absent evidence
- **Correct framing**: Optional inventory only. Never claimed PayPal is quantum-vulnerable.
- **Reference**: NIST PQC FIPS 203/204/205 approved August 2024: https://www.nist.gov/news-events/news/2024/08/announcing-approval-three-federal-information-processing-standards-fips

### UK-2: APK/apko Usage
- **Finding**: No evidence in reviewed repositories establishes PayPal use of Chainguard apko or Alpine apk-tools.
- **Classification**: UNKNOWN — absent evidence, not built into product assumptions

### UK-3: PayPal Internal PQC/TLS Status
- **Finding**: No evidence establishes PayPal's internal migration to PQC-ready TLS.
- **Classification**: UNKNOWN

---

## Source Index

| Source | URL |
|--------|-----|
| Agent Toolkit configuration.ts | https://github.com/paypal/agent-toolkit/blob/main/typescript/src/shared/configuration.ts |
| Agent Toolkit Python client | https://github.com/paypal/agent-toolkit/blob/main/python/paypal_agent_toolkit/shared/paypal_client.py |
| Agent Toolkit Python README | https://github.com/paypal/agent-toolkit/blob/main/python/README.md |
| MCP Server package.json | https://github.com/paypal/paypal-mcp-server/blob/main/package.json |
| MCP Server index.ts | https://github.com/paypal/paypal-mcp-server/blob/main/src/index.ts |
| TypeScript Server SDK ordersController | https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/main/src/controllers/ordersController.ts |
| TypeScript Server SDK defaultConfiguration | https://github.com/paypal/PayPal-TypeScript-Server-SDK/blob/main/src/defaultConfiguration.ts |
| PayPal Risk iOS Package.swift | https://github.com/paypal/paypal-risk-ios/blob/main/Package.swift |
| Braintree iOS Issue 1857 | https://github.com/braintree/braintree_ios/issues/1857 |
| PayPal iOS 3.1.0 Release | https://github.com/paypal/paypal-ios/releases/tag/3.1.0 |
| PayPal REST API Specifications | https://github.com/paypal/paypal-rest-api-specifications |
| PayPal AI Toolkit doctor.md | https://github.com/paypal/AI-Toolkit/blob/main/commands/doctor.md |
| PayPal Idempotency Docs | https://developer.paypal.com/api/rest/requests/ |
| PayPal Orders Integration | https://developer.paypal.com/api/rest/integration/orders-api |
| PayPal Webhook Docs | https://developer.paypal.com/api/rest/webhooks/ |
| NIST PQC Standards | https://www.nist.gov/news-events/news/2024/08/announcing-approval-three-federal-information-processing-standards-fips |

---

*This document was generated from source evidence only. No claim in this document should be read as a confirmed PayPal production vulnerability, duplicate charge mechanism, apko usage, or PQC status claim.*
