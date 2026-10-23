# Devpost Submission — PayPal AI Hackathon

Use this document to copy-paste directly into your Devpost project submission form.

---

### Project Title
**PayPal Agent Trust Gateway**

### Tagline / Elevator Pitch (Under 200 characters)
Deterministic policy gate, idempotency coordinator, and static code auditor for PayPal AI-agent integrations.

---

### Links & URLs
- **GitHub Repository**: https://github.com/Dev10-sys/paypal-agent-trust-gateway
- **Demo / Local URL**: http://localhost:3000 (API at http://localhost:4000)
- **License**: Apache-2.0 Open Source

---

### About the Project (Devpost Description)

#### Inspiration
Artificial intelligence agents (such as those built with LangChain, OpenAI Swarm, AutoGPT, or CrewAI) are rapidly being deployed to autonomously handle shopping, customer service, and invoice approvals. However, placing payment tools into an LLM's hands introduces severe risks:
1. **Non-Deterministic Pricing**: An LLM can hallucinate or negotiate arbitrary pricing, causing merchants to lose money or buyers to be overcharged.
2. **Prompt Injection & Overspending**: Rogue or jailbroken agents can execute unauthorized transactions exceeding business limits.
3. **Double-Charging from Retries**: Autonomous retries across transient network drops without strict per-call idempotency keys risk duplicate charges.
4. **Supply Chain Risks in Agent Manifests**: Floating dependencies (such as `@paypal/agent-toolkit: latest`) can silently pull compromised or breaking releases.

We built **PayPal Agent Trust Gateway** to solve these enterprise blockers by enforcing a deterministic security and reliability boundary between autonomous AI agents and PayPal Sandbox services.

---

#### What It Does
PayPal Agent Trust Gateway operates across two complementary pillars:

##### 1. Integration Auditor (Static Code Analysis)
- Performs read-only scans of PayPal integration codebases—including official PayPal repositories (`paypal/agent-toolkit`, `paypal-js`, and `braintree_ios`).
- Pinpoints vulnerabilities with exact file paths, line numbers, and evidence classifications:
  - `CODE_FACT`: Verifiable directly in public source code (e.g., missing idempotency headers, unrestricted `--tools=all` scopes).
  - `PUBLIC_ISSUE_REPORT`: Historical issues and advisory reports.
  - `INFERENCE_REQUIRES_TEST`: Structural patterns requiring verification (e.g., capture calls issued without buyer approval checks).
- Exports industry-standard SARIF (Static Analysis Results Interchange Format) and JSON reports for CI/CD pipelines.

##### 2. Guarded Sandbox Payment Lifecycle
- **Zero Client Price Trust**: The AI agent can only select a catalog identifier (e.g., `ads_basic`). Pricing is strictly resolved on the server from an authoritative merchant catalog.
- **Deterministic Merchant Policy Gate**: Requests exceeding transaction caps (e.g., $50.00 maximum limit) are immediately denied in the local ledger without ever contacting PayPal.
- **Cryptographic Idempotency Coordination**: Binds every logical operation to a distinct `PayPal-Request-Id` and a SHA-256 hash of the payload. Identical replays return the cached response; modified payloads under the same key are rejected with HTTP 409 (`IdempotencyConflictError`).
- **Pre-Flight Capture Gating**: PayPal orders must reach verified `BUYER_APPROVED` status before capture can be dispatched. Pre-mature capture attempts are strictly rejected by the server.
- **Authentic PayPal Sandbox Checkout**: Features an authentic PayPal checkout modal with sandbox buyer account context, funding source switching, and official gold button styling.

---

#### How We Built It
We structured the solution as a clean TypeScript monorepo using `pnpm`:
- **`packages/policy`**: Deterministic PolicyEngine, GatewayLedger (SQLite persistence), and strict state machine (`PROPOSED -> MERCHANT_APPROVED -> ORDER_CREATED -> BUYER_APPROVED -> CAPTURED`).
- **`packages/scanner`**: AST and regex pattern engine with SARIF exporter and 11 distinct detection rules.
- **`packages/paypal-adapter`**: Official PayPal TypeScript SDK client adapter with sandbox isolation enforcement and an offline mock adapter.
- **`packages/shared`**: Shared type system, server catalog, and recursive secret scrubbing utilities.
- **`apps/api`**: Fastify REST backend with full endpoint suite.
- **`apps/web`**: React + Vite frontend styled with Tailwind CSS, adhering strictly to official PayPal Dark Navy (`#001C3D`), Deep Blue (`#003087`), and Gold (`#FFC439`) design standards.

---

#### Challenges We Ran Into
- **Enforcing Zero Price Trust**: Designing the interface so that language models can freely parse natural language intents while preventing any prompt injection or client-side price override from altering authoritative catalog prices.
- **Idempotency Lifecycle**: Handling distinct idempotency keys across order creation versus order capture while maintaining cryptographic collision resistance for tampered replays.
- **Safe Sandboxing**: Programmatically blocking any production credential or endpoint configuration at constructor time so testing remains 100% safe.

---

#### Accomplishments That We're Proud Of
- **31 Automated Tests Passing**: Comprehensive unit, scanner, and integration test coverage (`pnpm test`).
- **Real Cloned PayPal Repositories**: Scanned official PayPal repositories (`cloned-repos/agent-toolkit`) detecting 15 live findings across Python and TypeScript implementations.
- **Automated Live Demonstration Script**: Fully autonomous CLI demo (`node docs/demo-script.js`) executing the entire 13-step security lifecycle in seconds.
- **Zero-Emoji Professional Documentation**: Clean, enterprise-grade architecture documentation suitable for executive review.

---

#### What We Learned
- In-depth architectural analysis of the official `@paypal/agent-toolkit` and PayPal TypeScript Server SDK.
- Best practices for combining Model Context Protocol (MCP) tool controls with deterministic financial policy gates.

---

#### What's Next for PayPal Agent Trust Gateway
- Multi-merchant policy federation for marketplace platforms.
- MCP sidecar proxy for plug-and-play AI desktop assistants (Claude Desktop, Cursor).
- Real-time cryptographic webhook verification and deduplication service.

---

### 3-Minute Video Demo Script

1. **Introduction (0:00 - 0:30)**:
   - "Hello! This is PayPal Agent Trust Gateway, a developer tool designed to secure AI agents executing financial transactions on PayPal."
   - "Show the problem: autonomous agents can hallucinate prices, get manipulated by prompt injections, or cause duplicate charges on retries."

2. **Integration Auditor (0:30 - 1:15)**:
   - Switch to the 'Integration Auditor' tab.
   - Click 'Scan Repository' on the official `paypal/agent-toolkit` card.
   - Highlight: "We scanned the official PayPal Agent Toolkit and identified 15 findings—like missing idempotency keys in Python headers and unpinned floating versions."
   - Click a finding to show the code excerpt and the 1-click AI remediation patch.

3. **Guarded Payment & Policy Enforcement (1:15 - 2:00)**:
   - Switch to 'AI Purchase Request' tab.
   - Demonstrate the $250 Enterprise Addon request: "Notice how the agent extracted the intent, but the deterministic merchant policy immediately blocked it because the transaction cap is $50."
   - Demonstrate the $10 Ads Basic request: "The policy approves it. Notice the server-authoritative pricing."

4. **Sandbox Checkout & Idempotency Proof (2:00 - 2:45)**:
   - Switch to 'PayPal Checkout & Capture' tab.
   - Click 'Grant Merchant Approval', then 'Create PayPal Sandbox Order'.
   - Click 'Launch Authentic PayPal Checkout' to display the interactive sandbox checkout modal.
   - Click 'Complete Purchase'.
   - Show: "Before approval, capture was blocked. Now that buyer approval is verified server-side, we capture with a distinct idempotency key."
   - Click 'Test Idempotency Re-Send' and 'Test Payload Tamper Collision' to prove duplicate protection.

5. **Conclusion (2:45 - 3:00)**:
   - "31 tests passing, full open source code on GitHub, and production-safe sandbox enforcement. Thank you!"
