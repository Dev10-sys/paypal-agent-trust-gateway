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
    { label: 'Normal $10 Ads Basic', text: 'Create a $10 Ads Basic order' },
    { label: '2x Ads Pro ($50 Limit Cap)', text: 'Buy 2 pro ads campaigns' },
    { label: 'Over-Limit Violation ($250)', text: 'Purchase enterprise addon tier for 1 client' },
    { label: 'Ambiguous Query', text: 'Please buy something for me' },
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
    <div className="space-y-8">
      {/* Top Banner */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Guarded AI Purchase Proposal
        </h2>
        <p className="text-sm text-slate-400">
          AI agents propose purchases from a server-owned catalog. Pricing is strictly resolved on the server; deterministic merchant policy enforces transaction limits and sandbox safety.
        </p>
      </div>

      {/* Input Card */}
      <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          Natural Language Prompt or Agent Request
        </label>

        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParseAi(prompt)}
            placeholder="e.g. 'Create a $10 Ads Basic order' or 'Buy 2 Ads Pro campaigns'"
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            onClick={() => handleParseAi(prompt)}
            disabled={loading}
            className="btn btn-primary px-6"
          >
            <Zap className="w-4 h-4" />
            <span>Parse with AI</span>
          </button>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs text-slate-500 font-medium mr-1">Demo Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p.text);
                handleParseAi(p.text);
              }}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-cyan-500/10 hover:border-cyan-400/40 hover:text-cyan-300 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Server Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Authoritative Server-Owned Catalog (Zero Client Price Trust)
          </h3>
          <span className="text-xs text-cyan-400">Strictly Enforced Server-Side</span>
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
                className={`glass-panel p-4 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(0,207,222,0.2)]'
                    : 'border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">{item.id}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-emerald-400">
                    {item.currency} {item.unitPrice.toFixed(2)}
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
        <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white">AI Constrained Parsing Result</span>
              <span className="badge badge-code-fact">Intent Mapped</span>
            </div>
            {aiAnalysis.policyResult && (
              <span
                className={`badge ${
                  aiAnalysis.policyResult.allowed
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                }`}
              >
                {aiAnalysis.policyResult.allowed ? 'POLICY ALLOWED' : 'POLICY DENIED'}
              </span>
            )}
          </div>

          {/* Ambiguity Alert */}
          {aiAnalysis.parsedIntent?.ambiguous ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Clarification Required from User:</strong>
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
                <div className="space-y-2 bg-black/30 p-4 rounded-xl text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Catalog ID:</span>
                    <strong className="text-cyan-400">{aiAnalysis.parsedIntent.catalogId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Item Name:</span>
                    <span className="text-white">{aiAnalysis.catalogItem?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantity:</span>
                    <span className="text-white">{aiAnalysis.parsedIntent.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Server Authoritative Total:</span>
                    <strong className="text-emerald-400 text-base">
                      {aiAnalysis.catalogItem?.currency} {aiAnalysis.totalAmount.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Price Tampering Test Checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={tamperPrice}
                      onChange={(e) => setTamperPrice(e.target.checked)}
                      className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-amber-400 font-medium">
                      Simulate Client/AI Price Tampering Attack (Override price to $1.00)
                    </span>
                  </label>
                </div>
              </div>

              {/* Deterministic Rule Evaluation Breakdown */}
              {aiAnalysis.policyResult && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Deterministic Merchant Policy Gate
                  </h4>
                  <div className="space-y-2 bg-black/30 p-4 rounded-xl text-xs">
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
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="text-xs text-slate-400">
                {aiAnalysis.policyResult?.allowed
                  ? 'Policy gate validated. Ready to record in SQLite ledger.'
                  : 'Proposal will be recorded as DENIED in ledger for audit logging.'}
              </div>
              <button
                onClick={handleSubmitProposal}
                disabled={loading}
                className={`btn ${aiAnalysis.policyResult?.allowed ? 'btn-primary' : 'btn-danger'}`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {aiAnalysis.policyResult?.allowed
                    ? 'Submit Guarded Proposal'
                    : 'Submit (Will Be Denied by Policy)'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
