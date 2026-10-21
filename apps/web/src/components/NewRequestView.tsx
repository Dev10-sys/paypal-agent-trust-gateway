import React, { useState } from 'react';
import { Send, Zap, CheckCircle2, XCircle, AlertCircle, ShoppingBag, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CatalogItem } from '@paypal-gateway/shared';

interface NewRequestViewProps {
  catalog: CatalogItem[];
  onProposalCreated: (proposal: any) => void;
}

export const NewRequestView: React.FC<NewRequestViewProps> = ({
  catalog,
  onProposalCreated,
}) => {
  const [prompt, setPrompt] = useState('Create a $10 Ads Basic order');
  const [loading, setLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [tamperPrice, setTamperPrice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presets = [
    { label: 'Normal $10 Ads Basic (Allowed)', text: 'Create a $10 Ads Basic order' },
    { label: '2x Ads Pro ($50 Max Limit Allowed)', text: 'Buy 2 pro ads campaigns' },
    { label: 'Over-Limit Violation ($250 Denied)', text: 'Purchase enterprise addon tier for 1 client' },
    { label: 'Ambiguous Intent Request', text: 'Please buy something for me' },
  ];

  const handleParseAi = async (textToParse: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/ai/parse-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToParse }),
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!aiAnalysis?.parsedIntent?.catalogId) return;

    setLoading(true);
    try {
      const payload: any = {
        catalogId: aiAnalysis.parsedIntent.catalogId,
        quantity: aiAnalysis.parsedIntent.quantity || 1,
        buyerContext: prompt,
      };

      if (tamperPrice) {
        payload.clientPriceOverride = 1.0; // Tampered price test
      }

      const res = await fetch('/api/orders/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      onProposalCreated(data.proposal);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#FFC439]" />
          <span>Guarded AI Purchase Proposal</span>
        </h2>
        <p className="text-sm text-slate-300">
          AI agents parse human intent into a server-owned catalog ID. Pricing is strictly authoritative on the server (zero client price trust); merchant deterministic policy enforces transaction caps and safe Sandbox operations.
        </p>
      </div>

      {/* Input Card */}
      <div className="glass-panel p-6 rounded-xl border-[#1E2E50] space-y-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
          Natural Language Prompt or Agent Command
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParseAi(prompt)}
            placeholder="e.g. 'Create a $10 Ads Basic order' or 'Buy 2 Ads Pro campaigns'"
            className="flex-1 bg-[#080D1A] border border-[#1E2E50] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#0070BA] font-mono"
          />
          <button
            onClick={() => handleParseAi(prompt)}
            disabled={loading}
            className="btn btn-primary px-6 whitespace-nowrap"
          >
            <Zap className="w-4 h-4 text-[#FFC439]" />
            <span>Parse & Evaluate</span>
          </button>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium mr-1">Quick Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p.text);
                handleParseAi(p.text);
              }}
              className="px-3 py-1 rounded-full text-xs font-medium bg-[#0E172C] border border-[#1E2E50] text-slate-300 hover:bg-[#16243F] hover:border-[#0070BA] hover:text-white transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Server Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Authoritative Server Catalog (Zero Client Price Trust)
          </h3>
          <span className="text-xs text-[#38BDF8] font-mono">Server-Enforced</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {catalog.map((item) => {
            const isSelected = aiAnalysis?.parsedIntent?.catalogId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setPrompt(`Purchase 1 ${item.name}`);
                  handleParseAi(`Purchase 1 ${item.name}`);
                }}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'border-[#0070BA] bg-[#121E36] shadow-[0_0_12px_rgba(0,112,186,0.3)]'
                    : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400">{item.id}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#080D1A] text-emerald-400 border border-emerald-900/40">
                    ${item.unitPrice.toFixed(2)}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white">{item.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Intent & Policy Evaluation Result */}
      {aiAnalysis && (
        <div className="glass-panel p-6 rounded-xl border-[#1E2E50] space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#1E2E50] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">Policy Engine Evaluation</span>
              <span className="badge badge-code-fact">Catalog Mapped</span>
            </div>
            {aiAnalysis.policyResult && (
              <span
                className={`badge text-xs ${
                  aiAnalysis.policyResult.allowed
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {aiAnalysis.policyResult.allowed ? 'POLICY ALLOWED' : 'POLICY REJECTED'}
              </span>
            )}
          </div>

          {/* Ambiguity Alert */}
          {aiAnalysis.parsedIntent?.ambiguous ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">User Clarification Required:</strong>
                <span>{aiAnalysis.parsedIntent.clarificationQuestion}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Extracted Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Extracted Proposal Parameters
                </h4>
                <div className="space-y-2 bg-[#080D1A] p-4 rounded-xl text-xs font-mono border border-[#1E2E50]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Catalog ID:</span>
                    <strong className="text-[#38BDF8]">{aiAnalysis.parsedIntent.catalogId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Item Name:</span>
                    <span className="text-white">{aiAnalysis.catalogItem?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity:</span>
                    <span className="text-white">{aiAnalysis.parsedIntent.quantity}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#1E2E50]">
                    <span className="text-slate-400">Authoritative Total:</span>
                    <strong className="text-emerald-400 text-sm">
                      ${aiAnalysis.totalAmount.toFixed(2)} {aiAnalysis.catalogItem?.currency}
                    </strong>
                  </div>
                </div>

                {/* Price Tampering Test Checkbox */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={tamperPrice}
                      onChange={(e) => setTamperPrice(e.target.checked)}
                      className="rounded bg-[#080D1A] border-[#1E2E50] text-[#0070BA]"
                    />
                    <span className="text-amber-400 font-medium">
                      Simulate Client Price Tampering (Inject $1.00 override to test rejection)
                    </span>
                  </label>
                </div>
              </div>

              {/* Deterministic Rule Evaluation Breakdown */}
              {aiAnalysis.policyResult && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Deterministic Policy Rules Breakdown
                  </h4>
                  <div className="space-y-2 bg-[#080D1A] p-4 rounded-xl text-xs border border-[#1E2E50]">
                    {Object.entries(aiAnalysis.policyResult.evaluatedRules).map(
                      ([ruleKey, rule]: [string, any]) => (
                        <div key={ruleKey} className="flex items-start gap-2">
                          {rule.pass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-mono font-bold text-white">{ruleKey}: </span>
                            <span className="text-slate-300">{rule.detail}</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          {!aiAnalysis.parsedIntent?.ambiguous && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#1E2E50]">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                {aiAnalysis.policyResult?.allowed
                  ? 'Policy checks passed. Ready to save to SQLite ledger and proceed to approval.'
                  : 'Proposal will be logged as DENIED in ledger for compliance audit trail.'}
              </div>
              <button
                onClick={handleSubmitProposal}
                disabled={loading}
                className={`w-full sm:w-auto ${aiAnalysis.policyResult?.allowed ? 'btn-paypal' : 'btn btn-danger'}`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {aiAnalysis.policyResult?.allowed
                    ? 'Propose Purchase Order'
                    : 'Submit Over-Limit Proposal (Will Be Denied)'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
