import { AuditFinding } from '@paypal-gateway/shared';

export function exportToHtml(findings: AuditFinding[], repoName: string = 'Repository'): string {
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO' || f.severity === 'LOW').length;

  const findingCards = findings
    .map(
      (f, idx) => `
    <div class="finding-card severity-${f.severity.toLowerCase()}">
      <div class="finding-header">
        <span class="finding-id">#${idx + 1} [${escapeHtml(f.ruleId)}]</span>
        <span class="badge badge-${f.severity.toLowerCase()}">${f.severity}</span>
        <span class="badge badge-classification">${escapeHtml(f.classification)}</span>
        <span class="badge badge-confidence">Confidence: ${escapeHtml(f.confidence)}</span>
      </div>
      <h3 class="finding-title">${escapeHtml(f.title)}</h3>
      <div class="location-bar">
        📁 <code>${escapeHtml(f.path)}:L${f.lineStart}-${f.lineEnd}</code> (Repo: ${escapeHtml(f.repo)})
      </div>
      
      <div class="code-block">
        <div class="code-label">Evidence Excerpt:</div>
        <pre><code>${escapeHtml(f.evidenceExcerpt)}</code></pre>
      </div>

      <div class="explanation-box">
        <h4>Why It Matters</h4>
        <p>${escapeHtml(f.whyItMatters)}</p>
      </div>

      <div class="remediation-box">
        <h4>Recommended Remediation</h4>
        <p>${escapeHtml(f.remediation)}</p>
      </div>

      <div class="test-suggestion-box">
        <h4>Test Suggestion</h4>
        <p>🧪 <code>${escapeHtml(f.testSuggestion)}</code></p>
      </div>

      ${
        f.sourceLinks && f.sourceLinks.length > 0
          ? `<div class="sources-box">
              <h4>Primary Source Evidence</h4>
              <ul>
                ${f.sourceLinks
                  .map(
                    (link) =>
                      `<li><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                        link
                      )}</a></li>`
                  )
                  .join('')}
              </ul>
            </div>`
          : ''
      }
    </div>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PayPal Agent Trust Gateway — Audit Report (${escapeHtml(repoName)})</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #121826;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --accent: #0070ba;
      --accent-glow: #00cfde;
      --critical: #ef4444;
      --high: #f97316;
      --medium: #eab308;
      --low: #3b82f6;
      --info: #64748b;
      --border: #1e293b;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    h1 {
      font-size: 28px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 10px 0;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 15px;
      line-height: 1.5;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-val {
      font-size: 32px;
      font-weight: 700;
      margin-top: 4px;
    }
    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }
    .finding-card.severity-critical { border-left: 6px solid var(--critical); }
    .finding-card.severity-high { border-left: 6px solid var(--high); }
    .finding-card.severity-medium { border-left: 6px solid var(--medium); }
    .finding-card.severity-info, .finding-card.severity-low { border-left: 6px solid var(--low); }
    .finding-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .finding-id {
      font-weight: 600;
      font-family: monospace;
      color: var(--accent-glow);
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .badge-critical { background: rgba(239, 68, 68, 0.2); color: var(--critical); border: 1px solid var(--critical); }
    .badge-high { background: rgba(249, 115, 22, 0.2); color: var(--high); border: 1px solid var(--high); }
    .badge-medium { background: rgba(234, 179, 8, 0.2); color: var(--medium); border: 1px solid var(--medium); }
    .badge-low, .badge-info { background: rgba(59, 130, 246, 0.2); color: var(--low); border: 1px solid var(--low); }
    .badge-classification { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .badge-confidence { background: rgba(0, 207, 222, 0.15); color: var(--accent-glow); }
    .finding-title {
      font-size: 20px;
      margin: 8px 0 12px 0;
      color: #fff;
    }
    .location-bar {
      background: #0d121f;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .code-block {
      background: #080c14;
      border: 1px solid #1a2336;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .code-label {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    pre {
      margin: 0;
      overflow-x: auto;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #38bdf8;
    }
    .explanation-box, .remediation-box, .test-suggestion-box, .sources-box {
      margin-top: 14px;
    }
    h4 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin: 0 0 6px 0;
    }
    p {
      margin: 0;
      line-height: 1.5;
      font-size: 14px;
    }
    a {
      color: var(--accent-glow);
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🛡️ PayPal Agent Trust Gateway — Audit Report</h1>
      <div class="subtitle">
        Deterministic security, supply chain, and idempotency audit for PayPal & AI Agent integrations.
        Target: <strong>${escapeHtml(repoName)}</strong> • Generated: ${new Date().toUTCString()}
      </div>
    </header>

    <div class="summary-grid">
      <div class="stat-card">
        <div>Total Findings</div>
        <div class="stat-val" style="color: #fff;">${findings.length}</div>
      </div>
      <div class="stat-card">
        <div>Critical</div>
        <div class="stat-val" style="color: var(--critical);">${criticalCount}</div>
      </div>
      <div class="stat-card">
        <div>High</div>
        <div class="stat-val" style="color: var(--high);">${highCount}</div>
      </div>
      <div class="stat-card">
        <div>Medium</div>
        <div class="stat-val" style="color: var(--medium);">${mediumCount}</div>
      </div>
      <div class="stat-card">
        <div>Low / Info</div>
        <div class="stat-val" style="color: var(--low);">${infoCount}</div>
      </div>
    </div>

    <div class="findings-list">
      ${findingCards}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
