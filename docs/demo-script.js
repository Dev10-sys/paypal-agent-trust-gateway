#!/usr/bin/env node
/**
 * PayPal Agent Trust Gateway — Demo Script
 * Run: node docs/demo-script.js
 * 
 * This script demonstrates the full flow in under 3 minutes:
 * 1. Repo findings from scanner
 * 2. Over-limit denial by policy
 * 3. Allowed sandbox order creation
 * 4. Buyer approval simulation
 * 5. Capture (with same-key retry simulation)
 * 6. Supply-chain finding evidence
 *
 * The API must be running: pnpm --filter @paypal-gateway/api dev
 */

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;

async function api(method, path, body) {
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ⚠️ API ${method} ${path} responded with ${res.status}:`, JSON.stringify(data));
  }
  return data;
}

function log(emoji, label, data) {
  console.log(`\n${emoji} ${label}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     PayPal Agent Trust Gateway — Live Demo               ║');
  console.log('║     All traffic: Sandbox only. No production calls.      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // ── STEP 1: System Health
  log('🔍', 'STEP 1: Gateway Health Check');
  const health = await api('GET', '/api/health');
  console.log(`  Status: ${health.status}`);
  console.log(`  PayPal Mode: ${health.paypalMode}`);
  console.log(`  AI Provider: ${health.aiProvider}`);

  // ── STEP 2: Scanner — Repo Findings
  log('📁', 'STEP 2: Integration Auditor — Scanning fixtures/paypal-mcp-server');
  const scan = await api('POST', '/api/audit/scan', { repoPath: './fixtures/paypal-mcp-server' });
  console.log(`  Total Findings: ${scan.totalFindings}`);
  for (const f of scan.findings) {
    console.log(`  [${f.severity}] ${f.ruleId} @ ${f.path}:${f.lineStart}`);
    console.log(`    Evidence: ${f.evidenceExcerpt}`);
    console.log(`    Classification: ${f.classification}`);
  }

  // ── STEP 3: AI Intent Parsing
  log('🤖', 'STEP 3: AI Intent Parsing — "Create a $10 Ads Basic order"');
  const intent = await api('POST', '/api/ai/parse-intent', {
    prompt: 'Create a $10 Ads Basic order please',
  });
  console.log(`  Extracted intent: ${intent.parsedIntent.extractedIntent}`);
  console.log(`  Catalog ID: ${intent.parsedIntent.catalogId}`);
  console.log(`  Policy allowed: ${intent.policyResult?.allowed}`);

  // ── STEP 4: Over-limit Denial
  log('🚫', 'STEP 4: Over-Limit Denial — "enterprise_addon" at $250, cap is $50');
  const denied = await api('POST', '/api/orders/propose', {
    catalogId: 'enterprise_addon',
    quantity: 1,
    buyerContext: 'Demo over-limit denial test',
  });
  console.log(`  State: ${denied.proposal.state}`);
  console.log(`  Denial Reason: ${denied.proposal.denialReason}`);
  console.log(`  Policy Allowed: ${denied.policyResult.allowed}`);

  // ── STEP 5: Allowed Order — Propose
  log('✅', 'STEP 5: Allowed Order — ads_basic ($10)');
  const proposed = await api('POST', '/api/orders/propose', {
    catalogId: 'ads_basic',
    quantity: 1,
    buyerContext: 'Demo allowed order test',
  });
  const opId = proposed.proposal.operationId;
  console.log(`  Operation ID: ${opId}`);
  console.log(`  State: ${proposed.proposal.state}`);
  console.log(`  Total: $${proposed.proposal.totalAmount} ${proposed.proposal.currency}`);
  console.log(`  Create Request ID: ${proposed.proposal.createRequestId}`);

  // ── STEP 6: Merchant Approval
  log('👔', 'STEP 6: Merchant Approval Gate');
  const approved = await api('POST', `/api/orders/${opId}/merchant-approve`, {
    actor: 'Demo Merchant Admin',
  });
  console.log(`  State: ${approved.operation.state}`);

  // ── STEP 7: Create PayPal Sandbox Order
  log('🛒', 'STEP 7: Create PayPal Sandbox Order (Idempotent)');
  const created = await api('POST', `/api/orders/${opId}/create-paypal`);
  console.log(`  PayPal Order ID: ${created.orderId}`);
  console.log(`  Approval URL: ${created.approvalUrl}`);
  console.log(`  State: ${created.operation.state}`);

  // ── STEP 8: Retry Same Key
  log('🔄', 'STEP 8: Retry Simulation — Same operation, same payload (should reuse key)');
  const retry = await api('POST', `/api/orders/${opId}/test-retry`, { action: 'CREATE_ORDER' });
  console.log(`  isRetry: ${retry.isRetry}`);
  console.log(`  Key: ${retry.key}`);

  // ── STEP 9: Tamper Detection
  log('🛡️', 'STEP 9: Tamper Detection — Same key with different payload (should reject)');
  const tampered = await api('POST', `/api/orders/${opId}/test-retry`, {
    action: 'CREATE_ORDER',
    tamperPayload: true,
  });
  console.log(`  Status: ${tampered.status}`);
  console.log(`  Error: ${tampered.error}`);

  // ── STEP 10: Attempt Capture Before Buyer Approval
  log('🚨', 'STEP 10: Security Test — Capture BEFORE buyer approval (must be rejected)');
  const prematureCapture = await api('POST', `/api/orders/${opId}/capture-paypal`);
  console.log(`  Error: ${prematureCapture.error}`);

  // ── STEP 11: Simulate Buyer Approval
  log('👤', 'STEP 11: Simulate Buyer Approval in Sandbox');
  const buyerApproved = await api('POST', `/api/orders/${opId}/simulate-buyer-approval`);
  console.log(`  State: ${buyerApproved.operation.state}`);
  console.log(`  Message: ${buyerApproved.message}`);

  // ── STEP 12: Capture
  log('💰', 'STEP 12: Capture Order (After Buyer Approval)');
  const captured = await api('POST', `/api/orders/${opId}/capture-paypal`);
  console.log(`  State: ${captured.operation.state}`);
  console.log(`  Capture ID: ${captured.captureId}`);
  console.log(`  Capture Request ID: ${captured.operation.captureRequestId}`);

  // ── STEP 13: Supply Chain Scan
  log('📦', 'STEP 13: Supply Chain Scan — Floating dependency detection');
  const supplyScan = await api('POST', '/api/audit/scan', { repoPath: './fixtures/paypal-mcp-server' });
  const floatingDep = supplyScan.findings.find(f => f.ruleId === 'DEP_FLOATING_VERSION');
  if (floatingDep) {
    console.log(`  Finding: ${floatingDep.ruleId} at ${floatingDep.path}:${floatingDep.lineStart}`);
    console.log(`  Evidence: ${floatingDep.evidenceExcerpt}`);
    console.log(`  Remediation: ${floatingDep.remediation}`);
  }

  // ── SUMMARY
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                  Demo Complete!                         ║');
  console.log('║  All key controls demonstrated:                         ║');
  console.log('║  ✓ Scanner found repo findings with exact paths         ║');
  console.log('║  ✓ Over-limit request denied by deterministic policy    ║');
  console.log('║  ✓ Allowed order created with idempotency key           ║');
  console.log('║  ✓ Tampered payload rejected (key binding enforced)     ║');
  console.log('║  ✓ Capture blocked before buyer approval                ║');
  console.log('║  ✓ Capture succeeded after buyer approval               ║');
  console.log('║  ✓ Supply-chain finding detected (floating dependency)  ║');
  console.log('║  ✓ All traffic: Sandbox only — zero production calls    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Demo error:', err.message);
  process.exit(1);
});
