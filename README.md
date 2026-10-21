# PayPal Agent Trust Gateway

> **Hackathon Submission — PayPal AI Hackathon 2025**
> A developer tool that enforces security, policy, and buyer-approval in PayPal AI-agent integrations.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Tests: 31 passing](https://img.shields.io/badge/Tests-31%20passing-brightgreen.svg)](#running-tests)
[![Environment: Sandbox Only](https://img.shields.io/badge/PayPal-Sandbox%20Only-orange.svg)](#security-boundaries)

## Product Goal

**PayPal Agent Trust Gateway** is a developer tool with two connected modes:

1. **Integration Auditor** - Read-only scan of any PayPal integration repository. Reports security and reliability findings with exact file paths, line numbers, evidence excerpts, confidence levels, and AI-powered fix suggestions.

2. **Guarded Sandbox Payment** - An AI agent proposes a purchase; deterministic merchant policy approves or denies it; approved orders are created in PayPal Sandbox via the official TypeScript Server SDK; the buyer completes PayPal approval; only then does the server capture.

### Problem Statement

"AI-assisted payment integrations combine agent tool access, merchant-side transaction limits, buyer approval, idempotent API calls, webhook processing, and dependency integrity. Developers must compose those controls across SDKs and services. PayPal Agent Trust Gateway makes those decisions visible, enforces merchant policy before an API call, and proves the approved flow in PayPal Sandbox."

## Monorepo Structure

```
paypal-agent-trust-gateway/
├── apps/
│   ├── api/                # Fastify REST API (Node.js 22 SQLite ledger)
│   └── web/                # React + Vite frontend (dark glass UI)
├── packages/
│   ├── shared/             # Types, server catalog, redaction utilities
│   ├── policy/             # PolicyEngine, GatewayLedger, state machine, idempotency
│   ├── paypal-adapter/     # Real PayPal SDK adapter + MockPayPalAdapter
│   ├── scanner/            # Static scanner engine, rules, SARIF exporter
│   └── guarded-tools/      # Narrow MCP server interface
├── fixtures/               # Benchmark scanner fixtures (attributed public repo excerpts)
├── tests/
│   ├── unit/               # Policy, ledger, state machine, idempotency, redaction (13 tests)
│   ├── scanner/            # Scanner fixture benchmark (13 tests)
│   ├── integration/        # Full gateway flow with fake PayPal server (4 tests)
│   └── sandbox/            # Opt-in real PayPal Sandbox (requires credentials)
├── docs/
├── scripts/
└── .env.example
```

## Setup

```bash
# Prerequisites: Node.js 22+, pnpm 12+
pnpm install

# Copy environment template
cp .env.example .env

# Start development servers
pnpm dev
# Frontend: http://localhost:5173
# API:      http://localhost:3001
```

## Running Tests

```bash
# Full test suite (no credentials required - 31 tests)
pnpm test

# Individual suites
pnpm test:unit        # Policy, ledger, state machine tests
pnpm test:scanner     # Scanner fixture benchmark
pnpm test:integration # Integration flow with mock PayPal

# Opt-in sandbox test (requires PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET)
pnpm test:sandbox
```

**Test Results (verified, no credentials needed):**
```
✓ tests/unit/policy.test.ts           13 tests - 81ms
✓ tests/scanner/scanner.test.ts       13 tests - 162ms
✓ tests/integration/gateway-flow.test.ts  4 tests - 651ms
✓ tests/sandbox/real-sandbox.test.ts  1 passed | 1 skipped (no creds)

Test Files: 4 passed
Tests: 31 passed | 1 skipped
Duration: ~5s
```

## Scanner CLI

```bash
pnpm build
node packages/scanner/dist/cli.js /path/to/paypal-integration
node packages/scanner/dist/cli.js . --format json
node packages/scanner/dist/cli.js . --format sarif
```

## Payment State Machine

```
PROPOSED -> DENIED
     |
     v
MERCHANT_APPROVED
     |
     v
ORDER_CREATED
     |
     v
BUYER_APPROVED  <- PayPal Sandbox buyer approval
     |
     v
CAPTURED
```

Capture is **impossible** before BUYER_APPROVED. The server verifies PayPal order state before transitioning.

## Scanner Rules

| Rule ID | Severity | Classification |
|---------|----------|----------------|
| DEP_FLOATING_VERSION | HIGH | CODE_FACT |
| LOCKFILE_ABSENT | MEDIUM | CODE_FACT |
| AGENT_TOOL_GRANT_UNRESTRICTED | MEDIUM | CODE_FACT |
| ENV_PRODUCTION_SELECTOR | MEDIUM | CODE_FACT |
| PAYPAL_POST_MISSING_IDEMPOTENCY | HIGH | CODE_FACT |
| PAYPAL_STATIC_REQUEST_ID | HIGH | CODE_FACT |
| PRICE_CLIENT_CONTROLLED | CRITICAL | CODE_FACT |
| CAPTURE_WITHOUT_APPROVAL_CHECK | HIGH | INFERENCE_REQUIRES_TEST |
| WEBHOOK_MISSING_VERIFICATION | HIGH | INFERENCE_REQUIRES_TEST |
| MOBILE_CHECKSUM_NOT_PROVENANCE | LOW | CODE_FACT |
| HISTORICAL_BUILD_INCIDENT | INFO | PUBLIC_ISSUE_REPORT |

## Security Boundaries

- **Sandbox only**: PayPal adapter rejects non-sandbox environment at construction
- **No AI price decisions**: Server resolves all prices from SERVER_CATALOG
- **No capture before buyer approval**: State machine enforces this strictly
- **Payload binding**: Idempotency keys bound to payload hash; mismatched payload throws IdempotencyConflictError
- **Secret redaction**: All logs, SARIF output, and API responses redact secrets
- **Webhook deduplication**: Duplicate event IDs rejected at DB layer

## Environment Variables

See .env.example for full list. Application runs in demo mode without credentials.

## License

Apache 2.0 - see LICENSE file.

## Links

- [PayPal AI Hackathon Rules](https://paypalaihackathon.devpost.com/rules)
- [PayPal Agent Toolkit](https://github.com/paypal/agent-toolkit)
- [PayPal TypeScript Server SDK](https://github.com/paypal/PayPal-TypeScript-Server-SDK)
- [PayPal Idempotency Docs](https://developer.paypal.com/api/rest/requests/)
