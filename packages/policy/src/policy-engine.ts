import {
  MerchantPolicy,
  PolicyEvaluationResult,
  PurchaseProposal,
  SERVER_CATALOG,
} from '@paypal-gateway/shared';

export const DEFAULT_MERCHANT_POLICY: MerchantPolicy = {
  allowedActions: ['orders.create', 'orders.capture'],
  maxAmountPerOperation: 50.0, // USD 50 cap
  allowedCurrencies: ['USD', 'EUR'],
  allowedPayees: undefined, // allow any or restricted list
  enforceSandboxOnly: true,
  requireMerchantApproval: true,
};

export class PolicyEngine {
  private policy: MerchantPolicy;

  constructor(policy: Partial<MerchantPolicy> = {}) {
    this.policy = { ...DEFAULT_MERCHANT_POLICY, ...policy };
  }

  public getPolicy(): MerchantPolicy {
    return { ...this.policy };
  }

  public updatePolicy(updates: Partial<MerchantPolicy>): MerchantPolicy {
    this.policy = { ...this.policy, ...updates };
    return this.getPolicy();
  }

  /**
   * Evaluates a payment proposal deterministically against merchant policy.
   * AI cannot approve or override these checks.
   */
  public evaluateProposal(
    proposal: {
      catalogId: string;
      quantity: number;
      action?: string;
      currency?: string;
      payee?: string;
      environment?: string;
      clientReportedPrice?: number;
    }
  ): PolicyEvaluationResult {
    const reasons: string[] = [];
    const evaluatedRules: Record<string, { pass: boolean; detail: string }> = {};

    const action = proposal.action || 'orders.create';
    const env = proposal.environment || 'sandbox';

    // 1. Action Check
    const actionAllowed = this.policy.allowedActions.includes(action);
    evaluatedRules['ACTION_ALLOW_CHECK'] = {
      pass: actionAllowed,
      detail: actionAllowed
        ? `Action '${action}' is authorized in merchant policy.`
        : `Action '${action}' is prohibited. Authorized actions: [${this.policy.allowedActions.join(', ')}]`,
    };
    if (!actionAllowed) {
      reasons.push(evaluatedRules['ACTION_ALLOW_CHECK'].detail);
    }

    // 2. Environment / Sandbox Check
    const isSandbox = env.toLowerCase() === 'sandbox';
    if (this.policy.enforceSandboxOnly && !isSandbox) {
      evaluatedRules['SANDBOX_ENFORCEMENT'] = {
        pass: false,
        detail: `Production environment is strictly rejected by policy. All requests must use PayPal Sandbox.`,
      };
      reasons.push(evaluatedRules['SANDBOX_ENFORCEMENT'].detail);
    } else {
      evaluatedRules['SANDBOX_ENFORCEMENT'] = {
        pass: true,
        detail: `Environment '${env}' verified as Sandbox compliant.`,
      };
    }

    // 3. Catalog Validation (Server-owned price resolution)
    const catalogItem = SERVER_CATALOG[proposal.catalogId];
    if (!catalogItem || !catalogItem.active) {
      evaluatedRules['CATALOG_VALIDATION'] = {
        pass: false,
        detail: `Invalid or inactive catalog ID '${proposal.catalogId}'. Prices and products must originate from server catalog.`,
      };
      reasons.push(evaluatedRules['CATALOG_VALIDATION'].detail);
    } else {
      evaluatedRules['CATALOG_VALIDATION'] = {
        pass: true,
        detail: `Catalog item '${catalogItem.name}' identified with server authoritative unit price ${catalogItem.currency} ${catalogItem.unitPrice}.`,
      };
    }

    // 4. Quantity Validation
    const quantity = Number(proposal.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      evaluatedRules['QUANTITY_VALIDATION'] = {
        pass: false,
        detail: `Invalid quantity '${proposal.quantity}'. Must be a positive integer.`,
      };
      reasons.push(evaluatedRules['QUANTITY_VALIDATION'].detail);
    } else {
      evaluatedRules['QUANTITY_VALIDATION'] = {
        pass: true,
        detail: `Quantity ${quantity} is valid.`,
      };
    }

    // 5. Currency Check
    const currency = proposal.currency || (catalogItem ? catalogItem.currency : 'USD');
    const currencyAllowed = this.policy.allowedCurrencies.includes(currency);
    evaluatedRules['CURRENCY_ALLOW_CHECK'] = {
      pass: currencyAllowed,
      detail: currencyAllowed
        ? `Currency '${currency}' is permitted.`
        : `Currency '${currency}' is not allowed. Permitted currencies: [${this.policy.allowedCurrencies.join(', ')}]`,
    };
    if (!currencyAllowed) {
      reasons.push(evaluatedRules['CURRENCY_ALLOW_CHECK'].detail);
    }

    // 6. Authoritative Amount Calculation & Cap Check
    if (catalogItem && Number.isInteger(quantity) && quantity > 0) {
      const serverCalculatedTotal = catalogItem.unitPrice * quantity;

      // Ensure client/AI did not attempt to tamper with the price
      if (
        proposal.clientReportedPrice !== undefined &&
        Math.abs(proposal.clientReportedPrice - serverCalculatedTotal) > 0.001
      ) {
        evaluatedRules['TAMPER_PREVENTION'] = {
          pass: false,
          detail: `Client or AI price override detected (${proposal.clientReportedPrice} vs server calculated ${serverCalculatedTotal}). Server catalog is authoritative.`,
        };
        reasons.push(evaluatedRules['TAMPER_PREVENTION'].detail);
      } else {
        evaluatedRules['TAMPER_PREVENTION'] = {
          pass: true,
          detail: `No price tampering detected. Server catalog price is authoritative.`,
        };
      }

      // Max Amount Cap Check
      const amountWithinCap = serverCalculatedTotal <= this.policy.maxAmountPerOperation;
      evaluatedRules['TRANSACTION_AMOUNT_CAP'] = {
        pass: amountWithinCap,
        detail: amountWithinCap
          ? `Calculated total ${currency} ${serverCalculatedTotal.toFixed(2)} is within policy cap (${currency} ${this.policy.maxAmountPerOperation.toFixed(2)}).`
          : `Calculated total ${currency} ${serverCalculatedTotal.toFixed(2)} exceeds merchant policy cap of ${currency} ${this.policy.maxAmountPerOperation.toFixed(2)}.`,
      };
      if (!amountWithinCap) {
        reasons.push(evaluatedRules['TRANSACTION_AMOUNT_CAP'].detail);
      }
    }

    // 7. Payee Allow-list (if specified)
    if (this.policy.allowedPayees && this.policy.allowedPayees.length > 0 && proposal.payee) {
      const payeeAllowed = this.policy.allowedPayees.includes(proposal.payee);
      evaluatedRules['PAYEE_ALLOW_CHECK'] = {
        pass: payeeAllowed,
        detail: payeeAllowed
          ? `Payee '${proposal.payee}' is authorized.`
          : `Payee '${proposal.payee}' is not on merchant allow-list.`,
      };
      if (!payeeAllowed) {
        reasons.push(evaluatedRules['PAYEE_ALLOW_CHECK'].detail);
      }
    }

    const allowed = reasons.length === 0;

    return {
      allowed,
      reasons,
      evaluatedRules,
    };
  }
}
