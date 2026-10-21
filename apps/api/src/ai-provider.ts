import {
  AuditFinding,
  CatalogItem,
  SERVER_CATALOG,
  redactString,
} from '@paypal-gateway/shared';

export interface ParseIntentResult {
  catalogId?: string;
  quantity?: number;
  ambiguous: boolean;
  clarificationQuestion?: string;
  extractedIntent: string;
}

export interface ExplainFindingResult {
  explanation: string;
  riskAnalysis: string;
  suggestedPatch: string;
  regressionTest: string;
  confidenceNotes: string;
}

export interface AiProvider {
  name: string;
  isMock: boolean;
  parsePurchaseIntent(prompt: string): Promise<ParseIntentResult>;
  explainFinding(finding: AuditFinding): Promise<ExplainFindingResult>;
}

export class MockAiProvider implements AiProvider {
  public name = 'Mock/Deterministic AI Assistant (Safe Demo Mode)';
  public isMock = true;

  public async parsePurchaseIntent(prompt: string): Promise<ParseIntentResult> {
    const clean = prompt.toLowerCase();

    // Check for ambiguous or vague requests
    if (
      clean.length < 5 ||
      clean === 'buy' ||
      clean === 'purchase' ||
      clean === 'order' ||
      clean.includes('buy something')
    ) {
      return {
        ambiguous: true,
        clarificationQuestion:
          'Could you please specify which catalog item you would like to purchase? ' +
          'Available items: ads_basic ($10), ads_pro ($25), cloud_starter ($15), ai_credits_micro ($5).',
        extractedIntent: 'Ambiguous purchase request',
      };
    }

    // Strip dollar amounts e.g. "$10", "$25", "10 dollar", "10 usd" so price is not mistaken for quantity
    const promptWithoutPrices = clean
      .replace(/\$\s*\d+(?:\.\d+)?/g, '')
      .replace(/\b\d+\s*(?:dollar|dollars|usd)\b/g, '');

    // Extract quantity (default 1)
    let quantity = 1;
    const explicitQtyMatch = promptWithoutPrices.match(/(?:qty|quantity|count|x)\s*[:=]?\s*(\d+)/i) ||
      promptWithoutPrices.match(/\b(\d+)\s*(?:x|units?|items?|campaigns?|orders?|packs?)\b/i) ||
      promptWithoutPrices.match(/\b(?:buy|order|purchase)\s+(\d+)\b/i);

    if (explicitQtyMatch && Number(explicitQtyMatch[1]) > 0 && Number(explicitQtyMatch[1]) < 1000) {
      quantity = parseInt(explicitQtyMatch[1], 10);
    }

    // Match catalog item
    let catalogId: string | undefined;

    if (clean.includes('ads basic') || clean.includes('ads_basic') || clean.includes('$10') || clean.includes('10 dollar')) {
      catalogId = 'ads_basic';
    } else if (clean.includes('ads pro') || clean.includes('ads_pro') || clean.includes('$25') || clean.includes('25 dollar')) {
      catalogId = 'ads_pro';
    } else if (clean.includes('cloud') || clean.includes('starter') || clean.includes('sandbox')) {
      catalogId = 'cloud_starter';
    } else if (clean.includes('credit') || clean.includes('token') || clean.includes('micro')) {
      catalogId = 'ai_credits_micro';
    } else if (clean.includes('enterprise')) {
      catalogId = 'enterprise_addon';
    } else {
      // Default to ads_basic if mention of 'ads'
      if (clean.includes('ad')) {
        catalogId = 'ads_basic';
      } else {
        return {
          ambiguous: true,
          clarificationQuestion:
            'Unrecognized product. Please select from the server catalog: ' +
            'ads_basic ($10), ads_pro ($25), cloud_starter ($15), ai_credits_micro ($5).',
          extractedIntent: `Unmatched query: "${redactString(prompt)}"`,
        };
      }
    }

    const item = SERVER_CATALOG[catalogId];

    return {
      catalogId,
      quantity,
      ambiguous: false,
      extractedIntent: `Proposed purchase of ${quantity}x ${item?.name || catalogId} (Authoritative server price: ${item?.currency} ${item?.unitPrice} each)`,
    };
  }

  public async explainFinding(finding: AuditFinding): Promise<ExplainFindingResult> {
    const safeExcerpt = redactString(finding.evidenceExcerpt);

    switch (finding.ruleId) {
      case 'DEP_FLOATING_VERSION':
        return {
          explanation:
            `In ${finding.path}, the dependency is declared with a floating version specifier: "${safeExcerpt}". ` +
            `This matches the public supply-chain hygiene observation in paypal/paypal-mcp-server/package.json ` +
            `where "@paypal/agent-toolkit" was declared as "latest". ` +
            `This is an unpinned dependency risk, not evidence of malware or compromise.`,
          riskAnalysis:
            'Non-reproducible builds; automatic ingestion of upstream breaking changes without review.',
          suggestedPatch: `--- a/${finding.path}\n+++ b/${finding.path}\n@@ -1,3 +1,3 @@\n-  "@paypal/agent-toolkit": "latest"\n+  "@paypal/agent-toolkit": "1.0.4"`,
          regressionTest:
            'Add "pnpm audit" or "npm audit" and enforce frozen lockfiles in CI pipeline.',
          confidenceNotes:
            'CODE_FACT: Directly verifiable by inspecting manifest JSON dependencies.',
        };

      case 'AGENT_TOOL_GRANT_UNRESTRICTED':
        return {
          explanation:
            `In ${finding.path}, the application permits unrestricted agent tool access: "${safeExcerpt}". ` +
            `In paypal-mcp-server/src/index.ts, the server accepts "--tools=all", granting orders.create, ` +
            `orders.capture, payments.createRefund, and disputes.create to the AI agent. ` +
            `This is an operator-configurable choice, not a vulnerability in itself, but violates least privilege.`,
          riskAnalysis:
            'AI model prompt injection or tool hallucination can trigger unauthorized refunds or dispute creations.',
          suggestedPatch: `--- a/${finding.path}\n+++ b/${finding.path}\n-  const tools = ['all'];\n+  const tools = ['invoices.get', 'orders.get']; // Principle of least privilege`,
          regressionTest:
            'Unit test asserting tool initialization fails if unauthorized actions like payments.createRefund are requested.',
          confidenceNotes:
            'CODE_FACT: Code grants all tools when configured with "all" flag.',
        };

      case 'PAYPAL_POST_MISSING_IDEMPOTENCY':
        return {
          explanation:
            `In ${finding.path}, state-changing PayPal POST operations are executed without passing a unique ` +
            `"PayPal-Request-Id" header: "${safeExcerpt}". ` +
            `The official PayPal TypeScript Server SDK demonstrates positive control by supporting per-call ` +
            `paypalRequestId in ordersCreate and ordersCapture. In contrast, the Agent Toolkit Python client ` +
            `build_headers() path did not include PayPal-Request-Id.`,
          riskAnalysis:
            'Network disconnects or automatic retries on order creation or capture can trigger duplicate payments on PayPal.',
          suggestedPatch: `--- a/${finding.path}\n+++ b/${finding.path}\n-  ordersController.createOrder({ body });\n+  ordersController.createOrder({ body, paypalRequestId: generateIdempotencyKey(operationId, 'CREATE_ORDER') });`,
          regressionTest:
            'Simulate network timeout during createOrder; verify retry resends identical PayPal-Request-Id and succeeds without duplicate order creation.',
          confidenceNotes:
            'CODE_FACT: Absence of PayPal-Request-Id header in outgoing HTTP request builder.',
        };

      case 'PAYPAL_STATIC_REQUEST_ID':
        return {
          explanation:
            `In ${finding.path}, the client binds a single context-level request ID across requests: "${safeExcerpt}". ` +
            `In paypal/agent-toolkit/typescript/src/shared/client.ts, the client maps context.request_id directly. ` +
            `This means multiple unrelated operations reuse the exact same request ID.`,
          riskAnalysis:
            'Subsequent operations fail or return cached responses belonging to prior operations due to idempotency key collision.',
          suggestedPatch: `--- a/${finding.path}\n+++ b/${finding.path}\n-  headers['PayPal-Request-Id'] = this._context.request_id;\n+  headers['PayPal-Request-Id'] = perOperationRequestId; // Distinct per call!`,
          regressionTest:
            'Assert two distinct orders in sequence have differing PayPal-Request-Id headers.',
          confidenceNotes:
            'CODE_FACT: Context-level property shared across instances.',
        };

      case 'PRICE_CLIENT_CONTROLLED':
        return {
          explanation:
            `In ${finding.path}, the payment amount or currency is accepted directly from client/AI input without ` +
            `verifying against an authoritative server catalog: "${safeExcerpt}".`,
          riskAnalysis:
            'Attackers or compromised AI prompts can change order value to $0.01 or manipulate currency codes.',
          suggestedPatch: `--- a/${finding.path}\n+++ b/${finding.path}\n-  const amount = req.body.amount;\n+  const catalogItem = SERVER_CATALOG[req.body.catalogId];\n+  const amount = catalogItem.unitPrice * req.body.quantity;`,
          regressionTest:
            'Submit request with tampered price; assert server returns 400 TAMPER_PREVENTION error.',
          confidenceNotes:
            'CODE_FACT: Request parameter mapped directly to payment amount.',
        };

      case 'CAPTURE_WITHOUT_APPROVAL_CHECK':
        return {
          explanation:
            `In ${finding.path}, orders.capture or pay_order is invoked without observable prior ` +
            `server verification of the order state: "${safeExcerpt}". ` +
            `The official Agent Toolkit Python README explicitly documents: "After approval by user, invoke pay_order." ` +
            `The backend must verify that the order status is APPROVED through PayPal before issuing capture.`,
          riskAnalysis:
            'Capturing an unapproved order returns an API error from PayPal Sandbox; relying on browser redirect alone allows bypass.',
          suggestedPatch: `--- a/${finding.path}\n+++ b/${finding.path}\n+  const order = await paypalClient.getOrder(orderId);\n+  if (order.status !== 'APPROVED') throw new Error('Buyer approval required');\n   await paypalClient.captureOrder({ orderId, paypalRequestId });`,
          regressionTest:
            'Attempt capture on newly created order before buyer approval; verify rejection with BUYER_APPROVAL_REQUIRED.',
          confidenceNotes:
            'INFERENCE_REQUIRES_TEST: Static analysis cannot observe dynamic approval check; requires runtime test.',
        };

      case 'HISTORICAL_BUILD_INCIDENT':
        return {
          explanation:
            `In ${finding.path}, reference to PPRiskMagnes or Braintree iOS issue #1857 was identified. ` +
            `This was a historical build incident where a code-signing certificate revocation caused Xcode ` +
            `build failures (CSSMERR_TP_CERT_REVOKED). Braintree maintainers resolved this in version 7.11.0 ` +
            `by moving to a remotely hosted dynamic xcframework via paypal-risk-ios. This was a trust/build incident, ` +
            `not a compromised artifact.`,
          riskAnalysis:
            'Legacy builds on braintree_ios < 7.11.0 fail code signing during compilation or archiving.',
          suggestedPatch: `// Ensure braintree_ios is updated to 7.11.0 or higher in Podfile/Cartfile`,
          regressionTest:
            'Verify project builds and archives successfully on modern Xcode without code signing errors.',
          confidenceNotes:
            'PUBLIC_ISSUE_REPORT: Publicly documented GitHub issue #1857.',
        };

      default:
        return {
          explanation: `${finding.title}: ${finding.whyItMatters}`,
          riskAnalysis: 'Integration security or reliability defect.',
          suggestedPatch: finding.remediation,
          regressionTest: finding.testSuggestion,
          confidenceNotes: `${finding.classification}: Confidence ${finding.confidence}.`,
        };
    }
  }
}

export class RealAiProvider implements AiProvider {
  public name = 'Google Gemini AI Assistant';
  public isMock = false;
  private apiKey: string;
  private fallback: MockAiProvider;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fallback = new MockAiProvider();
  }

  public async parsePurchaseIntent(prompt: string): Promise<ParseIntentResult> {
    try {
      const systemInstruction = `You are an intent parser for PayPal Agent Trust Gateway.
Your sole job is to map natural language requests to a server-owned catalog item and quantity.
You MUST NOT invent prices, currencies, or authorize transactions.
Catalog items available:
- "ads_basic": Basic Ads Campaign, $10 USD
- "ads_pro": Pro Ads Campaign, $25 USD
- "cloud_starter": Cloud Sandbox Environment, $15 USD
- "ai_credits_micro": AI Token Pack, $5 USD
- "enterprise_addon": Enterprise High-Volume Tier, $250 USD

Respond in JSON ONLY with this schema:
{
  "catalogId": "string or null",
  "quantity": 1,
  "ambiguous": boolean,
  "clarificationQuestion": "string or null",
  "extractedIntent": "string"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\nUser request: "${prompt}"` }],
              },
            ],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!res.ok) {
        return this.fallback.parsePurchaseIntent(prompt);
      }

      const data = await res.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return this.fallback.parsePurchaseIntent(prompt);

      const parsed = JSON.parse(text);
      return {
        catalogId: parsed.catalogId || undefined,
        quantity: parsed.quantity || 1,
        ambiguous: Boolean(parsed.ambiguous),
        clarificationQuestion: parsed.clarificationQuestion || undefined,
        extractedIntent: parsed.extractedIntent || prompt,
      };
    } catch {
      return this.fallback.parsePurchaseIntent(prompt);
    }
  }

  public async explainFinding(finding: AuditFinding): Promise<ExplainFindingResult> {
    try {
      const prompt = `You are a security auditor for PayPal AI Agent integrations.
Explain this audit finding:
Rule ID: ${finding.ruleId}
Title: ${finding.title}
File: ${finding.path}:${finding.lineStart}
Evidence: ${finding.evidenceExcerpt}
Classification: ${finding.classification}

Provide JSON ONLY:
{
  "explanation": "concise explanation citing PayPal official documentation/repos",
  "riskAnalysis": "risk analysis",
  "suggestedPatch": "diff snippet",
  "regressionTest": "concrete test suggestion",
  "confidenceNotes": "evaluation notes"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!res.ok) {
        return this.fallback.explainFinding(finding);
      }

      const data = await res.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return this.fallback.explainFinding(finding);

      return JSON.parse(text);
    } catch {
      return this.fallback.explainFinding(finding);
    }
  }
}

export function createAiProvider(): AiProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 10) {
    return new RealAiProvider(geminiKey.trim());
  }
  return new MockAiProvider();
}
