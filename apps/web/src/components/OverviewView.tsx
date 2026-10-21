import React from 'react';
import { Shield, ArrowRight, Zap, CheckCircle, AlertTriangle, RefreshCw, Terminal, Layers } from 'lucide-react';
import { PurchaseProposal } from '@paypal-gateway/shared';

interface OverviewViewProps {
  operations: PurchaseProposal[];
  onSelectTab: (tab: string) => void;
  onSelectOperation: (op: PurchaseProposal) => void;
  onRefresh: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  operations,
  onSelectTab,
  onSelectOperation,
  onRefresh,
}) => {
  const approvedCount = operations.filter((o) => o.state === 'CAPTURED' || o.state === 'BUYER_APPROVED' || o.state === 'ORDER_CREATED').length;
  const deniedCount = operations.filter((o) => o.state === 'DENIED').length;

  return (
    <div className="space-y-8">
      {/* Hero Banner with Problem Statement */}
      <div className="glass-panel p-8 rounded-2xl relative overflow-hidden border-cyan-500/20 bg-gradient-to-br from-slate-900/90 via-[#071328]/80 to-slate-900/90">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0070ba]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Developer Trust & Security Layer</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Guarded AI Payments & PayPal Integration Auditor
          </h1>

          <blockquote className="p-4 rounded-xl bg-black/40 border-l-4 border-cyan-400 text-slate-300 text-sm italic leading-relaxed">
            “AI-assisted payment integrations combine agent tool access, merchant-side transaction limits, buyer approval, idempotent API calls, webhook processing, and dependency integrity. Developers must compose those controls across SDKs and services. PayPal Agent Trust Gateway makes those decisions visible, enforces merchant policy before an API call, and proves the approved flow in PayPal Sandbox.”
          </blockquote>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => onSelectTab('new-request')}
              className="btn btn-primary"
            >
              <Zap className="w-4 h-4" />
              <span>Propose Guarded Purchase</span>
            </button>
            <button
              onClick={() => onSelectTab('audit')}
              className="btn btn-secondary"
            >
              <Terminal className="w-4 h-4" />
              <span>Audit Integration Repo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>TOTAL LEDGER OPERATIONS</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{operations.length}</div>
          <p className="text-xs text-slate-500 mt-1">Persisted in SQLite local ledger</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>POLICY APPROVED / CREATED</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{approvedCount}</div>
          <p className="text-xs text-slate-500 mt-1">Passed deterministic merchant rules</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>POLICY DENIED ATTEMPTS</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">{deniedCount}</div>
          <p className="text-xs text-slate-500 mt-1">Over-cap, tamper or unauthorized</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>SANDBOX ENFORCEMENT</span>
            <Shield className="w-4 h-4 text-[#00cfde]" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">100%</div>
          <p className="text-xs text-slate-500 mt-1">Production calls strictly blocked</p>
        </div>
      </div>

      {/* Recent Operations Ledger Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border-white/10">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Operations & Idempotency Ledger</h2>
            <p className="text-xs text-slate-400">
              Deterministic state progression with unique PayPal request IDs
            </p>
          </div>
          <button onClick={onRefresh} className="btn btn-secondary text-xs py-1.5 px-3">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {operations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <p>No operations recorded in ledger yet.</p>
            <button onClick={() => onSelectTab('new-request')} className="btn btn-primary text-xs">
              Create First Purchase Proposal
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/30 text-slate-400 text-xs uppercase font-semibold border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Operation ID</th>
                  <th className="px-6 py-3">Catalog Item</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">State</th>
                  <th className="px-6 py-3">Create Request ID</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {operations.slice(0, 8).map((op) => {
                  let stateColor = 'bg-slate-800 text-slate-300';
                  if (op.state === 'CAPTURED') stateColor = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30';
                  else if (op.state === 'BUYER_APPROVED') stateColor = 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30';
                  else if (op.state === 'ORDER_CREATED') stateColor = 'bg-blue-950/80 text-blue-300 border border-blue-500/30';
                  else if (op.state === 'DENIED') stateColor = 'bg-rose-950/80 text-rose-300 border border-rose-500/30';

                  return (
                    <tr
                      key={op.operationId}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() => {
                        onSelectOperation(op);
                        onSelectTab('approval-flow');
                      }}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-cyan-400 font-medium">
                        {op.operationId}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {op.serverCatalogItem?.name || op.catalogId} (x{op.quantity})
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {op.currency} {op.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${stateColor}`}>
                          {op.state}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 truncate max-w-xs">
                        {op.createRequestId}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-cyan-400 flex items-center gap-1 text-xs font-semibold hover:underline">
                          Inspect <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
