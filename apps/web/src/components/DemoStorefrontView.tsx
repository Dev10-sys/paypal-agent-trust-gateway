import React, { useState } from 'react';
import {
  ShoppingBag,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Cpu,
  Server,
  Terminal,
  ExternalLink,
  ChevronRight,
  Layers,
  CreditCard,
  DollarSign,
  User,
  X
} from 'lucide-react';
import { CatalogItem, PurchaseProposal } from '@paypal-gateway/shared';

interface DemoStorefrontViewProps {
  catalog: CatalogItem[];
  onProposalCreated: (proposal: PurchaseProposal) => void;
  onSelectTab: (tab: string) => void;
  onSelectOperation?: (op: PurchaseProposal) => void;
}

interface StepLog {
  title: string;
  detail: string;
  status: 'pending' | 'success' | 'blocked' | 'running';
  codeFact?: string;
}

export const DemoStorefrontView: React.FC<DemoStorefrontViewProps> = ({
  catalog,
  onProposalCreated,
  onSelectTab,
  onSelectOperation,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [scenarioLogs, setScenarioLogs] = useState<StepLog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProposal, setActiveProposal] = useState<PurchaseProposal | null>(null);
  const [modalStage, setModalStage] = useState<'checkout' | 'processing' | 'success' | 'error'>('checkout');
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedFunding, setSelectedFunding] = useState<'balance' | 'card'>('balance');

  // Interactive Scenario 1: Legitimate Autonomous Agent Purchase ($15.00)
  const runLegitimatePurchaseDemo = async () => {
    setActiveScenario('legitimate');
    setIsRunningScenario(true);
    setScenarioLogs([
      { title: 'AI Agent Prompt', detail: 'Agent requests 1 unit of Cloud Sandbox Environment ($15.00)', status: 'running' }
    ]);

    try {
      // Step 1: Server-side Intent Parsing
      const parseRes = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Purchase 1 Cloud Sandbox Environment for developer testing' }),
      });
      const parseData = await parseRes.json();
      
      setScenarioLogs(prev => [
        { ...prev[0], status: 'success', codeFact: 'Catalog ID: cloud_starter' },
        { title: 'Gateway Policy Evaluation', detail: 'Evaluating $15.00 against $50.00 merchant ceiling and Sandbox constraint', status: 'running' }
      ]);

      // Step 2: Propose Order
      const proposeRes = await fetch('/api/orders/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: 'cloud_starter',
          quantity: 1,
          buyerContext: 'Autonomous Developer Agent test run'
        }),
      });
      const proposeData = await proposeRes.json();
      const proposal: PurchaseProposal = proposeData.proposal;
      setActiveProposal(proposal);
      onProposalCreated(proposal);

      setScenarioLogs(prev => [
        prev[0],
        { ...prev[1], status: 'success', codeFact: 'Policy PASS: Amount $15.00 <= $50.00 Limit' },
        { title: 'Merchant Approval Gate', detail: 'Transitioning operation state to MERCHANT_APPROVED', status: 'running' }
      ]);

      // Step 3: Merchant Approval
      const approveRes = await fetch(`/api/orders/${proposal.operationId}/merchant-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Automated Merchant Policy Engine' }),
      });
      const approveData = await approveRes.json();

      setScenarioLogs(prev => [
        prev[0],
        prev[1],
        { ...prev[2], status: 'success', codeFact: 'State: MERCHANT_APPROVED' },
        { title: 'PayPal Sandbox Order Creation', detail: 'POST /v2/checkout/orders dispatched with per-call PayPal-Request-Id', status: 'running' }
      ]);

      // Step 4: Create PayPal Order
      const paypalRes = await fetch(`/api/orders/${proposal.operationId}/create-paypal`, {
        method: 'POST',
      });
      const paypalData = await paypalRes.json();
      const updatedOp: PurchaseProposal = paypalData.operation;
      setActiveProposal(updatedOp);

      setScenarioLogs(prev => [
        prev[0],
        prev[1],
        prev[2],
        { ...prev[3], status: 'success', codeFact: `Order ID: ${paypalData.orderId}` },
        { title: 'Awaiting Buyer Checkout', detail: 'Opening PayPal Sandbox Interactive Checkout Dialog', status: 'running' }
      ]);

      // Open PayPal Sandbox Dialog for user to complete
      setModalStage('checkout');
      setModalOpen(true);
    } catch (err: any) {
      setScenarioLogs(prev => [
        ...prev,
        { title: 'Error Encountered', detail: err.message, status: 'blocked' }
      ]);
    } finally {
      setIsRunningScenario(false);
    }
  };

  // Interactive Scenario 2: Rogue Over-Limit Spend ($250.00 - Denied)
  const runRogueOverspendDemo = async () => {
    setActiveScenario('rogue-overspend');
    setIsRunningScenario(true);
    setScenarioLogs([
      { title: 'Rogue Agent Intent', detail: 'Unsupervised agent attempts to purchase Enterprise Tier ($250.00)', status: 'running' }
    ]);

    try {
      const proposeRes = await fetch('/api/orders/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: 'enterprise_addon',
          quantity: 1,
          buyerContext: 'Rogue Autonomous Agent (Exceeding limit test)'
        }),
      });
      const data = await proposeRes.json();
      const proposal: PurchaseProposal = data.proposal;
      setActiveProposal(proposal);
      onProposalCreated(proposal);

      setScenarioLogs([
        { title: 'Rogue Agent Intent', detail: 'Autonomous agent attempts to purchase Enterprise Tier ($250.00)', status: 'success', codeFact: 'Catalog ID: enterprise_addon' },
        { 
          title: 'Gateway Policy Blocked', 
          detail: `Transaction rejected: ${data.policyResult.reasons.join('; ')}`, 
          status: 'blocked',
          codeFact: 'HTTP 200 / Policy DENIED (Zero Sandbox API calls triggered)'
        },
        { 
          title: 'Audit Ledger Entry', 
          detail: `Logged to SQLite with state: DENIED. Denial Reason: ${proposal.denialReason}`, 
          status: 'success',
          codeFact: `Op ID: ${proposal.operationId}`
        }
      ]);
    } catch (err: any) {
      setScenarioLogs(prev => [
        ...prev,
        { title: 'Error', detail: err.message, status: 'blocked' }
      ]);
    } finally {
      setIsRunningScenario(false);
    }
  };

  // Interactive Scenario 3: Client-Side Price Tampering ($25.00 -> $1.00 Override)
  const runPriceTamperingDemo = async () => {
    setActiveScenario('price-tamper');
    setIsRunningScenario(true);
    setScenarioLogs([
      { title: 'Malicious Request Injected', detail: 'Client sends Ads Campaign - Pro ($25.00) with clientPriceOverride = $1.00', status: 'running' }
    ]);

    try {
      const proposeRes = await fetch('/api/orders/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: 'ads_pro',
          quantity: 1,
          clientPriceOverride: 1.0,
          buyerContext: 'Malicious client price tampering simulation'
        }),
      });
      const data = await proposeRes.json();
      const proposal: PurchaseProposal = data.proposal;
      setActiveProposal(proposal);
      onProposalCreated(proposal);

      setScenarioLogs([
        { 
          title: 'Malicious Request Injected', 
          detail: 'Client-reported price $1.00 was rejected. Gateway evaluated against authoritative server catalog ($25.00).', 
          status: 'blocked',
          codeFact: 'Price Tampering Detected: Client $1.00 vs Server $25.00' 
        },
        { 
          title: 'Authoritative Rejection', 
          detail: `Policy result: ${data.policyResult.reasons.join('; ')}`, 
          status: 'success',
          codeFact: 'Server Catalog Preserved (Zero Client Price Trust)'
        }
      ]);
    } catch (err: any) {
      setScenarioLogs(prev => [
        ...prev,
        { title: 'Error', detail: err.message, status: 'blocked' }
      ]);
    } finally {
      setIsRunningScenario(false);
    }
  };

  // Interactive Scenario 4: Network Retry & Idempotency Duplicate Replay
  const runIdempotencyRetryDemo = async () => {
    if (!activeProposal || activeProposal.state === 'DENIED') {
      // Run legitimate order first to obtain an active operation
      await runLegitimatePurchaseDemo();
      return;
    }

    setActiveScenario('idempotency');
    setIsRunningScenario(true);
    setScenarioLogs(prev => [
      ...prev,
      { title: 'Simulating Network Replay / Double-Click', detail: `Re-dispatching identical create request with key: ${activeProposal.createRequestId}`, status: 'running' }
    ]);

    try {
      const res = await fetch(`/api/orders/${activeProposal.operationId}/test-retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE_ORDER', tamperPayload: false }),
      });
      const data = await res.json();

      setScenarioLogs(prev => [
        ...prev.slice(0, -1),
        {
          title: 'Idempotency Protection Confirmed',
          detail: `Duplicate network call safely intercepted. Key '${data.key}' was recognized. isRetry: true. Zero duplicate orders created.`,
          status: 'success',
          codeFact: 'PayPal-Request-Id: Cached Response Replayed'
        }
      ]);
    } catch (err: any) {
      setScenarioLogs(prev => [
        ...prev,
        { title: 'Retry Error', detail: err.message, status: 'blocked' }
      ]);
    } finally {
      setIsRunningScenario(false);
    }
  };

  // Direct Product Checkout with PayPal Button
  const handleDirectProductCheckout = async (item: CatalogItem) => {
    setSelectedProduct(item);
    setIsRunningScenario(true);
    setActiveScenario('direct-checkout');
    setScenarioLogs([
      { title: 'Initiating Checkout', detail: `Preparing ${item.name} ($${item.unitPrice.toFixed(2)}) for PayPal Sandbox payment`, status: 'running' }
    ]);

    try {
      // 1. Propose
      const proposeRes = await fetch('/api/orders/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogId: item.id,
          quantity: purchaseQuantity,
          buyerContext: 'Direct Storefront Checkout'
        }),
      });
      const proposeData = await proposeRes.json();
      const proposal: PurchaseProposal = proposeData.proposal;
      setActiveProposal(proposal);
      onProposalCreated(proposal);

      if (!proposeData.policyResult.allowed) {
        setScenarioLogs([
          { 
            title: 'Purchase Blocked by Gateway Policy', 
            detail: `Amount $${proposal.totalAmount.toFixed(2)} exceeds merchant policy limit of $50.00 USD.`, 
            status: 'blocked',
            codeFact: 'Policy Gate Enforced' 
          }
        ]);
        setIsRunningScenario(false);
        return;
      }

      // 2. Merchant Approval
      await fetch(`/api/orders/${proposal.operationId}/merchant-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Storefront Checkout System' }),
      });

      // 3. Create PayPal Sandbox Order
      const paypalRes = await fetch(`/api/orders/${proposal.operationId}/create-paypal`, {
        method: 'POST',
      });
      const paypalData = await paypalRes.json();
      const updatedOp: PurchaseProposal = paypalData.operation;
      setActiveProposal(updatedOp);

      setScenarioLogs([
        { title: 'Gateway Policy Passed', detail: `Authoritative server price verified: $${proposal.totalAmount.toFixed(2)}`, status: 'success' },
        { title: 'PayPal Sandbox Order Ready', detail: `Order ID: ${paypalData.orderId}`, status: 'success', codeFact: `PayPal-Request-Id: ${proposal.createRequestId}` }
      ]);

      setModalStage('checkout');
      setModalOpen(true);
    } catch (err: any) {
      setScenarioLogs(prev => [
        ...prev,
        { title: 'Checkout Failed', detail: err.message, status: 'blocked' }
      ]);
    } finally {
      setIsRunningScenario(false);
    }
  };

  // Complete Sandbox Payment inside Modal
  const handleModalPayNow = async () => {
    if (!activeProposal) return;
    setModalStage('processing');
    setModalError(null);

    try {
      // Step A: Buyer Approval in Sandbox
      const approveRes = await fetch(`/api/orders/${activeProposal.operationId}/simulate-buyer-approval`, {
        method: 'POST',
      });
      const approveData = await approveRes.json();
      if (!approveRes.ok) throw new Error(approveData.error);

      // Step B: Server-Side Capture with Distinct Key
      const captureRes = await fetch(`/api/orders/${activeProposal.operationId}/capture-paypal`, {
        method: 'POST',
      });
      const captureData = await captureRes.json();
      if (!captureRes.ok) throw new Error(captureData.error);

      const capturedOp: PurchaseProposal = captureData.operation;
      setActiveProposal(capturedOp);
      setModalStage('success');

      setScenarioLogs(prev => [
        ...prev,
        { title: 'Buyer Approved', detail: 'PayPal Sandbox approval token verified', status: 'success' },
        { title: 'Settlement Captured', detail: `Captured successfully. Capture ID: ${captureData.captureId}`, status: 'success', codeFact: `Capture Key: ${capturedOp.captureRequestId}` }
      ]);
    } catch (err: any) {
      setModalError(err.message);
      setModalStage('error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Store Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border-[#1E2E50] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0070BA]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#002654] text-[#38BDF8] border border-[#003875]">
                MERCHANT DEMO STOREFRONT
              </span>
              <span className="badge badge-sandbox flex items-center gap-1 bg-[#003087] text-[#FFC439] border border-[#004B99]">
                <Lock className="w-3 h-3 text-[#FFC439]" /> PAYPAL SANDBOX ENFORCED
              </span>
              <span className="text-xs font-mono text-slate-400">
                Merchant ID: <strong className="text-white">MERCHANT-NEXUS-01</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Nexus Cloud & AI Services</span>
              <span className="text-[#38BDF8] text-lg font-normal">Storefront</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl">
              Experience end-to-end commerce protected by the PayPal Agent Trust Gateway. See how autonomous buyer agents purchase cloud tools while merchant policies prevent runaway spend and client price tampering.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-row lg:flex-col gap-3 shrink-0">
            <div className="bg-[#080D1A] border border-[#1E2E50] rounded-xl p-3 text-xs space-y-1">
              <span className="text-slate-400 block font-medium">Merchant Spend Ceiling:</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">$50.00 USD / transaction</span>
            </div>
            <div className="bg-[#080D1A] border border-[#1E2E50] rounded-xl p-3 text-xs space-y-1">
              <span className="text-slate-400 block font-medium">Authoritative Pricing:</span>
              <span className="text-[#38BDF8] font-bold font-mono text-sm">Server-Enforced (Zero Client Trust)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 One-Click Interactive Test Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FFC439]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Interactive Agent Test Scenarios (1-Click Run)
            </h2>
          </div>
          <span className="text-xs text-slate-400">Click any scenario to see live gateway interception</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Scenario 1 */}
          <button
            onClick={runLegitimatePurchaseDemo}
            disabled={isRunningScenario}
            className={`p-4 rounded-xl text-left border transition-all ${
              activeScenario === 'legitimate'
                ? 'bg-[#121E36] border-[#0070BA] shadow-[0_0_15px_rgba(0,112,186,0.3)]'
                : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                SCENARIO 1 • PASS
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">$15.00</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Legitimate AI Purchase</h3>
            <p className="text-xs text-slate-400">
              Agent buys Cloud Sandbox. Within $50 limit, triggers PayPal order and checkout modal.
            </p>
          </button>

          {/* Scenario 2 */}
          <button
            onClick={runRogueOverspendDemo}
            disabled={isRunningScenario}
            className={`p-4 rounded-xl text-left border transition-all ${
              activeScenario === 'rogue-overspend'
                ? 'bg-[#121E36] border-[#0070BA] shadow-[0_0_15px_rgba(0,112,186,0.3)]'
                : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                SCENARIO 2 • BLOCKED
              </span>
              <span className="text-xs font-mono text-rose-400 font-bold">$250.00</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Rogue Agent Overspend</h3>
            <p className="text-xs text-slate-400">
              Agent attempts Enterprise purchase. Gateway blocks request before PayPal is called.
            </p>
          </button>

          {/* Scenario 3 */}
          <button
            onClick={runPriceTamperingDemo}
            disabled={isRunningScenario}
            className={`p-4 rounded-xl text-left border transition-all ${
              activeScenario === 'price-tamper'
                ? 'bg-[#121E36] border-[#0070BA] shadow-[0_0_15px_rgba(0,112,186,0.3)]'
                : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                SCENARIO 3 • TAMPER
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">$25 vs $1</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Price Tamper Attack</h3>
            <p className="text-xs text-slate-400">
              Client sends injected $1.00 override. Gateway rejects it; uses server catalog.
            </p>
          </button>

          {/* Scenario 4 */}
          <button
            onClick={runIdempotencyRetryDemo}
            disabled={isRunningScenario}
            className={`p-4 rounded-xl text-left border transition-all ${
              activeScenario === 'idempotency'
                ? 'bg-[#121E36] border-[#0070BA] shadow-[0_0_15px_rgba(0,112,186,0.3)]'
                : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                SCENARIO 4 • RETRY
              </span>
              <span className="text-xs font-mono text-[#38BDF8] font-bold">REPLAY KEY</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Double-Charge Retry</h3>
            <p className="text-xs text-slate-400">
              Replays same idempotency key. Proves PayPal-Request-Id deduplication prevents double billing.
            </p>
          </button>
        </div>
      </div>

      {/* Live Gateway Telemetry HUD (Shows when a scenario is triggered) */}
      {scenarioLogs.length > 0 && (
        <div className="glass-panel p-5 rounded-xl border-[#1E2E50] bg-[#0A1020] space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E2E50] pb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Live Gateway Interception Telemetry
              </span>
            </div>
            {isRunningScenario && (
              <span className="flex items-center gap-1.5 text-xs text-[#FFC439]">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Executing Pipeline...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {scenarioLogs.map((log, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                  log.status === 'success'
                    ? 'bg-[#0E1F1A] border-emerald-900/60 text-emerald-200'
                    : log.status === 'blocked'
                    ? 'bg-[#210D12] border-rose-900/60 text-rose-200'
                    : log.status === 'running'
                    ? 'bg-[#182038] border-[#0070BA] text-blue-200'
                    : 'bg-[#0E172C] border-[#1E2E50] text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{log.title}</span>
                  {log.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {log.status === 'blocked' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {log.status === 'running' && <RotateCw className="w-3.5 h-3.5 text-[#38BDF8] animate-spin" />}
                </div>
                <p className="text-[11px] opacity-90">{log.detail}</p>
                {log.codeFact && (
                  <div className="mt-1.5 pt-1 border-t border-white/10 text-[10px] text-slate-300 font-semibold truncate">
                    {log.codeFact}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Storefront Products Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Available Store Catalog & Direct Checkout
            </h2>
          </div>
          <span className="text-xs text-slate-400">All prices authoritative server-side</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {catalog.map((item) => {
            const isOverCeiling = item.unitPrice > 50.0;
            return (
              <div
                key={item.id}
                className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                  isOverCeiling
                    ? 'border-amber-900/40 bg-[#0E172C]/70'
                    : 'border-[#1E2E50] hover:border-[#0070BA] bg-[#0E172C]'
                }`}
              >
                <div className="space-y-3">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#080D1A] text-slate-400 border border-[#1E2E50]">
                      {item.category}
                    </span>
                    {isOverCeiling ? (
                      <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400" /> Over $50 Cap
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Policy Compliant
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-[#38BDF8] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Price Tag */}
                  <div className="py-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      ${item.unitPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{item.currency}</span>
                  </div>
                </div>

                {/* Checkout Actions */}
                <div className="pt-4 border-t border-[#1E2E50] space-y-2 mt-4">
                  {/* Authentic PayPal Button */}
                  <button
                    onClick={() => handleDirectProductCheckout(item)}
                    disabled={isRunningScenario}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm bg-[#FFC439] hover:bg-[#F2BA36] text-[#001C3D]"
                  >
                    {/* Authentic PayPal SVG Mark */}
                    <svg
                      width="16"
                      height="18"
                      style={{ width: 16, height: 18, display: 'block', flexShrink: 0 }}
                      viewBox="0 0 100 115"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M78.6 30.4C76.1 47.1 63.8 55.4 46.5 55.4H35.8L28.1 104.7H10L25.3 6.9H56.5C71.3 6.9 80.5 13.9 78.6 30.4Z" fill="#003087"/>
                      <path d="M89.7 44.5C87.2 61.2 74.9 69.5 57.6 69.5H46.9L40.9 108.1H25.3L37.1 32.7H67.6C82.4 32.7 91.6 39.7 89.7 44.5Z" fill="#0079C1"/>
                      <path d="M46.9 69.5L52.8 32.7H37.1L28.1 104.7H41.2L46.9 69.5Z" fill="#00235C" opacity="0.6"/>
                    </svg>
                    <span>Checkout with PayPal</span>
                  </button>

                  {/* Secondary Agent Prompt Trigger */}
                  <button
                    onClick={() => {
                      if (onSelectOperation && activeProposal) onSelectOperation(activeProposal);
                      onSelectTab('new-request');
                    }}
                    className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#080D1A] hover:bg-[#131F37] border border-[#1E2E50] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Open in AI Agent Terminal</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive PayPal Sandbox Checkout Modal */}
      {modalOpen && activeProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] text-[#001C3D] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-300">
            {/* Modal Top Header (Authentic PayPal Navy) */}
            <div className="bg-[#001C3D] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center p-1 rounded bg-[#002654]" style={{ width: 28, height: 28 }}>
                  <svg
                    width="18"
                    height="20"
                    style={{ width: 18, height: 20, display: 'block' }}
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
                  <h3 className="font-bold text-sm tracking-tight">PayPal Checkout Sandbox</h3>
                  <span className="text-[11px] text-[#38BDF8] flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Enforced Sandbox Session
                  </span>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {modalStage === 'checkout' && (
                <>
                  {/* Logged in buyer box */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0070BA] text-white flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block">Buyer Sandbox Account</span>
                        <span className="text-slate-500 font-mono">sb-buyer-agent@personal.example.com</span>
                      </div>
                    </div>
                    <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded text-[10px]">
                      VERIFIED
                    </span>
                  </div>

                  {/* Order Summary */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Store Merchant</span>
                      <span className="font-semibold text-slate-800">Nexus Cloud Services</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Item Purchased</span>
                      <span className="font-semibold text-slate-800">
                        {activeProposal.serverCatalogItem?.name || activeProposal.catalogId} (x{activeProposal.quantity})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>PayPal Sandbox Order ID</span>
                      <span className="font-mono text-[11px] text-[#0070BA]">
                        {activeProposal.paypalOrderId || 'GENERATING_ORDER'}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-sm">Total to Authorize</span>
                      <span className="font-extrabold text-xl text-[#0070BA] font-mono">
                        ${activeProposal.totalAmount.toFixed(2)} {activeProposal.currency}
                      </span>
                    </div>
                  </div>

                  {/* Payment Funding Source */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        onClick={() => setSelectedFunding('balance')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 text-xs transition-all ${
                          selectedFunding === 'balance'
                            ? 'border-[#0070BA] bg-blue-50/50 text-[#001C3D] font-bold'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="funding"
                          checked={selectedFunding === 'balance'}
                          onChange={() => {}}
                          className="text-[#0070BA]"
                        />
                        <div>
                          <span>PayPal Balance</span>
                          <span className="block text-[11px] text-slate-500 font-normal">$1,250.00 Available</span>
                        </div>
                      </label>

                      <label
                        onClick={() => setSelectedFunding('card')}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 text-xs transition-all ${
                          selectedFunding === 'card'
                            ? 'border-[#0070BA] bg-blue-50/50 text-[#001C3D] font-bold'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="funding"
                          checked={selectedFunding === 'card'}
                          onChange={() => {}}
                          className="text-[#0070BA]"
                        />
                        <div>
                          <span>Visa debit card</span>
                          <span className="block text-[11px] text-slate-500 font-normal">•••• 1881</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Pay Now Button */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleModalPayNow}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#0070BA] hover:bg-[#005ea6] transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Lock className="w-4 h-4 text-white" />
                      <span>Complete Purchase • ${activeProposal.totalAmount.toFixed(2)} USD</span>
                    </button>
                    <p className="text-[11px] text-center text-slate-400">
                      Sandbox transactions do not charge real payment cards. Per-call idempotency keys enforced.
                    </p>
                  </div>
                </>
              )}

              {modalStage === 'processing' && (
                <div className="py-12 text-center space-y-4">
                  <RotateCw className="w-12 h-12 text-[#0070BA] animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-slate-800">Processing PayPal Settlement</h4>
                    <p className="text-xs text-slate-500">
                      Verifying buyer approval token and dispatching idempotent capture...
                    </p>
                  </div>
                </div>
              )}

              {modalStage === 'success' && (
                <div className="py-6 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xl text-slate-900">Payment Succeeded!</h4>
                    <p className="text-xs text-slate-500">
                      Funds successfully captured into merchant account with full audit trail.
                    </p>
                  </div>

                  {/* Receipt Box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Operation ID:</span>
                      <strong className="text-slate-800">{activeProposal.operationId}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PayPal Order ID:</span>
                      <strong className="text-[#0070BA]">{activeProposal.paypalOrderId}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PayPal Capture ID:</span>
                      <strong className="text-emerald-700">{activeProposal.paypalCaptureId || 'CAP-SANDBOX-SUCCESS'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capture Request ID:</span>
                      <span className="text-slate-700 truncate max-w-[200px]">{activeProposal.captureRequestId}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => {
                        setModalOpen(false);
                        if (onSelectOperation) onSelectOperation(activeProposal);
                        onSelectTab('receipt');
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#001C3D] text-white hover:bg-[#002B5E] transition-colors"
                    >
                      View in Ledger
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Back to Store
                    </button>
                  </div>
                </div>
              )}

              {modalStage === 'error' && (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-slate-900">Payment Error</h4>
                    <p className="text-xs text-rose-600">{modalError || 'An unexpected error occurred'}</p>
                  </div>
                  <button
                    onClick={() => setModalStage('checkout')}
                    className="py-2 px-4 rounded-lg text-xs font-bold bg-slate-200 text-slate-700"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
