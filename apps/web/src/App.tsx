import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { NewRequestView } from './components/NewRequestView';
import { PayPalApprovalView } from './components/PayPalApprovalView';
import { OperationReceiptView } from './components/OperationReceiptView';
import { RepositoryAuditView } from './components/RepositoryAuditView';
import { SupplyChainView } from './components/SupplyChainView';
import { CatalogItem, PurchaseProposal } from '@paypal-gateway/shared';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [operations, setOperations] = useState<PurchaseProposal[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<PurchaseProposal | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setSystemHealth(data);
    } catch {
      // Offline fallback
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/catalog');
      const data = await res.json();
      setCatalog(data.catalog || []);
    } catch {
      // Offline fallback
    }
  };

  const fetchOperations = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOperations(data.operations || []);
      if (!selectedOperation && data.operations?.length > 0) {
        setSelectedOperation(data.operations[0]);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchCatalog();
    fetchOperations();
    const interval = setInterval(() => {
      fetchOperations();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleProposalCreated = (proposal: PurchaseProposal) => {
    setOperations((prev) => [proposal, ...prev]);
    setSelectedOperation(proposal);
    setActiveTab('approval-flow');
  };

  const handleOperationUpdated = (updated: PurchaseProposal) => {
    setOperations((prev) =>
      prev.map((o) => (o.operationId === updated.operationId ? updated : o))
    );
    setSelectedOperation(updated);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemHealth={systemHealth}
        operationsCount={operations.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <OverviewView
            operations={operations}
            onSelectTab={setActiveTab}
            onSelectOperation={(op) => setSelectedOperation(op)}
            onRefresh={fetchOperations}
          />
        )}

        {activeTab === 'new-request' && (
          <NewRequestView
            catalog={catalog}
            onProposalCreated={handleProposalCreated}
          />
        )}

        {activeTab === 'approval-flow' && (
          <PayPalApprovalView
            operation={selectedOperation}
            onOperationUpdated={handleOperationUpdated}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'receipt' && (
          <OperationReceiptView
            operation={selectedOperation}
            operations={operations}
            onSelectOperation={(op) => setSelectedOperation(op)}
          />
        )}

        {activeTab === 'audit' && <RepositoryAuditView />}

        {activeTab === 'supply-chain' && <SupplyChainView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-black/30 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>PayPal Agent Trust Gateway • Open Source Apache-2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://paypalaihackathon.devpost.com/rules"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              Hackathon Official Rules
            </a>
            <span>•</span>
            <a
              href="https://developer.paypal.com/api/rest/requests/#idempotency"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              PayPal Idempotency Docs
            </a>
            <span>•</span>
            <span>All Traffic Enforced to Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
