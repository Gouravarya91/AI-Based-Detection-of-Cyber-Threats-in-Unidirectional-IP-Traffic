import React from 'react';
import {
  ShieldAlert,
  Activity,
  Server,
  Cloud,
  Terminal,
  Zap,
  Bot,
  Play,
  Pause,
  AlertTriangle,
  Database,
  Gauge,
  FileCode,
  BookOpen,
  Download
} from 'lucide-react';
import { SOCMetrics } from '../types';

interface HeaderProps {
  metrics: SOCMetrics;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onOpenInjector: () => void;
  onOpenCopilot: () => void;
  activeTab: 'soc' | 'benchmark' | 'code' | 'docs' | 'pipeline' | 'bigquery' | 'lab';
  onSelectTab: (tab: 'soc' | 'benchmark' | 'code' | 'docs' | 'pipeline' | 'bigquery' | 'lab') => void;
}

export const Header: React.FC<HeaderProps> = ({
  metrics,
  isStreaming,
  onToggleStreaming,
  onOpenInjector,
  onOpenCopilot,
  activeTab,
  onSelectTab
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur">
      {/* Top GCP Project & Health Banner */}
      <div className="px-4 py-2 border-b border-slate-850 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 font-tech">
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span>gcp: <strong className="text-white">cyber-threat-detection</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-400 font-tech">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Region: <span className="text-slate-200">us-central1</span></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-400 font-tech hidden sm:flex">
            <Server className="w-3 h-3 text-indigo-400" />
            <span>Endpoint: <span className="text-indigo-200">threat-detection-endpoint (2 replicas)</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleStreaming}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              isStreaming
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900'
                : 'bg-amber-950 text-amber-300 border border-amber-700/60 hover:bg-amber-900'
            }`}
            title={isStreaming ? 'Pause Real-Time Packet Stream' : 'Resume Real-Time Packet Stream'}
          >
            {isStreaming ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Pause className="w-3 h-3" />
                <span>Ingest Active</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Ingest Paused</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenInjector}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-950/90 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors font-medium"
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Inject Attack</span>
          </button>

          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950/90 text-purple-300 border border-purple-800 hover:bg-purple-900 transition-colors font-medium"
          >
            <Bot className="w-3 h-3 text-purple-400" />
            <span>AI Copilot</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation & Title Row */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-950/50 border border-indigo-500/30">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg text-white tracking-wide">
                GCP Cyber Threat Detection
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-blue-900/60 border border-blue-700/40 text-[10px] font-tech text-blue-300">
                SOC v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Unidirectional Read-Only Ingest • No Decryption TLS/QUIC • Vertex AI • BigQuery Alert Lake
            </p>
          </div>
        </div>

        {/* View Selection Tabs */}
        <nav className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium overflow-x-auto max-w-full">
          <button
            onClick={() => onSelectTab('soc')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'soc'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Real-Time SOC</span>
          </button>

          <button
            onClick={() => onSelectTab('benchmark')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-300" />
            <span>1,000 Flows/s Benchmark</span>
          </button>

          <button
            onClick={() => onSelectTab('code')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-300" />
            <span>Deliverables Code</span>
          </button>

          <button
            onClick={() => onSelectTab('docs')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'docs'
                ? 'bg-purple-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-300" />
            <span>Architecture & Spec</span>
          </button>

          <button
            onClick={() => onSelectTab('pipeline')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>GCP Pipeline</span>
          </button>

          <button
            onClick={() => onSelectTab('bigquery')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'bigquery'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>BigQuery Lake</span>
          </button>

          <button
            onClick={() => onSelectTab('lab')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'lab'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Flow Lab & Test</span>
          </button>
        </nav>
      </div>

      {/* Real-Time Telemetry Ticker */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-850/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-tech">
        <div className="flex items-center justify-between p-2 rounded bg-slate-900/70 border border-slate-800/80">
          <span className="text-slate-400">Pub/Sub Ingest:</span>
          <span className="text-emerald-400 font-bold">{metrics.pubSubThroughputKbps.toLocaleString()} msg/s</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-900/70 border border-slate-800/80">
          <span className="text-slate-400">Total Flows:</span>
          <span className="text-blue-300 font-bold">{metrics.totalFlowsIngested.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-900/70 border border-slate-800/80">
          <span className="text-slate-400">Threats Intercepted:</span>
          <span className="text-rose-400 font-bold">{metrics.threatsDetected.toLocaleString()} ({metrics.threatRatePct}%)</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-900/70 border border-slate-800/80">
          <span className="text-slate-400">Vertex P95 Latency:</span>
          <span className="text-cyan-300 font-bold">{metrics.vertexAiP95LatencyMs.toFixed(1)} ms</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-900/70 border border-slate-800/80">
          <span className="text-slate-400">BQ Alert Lake:</span>
          <span className="text-purple-300 font-bold">{metrics.bigQueryAlertsSinkCount.toLocaleString()} rows</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded bg-slate-900/70 border border-slate-800/80">
          <span className="text-slate-400">Cloud Armor Blocked:</span>
          <span className="text-amber-400 font-bold">{metrics.activeBlockedIps} IPs</span>
        </div>
      </div>
    </header>
  );
};
