import { OperationState } from '@paypal-gateway/shared';

export interface StateTransitionEvent {
  from: OperationState;
  to: OperationState;
  actor: string;
  timestamp: string;
  reason?: string;
}

export const VALID_TRANSITIONS: Record<OperationState, OperationState[]> = {
  PROPOSED: ['MERCHANT_APPROVED', 'DENIED', 'FAILED'],
  DENIED: [],
  MERCHANT_APPROVED: ['ORDER_CREATED', 'FAILED', 'TIMEOUT'],
  ORDER_CREATED: ['BUYER_APPROVED', 'FAILED', 'TIMEOUT'],
  BUYER_APPROVED: ['CAPTURED', 'FAILED'],
  CAPTURED: [],
  FAILED: [],
  TIMEOUT: [],
};

export class OperationStateMachine {
  public static canTransition(from: OperationState, to: OperationState): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  public static assertTransition(from: OperationState, to: OperationState, actor: string): void {
    if (!this.canTransition(from, to)) {
      if (to === 'CAPTURED' && from !== 'BUYER_APPROVED') {
        throw new Error(
          `ILLEGAL_PAYMENT_CAPTURE_ATTEMPT: Order cannot be captured in state '${from}'. ` +
            `PayPal sandbox requires explicit buyer approval and server verification prior to capture.`
        );
      }
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot transition operation from '${from}' to '${to}' (requested by ${actor}).`
      );
    }
  }
}
