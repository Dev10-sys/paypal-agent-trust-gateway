import { AuditFinding, SarifLog } from '@paypal-gateway/shared';

export function exportToSarif(findings: AuditFinding[]): SarifLog {
  const rulesMap = new Map<string, any>();

  for (const f of findings) {
    if (!rulesMap.has(f.ruleId)) {
      rulesMap.set(f.ruleId, {
        id: f.ruleId,
        name: f.title,
        shortDescription: { text: f.title },
        helpUri: f.sourceLinks[0] || undefined,
        properties: {
          classification: f.classification,
          severity: f.severity,
          confidence: f.confidence,
        },
      });
    }
  }

  const results = findings.map((f) => {
    let level: 'error' | 'warning' | 'note' = 'note';
    if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
      level = 'error';
    } else if (f.severity === 'MEDIUM') {
      level = 'warning';
    }

    return {
      ruleId: f.ruleId,
      level,
      message: {
        text: `${f.title}: ${f.whyItMatters}\nRemediation: ${f.remediation}`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: f.path },
            region: {
              startLine: f.lineStart,
              endLine: f.lineEnd,
              snippet: { text: f.evidenceExcerpt },
            },
          },
        },
      ],
      properties: {
        classification: f.classification,
        confidence: f.confidence,
        remediation: f.remediation,
        testSuggestion: f.testSuggestion,
        sourceLinks: f.sourceLinks,
      },
    };
  });

  return {
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'PayPal Agent Trust Gateway Scanner',
            version: '1.0.0',
            informationUri:
              'https://github.com/paypal/PayPal-TypeScript-Server-SDK',
            rules: Array.from(rulesMap.values()),
          },
        },
        results,
      },
    ],
  };
}
