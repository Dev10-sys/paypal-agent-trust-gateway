# PayPal Agent Trust Gateway

> Deterministic Policy Gate, Idempotency Coordinator, and Static Code Auditor for PayPal AI Agent Integrations

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Tests: 31 passing](https://img.shields.io/badge/Tests-31%20passing-brightgreen.svg)](#test-suite-execution)
[![Environment: Sandbox Enforced](https://img.shields.io/badge/PayPal-Sandbox%20Enforced-003087.svg)](#security-boundaries)

---

## Executive Summary

Artificial intelligence agents operating on financial payment surfaces introduce novel systemic risks: prompt injection can manipulate transaction parameters, non-deterministic language models can generate arbitrary prices, and network retries without per-call idempotency keys risk duplicate charges.

**PayPal Agent Trust Gateway** provides an enterprise security and reliability layer that isolates merchant policy enforcement from non-deterministic language models. The solution operates in two complementary modes:

1. **Integration Auditor**: Performs read-only static analysis on PayPal integration codebases (including official PayPal repositories). Evaluates dependencies, request headers, tool permission scopes, and state machine transitions, reporting findings with exact file paths, line numbers, and standardized evidence classifications.
2. **Guarded Sandbox Payment Gateway**: Coordinates end-to-end payment lifecycle operations in the PayPal Sandbox. Enforces server-authoritative catalog pricing, deterministic transaction caps, cryptographic idempotency key bindings, and pre-flight verification of buyer approval before payment capture.

---

## Architectural Principles

```
  +-------------------------------------------------------------------------+
  |                             AI Agent Layer                              |
  |  - Interprets user language                                            |
  |  - Selects catalog target identifier (e.g., "ads_basic")                |
  |  - CANNOT set, alter, or negotiate transaction price                    |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |                   PayPal Agent Trust Gateway Engine                     |
  |                                                                         |
  |  1. Authoritative Catalog Lookup (Server-side price binding)            |
  |  2. Deterministic Policy Evaluation (Caps, currencies, payee rules)     |
  |  3. State Machine Transition: PROPOSED -> MERCHANT_APPROVED            |
  |  4. Idempotency Registration (Unique PayPal-Request-Id + SHA-256 hash)  |
  +------------------------------------+------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |                         PayPal Sandbox Service                          |
  |  - Orders API: Creates order bound to per-call idempotency key          |
  |  - Buyer Approval: Authenticated approval in PayPal Sandbox             |
  |  - Pre-Flight Verification: Gateway verifies status == "APPROVED"       |
  |  - Capture API: Dispatches capture with distinct idempotency key        |
  +-------------------------------------------------------------------------+
```

### Core Security Invariants

- **Authoritative Catalog Enforcement**: Client-side or agent-supplied price overrides are unconditionally discarded. Prices are resolved exclusively from a merchant-governed, server-side catalog.
- **Strict Sandbox Isolation**: All network calls are programmatically restricted to PayPal Sandbox endpoints (`https://api-m.sandbox.paypal.com`). Any initialization attempt specifying a live or production environment is aborted at constructor time.
- **Pre-Flight Capture Gating**: An order cannot be captured without verified buyer approval. The gateway queries order state directly from PayPal before permitting the capture dispatch.
- **Cryptographic Idempotency Binding**: Every logical operation is assigned a distinct `PayPal-Request-Id`. The gateway records a SHA-256 hash of the initial request payload. Retries with identical payloads safely return the recorded result; retries with conflicting payloads are rejected with HTTP 409 (`IdempotencyConflictError`).
- **Data Protection and Secret Redaction**: Client credentials, bearer tokens, and sensitive authentication headers are automatically scrubbed from logs, ledger storage, and SARIF exports.

---

## Monorepo Layout

```
paypal-agent-trust-gateway/
├── apps/
│   ├── api/                     Fastify backend service with SQLite ledger
│   └── web/                     React + Vite dashboard with PayPal enterprise design
├── packages/
│   ├── shared/                  Shared interfaces, catalog definitions, redaction utils
│   ├── policy/                  PolicyEngine, GatewayLedger, state machine, idempotency
│   ├── paypal-adapter/          Official PayPal SDK adapter and offline mock adapter
│   ├── scanner/                 Static AST and pattern analysis engine with SARIF exporter
│   └── guarded-tools/           Constrained Model Context Protocol (MCP) server
├── cloned-repos/                Official PayPal repositories cloned for live audit
│   ├── agent-toolkit/           Official PayPal Agent Toolkit (Python and TypeScript)
│   ├── paypal-js/               Official PayPal JavaScript Client SDK
│   └── braintree_ios/           Official PayPal Braintree iOS SDK
├── fixtures/                    Targeted regression test fixtures
├── tests/
│   ├── unit/                    Policy engine, ledger, and state machine tests (13 tests)
│   ├── scanner/                 Fixture benchmark and detection rule tests (13 tests)
│   ├── integration/             End-to-end gateway lifecycle tests (4 tests)
│   └── sandbox/                 Credential-dependent live sandbox validation (2 tests)
├── docs/
│   ├── demo-script.js           Automated live demonstration script
│   └── sample-policy.json       Merchant policy configuration specification
├── LICENSE                      Apache License 2.0
├── README.md                    System documentation
└── RESEARCH.md                  Research evidence log and findings classifications
```

---

## Getting Started

### Prerequisites

- Node.js version 22.0.0 or higher
- pnpm version 12.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/paypal-agent-trust-gateway.git
cd paypal-agent-trust-gateway

# Install dependencies across all workspace packages
pnpm install

# Copy environment configuration
cp .env.example .env

# Build all packages
pnpm build
```

### Running Locally

```bash
# Start both backend API (port 4000) and frontend dashboard (port 3000)
pnpm dev
```

- Web Dashboard: `http://localhost:3000`
- API Health Endpoint: `http://localhost:4000/api/health`

---

## Test Suite Execution

The repository contains 31 automated tests covering policy evaluation, scanner rule correctness, state machine constraints, and integration flows. No external credentials are required to execute the primary test suite.

```bash
# Execute the complete automated test suite
pnpm test

# Run individual test domains
pnpm test:unit         # Policy engine, ledger, state machine, idempotency
pnpm test:scanner      # Integration code auditor and rule benchmarks
pnpm test:integration  # Complete proposal-to-capture gateway simulation
pnpm test:sandbox      # Opt-in live PayPal Sandbox test (requires credentials)
```

### Verified Test Summary

```
Test Files  4 passed (4)
Tests       31 passed | 1 skipped (real sandbox credential test)
Duration    ~5 seconds
```

---

## Automated Live Demonstration

An automated demonstration script validates all security and policy controls sequentially against the running gateway:

```bash
node docs/demo-script.js
```

### Validated Steps

1. **System Health Check**: Verifies sandbox enforcement and server state.
2. **Repository Scan**: Audits official PayPal repository files and outputs classified findings.
3. **AI Intent Resolution**: Maps natural language to server-owned catalog identifiers.
4. **Deterministic Denial**: Rejects an over-limit order request ($250 > $50 cap).
5. **Guarded Order Creation**: Creates an authorized order with a stable `PayPal-Request-Id`.
6. **Merchant Policy Approval**: Records administrative policy approval in the ledger.
7. **Idempotency Replay**: Confirms that identical re-transmissions reuse the original key.
8. **Tamper Detection**: Confirms that payload modification under the same key triggers HTTP 409.
9. **Capture Gate Enforcement**: Verifies HTTP 400 rejection when attempting capture prior to buyer approval.
10. **Buyer Approval Simulation**: Verifies state transition to `BUYER_APPROVED`.
11. **Final Settlement**: Executes order capture with a distinct capture idempotency key.
12. **Supply Chain Audit**: Confirms detection of unpinned floating dependencies.

---

## Scanner Rule Catalog and Evidence Standards

Per the project specification, all security and reliability observations are categorized under four explicit evidence classifications:

- `CODE_FACT`: Directly verifiable in publicly available source code.
- `PUBLIC_ISSUE_REPORT`: Documented in public issue trackers, security advisories, or commit histories.
- `INFERENCE_REQUIRES_TEST`: Logical deduction based on code structure that requires empirical validation.
- `UNKNOWN`: Unverified assertion requiring further technical verification.

| Rule ID | Severity | Evidence Class | Description |
|---|---|---|---|
| `DEP_FLOATING_VERSION` | MEDIUM | `CODE_FACT` | Unpinned or floating dependency version (e.g. `@paypal/agent-toolkit: latest`) |
| `LOCKFILE_ABSENT` | MEDIUM | `CODE_FACT` | Missing lockfile in repository containing dependency manifests |
| `AGENT_TOOL_GRANT_UNRESTRICTED` | MEDIUM | `CODE_FACT` | Unrestricted tool selection surface (e.g. `--tools=all`) |
| `ENV_PRODUCTION_SELECTOR` | LOW | `CODE_FACT` | Command-line environment flags allowing runtime production selection |
| `PAYPAL_POST_MISSING_IDEMPOTENCY` | HIGH | `CODE_FACT` | State-changing HTTP POST request lacking `PayPal-Request-Id` |
| `PAYPAL_STATIC_REQUEST_ID` | HIGH | `CODE_FACT` | Shared or static request ID configured at client context level |
| `PRICE_CLIENT_CONTROLLED` | CRITICAL | `CODE_FACT` | Transaction amount derived from client input rather than server catalog |
| `CAPTURE_WITHOUT_APPROVAL_CHECK` | HIGH | `INFERENCE_REQUIRES_TEST` | Capture invocation issued without observable buyer-approval verification |
| `WEBHOOK_MISSING_VERIFICATION` | HIGH | `INFERENCE_REQUIRES_TEST` | Webhook endpoint processing events without cryptographic signature checks |
| `MOBILE_CHECKSUM_NOT_PROVENANCE` | LOW | `CODE_FACT` | Checksum verification used as a substitute for binary build provenance |
| `HISTORICAL_BUILD_INCIDENT` | INFO | `PUBLIC_ISSUE_REPORT` | Historical public issue relating to SDK distribution artifacts |

### Running the Standalone Scanner CLI

```bash
# Scan a specific repository or directory
node packages/scanner/dist/cli.js cloned-repos/agent-toolkit

# Output results in standard SARIF format
node packages/scanner/dist/cli.js cloned-repos/agent-toolkit --format sarif > audit.sarif

# Output results in structured JSON
node packages/scanner/dist/cli.js cloned-repos/agent-toolkit --format json
```

---

## API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Gateway status, sandbox enforcement mode, and AI provider info |
| `GET` | `/api/catalog` | Authoritative server-owned product catalog |
| `GET` | `/api/policy` | Active merchant policy configuration and transaction limits |
| `POST` | `/api/policy/update` | Updates merchant policy rules (caps, allowed currencies) |
| `POST` | `/api/ai/parse-intent` | Maps natural language prompt to server catalog item |
| `POST` | `/api/orders/propose` | Evaluates proposal against policy; logs PROPOSED or DENIED in ledger |
| `POST` | `/api/orders/:id/merchant-approve` | Administrative merchant approval gate transition |
| `POST` | `/api/orders/:id/create-paypal` | Creates order in PayPal Sandbox with distinct idempotency key |
| `GET` | `/api/orders/:id/status` | Queries live order state from PayPal to confirm buyer approval |
| `POST` | `/api/orders/:id/simulate-buyer-approval` | Simulates buyer authorization completion in sandbox environment |
| `POST` | `/api/orders/:id/capture-paypal` | Pre-flight verifies approval and executes order capture |
| `POST` | `/api/orders/:id/test-retry` | Validates safe idempotency replay and tamper rejection |
| `GET` | `/api/orders` | Retrieves full operation ledger and audit history |
| `POST` | `/api/audit/scan` | Executes read-only static code scan on specified directory |
| `POST` | `/api/audit/explain` | Generates technical explanation and remediation patch for a finding |

---

## Pushing to a Remote GitHub Repository

To publish this project to your GitHub account:

```bash
# 1. Create a new empty repository on GitHub (e.g. named paypal-agent-trust-gateway)

# 2. Add your remote origin
git remote add origin https://github.com/<your-username>/paypal-agent-trust-gateway.git

# 3. Ensure branch is main
git branch -M main

# 4. Push all commits and branches
git push -u origin main
```

---

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
