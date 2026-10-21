import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { PurchaseProposal } from '@paypal-gateway/shared';

interface PayPalApprovalViewProps {
  operation: PurchaseProposal | null;
  onOperationUpdated: (op: PurchaseProposal) => void;
  onSelectTab: (tab: string) => void;
}

export const PayPalApprovalView: React.FC<PayPalApprovalViewProps> = ({
  operation,
  onOperationUpdated,
  onSelectTab,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!operation) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border-white/10 space-y-4">
        <Clock className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Operation Selected</h3>
        <p className="text-sm text-slate-400">
          Propose a new purchase or select an operation from the Overview ledger.
        </p>
        <button onClick={() => onSelectTab('new-request')} className="btn btn-primary text-xs">
          New Purchase Proposal
        </button>
      </div>
    );
  }

  const steps = [
    { key: 'PROPOSED', label: '1. Proposed', desc: 'AI parsed proposal' },
    { key: 'MERCHANT_APPROVED', label: '2. Merchant Approved', desc: 'Merchant policy gate passed' },
    { key: 'ORDER_CREATED', label: '3. Order Created', desc: 'PayPal Sandbox order with idempotency key' },
    { key: 'BUYER_APPROVED', label: '4. Buyer Approved', desc: 'Verified through PayPal Sandbox' },
    { key: 'CAPTURED', label: '5. Captured', desc: 'Settled with distinct capture key' },
  ];

  const stateOrder = ['PROPOSED', 'MERCHANT_APPROVED', 'ORDER_CREATED', 'BUYER_APPROVED', 'CAPTURED'];
  const currentIndex = stateOrder.indexOf(operation.state);

  // Merchant Approval Action
  const handleMerchantApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/merchant-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Merchant Policy Admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onOperationUpdated(data.operation);
      setStatusMessage('Merchant policy approval granted. Ready to create PayPal Sandbox order.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create PayPal Sandbox Order
  const handleCreatePayPalOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/create-paypal`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onOperationUpdated(data.operation);
      setStatusMessage(`PayPal Sandbox order ${data.orderId} created successfully with stable idempotency key.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check PayPal Order Status Server-Side
  const handleCheckStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/status`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onOperationUpdated(data.operation);
      setStatusMessage(`PayPal order status verified from Sandbox: ${data.verifiedPayPalStatus}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Buyer Approval in Sandbox
  const handleSimulateBuyerApproval = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/simulate-buyer-approval`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onOperationUpdated(data.operation);
      setStatusMessage('Buyer approval simulation complete. PayPal state is now APPROVED.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Capture PayPal Order
  const handleCaptureOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/capture-paypal`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onOperationUpdated(data.operation);
      setStatusMessage(`Payment captured successfully! Capture ID: ${data.captureId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Operation Header */}
      <div className="glass-panel p-6 rounded-2xl border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white font-mono">{operation.operationId}</span>
            <span
              className={`badge ${
                operation.state === 'CAPTURED'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : operation.state === 'DENIED'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {operation.state}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Item: <strong className="text-white">{operation.serverCatalogItem?.name || operation.catalogId}</strong> •
            Amount: <strong className="text-emerald-400">{operation.currency} {operation.totalAmount.toFixed(2)}</strong> (Qty: {operation.quantity})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('receipt')}
            className="btn btn-secondary text-xs"
          >
            View Idempotency Receipt
          </button>
        </div>
      </div>

      {/* State Progress Bar */}
      <div className="glass-panel p-6 rounded-2xl border-white/10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
          Deterministic State Machine Progression
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {steps.map((st, idx) => {
            const isCompleted = currentIndex >= idx;
            const isCurrent = currentIndex === idx;

            return (
              <div
                key={st.key}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,207,222,0.25)]'
                    : isCompleted
                      ? 'bg-black/30 border-emerald-500/30'
                      : 'bg-black/20 border-white/5 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Step {idx + 1}
                  </span>
                  {isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="font-bold text-sm text-white">{st.label}</div>
                <div className="text-xs text-slate-400 mt-1">{st.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Security Gate Rejection:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Action Stage Cards */}
      <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-6">
        <h3 className="text-lg font-bold text-white">
          Active Flow Stage Actions
        </h3>

        {/* 1. Propose -> Merchant Approve */}
        {operation.state === 'PROPOSED' && (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-start gap-3">
              <UserCheck className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-white">Merchant Policy Approval Required</h4>
                <p className="text-xs text-slate-300 mt-1">
                  The AI agent has proposed an order for {operation.currency} {operation.totalAmount.toFixed(2)}. Deterministic policy allows this transaction. Merchant approval is required before calling PayPal Sandbox.
                </p>
              </div>
            </div>

            <button
              onClick={handleMerchantApprove}
              disabled={loading}
              className="btn btn-primary"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve as Merchant Admin</span>
            </button>
          </div>
        )}

        {/* 2. Merchant Approved -> Create Order */}
        {operation.state === 'MERCHANT_APPROVED' && (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-[#00cfde] flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-white">Ready for PayPal Sandbox Order Creation</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Using official PayPal TypeScript Server SDK with per-call idempotency key: <code className="text-cyan-400">{operation.createRequestId}</code>.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreatePayPalOrder}
              disabled={loading}
              className="btn btn-primary"
            >
              <DollarSign className="w-4 h-4" />
              <span>Create Order in PayPal Sandbox</span>
            </button>
          </div>
        )}

        {/* 3. Order Created -> Buyer Approval Step */}
        {operation.state === 'ORDER_CREATED' && (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-white/10 space-y-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-white">PayPal Sandbox Order Active — Buyer Approval Required</h4>
                <p className="text-xs text-slate-300 mt-1">
                  PayPal Order ID: <code className="text-amber-400">{operation.paypalOrderId}</code>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Security Rule: Backend checks PayPal order state directly. Capture is strictly blocked until buyer approves in PayPal.
                </p>
              </div>
            </div>

            {/* Sandbox Approval Link */}
            {operation.paypalApprovalUrl && (
              <div className="p-3 bg-black/40 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-md font-mono">{operation.paypalApprovalUrl}</span>
                <a
                  href={operation.paypalApprovalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 font-semibold flex items-center gap-1 hover:underline ml-2"
                >
                  Open Sandbox Approval <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleSimulateBuyerApproval}
                disabled={loading}
                className="btn btn-success text-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulate Buyer Approval in Sandbox</span>
              </button>

              <button
                onClick={handleCheckStatus}
                disabled={loading}
                className="btn btn-secondary text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Verify Status with PayPal</span>
              </button>

              {/* Disabled Capture Button with clear warning */}
              <button
                disabled={true}
                className="btn btn-secondary opacity-50 cursor-not-allowed text-xs"
                title="Capture blocked until buyer approval is verified!"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Capture Blocked (Buyer Approval Required)</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Buyer Approved -> Ready for Authorized Capture */}
        {operation.state === 'BUYER_APPROVED' && (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-emerald-500/30 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-white">Buyer Approval Verified on PayPal Sandbox</h4>
                <p className="text-xs text-slate-300 mt-1">
                  The backend has verified that order <code className="text-emerald-400">{operation.paypalOrderId}</code> is APPROVED.
                  Capture can now be executed using a distinct capture idempotency key.
                </p>
              </div>
            </div>

            <button
              onClick={handleCaptureOrder}
              disabled={loading}
              className="btn btn-success"
            >
              <DollarSign className="w-4 h-4" />
              <span>Capture PayPal Sandbox Order</span>
            </button>
          </div>
        )}

        {/* 5. Captured -> Completed */}
        {operation.state === 'CAPTURED' && (
          <div className="p-6 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold text-white">Order Settled & Captured in PayPal Sandbox</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Capture ID: <code className="text-emerald-400">{operation.paypalCaptureId}</code> •
                  Capture Request ID: <code className="text-cyan-400">{operation.captureRequestId}</code>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onSelectTab('receipt')}
                className="btn btn-primary text-xs"
              >
                Inspect Operation Audit Receipt & Retry Keys
              </button>
              <button
                onClick={() => onSelectTab('new-request')}
                className="btn btn-secondary text-xs"
              >
                Start New Purchase
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
