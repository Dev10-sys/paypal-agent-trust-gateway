import React from 'react';
import { ShieldCheck, Cpu, Database, CheckCircle2, Lock } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemHealth: any;
  operationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  systemHealth,
  operationsCount,
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'new-request', label: 'New AI Purchase' },
    { id: 'approval-flow', label: 'Sandbox Approval Flow' },
    { id: 'receipt', label: 'Idempotency & Receipts' },
    { id: 'audit', label: 'Repository Auditor' },
    { id: 'supply-chain', label: 'Supply Chain & PQC' },
  ];

  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0070ba] to-[#00cfde] flex items-center justify-center shadow-lg shadow-[#0070ba]/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-xl text-white tracking-tight">
                PayPal Agent Trust Gateway
              </span>
              <span className="badge badge-sandbox flex items-center gap-1">
                <Lock className="w-3 h-3" /> Sandbox Enforced
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Security, Merchant Policy Gate & Code Auditor
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI: <strong className="text-white">{systemHealth?.isMockAi ? 'Mock AI (Deterministic)' : 'Gemini AI'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ledger: <strong className="text-white">{operationsCount} ops</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PayPal Sandbox Active</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto gap-1 border-t border-white/5 pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all relative border-b-2 whitespace-nowrap ${
                isActive
                  ? 'text-cyan-400 border-cyan-400 font-semibold'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[#0070ba] to-[#00cfde] shadow-[0_0_8px_#00cfde]" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
