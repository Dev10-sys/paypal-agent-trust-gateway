import React, { useState } from 'react';
import {
  Terminal,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileCode,
  Shield,
  Layers,
} from 'lucide-react';
import { AuditFinding, Classification, FindingSeverity } from '@paypal-gateway/shared';

interface RepositoryAuditViewProps {
  initialFindings?: AuditFinding[];
}

export const RepositoryAuditView: React.FC<RepositoryAuditViewProps> = ({
  initialFindings = [],
}) => {
  const [repoPath, setRepoPath] = useState('./fixtures');
  const [findings, setFindings] = useState<AuditFinding[]>(initialFindings);
  const [loading, setLoading] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleScan = async (target: string = repoPath) => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: target }),
      });
      const data = await res.json();
      setFindings(data.findings || []);
      if (data.findings && data.findings.length > 0) {
        setSelectedFinding(data.findings[0]);
      }
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainWithAi = async (finding: AuditFinding) => {
    setAiLoading(true);
    setAiExplanation(null);
    try {
      const res = await fetch('/api/audit/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finding }),
      });
      const data = await res.json();
      setAiExplanation(data.explanation);
    } catch (err: any) {
      alert(`AI explanation failed: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadSarif = () => {
    const jsonStr = JSON.stringify(findings, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-findings-${Date.now()}.json`;
    a.click();
  };

  const filtered = findings.filter((f) => {
    if (filterClassification === 'ALL') return true;
    return f.classification === filterClassification;
  });

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO' || f.severity === 'LOW').length;

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-6 h-6 text-cyan-400" />
            <span>PayPal Integration Code Auditor</span>
          </h2>
          <p className="text-sm text-slate-400">
            Read-only static scanner for PayPal SDKs, agent tool configs, idempotency headers, and supply-chain hygiene.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleDownloadSarif} className="btn btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>Export Findings JSON / SARIF</span>
          </button>
        </div>
      </div>

      {/* Target Path Bar */}
      <div className="glass-panel p-4 rounded-xl border-white/10 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full relative">
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Target repository directory path (e.g. ./fixtures or c:/my-paypal-app)"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleScan(repoPath)}
            disabled={loading}
            className="btn btn-primary text-xs flex-1 sm:flex-initial"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Scanning...' : 'Scan Repository'}</span>
          </button>
          <button
            onClick={() => {
              setRepoPath('./fixtures');
              handleScan('./fixtures');
            }}
            className="btn btn-secondary text-xs whitespace-nowrap"
          >
            Benchmark Pack
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-panel p-4 rounded-xl border-white/5 text-center">
          <div className="text-xs text-slate-400 font-semibold">TOTAL FINDINGS</div>
          <div className="text-2xl font-extrabold text-white mt-1">{findings.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-white/5 text-center">
          <div className="text-xs text-rose-400 font-semibold">CRITICAL</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">{criticalCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-white/5 text-center">
          <div className="text-xs text-amber-400 font-semibold">HIGH</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">{highCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-white/5 text-center">
          <div className="text-xs text-yellow-400 font-semibold">MEDIUM</div>
          <div className="text-2xl font-extrabold text-yellow-400 mt-1">{mediumCount}</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-white/5 text-center">
          <div className="text-xs text-blue-400 font-semibold">INFO / BENCHMARK</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">{infoCount}</div>
        </div>
      </div>

      {/* Classification Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-medium">Filter Classification:</span>
        {['ALL', 'CODE_FACT', 'PUBLIC_ISSUE_REPORT', 'INFERENCE_REQUIRES_TEST', 'UNKNOWN'].map((cl) => (
          <button
            key={cl}
            onClick={() => setFilterClassification(cl)}
            className={`px-3 py-1 rounded-full font-bold uppercase transition-all whitespace-nowrap ${
              filterClassification === cl
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            {cl.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Findings Main Workspace (List on Left, Detail Drawer on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Findings List (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl border-white/10 overflow-hidden flex flex-col max-h-[750px]">
          <div className="p-4 border-b border-white/10 text-xs font-bold text-slate-400 uppercase">
            Findings ({filtered.length})
          </div>

          <div className="overflow-y-auto divide-y divide-white/5 flex-1">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No findings match the current filter.
              </div>
            ) : (
              filtered.map((f, idx) => {
                const isSelected = selectedFinding === f;
                let sevBadge = 'text-blue-400 bg-blue-950/60 border-blue-500/30';
                if (f.severity === 'CRITICAL') sevBadge = 'text-rose-400 bg-rose-950/60 border-rose-500/30';
                else if (f.severity === 'HIGH') sevBadge = 'text-amber-400 bg-amber-950/60 border-amber-500/30';
                else if (f.severity === 'MEDIUM') sevBadge = 'text-yellow-400 bg-yellow-950/60 border-yellow-500/30';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedFinding(f);
                      setAiExplanation(null);
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/30 border-l-4 border-cyan-400'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${sevBadge}`}>
                        {f.severity}
                      </span>
                      <span className="badge badge-code-fact text-[10px] py-0 px-2">
                        {f.classification}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white line-clamp-1">{f.title}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1 truncate">
                      {f.path}:{f.lineStart}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail & AI Remediation Drawer (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border-white/10 space-y-6 overflow-y-auto max-h-[750px]">
          {selectedFinding ? (
            <>
              {/* Finding Title & Badges */}
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-cyan-400 font-bold">
                    {selectedFinding.ruleId}
                  </span>
                  <span className="badge badge-code-fact">{selectedFinding.classification}</span>
                  <span className="badge badge-unknown">Confidence: {selectedFinding.confidence}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{selectedFinding.title}</h3>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{selectedFinding.path}:{selectedFinding.lineStart}-{selectedFinding.lineEnd}</span>
                </div>
              </div>

              {/* Exact Evidence Excerpt */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Exact Code Evidence (Redacted)
                </div>
                <pre className="p-3.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto">
                  {selectedFinding.evidenceExcerpt}
                </pre>
              </div>

              {/* Why It Matters */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Why It Matters
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {selectedFinding.whyItMatters}
                </p>
              </div>

              {/* Remediation & Test Suggestion */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Recommended Remediation</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedFinding.remediation}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Test Suggestion</h4>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    🧪 {selectedFinding.testSuggestion}
                  </p>
                </div>
              </div>

              {/* Cited Primary Sources */}
              {selectedFinding.sourceLinks && selectedFinding.sourceLinks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary Pinned Documentation & Evidence
                  </h4>
                  <div className="space-y-1">
                    {selectedFinding.sourceLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-mono truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Remediation Action */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>AI Remediation Assistant</span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      Explains finding using cited PayPal docs and generates minimal unified diff patch.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExplainWithAi(selectedFinding)}
                    disabled={aiLoading}
                    className="btn btn-primary text-xs py-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiLoading ? 'Explaining...' : 'Explain with AI'}</span>
                  </button>
                </div>

                {/* AI Explanation Box */}
                {aiExplanation && (
                  <div className="p-5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-4 animate-in fade-in duration-300">
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                        AI Cited Explanation
                      </h5>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {aiExplanation.explanation}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                        Risk Analysis & Uncertainty
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {aiExplanation.riskAnalysis}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Suggested Minimal Diff Patch
                      </h5>
                      <pre className="p-3 bg-black/60 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-emerald-500/20">
                        {aiExplanation.suggestedPatch}
                      </pre>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                        Regression Test
                      </h5>
                      <p className="text-xs text-slate-300 font-mono">
                        {aiExplanation.regressionTest}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              Select a finding from the list to inspect code evidence and remediation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
