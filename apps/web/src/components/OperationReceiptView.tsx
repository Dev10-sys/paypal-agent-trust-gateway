import React, { useState } from 'react';
import {
  FileText,
  Key,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Hash,
  Terminal,
  Lock,
} from 'lucide-react';
import { PurchaseProposal } from '@paypal-gateway/shared';

interface OperationReceiptViewProps {
  operation: PurchaseProposal | null;
  operations: PurchaseProposal[];
  onSelectOperation: (op: PurchaseProposal) => void;
}

export const OperationReceiptView: React.FC<OperationReceiptViewProps> = ({
  operation,
  operations,
  onSelectOperation,
}) => {
  const [retryResult, setRetryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedOp = operation || operations[0];

  if (!selectedOp) {
    return (
      <div className="glass-panel p-12 text-center rounded-2xl border-white/10 text-slate-400">
        No operations in ledger yet.
      </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestRetry = async (tamper: boolean) => {
    setLoading(true);
    setRetryResult(null);
    try {
      const res = await fetch(`/api/orders/${selectedOp.operationId}/test-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_ORDER', tamperPayload: tamper }),
      });
      const data = await res.json();
      setRetryResult({
        ok: res.ok,
        status: res.status,
        data,
      });
    } catch (err: any) {
      setRetryResult({
        ok: false,
        status: 500,
        data: { error: err.message },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Idempotency & Operation Audit Receipt
          </h2>
          <p className="text-sm text-slate-400">
            Immutable SQLite operation ledger, distinct PayPal-Request-Ids, payload hashes, and retry verification.
          </p>
        </div>

        {/* Operation Picker */}
        {operations.length > 1 && (
          <select
            value={selectedOp.operationId}
            onChange={(e) => {
              const found = operations.find((o) => o.operationId === e.target.value);
              if (found) onSelectOperation(found);
            }}
            className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
          >
            {operations.map((op) => (
              <option key={op.operationId} value={op.operationId}>
                {op.operationId} - {op.serverCatalogItem?.name || op.catalogId} ({op.state})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Receipt Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ledger Details */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-lg text-white">Immutable Ledger Entry</span>
            </div>
            <span
              className={`badge ${
                selectedOp.state === 'CAPTURED'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
              }`}
            >
              {selectedOp.state}
            </span>
          </div>

          {/* Details Table */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Operation ID:</span>
              <span className="font-mono text-cyan-400 font-bold">{selectedOp.operationId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Catalog Item & Quantity:</span>
              <span className="text-white font-medium">
                {selectedOp.serverCatalogItem?.name || selectedOp.catalogId} (x{selectedOp.quantity})
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Total Settled Amount:</span>
              <strong className="text-emerald-400">
                {selectedOp.currency} {selectedOp.totalAmount.toFixed(2)}
              </strong>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Approving Actor:</span>
              <span className="text-white">{selectedOp.approvingActor || 'Deterministic Policy Gate'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-slate-400">Created Timestamp:</span>
              <span className="font-mono text-xs text-slate-300">{selectedOp.createdAt}</span>
            </div>

            {/* SHA-256 Payload Hash */}
            <div className="py-2 border-b border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Payload SHA-256 Hash:</span>
                </span>
                <button
                  onClick={() => copyToClipboard(selectedOp.payloadHash, 'hash')}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'hash' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-black/40 rounded-lg font-mono text-xs text-slate-300 break-all border border-white/5">
                {selectedOp.payloadHash}
              </div>
            </div>

            {/* Create vs Capture Request IDs */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-white">Create Order Idempotency Key:</span>
                  <span className="text-emerald-400 font-mono">PayPal-Request-Id</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg font-mono text-xs text-cyan-400 border border-white/5 flex items-center justify-between">
                  <span>{selectedOp.createRequestId}</span>
                  <button
                    onClick={() => copyToClipboard(selectedOp.createRequestId, 'create')}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {selectedOp.captureRequestId && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-white">Capture Order Idempotency Key (Distinct!):</span>
                    <span className="text-emerald-400 font-mono">PayPal-Request-Id</span>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg font-mono text-xs text-cyan-400 border border-white/5 flex items-center justify-between">
                    <span>{selectedOp.captureRequestId}</span>
                    <button
                      onClick={() => copyToClipboard(selectedOp.captureRequestId!, 'capture')}
                      className="text-slate-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Idempotency Retry Simulator */}
        <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">Idempotency & Retry Test</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            PayPal requires passing a stable <code>PayPal-Request-Id</code> to prevent duplicate billing during retries. If the payload changes, reuse must be strictly rejected.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleTestRetry(false)}
              disabled={loading}
              className="w-full btn btn-primary text-xs py-2.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Test Safe Retry (Same Payload)</span>
            </button>

            <button
              onClick={() => handleTestRetry(true)}
              disabled={loading}
              className="w-full btn btn-danger text-xs py-2.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Simulate Attack (Tampered Payload)</span>
            </button>
          </div>

          {/* Retry Result Box */}
          {retryResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                retryResult.ok
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {retryResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>
                  {retryResult.ok
                    ? 'Safe Idempotent Replay Verified'
                    : 'Idempotency Conflict Successfully Blocked (409)'}
                </span>
              </div>
              <p className="leading-relaxed">
                {retryResult.data?.message || retryResult.data?.error}
              </p>
              {retryResult.data?.key && (
                <div className="font-mono text-[11px] text-slate-300">
                  Reused Key: {retryResult.data.key}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Redacted PayPal Response View */}
      {selectedOp.rawOrderResponseRedacted && (
        <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Redacted PayPal Response Payload & Debug Context</span>
            </h3>
            <span className="text-xs text-slate-500">Credentials & tokens sanitized</span>
          </div>

          <pre className="p-4 rounded-xl bg-black/50 border border-white/5 text-xs text-slate-300 font-mono overflow-x-auto max-h-72">
            {JSON.stringify(selectedOp.rawOrderResponseRedacted, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
