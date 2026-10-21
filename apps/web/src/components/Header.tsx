import React from 'react';
import { ShieldCheck, Cpu, Database, CheckCircle2, Lock, ExternalLink } from 'lucide-react';

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
    { id: 'overview', label: 'Dashboard' },
    { id: 'new-request', label: 'AI Purchase Request' },
    { id: 'approval-flow', label: 'PayPal Checkout & Capture' },
    { id: 'receipt', label: 'Idempotency & Ledger' },
    { id: 'audit', label: 'Integration Auditor' },
    { id: 'supply-chain', label: 'Supply Chain & PQC' },
  ];

  return (
    <header className="border-b border-[#1E2E50] bg-[#001C3D]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          {/* Authentic PayPal Logo */}
          <div className="flex items-center justify-center p-1 rounded-lg bg-[#002654] border border-[#003875]" style={{ width: 36, height: 36, flexShrink: 0 }}>
            <svg
              className="paypal-logo-svg"
              width="22"
              height="26"
              style={{ width: 22, height: 26, display: 'block', flexShrink: 0 }}
              viewBox="0 0 100 115"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M78.6 30.4C76.1 47.1 63.8 55.4 46.5 55.4H35.8L28.1 104.7H10L25.3 6.9H56.5C71.3 6.9 80.5 13.9 78.6 30.4Z" fill="#003087"/>
              <path d="M89.7 44.5C87.2 61.2 74.9 69.5 57.6 69.5H46.9L40.9 108.1H25.3L37.1 32.7H67.6C82.4 32.7 91.6 39.7 89.7 44.5Z" fill="#0079C1"/>
              <path d="M46.9 69.5L52.8 32.7H37.1L28.1 104.7H41.2L46.9 69.5Z" fill="#00235C" opacity="0.6"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                <span className="text-white">PayPal</span>
                <span className="text-[#38BDF8] font-normal">Agent Trust Gateway</span>
              </span>
              <span className="badge badge-sandbox flex items-center gap-1 bg-[#003087] text-[#FFC439] border border-[#004B99]">
                <Lock className="w-3 h-3 text-[#FFC439]" /> SANDBOX ONLY
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Developer Guardrails, Deterministic Policy Gate & Integration Auditor
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E172C] border border-[#1E2E50] text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>AI Provider: <strong className="text-white">{systemHealth?.isMockAi ? 'Deterministic Policy AI' : 'Gemini AI'}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E172C] border border-[#1E2E50] text-slate-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ledger: <strong className="text-white">{operationsCount} ops</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#003087]/70 border border-[#0052A3] text-[#38BDF8]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sandbox Mode Active</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto gap-2 border-t border-[#132244] pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm transition-all relative border-b-2 whitespace-nowrap ${
                isActive
                  ? 'text-[#FFC439] border-[#FFC439] font-bold'
                  : 'text-slate-300 border-transparent hover:text-white hover:border-slate-500 font-medium'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#FFC439]" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
