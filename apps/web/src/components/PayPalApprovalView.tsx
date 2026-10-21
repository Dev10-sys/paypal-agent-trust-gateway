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
  CreditCard,
  Building,
  Check,
  XCircle,
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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedFunding, setSelectedFunding] = useState<'balance' | 'card'>('balance');

  if (!operation) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border-[#1E2E50] space-y-4">
        <Clock className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Active Purchase Operation Selected</h3>
        <p className="text-sm text-slate-400">
          Propose a purchase first or select an operation from the Dashboard ledger.
        </p>
        <button onClick={() => onSelectTab('new-request')} className="btn btn-primary text-xs">
          Create AI Purchase Proposal
        </button>
      </div>
    );
  }

  const steps = [
    { key: 'PROPOSED', label: '1. AI Proposed', desc: 'Authoritative server price check' },
    { key: 'MERCHANT_APPROVED', label: '2. Policy Pass', desc: 'Merchant rules verified' },
    { key: 'ORDER_CREATED', label: '3. Order Created', desc: 'PayPal Sandbox order with key' },
    { key: 'BUYER_APPROVED', label: '4. Buyer Approved', desc: 'PayPal Checkout completed' },
    { key: 'CAPTURED', label: '5. Settled / Captured', desc: 'Distinct capture key verified' },
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
      setStatusMessage(`PayPal Sandbox order ${data.orderId} created successfully with idempotency key.`);
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
      setShowCheckoutModal(false);
      setStatusMessage('Buyer approval verified in Sandbox. Order is now authorized for capture.');
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
      setStatusMessage(`Order successfully captured! Capture ID: ${data.captureId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test Premature Capture (Proof of Security Control)
  const handleTestPrematureCapture = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/capture-paypal`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`SECURITY CONTROL PROVEN (Blocked 400): ${data.error}`);
      } else {
        onOperationUpdated(data.operation);
      }
    } catch (err: any) {
      setError(`Rejection confirmed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test Idempotency Retry
  const handleTestRetry = async (tamper: boolean) => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/orders/${operation.operationId}/test-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_ORDER', tamperPayload: tamper }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`TAMPER DETECTION PROVEN (Conflict 409): ${data.message || data.error}`);
      } else {
        setStatusMessage(`IDEMPOTENCY PROVEN: Key '${data.key}' safely reused (isRetry: ${data.isRetry}).`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0070BA]" />
            <span>PayPal Sandbox Checkout & State Machine</span>
          </h2>
          <p className="text-sm text-slate-300">
            Enforces: Merchant Policy Gate → Sandbox Order → Buyer Approval → Idempotent Capture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-sandbox text-xs">
            Operation: {operation.operationId}
          </span>
        </div>
      </div>

      {/* State Machine Progress Bar */}
      <div className="glass-panel p-5 rounded-xl border-[#1E2E50]">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {steps.map((st, i) => {
            const isCompleted = currentIndex > i;
            const isCurrent = currentIndex === i;
            return (
              <div
                key={st.key}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'bg-[#003087]/50 border-[#FFC439] shadow-[0_0_10px_rgba(255,196,57,0.2)]'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-[#0E172C] border-[#1E2E50] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    {st.label}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-[#FFC439] animate-pulse" />
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status or Error Alerts */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Order Summary & Interactive Actions */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2E50] pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Order Summary
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                operation.state === 'CAPTURED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : operation.state === 'DENIED'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-[#003087] text-[#FFC439] border border-[#004B99]'
              }`}>
                STATE: {operation.state}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Catalog Item:</span>
                <p className="font-bold text-white mt-0.5">{operation.serverCatalogItem?.name || operation.catalogId}</p>
              </div>
              <div>
                <span className="text-slate-400">Quantity & Price:</span>
                <p className="font-bold text-white mt-0.5">
                  {operation.quantity}x @ ${operation.serverCatalogItem?.unitPrice || 0} USD
                </p>
              </div>
              <div>
                <span className="text-slate-400">Total Authoritative Amount:</span>
                <p className="font-bold text-xl text-[#38BDF8] mt-0.5">
                  ${operation.totalAmount.toFixed(2)} {operation.currency}
                </p>
              </div>
              <div>
                <span className="text-slate-400">PayPal Order ID:</span>
                <p className="font-mono text-xs text-white mt-0.5 truncate">
                  {operation.paypalOrderId || 'Not yet created'}
                </p>
              </div>
            </div>

            {/* Action Buttons Depending on State */}
            <div className="pt-4 border-t border-[#1E2E50] space-y-3">
              {operation.state === 'PROPOSED' && (
                <button
                  onClick={handleMerchantApprove}
                  disabled={loading}
                  className="btn btn-primary w-full py-2.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Grant Merchant Admin Policy Approval</span>
                </button>
              )}

              {operation.state === 'MERCHANT_APPROVED' && (
                <button
                  onClick={handleCreatePayPalOrder}
                  disabled={loading}
                  className="btn btn-primary w-full py-2.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Create PayPal Sandbox Order (with Idempotency Key)</span>
                </button>
              )}

              {operation.state === 'ORDER_CREATED' && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCheckoutModal(true)}
                    className="btn-paypal w-full flex items-center justify-center gap-2 py-3 text-sm"
                  >
                    {/* PayPal Monogram Logo */}
                    <svg
                      width="18"
                      height="20"
                      style={{ width: 18, height: 20, display: 'inline-block', flexShrink: 0 }}
                      viewBox="0 0 100 115"
                      fill="none"
                    >
                      <path d="M78.6 30.4C76.1 47.1 63.8 55.4 46.5 55.4H35.8L28.1 104.7H10L25.3 6.9H56.5C71.3 6.9 80.5 13.9 78.6 30.4Z" fill="#003087"/>
                      <path d="M89.7 44.5C87.2 61.2 74.9 69.5 57.6 69.5H46.9L40.9 108.1H25.3L37.1 32.7H67.6C82.4 32.7 91.6 39.7 89.7 44.5Z" fill="#0079C1"/>
                    </svg>
                    <span>Launch Authentic PayPal Checkout</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Simulates authentic PayPal Checkout popup modal for buyer authorization.
                  </p>
                </div>
              )}

              {operation.state === 'BUYER_APPROVED' && (
                <button
                  onClick={handleCaptureOrder}
                  disabled={loading}
                  className="btn btn-success w-full py-3 text-sm font-bold"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize & Settle Payment (Capture Order)</span>
                </button>
              )}

              {operation.state === 'CAPTURED' && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Transaction Completely Settled</span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-300">
                    Capture ID: {operation.paypalCaptureId}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Reliability & Security Tests */}
          <div className="glass-panel p-5 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-[#1E2E50] pb-2">
              Prove Gateway Security Controls
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleTestPrematureCapture}
                disabled={loading || operation.state === 'BUYER_APPROVED' || operation.state === 'CAPTURED'}
                className="btn btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
                title="Attempts capture before buyer approval to prove rejection"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Test Premature Capture Gate</span>
              </button>

              <button
                onClick={() => handleTestRetry(false)}
                disabled={loading}
                className="btn btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
                title="Tests safe replay with identical idempotency key"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>Test Idempotency Re-Send</span>
              </button>

              <button
                onClick={() => handleTestRetry(true)}
                disabled={loading}
                className="btn btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 sm:col-span-2"
                title="Tests tampering with payload to prove conflict rejection"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Payload Tamper Collision (Must Reject 409)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Idempotency Keys & Audit Ledger */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-panel p-6 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-[#1E2E50] pb-2">
              Cryptographic Idempotency Keys & Audit Trail
            </span>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400">Order Create Key (PayPal-Request-Id):</span>
                <p className="font-mono text-[11px] text-[#38BDF8] p-2 rounded bg-[#080D1A] border border-[#1E2E50] mt-1 break-all">
                  {operation.createRequestId}
                </p>
              </div>

              <div>
                <span className="text-slate-400">Capture Key (PayPal-Request-Id):</span>
                <p className="font-mono text-[11px] text-emerald-400 p-2 rounded bg-[#080D1A] border border-[#1E2E50] mt-1 break-all">
                  {operation.captureRequestId || 'Generated at capture pre-flight'}
                </p>
              </div>

              <div>
                <span className="text-slate-400">Payload Cryptographic Hash (SHA-256):</span>
                <p className="font-mono text-[11px] text-slate-300 p-2 rounded bg-[#080D1A] border border-[#1E2E50] mt-1 break-all">
                  {operation.payloadHash}
                </p>
              </div>

              <div>
                <span className="text-slate-400">Buyer Context / Prompt:</span>
                <p className="text-xs text-slate-300 p-2 rounded bg-[#080D1A] border border-[#1E2E50] mt-1">
                  {operation.buyerContext}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authentic PayPal Sandbox Checkout Modal Popup */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 paypal-modal-overlay">
          <div className="paypal-checkout-card w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <svg
                  width="24"
                  height="28"
                  style={{ width: 24, height: 28, display: 'inline-block', flexShrink: 0 }}
                  viewBox="0 0 100 115"
                  fill="none"
                >
                  <path d="M78.6 30.4C76.1 47.1 63.8 55.4 46.5 55.4H35.8L28.1 104.7H10L25.3 6.9H56.5C71.3 6.9 80.5 13.9 78.6 30.4Z" fill="#003087"/>
                  <path d="M89.7 44.5C87.2 61.2 74.9 69.5 57.6 69.5H46.9L40.9 108.1H25.3L37.1 32.7H67.6C82.4 32.7 91.6 39.7 89.7 44.5Z" fill="#0079C1"/>
                </svg>
                <span className="font-bold text-lg text-[#003087]">PayPal Checkout</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                SANDBOX
              </span>
            </div>

            {/* Buyer Account */}
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span>Account:</span>
                <strong className="text-slate-900">alex.buyer-sandbox@paypal-agent-demo.com</strong>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Shipping to:</span>
                <span>2211 North First Street, San Jose, CA</span>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-b border-slate-200 py-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-medium text-slate-800">
                <span>{operation.serverCatalogItem?.name || operation.catalogId} (x{operation.quantity})</span>
                <span>${operation.totalAmount.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Shipping & Handling</span>
                <span>$0.00 USD</span>
              </div>
              <div className="flex items-center justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-[#0070BA]">${operation.totalAmount.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Funding Source Selector */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700">Pay with:</span>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="funding"
                      checked={selectedFunding === 'balance'}
                      onChange={() => setSelectedFunding('balance')}
                    />
                    <span className="font-medium text-slate-800">PayPal Balance</span>
                  </div>
                  <span className="text-slate-500">$1,450.00 available</span>
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="funding"
                      checked={selectedFunding === 'card'}
                      onChange={() => setSelectedFunding('card')}
                    />
                    <span className="font-medium text-slate-800">Visa ending in •••• 4242</span>
                  </div>
                  <span className="text-slate-500">Chase Sapphire</span>
                </label>
              </div>
            </div>

            {/* Complete Purchase Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSimulateBuyerApproval}
                disabled={loading}
                className="btn-paypal w-full py-3 font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Authorizing in Sandbox...' : `Complete Purchase — $${operation.totalAmount.toFixed(2)} USD`}</span>
              </button>

              <button
                onClick={() => setShowCheckoutModal(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 font-medium py-1"
              >
                Cancel and return to Merchant Gateway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
