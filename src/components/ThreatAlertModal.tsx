import React, { useState } from 'react';
import { ThreatAlert, GeminiAnalysis } from '../types';
import {
  X,
  ShieldAlert,
  Bot,
  Copy,
  Check,
  Ban,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRight
} from 'lucide-react';

interface ThreatAlertModalProps {
  alert: ThreatAlert | null;
  onClose: () => void;
  onBlockIp: (ip: string) => void;
  onMitigate: (alertId: string) => void;
}

export const ThreatAlertModal: React.FC<ThreatAlertModalProps> = ({
  alert,
  onClose,
  onBlockIp,
  onMitigate
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<GeminiAnalysis | null>(alert?.geminiAnalysis || null);

  if (!alert) return null;

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleRunAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/analyze-threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert })
      });
      const data = await res.json();
      setAiAnalysis(data);
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const flow = alert.flowDetails;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-750 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-tech font-bold text-rose-400">
                  {alert.alertId}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold bg-rose-950 border border-rose-800 text-rose-300">
                  {alert.severity}
                </span>
                <span className="text-xs text-slate-500 font-tech">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>
              <h3 className="text-base font-bold text-white font-tech mt-0.5">
                {alert.threatType.replace(/_/g, ' ')}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Executive Flow Summary */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-slate-400 font-tech uppercase text-[10px] tracking-wider">
              Detection Incident Summary
            </div>
            <p className="text-sm text-slate-200 font-medium leading-relaxed">
              {alert.summary}
            </p>
          </div>

          {/* Network Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <div className="text-slate-400 text-[10px] font-tech">Attacker Source</div>
              <div className="font-tech font-bold text-rose-400 text-sm mt-0.5 truncate">
                {alert.srcIp}
              </div>
              <div className="text-[10px] text-slate-500 font-tech">Ephemeral Port</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <div className="text-slate-400 text-[10px] font-tech">Victim Internal IP</div>
              <div className="font-tech font-bold text-indigo-300 text-sm mt-0.5 truncate">
                {alert.dstIp}:{alert.dstPort}
              </div>
              <div className="text-[10px] text-slate-500 font-tech">Protocol: {alert.protocol}</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <div className="text-slate-400 text-[10px] font-tech">Traffic Volume</div>
              <div className="font-tech font-bold text-slate-200 text-sm mt-0.5">
                {flow?.packets?.toLocaleString() || 'N/A'} pkts
              </div>
              <div className="text-[10px] text-slate-500 font-tech">
                {flow?.bytes ? `${(flow.bytes / 1024).toFixed(1)} KB` : 'N/A'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850">
              <div className="text-slate-400 text-[10px] font-tech">Shannon Entropy / Score</div>
              <div className="font-tech font-bold text-cyan-400 text-sm mt-0.5">
                {flow?.entropy || 'N/A'} / 8.0
              </div>
              <div className="text-[10px] text-rose-400 font-tech">
                Anomaly: {flow?.anomalyScore || 'N/A'}%
              </div>
            </div>
          </div>

          {/* Gemini AI Threat Investigation Section */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-purple-950/40 to-slate-950 border border-purple-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="font-display font-bold text-sm text-white tracking-wide">
                  Gemini AI Cyber Security Copilot Analysis
                </h4>
                <span className="px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-700/50 text-[10px] font-tech text-purple-300">
                  gemini-3.8-flash
                </span>
              </div>

              {!aiAnalysis && (
                <button
                  disabled={loadingAi}
                  onClick={handleRunAiAnalysis}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{loadingAi ? 'Investigating with Gemini...' : 'Run Deep AI Triage'}</span>
                </button>
              )}
            </div>

            {loadingAi && (
              <div className="p-6 rounded-lg bg-slate-950/60 border border-purple-900/40 flex flex-col items-center justify-center space-y-2 text-center">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-purple-300 font-tech">
                  Correlating flow heuristics with MITRE ATT&CK knowledge base...
                </div>
              </div>
            )}

            {aiAnalysis && (
              <div className="space-y-4 pt-1">
                {/* AI Executive Summary */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed font-normal">
                  <span className="text-purple-400 font-bold font-tech mr-1.5">[Threat Assessment]</span>
                  {aiAnalysis.incidentSummary}
                </div>

                {/* MITRE ATT&CK Alignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 space-y-1">
                    <span className="text-[10px] font-tech text-slate-400 uppercase">MITRE ATT&CK Tactic / Technique</span>
                    <div className="font-bold text-slate-200 text-xs font-tech">
                      {aiAnalysis.mitreMapping.technique} ({aiAnalysis.mitreMapping.tactic})
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {aiAnalysis.mitreMapping.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 space-y-1">
                    <span className="text-[10px] font-tech text-slate-400 uppercase">Blast Radius & Vulnerability</span>
                    <div className="font-bold text-amber-300 text-xs font-tech">
                      VPC Subnet 10.128.0.0/20 Exposure
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      {aiAnalysis.blastRadius}
                    </p>
                  </div>
                </div>

                {/* Recommended Remediation Playbook */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white font-tech flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Automated Remediation Playbook (gcloud / bq):</span>
                  </div>

                  <div className="space-y-2">
                    {aiAnalysis.recommendedPlaybook.map((step) => (
                      <div key={step.stepNumber} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-tech font-bold text-emerald-400 text-xs">
                            Step {step.stepNumber}: {step.action}
                          </span>
                          {step.command && (
                            <button
                              onClick={() => handleCopy(step.command!)}
                              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-tech"
                            >
                              {copiedCmd === step.command ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Command</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {step.rationale}
                        </p>
                        {step.command && (
                          <pre className="p-2 rounded bg-black/80 border border-slate-850 font-tech text-[11px] text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                            {step.command}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBlockIp(alert.srcIp)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block {alert.srcIp} with Cloud Armor</span>
            </button>

            <button
              onClick={() => onMitigate(alert.alertId)}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mark Alert Mitigated</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
