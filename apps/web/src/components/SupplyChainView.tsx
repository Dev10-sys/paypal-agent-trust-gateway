import React from 'react';
import {
  Package,
  ShieldAlert,
  FileCheck,
  Lock,
  Layers,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const SupplyChainView: React.FC = () => {
  const floatingDependencies = [
    {
      manifest: 'paypal-mcp-server/package.json',
      dependency: '@paypal/agent-toolkit',
      versionSpec: 'latest',
      classification: 'CODE_FACT',
      verdict: 'Reproducibility / Supply-Chain Hygiene Risk',
      detail:
        'Declared as "latest" in package.json. While not malware or compromise, unpinned dependencies make builds non-reproducible and absorb breaking changes without human code audit.',
      remediation: 'Pin to exact semantic version (e.g. "@paypal/agent-toolkit": "1.0.4").',
    },
  ];

  const provenanceCases = [
    {
      target: 'paypal-risk-ios (Package.swift)',
      version: '5.6.0',
      checksum: '66a26c6f8f36ae4bd7d37feb08e3de00b73a2732b62b4f239c419bd6d1513833',
      url: 'https://github.com/paypal/paypal-risk-ios/releases/download/5.6.0/PPRiskMagnes.xcframework.zip',
      classification: 'CODE_FACT',
      notes:
        'A cryptographic checksum is present, which guarantees download integrity against transit corruption. However, a checksum alone does NOT prove publisher provenance or certificate validity.',
    },
    {
      target: 'braintree_ios (Issue #1857)',
      version: 'Resolved in 7.11.0',
      classification: 'PUBLIC_ISSUE_REPORT',
      notes:
        'PPRiskMagnes code-signing certificate was revoked by authority, causing Xcode archive failures (CSSMERR_TP_CERT_REVOKED). Braintree maintainers resolved this in 7.11.0 by moving to remote dynamic framework. This was a historical build/trust incident, not a compromised binary.',
    },
  ];

  const pqcInventory = [
    {
      primitive: 'Transport Layer Security (TLS 1.2 / 1.3)',
      observedAlgorithm: 'ECDHE-RSA / ECDHE-ECDSA (Classical)',
      pqcStatus: 'UNKNOWN / NOT_OBSERVED',
      evidenceSource: 'Public PayPal REST Endpoints',
      notes:
        'No evidence in public repositories establishes PayPal’s internal PQC or hybrid key exchange status. Evaluated strictly as UNKNOWN per evidence boundaries.',
    },
    {
      primitive: 'Idempotency Payload Digesting',
      observedAlgorithm: 'SHA-256 (NIST FIPS 180-4)',
      pqcStatus: 'CLASSICAL_SECURE',
      evidenceSource: 'Gateway Policy Ledger',
      notes:
        'SHA-256 provides 128 bits of collision resistance against quantum Grover attacks; post-quantum safe for collision hashing.',
    },
    {
      primitive: 'Webhook Signature Verification',
      observedAlgorithm: 'RSA-SHA256 (PKCS#1 v1.5)',
      pqcStatus: 'CLASSICAL_ONLY',
      evidenceSource: 'PayPal Webhook Security Specification',
      notes:
        'Classic asymmetric signature scheme vulnerable to Shor’s algorithm when cryptographically relevant quantum computers emerge. Industry transition to NIST FIPS 204 (ML-DSA) expected in coming years.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-cyan-400" />
          <span>Supply Chain, Provenance & Cryptographic Inventory</span>
        </h2>
        <p className="text-sm text-slate-400">
          Fact-bounded analysis of dependencies, lockfile hygiene, binary checksums vs provenance, and post-quantum readiness.
        </p>
      </div>

      {/* Floating Dependencies Section */}
      <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">Floating Dependencies & Pinning Hygiene</h3>
          </div>
          <span className="badge badge-code-fact">Code Fact</span>
        </div>

        <div className="space-y-3">
          {floatingDependencies.map((dep, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-black/40 border border-amber-500/20 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm text-cyan-400 font-bold">{dep.manifest}</span>
                <span className="badge bg-amber-950/60 text-amber-300 border-amber-500/30">
                  {dep.dependency}: {dep.versionSpec}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{dep.detail}</p>
              <div className="text-xs font-mono text-emerald-400 pt-1">
                Remediation: {dep.remediation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checksum vs Provenance Section */}
      <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg text-white">Binary Checksums vs Code-Signing Provenance</h3>
          </div>
          <span className="badge badge-public-issue">Public Issue Report</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {provenanceCases.map((cs, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{cs.target}</span>
                <span className="badge badge-code-fact text-[10px]">{cs.classification}</span>
              </div>
              {cs.checksum && (
                <div className="p-2 bg-black/40 rounded text-[11px] font-mono text-slate-400 break-all">
                  SHA-256: {cs.checksum}
                </div>
              )}
              <p className="text-xs text-slate-300 leading-relaxed">{cs.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Post-Quantum Cryptography & Classical Inventory */}
      <div className="glass-panel p-6 rounded-2xl border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-lg text-white">Cryptographic Inventory & Post-Quantum Readiness</h3>
          </div>
          <span className="badge badge-unknown">Evidence Boundary: UNKNOWN</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/30 text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Primitive</th>
                <th className="px-4 py-3">Observed Algorithm</th>
                <th className="px-4 py-3">PQC Status</th>
                <th className="px-4 py-3">Evidence Source</th>
                <th className="px-4 py-3">Notes & Boundary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {pqcInventory.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-white">{item.primitive}</td>
                  <td className="px-4 py-3 text-cyan-400">{item.observedAlgorithm}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                      {item.pqcStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.evidenceSource}</td>
                  <td className="px-4 py-3 text-slate-300 font-sans">{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
