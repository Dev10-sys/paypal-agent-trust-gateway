import React from 'react';
import {
  Shield,
  ArrowRight,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Layers,
  GitBranch,
  FolderGit2,
  Lock,
} from 'lucide-react';
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
  const approvedCount = operations.filter(
    (o) => o.state === 'CAPTURED' || o.state === 'BUYER_APPROVED' || o.state === 'ORDER_CREATED'
  ).length;
  const deniedCount = operations.filter((o) => o.state === 'DENIED').length;

  return (
    <div className="space-y-6">
      {/* Hero Banner with PayPal Professional Brand Styling */}
      <div className="glass-panel p-8 rounded-2xl relative overflow-hidden bg-gradient-to-r from-[#001C3D] via-[#0A2552] to-[#001C3D] border-[#1E2E50]">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#003087] text-[#FFC439] text-xs font-bold border border-[#004B99]">
            <Lock className="w-3.5 h-3.5 text-[#FFC439]" />
            <span>PayPal Sandbox Guarded Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Developer Trust Gateway for PayPal AI Agents
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            AI-assisted payment integrations combine agent tool access, merchant policy limits, buyer approval, 
            idempotent API calls, and dependency integrity. This gateway enforces deterministic merchant policy 
            before calling PayPal Sandbox, checks exact code paths across official PayPal repositories, and prevents unauthorized captures.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onSelectTab('new-request')}
              className="btn btn-paypal text-sm font-bold flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-[#003087]" />
              <span>New Guarded Purchase</span>
            </button>
            <button
              onClick={() => onSelectTab('audit')}
              className="btn btn-secondary text-sm flex items-center gap-2"
            >
              <FolderGit2 className="w-4 h-4 text-[#38BDF8]" />
              <span>Audit Real Cloned PayPal Repos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Cloned Repositories Section */}
      <div className="glass-panel p-5 rounded-xl border-[#1E2E50] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[#38BDF8]" />
            <span>Target Official PayPal Repositories (Cloned & Available)</span>
          </span>
          <span className="text-xs text-[#38BDF8] font-mono">3 Repositories Ready</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            onClick={() => onSelectTab('audit')}
            className="p-3.5 rounded-lg bg-[#080D1A] border border-[#1E2E50] hover:border-[#0070BA] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs text-white">paypal/agent-toolkit</strong>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#003087] text-[#FFC439] font-bold">15 Findings</span>
            </div>
            <p className="text-[11px] text-slate-400">Official PayPal Agent Toolkit (Python & TS SDKs)</p>
          </div>

          <div
            onClick={() => onSelectTab('audit')}
            className="p-3.5 rounded-lg bg-[#080D1A] border border-[#1E2E50] hover:border-[#0070BA] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs text-white">paypal/paypal-js</strong>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0E2A47] text-[#38BDF8] font-bold">SDK Scanned</span>
            </div>
            <p className="text-[11px] text-slate-400">Official PayPal JS Client Web SDK</p>
          </div>

          <div
            onClick={() => onSelectTab('audit')}
            className="p-3.5 rounded-lg bg-[#080D1A] border border-[#1E2E50] hover:border-[#0070BA] cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <strong className="text-xs text-white">braintree/braintree_ios</strong>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">iOS Scanned</span>
            </div>
            <p className="text-[11px] text-slate-400">Official PayPal Braintree iOS SDK</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border-[#1E2E50]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>TOTAL LEDGER OPERATIONS</span>
            <Layers className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{operations.length}</div>
          <p className="text-xs text-slate-400 mt-1">Persisted in local SQLite ledger</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border-[#1E2E50]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>POLICY APPROVED / CREATED</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{approvedCount}</div>
          <p className="text-xs text-slate-400 mt-1">Passed deterministic policy rules</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border-[#1E2E50]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>POLICY DENIED ATTEMPTS</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">{deniedCount}</div>
          <p className="text-xs text-slate-400 mt-1">Over-cap or unauthorized</p>
        </div>

        <div className="glass-panel p-5 rounded-xl border-[#1E2E50]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>SANDBOX RESTRICTION</span>
            <Shield className="w-4 h-4 text-[#FFC439]" />
          </div>
          <div className="text-3xl font-extrabold text-[#FFC439] mt-2">100%</div>
          <p className="text-xs text-slate-400 mt-1">Production calls strictly blocked</p>
        </div>
      </div>

      {/* Operations Ledger Table */}
      <div className="glass-panel rounded-xl overflow-hidden border-[#1E2E50]">
        <div className="p-4 border-b border-[#1E2E50] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Gateway Operations Ledger</h3>
            <p className="text-xs text-slate-400">Deterministic state audit records with per-call idempotency keys</p>
          </div>
          <button onClick={onRefresh} className="btn btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#080D1A] text-slate-400 uppercase text-[11px] border-b border-[#1E2E50]">
              <tr>
                <th className="py-3 px-4">Operation ID</th>
                <th className="py-3 px-4">Catalog Item</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Idempotency Key</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2E50]">
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No operations in ledger yet. Click 'New Guarded Purchase' above.
                  </td>
                </tr>
              ) : (
                operations.map((op) => (
                  <tr key={op.operationId} className="hover:bg-[#121E36] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-[#38BDF8]">
                      {op.operationId}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {op.serverCatalogItem?.name || op.catalogId} (x{op.quantity})
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      ${op.totalAmount.toFixed(2)} {op.currency}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        op.state === 'CAPTURED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : op.state === 'DENIED'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : op.state === 'BUYER_APPROVED'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-[#003087] text-[#FFC439] border border-[#004B99]'
                      }`}>
                        {op.state}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] max-w-[180px] truncate">
                      {op.createRequestId}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectOperation(op);
                          onSelectTab('approval-flow');
                        }}
                        className="text-[#38BDF8] hover:text-white font-semibold inline-flex items-center gap-1"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
