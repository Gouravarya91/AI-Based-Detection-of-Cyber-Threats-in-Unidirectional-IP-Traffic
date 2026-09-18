import React from 'react';
import { NetworkFlow, ThreatAlert } from '../types';
import { Shield, AlertCircle, Cpu, Wifi, Activity } from 'lucide-react';

interface SocAnalyticsChartsProps {
  flows: NetworkFlow[];
  alerts: ThreatAlert[];
}

export const SocAnalyticsCharts: React.FC<SocAnalyticsChartsProps> = ({
  flows,
  alerts
}) => {
  // Count by threat types in recent window
  const threatTypeCounts: Record<string, number> = {
    DDOS_SYN_FLOOD: 0,
    PORT_SCAN: 0,
    C2_BEACON: 0,
    DATA_EXFILTRATION: 0,
    BRUTE_FORCE_SSH: 0,
    BENIGN: 0
  };

  flows.forEach(f => {
    threatTypeCounts[f.predictedLabel] = (threatTypeCounts[f.predictedLabel] || 0) + 1;
  });

  const totalThreats = flows.filter(f => f.isThreat).length;
  const attackTypesOnly = Object.entries(threatTypeCounts).filter(([k]) => k !== 'BENIGN');

  // Compute average entropy of recent 20 flows
  const recentFlows = flows.slice(0, 20);
  const avgEntropy = recentFlows.length
    ? recentFlows.reduce((sum, f) => sum + f.entropy, 0) / recentFlows.length
    : 4.8;

  // Real-time timeline points for SVG sparkline (last 16 flows packet sizes or anomaly scores)
  const sparkPoints = flows.slice(0, 24).reverse();
  const maxScore = 100;
  const svgWidth = 400;
  const svgHeight = 70;

  const pointsString = sparkPoints
    .map((f, i) => {
      const x = (i / Math.max(sparkPoints.length - 1, 1)) * svgWidth;
      const y = svgHeight - (f.anomalyScore / maxScore) * (svgHeight - 10) - 5;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1: Real-time Vertex AI Anomaly Stream Sparkline */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-tech">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Vertex AI Inference Stream (Anomaly %)
          </span>
          <span className="text-[11px] font-tech text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
            Real-time
          </span>
        </div>

        <div className="h-20 w-full pt-1">
          {sparkPoints.length > 2 ? (
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Threshold indicator line (80% anomaly) */}
              <line
                x1="0"
                y1={svgHeight - (80 / maxScore) * (svgHeight - 10) - 5}
                x2={svgWidth}
                y2={svgHeight - (80 / maxScore) * (svgHeight - 10) - 5}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth="1"
                opacity="0.4"
              />

              {/* Area polygon */}
              <polygon
                points={`0,${svgHeight} ${pointsString} ${svgWidth},${svgHeight}`}
                fill="url(#scoreGradient)"
              />

              {/* Polyline */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-tech">
              Buffering stream data...
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-tech text-slate-400 pt-1 border-t border-slate-800/60">
          <span>Threshold: 80% (Threat Trigger)</span>
          <span className="text-rose-400 font-semibold">{totalThreats} In-window Spikes</span>
        </div>
      </div>

      {/* 2: Threat Distribution Breakdown */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-tech">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Detected Vector Breakdown
          </span>
          <span className="text-[11px] font-tech text-rose-400">
            {totalThreats} Threats
          </span>
        </div>

        <div className="space-y-1.5">
          {attackTypesOnly.slice(0, 4).map(([attack, count]) => {
            const pct = totalThreats > 0 ? Math.round((count / totalThreats) * 100) : 0;
            const labelMap: Record<string, { name: string; color: string }> = {
              DDOS_SYN_FLOOD: { name: 'SYN Flood', color: 'bg-rose-500' },
              PORT_SCAN: { name: 'Port Scan', color: 'bg-amber-500' },
              C2_BEACON: { name: 'C2 Beacon', color: 'bg-purple-500' },
              DATA_EXFILTRATION: { name: 'Data Exfil', color: 'bg-red-600' },
              BRUTE_FORCE_SSH: { name: 'SSH Brute', color: 'bg-orange-500' }
            };
            const meta = labelMap[attack] || { name: attack, color: 'bg-blue-500' };

            return (
              <div key={attack} className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-slate-300 font-tech">
                  <span className="truncate">{meta.name}</span>
                  <span className="text-slate-400">{count} ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${meta.color}`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3: Flow Telemetry & Shannon Entropy Gauge */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-tech">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Shannon Packet Entropy
          </span>
          <span className="text-[11px] font-tech text-indigo-300">
            Avg: {avgEntropy.toFixed(2)} / 8.0
          </span>
        </div>

        <div className="space-y-2">
          {/* Entropy Gauge bar */}
          <div className="w-full bg-slate-800 rounded-lg h-3 relative overflow-hidden">
            <div
              className={`h-full rounded-lg transition-all duration-300 ${
                avgEntropy > 7.2
                  ? 'bg-rose-500'
                  : avgEntropy > 5.5
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${(avgEntropy / 8.0) * 100}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-tech">
            <span>0.0 (Uniform SYN)</span>
            <span>4.5 (Normal Web)</span>
            <span>8.0 (Encrypted C2 / Exfil)</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-tech">
          <span>BigQuery Sink Status:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Streaming (0 backpressure)
          </span>
        </div>
      </div>
    </div>
  );
};
