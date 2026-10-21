export type Classification =
  | 'CODE_FACT'
  | 'PUBLIC_ISSUE_REPORT'
  | 'INFERENCE_REQUIRES_TEST'
  | 'UNKNOWN';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ConfidenceLevel = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'HEURISTIC' | 'UNKNOWN';

export interface AuditFinding {
  ruleId: string;
  title: string;
  classification: Classification;
  severity: FindingSeverity;
  confidence: ConfidenceLevel;
  repo: string;
  path: string;
  lineStart: number;
  lineEnd: number;
  evidenceExcerpt: string;
  whyItMatters: string;
  remediation: string;
  testSuggestion: string;
  sourceLinks: string[];
}

export type OperationState =
  | 'PROPOSED'
  | 'DENIED'
  | 'MERCHANT_APPROVED'
  | 'ORDER_CREATED'
  | 'BUYER_APPROVED'
  | 'CAPTURED'
  | 'FAILED'
  | 'TIMEOUT';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  currency: string;
  category: string;
  active: boolean;
}

export interface MerchantPolicy {
  allowedActions: string[];
  maxAmountPerOperation: number;
  allowedCurrencies: string[];
  allowedPayees?: string[];
  enforceSandboxOnly: boolean;
  requireMerchantApproval: boolean;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  reasons: string[];
  evaluatedRules: Record<string, { pass: boolean; detail: string }>;
}

export interface PurchaseProposal {
  operationId: string;
  catalogId: string;
  quantity: number;
  buyerContext?: string;
  serverCatalogItem?: CatalogItem;
  totalAmount: number;
  currency: string;
  payee?: string;
  action: string;
  state: OperationState;
  payloadHash: string;
  createRequestId: string;
  captureRequestId?: string;
  paypalOrderId?: string;
  paypalApprovalUrl?: string;
  paypalCaptureId?: string;
  approvingActor?: string;
  denialReason?: string;
  rawOrderResponseRedacted?: any;
  rawCaptureResponseRedacted?: any;
  createdAt: string;
  updatedAt: string;
}

export interface IdempotencyRecord {
  requestId: string;
  operationId: string;
  action: 'CREATE_ORDER' | 'CAPTURE_ORDER';
  payloadHash: string;
  createdAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  responsePayloadRedacted?: string;
}

export interface WebhookEventRecord {
  eventId: string;
  eventType: string;
  summary: string;
  resourceId?: string;
  signatureVerified: boolean;
  processed: boolean;
  firstSeenAt: string;
  processedAt?: string;
}

export interface SupplyChainSummary {
  manifestsScanned: number;
  floatingDependencies: {
    package: string;
    versionSpec: string;
    manifestPath: string;
    severity: FindingSeverity;
  }[];
  lockfilesPresent: string[];
  lockfilesMissing: string[];
  checksumIntegrityChecks: {
    name: string;
    targetUrl: string;
    checksum: string;
    provenanceGuaranteed: boolean;
  }[];
  pqcInventory: PqcInventoryItem[];
}

export interface PqcInventoryItem {
  component: string;
  cryptoReference: string;
  algorithmDetected: string;
  pqcStatus: 'NOT_OBSERVED' | 'UNKNOWN' | 'CLASSICAL_ONLY' | 'HYBRID_CANDIDATE';
  sourceFile: string;
  notes: string;
}

export interface SarifLog {
  $schema: string;
  version: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          helpUri?: string;
          properties?: Record<string, any>;
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: 'error' | 'warning' | 'note';
      message: { text: string };
      locations: Array<{
        physicalLocation: {
          artifactLocation: { uri: string };
          region: {
            startLine: number;
            endLine: number;
            snippet?: { text: string };
          };
        };
      }>;
      properties?: Record<string, any>;
    }>;
  }>;
}
