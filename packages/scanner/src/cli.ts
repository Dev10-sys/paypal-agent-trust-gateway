#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ScannerEngine } from './scanner-engine.js';
import { exportToSarif } from './sarif-exporter.js';
import { exportToHtml } from './html-exporter.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let targetPath = '.';
  let sarifOutput: string | undefined;
  let jsonOutput: string | undefined;
  let htmlOutput: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--sarif' && args[i + 1]) {
      sarifOutput = args[++i];
    } else if (arg === '--json' && args[i + 1]) {
      jsonOutput = args[++i];
    } else if (arg === '--html' && args[i + 1]) {
      htmlOutput = args[++i];
    } else if (!arg.startsWith('--')) {
      targetPath = arg;
    }
  }

  return { targetPath, sarifOutput, jsonOutput, htmlOutput };
}

async function main() {
  const { targetPath, sarifOutput, jsonOutput, htmlOutput } = parseArgs();
  const absPath = path.resolve(targetPath);

  console.log(`\n🛡️  PayPal Agent Trust Gateway — Integration Auditor`);
  console.log(`Scanning repository target: ${absPath}\n`);

  const engine = new ScannerEngine();
  const startTime = Date.now();
  const findings = engine.scanDirectory({ repoPath: absPath });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`Scan completed in ${duration}s. Found ${findings.length} findings:\n`);

  for (const f of findings) {
    const color =
      f.severity === 'CRITICAL'
        ? '\x1b[31m'
        : f.severity === 'HIGH'
          ? '\x1b[33m'
          : '\x1b[36m';
    console.log(
      `${color}[${f.severity}]\x1b[0m [${f.classification}] ${f.title} (${f.ruleId})`
    );
    console.log(`  File: ${f.path}:${f.lineStart}`);
    console.log(`  Evidence: ${f.evidenceExcerpt.slice(0, 100).replace(/\n/g, ' ')}`);
    console.log(`  Remediation: ${f.remediation}`);
    console.log();
  }

  if (sarifOutput) {
    const sarif = exportToSarif(findings);
    fs.writeFileSync(sarifOutput, JSON.stringify(sarif, null, 2), 'utf-8');
    console.log(`✓ SARIF report saved to: ${sarifOutput}`);
  }

  if (jsonOutput) {
    fs.writeFileSync(jsonOutput, JSON.stringify(findings, null, 2), 'utf-8');
    console.log(`✓ JSON report saved to: ${jsonOutput}`);
  }

  if (htmlOutput) {
    const html = exportToHtml(findings, path.basename(absPath));
    fs.writeFileSync(htmlOutput, html, 'utf-8');
    console.log(`✓ HTML report saved to: ${htmlOutput}`);
  }

  const hasHighOrCritical = findings.some(
    (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
  );
  if (hasHighOrCritical) {
    console.log(`\x1b[33mNotice: Security/reliability findings require remediation review.\x1b[0m\n`);
  }
}

main().catch((err) => {
  console.error('Scan failed:', err);
  process.exit(1);
});
