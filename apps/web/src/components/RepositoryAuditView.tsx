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
  FolderGit2,
  GitBranch,
} from 'lucide-react';
import { AuditFinding, Classification, FindingSeverity } from '@paypal-gateway/shared';

interface RepositoryAuditViewProps {
  initialFindings?: AuditFinding[];
}

export const RepositoryAuditView: React.FC<RepositoryAuditViewProps> = ({
  initialFindings = [],
}) => {
  const [repoPath, setRepoPath] = useState('cloned-repos/agent-toolkit');
  const [findings, setFindings] = useState<AuditFinding[]>(initialFindings);
  const [loading, setLoading] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('ALL');
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Pre-configured real repositories available for instant scanning
  const REPO_PRESETS = [
    {
      id: 'agent-toolkit',
      name: 'paypal/agent-toolkit',
      path: 'cloned-repos/agent-toolkit',
      badge: 'Official GitHub Cloned',
      desc: 'Official PayPal Agent Toolkit (Python & TypeScript SDKs). Identifies missing idempotency in headers and tool action surface controls.',
      badgeColor: 'bg-[#003087] text-[#FFC439]',
    },
    {
      id: 'paypal-js',
      name: 'paypal/paypal-js',
      path: 'cloned-repos/paypal-js',
      badge: 'Official Web SDK',
      desc: 'Official PayPal JavaScript Client SDK for modern web checkout and smart payment buttons.',
      badgeColor: 'bg-[#00457C] text-[#38BDF8]',
    },
    {
      id: 'braintree_ios',
      name: 'braintree/braintree_ios',
      path: 'cloned-repos/braintree_ios',
      badge: 'Official iOS SDK',
      desc: 'Official PayPal & Braintree iOS SDK. Scans for Apple Pay / PayPal mobile configuration.',
      badgeColor: 'bg-[#1E2D4A] text-slate-300',
    },
    {
      id: 'synthetic-mcp',
      name: 'fixtures/paypal-mcp-server',
      path: 'fixtures/paypal-mcp-server',
      badge: 'Regression Testbed',
      desc: 'Targeted MCP server integration with floating version (@paypal/agent-toolkit: latest) and unrestricted tools.',
      badgeColor: 'bg-slate-800 text-slate-400',
    },
  ];

  const handleScan = async (target: string = repoPath) => {
    setLoading(true);
    setRepoPath(target);
    try {
      const res = await fetch('/api/audit/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoPath: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFindings(data.findings || []);
      if (data.findings && data.findings.length > 0) {
        setSelectedFinding(data.findings[0]);
      } else {
        setSelectedFinding(null);
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
  const lowCount = findings.filter((f) => f.severity === 'LOW' || f.severity === 'INFO').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-[#38BDF8]" />
            <span>PayPal Integration Code Auditor</span>
          </h2>
          <p className="text-sm text-slate-300">
            Read-only static scan of PayPal agent implementations with exact paths, line numbers, and evidence classifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {findings.length > 0 && (
            <button
              onClick={handleDownloadSarif}
              className="btn btn-secondary text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SARIF / JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Cloned Repositories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {REPO_PRESETS.map((p) => {
          const isCurrent = repoPath === p.path;
          return (
            <div
              key={p.id}
              onClick={() => handleScan(p.path)}
              className={`p-4 rounded-xl cursor-pointer border transition-all text-left flex flex-col justify-between ${
                isCurrent
                  ? 'bg-[#121E36] border-[#0070BA] shadow-[0_0_12px_rgba(0,112,186,0.3)]'
                  : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373] hover:bg-[#121E36]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                  {isCurrent && <span className="text-xs text-[#38BDF8] font-bold">Selected</span>}
                </div>
                <h4 className="font-bold text-sm text-white mb-1 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{p.name}</span>
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <button
                disabled={loading}
                className="mt-3 w-full py-1.5 rounded-lg bg-[#003087] hover:bg-[#00457C] text-xs font-semibold text-white transition-colors"
              >
                {loading && isCurrent ? 'Scanning...' : 'Scan Repository'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Manual Path Input */}
      <div className="glass-panel p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#080D1A] border border-[#1E2E50]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Target repo path (e.g. cloned-repos/agent-toolkit or fixtures)"
            className="w-full bg-transparent text-sm text-white focus:outline-none"
          />
        </div>
        <button
          onClick={() => handleScan(repoPath)}
          disabled={loading}
          className="btn btn-primary w-full sm:w-auto px-6"
        >
          {loading ? 'Scanning Repository...' : 'Run Audit Scan'}
        </button>
      </div>

      {/* Metrics Row */}
      {findings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-panel p-3.5 rounded-xl border-rose-500/30 bg-rose-950/20">
            <span className="text-xs font-medium text-rose-300">CRITICAL FINDINGS</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{criticalCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">High exploitability</p>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border-amber-500/30 bg-amber-950/20">
            <span className="text-xs font-medium text-amber-300">HIGH SEVERITY</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{highCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Missing idempotency / unverified capture</p>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border-[#0070BA]/30 bg-[#003087]/20">
            <span className="text-xs font-medium text-[#38BDF8]">MEDIUM / FLOATING</span>
            <div className="text-2xl font-bold text-[#38BDF8] mt-1">{mediumCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Supply chain / dependencies</p>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border-slate-700 bg-slate-800/20">
            <span className="text-xs font-medium text-slate-300">LOW / AUDIT</span>
            <div className="text-2xl font-bold text-slate-300 mt-1">{lowCount}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Configuration & hygiene</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {findings.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter by Evidence:
          </span>
          {['ALL', 'CODE_FACT', 'PUBLIC_ISSUE_REPORT', 'INFERENCE_REQUIRES_TEST', 'UNKNOWN'].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClassification(cls)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                filterClassification === cls
                  ? 'bg-[#0070BA] text-white'
                  : 'bg-[#121E36] text-slate-300 hover:bg-[#162542] border border-[#1E2E50]'
              }`}
            >
              {cls} {cls !== 'ALL' && `(${findings.filter(f => f.classification === cls).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Main Content: Findings List & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Findings List */}
        <div className="lg:col-span-7 space-y-3">
          {findings.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-xl border-dashed border-[#1E2E50] space-y-3">
              <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Scan Results Loaded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click on one of the real cloned PayPal repositories above (e.g. <strong>paypal/agent-toolkit</strong>) to perform a live scan.
              </p>
              <button
                onClick={() => handleScan('cloned-repos/agent-toolkit')}
                className="btn btn-primary text-xs"
              >
                Scan Official paypal/agent-toolkit
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl text-slate-400 text-sm">
              No findings match classification "{filterClassification}".
            </div>
          ) : (
            filtered.map((f, i) => {
              const isSelected = selectedFinding?.ruleId === f.ruleId && selectedFinding?.path === f.path && selectedFinding?.lineStart === f.lineStart;
              return (
                <div
                  key={`${f.ruleId}-${f.path}-${f.lineStart}-${i}`}
                  onClick={() => {
                    setSelectedFinding(f);
                    setAiExplanation(null);
                  }}
                  className={`p-4 rounded-xl cursor-pointer border transition-all text-left ${
                    isSelected
                      ? 'bg-[#121E36] border-[#0070BA] shadow-md'
                      : 'bg-[#0E172C] border-[#1E2E50] hover:border-[#2D4373]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          f.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : f.severity === 'HIGH'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : f.severity === 'MEDIUM'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        f.classification === 'CODE_FACT'
                          ? 'badge-code-fact'
                          : f.classification === 'INFERENCE_REQUIRES_TEST'
                          ? 'badge-inference'
                          : f.classification === 'PUBLIC_ISSUE_REPORT'
                          ? 'badge-public-issue'
                          : 'badge-unknown'
                      }`}>
                        {f.classification}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      Line {f.lineStart}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white mb-1">
                    {f.ruleId}
                  </h4>

                  <div className="text-xs font-mono text-[#38BDF8] flex items-center gap-1.5 truncate mb-2">
                    <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{f.path}:{f.lineStart}</span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {f.evidenceExcerpt}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Finding Details & AI Remediation */}
        <div className="lg:col-span-5">
          {selectedFinding ? (
            <div className="glass-panel p-5 rounded-xl space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-[#1E2E50] pb-3">
                <span className="text-xs font-bold text-[#FFC439] uppercase tracking-wider">
                  Finding Details & Remediation
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedFinding.ruleId}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400">File & Line Location</span>
                <div className="p-2.5 rounded-lg bg-[#080D1A] border border-[#1E2E50] font-mono text-xs text-[#38BDF8] mt-1 break-all">
                  {selectedFinding.path}:{selectedFinding.lineStart}-{selectedFinding.lineEnd}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400">Code Evidence</span>
                <pre className="p-3 rounded-lg bg-[#080D1A] border border-[#1E2E50] font-mono text-xs text-amber-200 mt-1 whitespace-pre-wrap break-all leading-relaxed">
                  {selectedFinding.evidenceExcerpt}
                </pre>
              </div>

              <div>
                <span className="text-xs text-slate-400">Deterministic Recommendation</span>
                <p className="text-xs text-slate-200 p-3 rounded-lg bg-[#001C3D] border border-[#003875] mt-1 leading-relaxed">
                  {selectedFinding.remediation}
                </p>
              </div>

              {/* AI Analysis / Patch Suggestion Button */}
              <div className="pt-2 border-t border-[#1E2E50]">
                <button
                  onClick={() => handleExplainWithAi(selectedFinding)}
                  disabled={aiLoading}
                  className="btn btn-paypal w-full text-xs flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#003087]" />
                  <span>{aiLoading ? 'Analyzing Code with AI...' : 'Explain Finding & Suggest Fix'}</span>
                </button>

                {aiExplanation && (
                  <div className="mt-3 p-3.5 rounded-xl bg-[#080D1A] border border-[#0070BA]/40 space-y-2 text-xs">
                    <div className="font-bold text-[#38BDF8] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Code Analysis</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {aiExplanation.explanation}
                    </p>
                    {aiExplanation.suggestedPatch && (
                      <div>
                        <span className="text-slate-400 font-mono text-[11px]">Suggested Code Patch:</span>
                        <pre className="p-2.5 rounded bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto mt-1">
                          {aiExplanation.suggestedPatch}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 text-center rounded-xl text-slate-400 text-xs">
              Select a finding on the left to inspect evidence, line references, and remediation guidance.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
