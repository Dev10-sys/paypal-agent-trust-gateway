import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { ScannerEngine } from '@paypal-gateway/scanner';

describe('Scanner Engine & Public Benchmark Fixture Tests', () => {
  const engine = new ScannerEngine();
  const fixturesDir = path.resolve('fixtures');

  it('1. Scans fixtures directory and produces structured findings with exact line paths', () => {
    const findings = engine.scanDirectory({ repoPath: fixturesDir });

    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.ruleId).toBeDefined();
      expect(f.classification).toBeDefined();
      expect(f.severity).toBeDefined();
      expect(f.confidence).toBeDefined();
      expect(f.path).toBeDefined();
      expect(f.lineStart).toBeGreaterThan(0);
      expect(f.evidenceExcerpt).toBeDefined();
      expect(f.whyItMatters).toBeDefined();
      expect(f.remediation).toBeDefined();
      expect(f.testSuggestion).toBeDefined();
    }
  });

  it('2. Flags floating latest dependency in paypal-mcp-server/package.json as CODE_FACT', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'paypal-mcp-server'),
    });

    const floating = findings.find((f) => f.ruleId === 'DEP_FLOATING_VERSION');
    expect(floating).toBeDefined();
    expect(floating?.classification).toBe('CODE_FACT');
    expect(floating?.path).toContain('package.json');
    expect(floating?.evidenceExcerpt).toContain('@paypal/agent-toolkit');
    expect(floating?.evidenceExcerpt).toContain('latest');
  });

  it('3. Flags --tools=all in paypal-mcp-server/index.ts as configuration review (CODE_FACT)', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'paypal-mcp-server'),
    });

    const toolGrant = findings.find((f) => f.ruleId === 'AGENT_TOOL_GRANT_UNRESTRICTED');
    expect(toolGrant).toBeDefined();
    expect(toolGrant?.classification).toBe('CODE_FACT');
    expect(toolGrant?.evidenceExcerpt).toContain('all');
  });

  it('4. Flags operator production environment selector in paypal-mcp-server/index.ts', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'paypal-mcp-server'),
    });

    const envSelector = findings.find((f) => f.ruleId === 'ENV_PRODUCTION_SELECTOR');
    expect(envSelector).toBeDefined();
    expect(envSelector?.classification).toBe('CODE_FACT');
  });

  it('5. Flags Python client build_headers path as missing PayPal-Request-Id (CODE_FACT)', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'agent-toolkit-py'),
    });

    const missingIdem = findings.find(
      (f) => f.ruleId === 'PAYPAL_POST_MISSING_IDEMPOTENCY' && f.path.includes('paypal_client.py')
    );
    expect(missingIdem).toBeDefined();
    expect(missingIdem?.classification).toBe('CODE_FACT');
    expect(missingIdem?.evidenceExcerpt).toContain('def build_headers');
  });

  it('6. POSITIVE CONTROL: Assert buyer approval README case is NOT reported as missing approval', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'agent-toolkit-py'),
    });

    const docFinding = findings.find(
      (f) => f.path.includes('README.md') && f.ruleId === 'CAPTURE_WITHOUT_APPROVAL_CHECK'
    );
    expect(docFinding).toBeUndefined();
  });

  it('7. Flags TypeScript client context-level request_id as PAYPAL_STATIC_REQUEST_ID (CODE_FACT)', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'agent-toolkit-ts'),
    });

    const staticKey = findings.find((f) => f.ruleId === 'PAYPAL_STATIC_REQUEST_ID');
    expect(staticKey).toBeDefined();
    expect(staticKey?.classification).toBe('CODE_FACT');
    expect(staticKey?.evidenceExcerpt).toContain('this._context.request_id');
  });

  it('8. POSITIVE CONTROL: TypeScript Server SDK per-call request ID is NOT flagged as missing idempotency', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'paypal-sdk-ts'),
    });

    const falsePositive = findings.find(
      (f) => f.ruleId === 'PAYPAL_POST_MISSING_IDEMPOTENCY' && f.path.includes('ordersController.ts')
    );
    expect(falsePositive).toBeUndefined();
  });

  it('9. Flags checksum presence in paypal-risk-ios Package.swift separately from provenance', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'paypal-risk-ios'),
    });

    const checksumFinding = findings.find((f) => f.ruleId === 'MOBILE_CHECKSUM_NOT_PROVENANCE');
    expect(checksumFinding).toBeDefined();
    expect(checksumFinding?.classification).toBe('CODE_FACT');
    expect(checksumFinding?.whyItMatters).toContain('provenance');
  });

  it('10. Identifies historical Braintree issue 1857 as PUBLIC_ISSUE_REPORT, not active compromise', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'braintree-ios'),
    });

    const histFinding = findings.find((f) => f.ruleId === 'HISTORICAL_BUILD_INCIDENT');
    expect(histFinding).toBeDefined();
    expect(histFinding?.classification).toBe('PUBLIC_ISSUE_REPORT');
    expect(histFinding?.whyItMatters).toContain('resolved');
  });

  it('11. Flags client-controlled price violation in negative fixtures', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'negative-violations'),
    });

    const priceFinding = findings.find((f) => f.ruleId === 'PRICE_CLIENT_CONTROLLED');
    expect(priceFinding).toBeDefined();
    expect(priceFinding?.severity).toBe('CRITICAL');
  });

  it('12. Flags unverified webhook handler in negative fixtures', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'negative-violations'),
    });

    const webhookFinding = findings.find((f) => f.ruleId === 'WEBHOOK_MISSING_VERIFICATION');
    expect(webhookFinding).toBeDefined();
    expect(webhookFinding?.classification).toBe('INFERENCE_REQUIRES_TEST');
  });

  it('13. POSITIVE CONTROL: Hardened order service passes without critical or high vulnerabilities', () => {
    const findings = engine.scanDirectory({
      repoPath: path.join(fixturesDir, 'positive-controls'),
    });

    const criticalOrHigh = findings.filter(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    );
    expect(criticalOrHigh).toHaveLength(0);
  });
});
