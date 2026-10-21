import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AuditFinding,
  Classification,
  ConfidenceLevel,
  FindingSeverity,
  redactString,
} from '@paypal-gateway/shared';
import { SCANNER_RULES } from './rules.js';

export interface ScanOptions {
  repoPath: string;
  repoName?: string;
}

export class ScannerEngine {
  private findings: AuditFinding[] = [];
  private scannedFilesCount = 0;

  constructor() {}

  public scanDirectory(options: ScanOptions): AuditFinding[] {
    this.findings = [];
    this.scannedFilesCount = 0;

    const absRepoPath = path.resolve(options.repoPath);
    if (!fs.existsSync(absRepoPath)) {
      throw new Error(`Repository path does not exist: ${absRepoPath}`);
    }

    const repoName = options.repoName || path.basename(absRepoPath);

    // Check lockfile presence at repo root
    this.checkRootLockfile(absRepoPath, repoName);

    // Recursively traverse files
    this.traverseAndScan(absRepoPath, absRepoPath, repoName);

    return this.findings;
  }

  private checkRootLockfile(rootPath: string, repoName: string): void {
    const lockfiles = [
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lockb',
      'poetry.lock',
      'Pipfile.lock',
      'Package.resolved',
    ];

    const hasLockfile = lockfiles.some((f) => fs.existsSync(path.join(rootPath, f)));
    const hasManifest =
      fs.existsSync(path.join(rootPath, 'package.json')) ||
      fs.existsSync(path.join(rootPath, 'requirements.txt')) ||
      fs.existsSync(path.join(rootPath, 'pyproject.toml'));

    if (hasManifest && !hasLockfile) {
      const manifestPath = fs.existsSync(path.join(rootPath, 'package.json'))
        ? 'package.json'
        : 'requirements.txt';
      this.addFinding({
        ruleId: 'LOCKFILE_ABSENT',
        repo: repoName,
        relPath: manifestPath,
        lineStart: 1,
        lineEnd: 1,
        evidenceExcerpt: `No lockfile (package-lock.json, pnpm-lock.yaml, yarn.lock, poetry.lock) found in repository root.`,
      });
    }
  }

  private traverseAndScan(currentPath: string, rootPath: string, repoName: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.relative(rootPath, fullPath).replace(/\\/g, '/');

      // Ignore node_modules, git, dist, cache directories
      if (
        entry.isDirectory() &&
        (entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.cache' ||
          entry.name === '__pycache__')
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        this.traverseAndScan(fullPath, rootPath, repoName);
      } else if (entry.isFile()) {
        this.scannedFilesCount++;
        this.scanFile(fullPath, relPath, repoName);
      }
    }
  }

  private scanFile(filePath: string, relPath: string, repoName: string): void {
    const fileName = path.basename(filePath);
    let content = '';

    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return; // Skip binary or unreadable files
    }

    const lines = content.split('\n');

    // 1. Scan package.json for floating dependencies
    if (fileName === 'package.json') {
      this.scanPackageJson(content, relPath, repoName, lines);
    }

    // 2. Scan Swift Package manifests
    if (fileName === 'Package.swift') {
      this.scanPackageSwift(content, relPath, repoName, lines);
    }

    // 3. Scan TypeScript / JavaScript files
    if (/\.(ts|tsx|js|mjs|cjs)$/.test(fileName)) {
      this.scanJsTsFile(content, relPath, repoName, lines);
    }

    // 4. Scan Python files
    if (fileName.endsWith('.py')) {
      this.scanPythonFile(content, relPath, repoName, lines);
    }

    // 5. Scan Documentation / Markdown files
    if (fileName.endsWith('.md')) {
      this.scanMarkdownFile(content, relPath, repoName, lines);
    }
  }

  private scanPackageJson(
    content: string,
    relPath: string,
    repoName: string,
    lines: string[]
  ): void {
    try {
      const parsed = JSON.parse(content);
      const checkDeps = (depsObj: Record<string, string> | undefined) => {
        if (!depsObj) return;
        for (const [dep, version] of Object.entries(depsObj)) {
          if (version === 'latest' || version === '*' || version.startsWith('^') || version.startsWith('>=')) {
            // Find line number in file
            const lineIdx = lines.findIndex((l) => l.includes(`"${dep}"`));
            const lineNum = lineIdx >= 0 ? lineIdx + 1 : 1;
            const excerpt = lineIdx >= 0 ? lines[lineIdx].trim() : `"${dep}": "${version}"`;

            // If it's literally 'latest' or '*'
            if (version === 'latest' || version === '*') {
              this.addFinding({
                ruleId: 'DEP_FLOATING_VERSION',
                repo: repoName,
                relPath,
                lineStart: lineNum,
                lineEnd: lineNum,
                evidenceExcerpt: redactString(excerpt),
              });
            }
          }
        }
      };

      checkDeps(parsed.dependencies);
      checkDeps(parsed.devDependencies);
    } catch {
      // Ignore JSON parse errors in malformed fixture files
    }
  }

  private scanPackageSwift(
    content: string,
    relPath: string,
    repoName: string,
    lines: string[]
  ): void {
    // Check for checksum in binary target
    if (content.includes('checksum:') || content.includes('packageChecksum')) {
      const lineIdx = lines.findIndex(
        (l) => l.includes('packageChecksum') || l.includes('checksum:')
      );
      const lineNum = lineIdx >= 0 ? lineIdx + 1 : 1;
      this.addFinding({
        ruleId: 'MOBILE_CHECKSUM_NOT_PROVENANCE',
        repo: repoName,
        relPath,
        lineStart: lineNum,
        lineEnd: lineNum,
        evidenceExcerpt: redactString(lines[lineIdx]?.trim() || 'checksum: ...'),
      });
    }

    // Check for historical PPRiskMagnes incident reference
    if (content.includes('PPRiskMagnes') || content.includes('1857')) {
      const lineIdx = lines.findIndex((l) => l.includes('PPRiskMagnes'));
      const lineNum = lineIdx >= 0 ? lineIdx + 1 : 1;
      this.addFinding({
        ruleId: 'HISTORICAL_BUILD_INCIDENT',
        repo: repoName,
        relPath,
        lineStart: lineNum,
        lineEnd: lineNum,
        evidenceExcerpt: redactString(lines[lineIdx]?.trim() || 'PPRiskMagnes'),
      });
    }
  }

  private scanJsTsFile(
    content: string,
    relPath: string,
    repoName: string,
    lines: string[]
  ): void {
    // 1. Tool grants --tools=all or wildcard
    if (content.includes("'all'") || content.includes('"all"') || content.includes('--tools=all')) {
      const lineIdx = lines.findIndex(
        (l) =>
          l.includes("selectedTools.includes('all')") ||
          l.includes('tool == \'all\'') ||
          l.includes('--tools=all')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'AGENT_TOOL_GRANT_UNRESTRICTED',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 2. Production Environment selector
    if (
      content.includes('paypal-environment') ||
      content.includes("!= 'production'") ||
      content.includes('!== "production"')
    ) {
      const lineIdx = lines.findIndex(
        (l) =>
          l.includes('paypal-environment') ||
          l.includes("'production'") ||
          l.includes('"production"')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'ENV_PRODUCTION_SELECTOR',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 3. Static or Context-Level Request ID
    // e.g. headers['PayPal-Request-Id'] = this._context.request_id;
    if (
      (content.includes('PayPal-Request-Id') || content.includes('paypalRequestId')) &&
      (content.includes('this._context.request_id') ||
        content.includes('context?.request_id') ||
        content.includes('context.request_id'))
    ) {
      const lineIdx = lines.findIndex(
        (l) =>
          (l.includes('PayPal-Request-Id') || l.includes('request_id')) &&
          (l.includes('this._context') || l.includes('context'))
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'PAYPAL_STATIC_REQUEST_ID',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 4. Positive control check: SDK per-call request ID support
    // In PayPal-TypeScript-Server-SDK ordersController.ts:
    // req.header('PayPal-Request-Id', mapped.paypalRequestId);
    const isSdkPositiveControl =
      content.includes('mapped.paypalRequestId') &&
      content.includes("req.header('PayPal-Request-Id'");

    // 5. State changing PayPal POST calls without idempotency key
    // If not positive control, check for POST call without PayPal-Request-Id
    if (!isSdkPositiveControl) {
      const hasOrderCreateOrCapture =
        (content.includes('/v2/checkout/orders') ||
          content.includes('orders.create') ||
          content.includes('orders.capture') ||
          content.includes('ordersCreate') ||
          content.includes('ordersCapture')) &&
        (content.includes('post(') ||
          content.includes('axios.post') ||
          content.includes('fetch(') ||
          content.includes('requests.post'));

      const hasIdempotencyHeader =
        content.includes('PayPal-Request-Id') ||
        content.includes('paypalRequestId') ||
        content.includes('paypal_request_id');

      if (hasOrderCreateOrCapture && !hasIdempotencyHeader) {
        const lineIdx = lines.findIndex(
          (l) =>
            l.includes('post(') ||
            l.includes('createOrder') ||
            l.includes('captureOrder') ||
            l.includes('/v2/checkout/orders')
        );
        if (lineIdx >= 0) {
          this.addFinding({
            ruleId: 'PAYPAL_POST_MISSING_IDEMPOTENCY',
            repo: repoName,
            relPath,
            lineStart: lineIdx + 1,
            lineEnd: lineIdx + 1,
            evidenceExcerpt: redactString(lines[lineIdx].trim()),
          });
        }
      }
    }

    // 6. Price trusted from client/LLM input
    // Checks if body.amount, params.amount, or args.amount is passed directly to order body without catalog lookup
    if (
      (content.includes('req.body.amount') ||
        content.includes('req.body.value') ||
        content.includes('args.amount') ||
        content.includes('toolArgs.amount')) &&
      !content.includes('catalog') &&
      !content.includes('SERVER_CATALOG')
    ) {
      const lineIdx = lines.findIndex(
        (l) =>
          l.includes('req.body.amount') ||
          l.includes('args.amount') ||
          l.includes('toolArgs.amount')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'PRICE_CLIENT_CONTROLLED',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 7. Capture call without observable buyer-approved state check
    if (
      (content.includes('orders.capture') ||
        content.includes('captureOrder') ||
        content.includes('/capture')) &&
      !content.includes('APPROVED') &&
      !content.includes('buyer_approved') &&
      !content.includes('simulateBuyerApproval')
    ) {
      const lineIdx = lines.findIndex(
        (l) =>
          l.includes('orders.capture') ||
          l.includes('captureOrder') ||
          l.includes('/capture')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'CAPTURE_WITHOUT_APPROVAL_CHECK',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 8. Webhook handler missing verification
    if (
      (content.includes('/webhook') || content.includes('webhookHandler')) &&
      (!content.includes('verifyWebhookSignature') &&
        !content.includes('paypal-transmission-sig') &&
        !content.includes('signatureVerified'))
    ) {
      const lineIdx = lines.findIndex(
        (l) => l.includes('webhook') || l.includes('Webhook')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'WEBHOOK_MISSING_VERIFICATION',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 9. Crypto inventory
    if (
      content.includes('crypto.') ||
      content.includes('sha256') ||
      content.includes('createHash')
    ) {
      // Optional inventory item - only flag if relevant crypto scan requested
    }
  }

  private scanPythonFile(
    content: string,
    relPath: string,
    repoName: string,
    lines: string[]
  ): void {
    // 1. Python PayPal client missing PayPal-Request-Id in build_headers / post
    if (content.includes('def build_headers') && content.includes('def post')) {
      const hasRequestIdInHeaders =
        content.includes('PayPal-Request-Id') ||
        content.includes('paypal-request-id') ||
        content.includes('PAYPAL_REQUEST_ID');

      if (!hasRequestIdInHeaders) {
        const lineIdx = lines.findIndex((l) => l.includes('def build_headers'));
        const lineNum = lineIdx >= 0 ? lineIdx + 1 : 1;
        this.addFinding({
          ruleId: 'PAYPAL_POST_MISSING_IDEMPOTENCY',
          repo: repoName,
          relPath,
          lineStart: lineNum,
          lineEnd: lineNum + 6,
          evidenceExcerpt: redactString(
            lines.slice(lineIdx, lineIdx + 7).join('\n')
          ),
        });
      }
    }

    // 2. Python configuration with boolean only action controls
    if (
      content.includes('def is_tool_allowed') &&
      content.includes('configuration.actions.get')
    ) {
      // Confirmed: boolean actions, no amount/payee policy controls
      const lineIdx = lines.findIndex((l) => l.includes('def is_tool_allowed'));
      // Note: this is a code fact about the configuration surface
    }

    // 3. Price accepted from LLM or args without catalog
    if (
      (content.includes('args.get("amount")') ||
        content.includes('args["amount"]') ||
        content.includes('kwargs.get("amount")')) &&
      !content.includes('catalog')
    ) {
      const lineIdx = lines.findIndex((l) => l.includes('amount'));
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'PRICE_CLIENT_CONTROLLED',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 4. Capture call in python without approval check
    if (
      (content.includes('pay_order') || content.includes('capture_order')) &&
      !content.includes('APPROVED') &&
      !content.includes('approved')
    ) {
      const lineIdx = lines.findIndex(
        (l) => l.includes('pay_order') || l.includes('capture_order')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'CAPTURE_WITHOUT_APPROVAL_CHECK',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }

    // 5. Webhook handler in python missing verification
    if (
      content.includes('webhook') &&
      !content.includes('verify_webhook_signature') &&
      !content.includes('transmission_sig')
    ) {
      const lineIdx = lines.findIndex((l) => l.includes('webhook'));
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'WEBHOOK_MISSING_VERIFICATION',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }
  }

  private scanMarkdownFile(
    content: string,
    relPath: string,
    repoName: string,
    lines: string[]
  ): void {
    // Assert that scanner does NOT report buyer approval as absent when documented in README
    // If README documents "After approval by user, invoke pay_order", it confirms buyer approval awareness
    if (
      content.includes('After approval by user') ||
      content.includes('share the approval link. After approval')
    ) {
      // Positive awareness documented; no missing approval finding should be emitted for this doc
    }

    // Historical issue report reference check
    if (content.includes('braintree_ios/issues/1857') || content.includes('PPRiskMagnes')) {
      const lineIdx = lines.findIndex(
        (l) => l.includes('1857') || l.includes('PPRiskMagnes')
      );
      if (lineIdx >= 0) {
        this.addFinding({
          ruleId: 'HISTORICAL_BUILD_INCIDENT',
          repo: repoName,
          relPath,
          lineStart: lineIdx + 1,
          lineEnd: lineIdx + 1,
          evidenceExcerpt: redactString(lines[lineIdx].trim()),
        });
      }
    }
  }

  private addFinding(item: {
    ruleId: string;
    repo: string;
    relPath: string;
    lineStart: number;
    lineEnd: number;
    evidenceExcerpt: string;
  }): void {
    const rule = SCANNER_RULES[item.ruleId];
    if (!rule) return;

    this.findings.push({
      ruleId: rule.id,
      title: rule.title,
      classification: rule.classification,
      severity: rule.defaultSeverity,
      confidence: rule.defaultConfidence,
      repo: item.repo,
      path: item.relPath,
      lineStart: item.lineStart,
      lineEnd: item.lineEnd,
      evidenceExcerpt: item.evidenceExcerpt,
      whyItMatters: rule.whyItMatters,
      remediation: rule.remediation,
      testSuggestion: rule.testSuggestion,
      sourceLinks: rule.sourceLinks,
    });
  }
}
