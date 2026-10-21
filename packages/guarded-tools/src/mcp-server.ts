import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  SERVER_CATALOG,
  PurchaseProposal,
  redactObject,
} from '@paypal-gateway/shared';
import {
  PolicyEngine,
  GatewayLedger,
  generateOperationId,
  generateIdempotencyKey,
  computePayloadHash,
} from '@paypal-gateway/policy';
import { ScannerEngine } from '@paypal-gateway/scanner';

export class GuardedMcpServer {
  private server: Server;
  private policyEngine: PolicyEngine;
  private ledger: GatewayLedger;
  private scanner: ScannerEngine;

  constructor(ledger?: GatewayLedger, policyEngine?: PolicyEngine) {
    this.ledger = ledger || new GatewayLedger();
    this.policyEngine = policyEngine || new PolicyEngine();
    this.scanner = new ScannerEngine();

    this.server = new Server(
      {
        name: 'paypal-agent-trust-gateway-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available guarded tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'propose_purchase',
            description:
              'Proposes a purchase of a server-catalog item. Pricing and currency are resolved strictly on the server; ' +
              'deterministic policy evaluates the purchase. AI cannot supply or tamper with prices.',
            inputSchema: {
              type: 'object',
              properties: {
                catalogId: {
                  type: 'string',
                  description:
                    'ID of catalog item (e.g. ads_basic, ads_pro, cloud_starter, ai_credits_micro)',
                },
                quantity: {
                  type: 'integer',
                  description: 'Quantity to purchase (must be positive integer)',
                },
                buyerContext: {
                  type: 'string',
                  description: 'Optional human context/intent for the proposal',
                },
              },
              required: ['catalogId', 'quantity'],
            },
          },
          {
            name: 'audit_repository',
            description:
              'Performs a read-only static security and idempotency audit on a PayPal integration repository.',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to local repository directory to audit',
                },
              },
              required: ['repoPath'],
            },
          },
          {
            name: 'get_policy_status',
            description:
              'Retrieves current deterministic merchant policy limits, caps, and allowed actions.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_operation_receipt',
            description:
              'Retrieves the immutable audit receipt, state history, and idempotency keys for an operation.',
            inputSchema: {
              type: 'object',
              properties: {
                operationId: {
                  type: 'string',
                  description: 'Unique operation ID',
                },
              },
              required: ['operationId'],
            },
          },
        ],
      };
    });

    // Execute tool request
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'propose_purchase') {
          return await this.handleProposePurchase(args);
        } else if (name === 'audit_repository') {
          return await this.handleAuditRepository(args);
        } else if (name === 'get_policy_status') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(this.policyEngine.getPolicy(), null, 2),
              },
            ],
          };
        } else if (name === 'get_operation_receipt') {
          return await this.handleGetOperationReceipt(args);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing guarded tool ${name}: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  public async handleProposePurchase(args: any) {
    const catalogId = String(args.catalogId);
    const quantity = Number(args.quantity);

    // Evaluate deterministically against policy
    const policyResult = this.policyEngine.evaluateProposal({
      catalogId,
      quantity,
      action: 'orders.create',
      environment: 'sandbox',
    });

    const catalogItem = SERVER_CATALOG[catalogId];
    const totalAmount = catalogItem ? catalogItem.unitPrice * quantity : 0;
    const currency = catalogItem ? catalogItem.currency : 'USD';
    const operationId = generateOperationId();
    const createRequestId = generateIdempotencyKey(operationId, 'CREATE_ORDER');

    const proposal: PurchaseProposal = {
      operationId,
      catalogId,
      quantity,
      buyerContext: args.buyerContext || 'Proposed via AI Tool',
      serverCatalogItem: catalogItem,
      totalAmount,
      currency,
      action: 'orders.create',
      state: policyResult.allowed ? 'PROPOSED' : 'DENIED',
      payloadHash: computePayloadHash({ catalogId, quantity, totalAmount, currency }),
      createRequestId,
      denialReason: policyResult.allowed ? undefined : policyResult.reasons.join('; '),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.ledger.saveOperation(proposal);
    this.ledger.recordPolicyAudit(
      operationId,
      policyResult.allowed ? 'ALLOWED' : 'DENIED',
      policyResult.reasons,
      policyResult.evaluatedRules
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              operationId: proposal.operationId,
              status: proposal.state,
              catalogItem: catalogItem?.name,
              quantity,
              totalAmount: `${currency} ${totalAmount.toFixed(2)}`,
              policyAllowed: policyResult.allowed,
              reasons: policyResult.reasons,
              nextStep: policyResult.allowed
                ? 'Merchant approval required before PayPal Sandbox order can be created.'
                : 'Purchase rejected by merchant policy gate.',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  public async handleAuditRepository(args: any) {
    const repoPath = String(args.repoPath);
    const findings = this.scanner.scanDirectory({ repoPath });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              totalFindings: findings.length,
              findings: findings.map((f) => ({
                ruleId: f.ruleId,
                title: f.title,
                classification: f.classification,
                severity: f.severity,
                confidence: f.confidence,
                location: `${f.path}:${f.lineStart}`,
                evidence: f.evidenceExcerpt,
                remediation: f.remediation,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  public async handleGetOperationReceipt(args: any) {
    const op = this.ledger.getOperation(String(args.operationId));
    if (!op) {
      throw new Error(`Operation '${args.operationId}' not found.`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(redactObject(op), null, 2),
        },
      ],
    };
  }

  public async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
