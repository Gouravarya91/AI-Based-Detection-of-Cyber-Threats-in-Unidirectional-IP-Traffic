import React, { useState } from 'react';
import {
  NetworkFlow,
  ThreatAlert,
  SeverityLevel,
  ThreatClass
} from '../types';
import {
  ShieldAlert,
  Search,
  Filter,
  Flame,
  ArrowUpRight,
  Bot,
  Ban,
  Radio,
  ExternalLink,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Zap,
  Lock,
  Layers,
  FileCode,
  Info,
  ChevronRight
} from 'lucide-react';
import { TrafficTrendsChartJs } from './TrafficTrendsChartJs';
import { ThreatHeatmap } from './ThreatHeatmap';
import { EvidenceDrillDownModal } from './EvidenceDrillDownModal';

interface LiveSocMonitorProps {
  flows: NetworkFlow[];
  alerts: ThreatAlert[];
  blockedIps: string[];
  onSelectAlert: (alert: ThreatAlert) => void;
  onSelectFlow: (flow: NetworkFlow) => void;
  onQuickBlockIp: (ip: string) => void;
  onOpenInjector: () => void;
  onOpenCopilot: () => void;
}

export const LiveSocMonitor: React.FC<LiveSocMonitorProps> = ({
  flows,
  alerts,
  blockedIps,
  onSelectAlert,
  onSelectFlow,
  onQuickBlockIp,
  onOpenInjector,
  onOpenCopilot
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'threats' | 'critical'>('all');
  const [selectedThreatClass, setSelectedThreatClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [evidenceAlert, setEvidenceAlert] = useState<ThreatAlert | null>(null);

  // Subnet filter triggered from Heatmap
  const [activeSubnetFilter, setActiveSubnetFilter] = useState<string | null>(null);

  const filteredAlerts = alerts.filter(alert => {
    if (filterMode === 'critical' && alert.severity !== 'CRITICAL' && alert.severity !== 'HIGH') {
      return false;
    }

    if (selectedThreatClass !== 'all') {
      const tc = alert.threatClass || (alert.threatType === 'DDOS_SYN_FLOOD' ? 'DDoS' :
                 alert.threatType === 'C2_BEACON' ? 'Botnet Beaconing' :
                 alert.threatType === 'PORT_SCAN' ? 'Recon Scanning' :
                 alert.threatType === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
                 alert.threatType === 'DNS_TUNNELING' ? 'DGA/Tunneling' : 'Malware TLS');
      if (tc !== selectedThreatClass) return false;
    }

    if (activeSubnetFilter) {
      const prefix = activeSubnetFilter.split('/')[0].split('.').slice(0, 3).join('.');
      if (!alert.dstIp.startsWith(prefix)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alert.alertId.toLowerCase().includes(q) ||
        alert.flowId.toLowerCase().includes(q) ||
        alert.srcIp.toLowerCase().includes(q) ||
        alert.dstIp.toLowerCase().includes(q) ||
        (alert.threatClass && alert.threatClass.toLowerCase().includes(q)) ||
        alert.threatType.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-950/90 text-rose-300 border-rose-800 font-bold';
      case 'HIGH':
        return 'bg-amber-950/90 text-amber-300 border-amber-800 font-bold';
      case 'MEDIUM':
        return 'bg-yellow-950/90 text-yellow-300 border-yellow-800';
      case 'LOW':
      case 'INFO':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getThreatClassBadge = (threatClass?: ThreatClass | string) => {
    switch (threatClass) {
      case 'DDoS':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'Botnet Beaconing':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'DGA/Tunneling':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'Malware TLS':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-800';
      case 'Recon Scanning':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'Data Exfiltration':
        return 'bg-red-950/90 text-red-300 border-red-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Real-time Traffic Trends Chart.js (Line + Bar charts) */}
      <TrafficTrendsChartJs flows={flows} alerts={alerts} />

      {/* 2. Threat Heatmap (2D matrix of Threat Class vs Destination Subnets) */}
      <ThreatHeatmap
        alerts={alerts}
        flows={flows}
        onSelectSubnetFilter={(subnet, tc) => {
          setActiveSubnetFilter(subnet);
          setSelectedThreatClass(tc);
        }}
      />

      {/* Filter notification banner if active */}
      {(activeSubnetFilter || selectedThreatClass !== 'all') && (
        <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/80 flex items-center justify-between text-xs font-tech text-blue-300">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>
              Active Filter: {activeSubnetFilter ? `Subnet ${activeSubnetFilter}` : ''}{' '}
              {selectedThreatClass !== 'all' ? `• Threat Vector: ${selectedThreatClass}` : ''}
            </span>
          </div>
          <button
            onClick={() => {
              setActiveSubnetFilter(null);
              setSelectedThreatClass('all');
            }}
            className="text-white hover:underline font-bold"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* 3. Live Alerts Table (Standardized Schema: timestamp, flow_id, threat_class, confidence, evidence) */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-white tracking-wide">
                  Standardized Live Threat Alerts Table
                </h3>
                <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-[10px] font-tech text-blue-300">
                  BigQuery Contract
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Schema: <code className="text-cyan-300">timestamp</code>, <code className="text-cyan-300">flow_id</code>, <code className="text-cyan-300">threat_class</code>, <code className="text-cyan-300">confidence</code>, <code className="text-cyan-300">evidence</code>
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter alerts, IP, flow..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-52 font-tech"
              />
            </div>

            {/* Threat Class Dropdown */}
            <select
              value={selectedThreatClass}
              onChange={(e) => setSelectedThreatClass(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-tech focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All 6 Vectors</option>
              <option value="DDoS">DDoS</option>
              <option value="Botnet Beaconing">Botnet Beaconing</option>
              <option value="DGA/Tunneling">DGA/Tunneling</option>
              <option value="Malware TLS">Malware TLS</option>
              <option value="Recon Scanning">Recon Scanning</option>
              <option value="Data Exfiltration">Data Exfiltration</option>
            </select>

            <button
              onClick={onOpenInjector}
              className="px-2.5 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-tech font-bold flex items-center gap-1 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Threat</span>
            </button>
          </div>
        </div>

        {/* The Live Alerts Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-tech">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Flow ID</th>
                <th className="py-3 px-3.5">Threat Class</th>
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3.5">Confidence</th>
                <th className="py-3 px-3.5">Source → Destination</th>
                <th className="py-3 px-3.5">Evidence (No Decryption)</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 bg-slate-900/40">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No active alerts matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => {
                  const tClass = alert.threatClass || (alert.threatType === 'DDOS_SYN_FLOOD' ? 'DDoS' :
                                 alert.threatType === 'C2_BEACON' ? 'Botnet Beaconing' :
                                 alert.threatType === 'PORT_SCAN' ? 'Recon Scanning' :
                                 alert.threatType === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
                                 alert.threatType === 'DNS_TUNNELING' ? 'DGA/Tunneling' : 'Malware TLS');

                  const isBlocked = blockedIps.includes(alert.srcIp);
                  const ev = alert.evidence;

                  return (
                    <tr
                      key={alert.alertId}
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => setEvidenceAlert(alert)}
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3.5 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(alert.timestamp).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Flow ID */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="text-cyan-300 font-bold font-mono group-hover:underline">
                          {alert.flowId}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {alert.alertId}
                        </span>
                      </td>

                      {/* Threat Class */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getThreatClassBadge(tClass)}`}>
                          {tClass}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {alert.mitreTechnique}
                        </span>
                      </td>

                      {/* Severity Badge */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] border ${getSeverityBadge(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold">
                            {(alert.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-16 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${alert.confidence * 100}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Source -> Destination */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-300">
                        <div>
                          <span className="text-rose-400 font-semibold">{alert.srcIp}</span>
                        </div>
                        <div className="text-slate-500 text-[10px] flex items-center gap-1">
                          <span>→</span>
                          <span className="text-slate-300">{alert.dstIp}:{alert.dstPort} ({alert.protocol})</span>
                        </div>
                      </td>

                      {/* Evidence Pill */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {ev?.ja3_hash ? (
                          <span className="text-[11px] font-mono text-purple-300 bg-purple-950/70 border border-purple-800 px-1.5 py-0.5 rounded block truncate max-w-[140px]" title={`JA3: ${ev.ja3_hash}`}>
                            JA3: {ev.ja3_hash.slice(0, 10)}...
                          </span>
                        ) : ev?.dns_query ? (
                          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded block truncate max-w-[140px]" title={`DNS: ${ev.dns_query}`}>
                            DNS H={ev.dns_entropy}
                          </span>
                        ) : ev?.inter_arrival_cv !== null && ev?.inter_arrival_cv !== undefined ? (
                          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800 px-1.5 py-0.5 rounded block">
                            CV={ev.inter_arrival_cv.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Flow Metrics
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEvidenceAlert(alert);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs font-semibold transition-colors"
                        >
                          Inspect Evidence
                        </button>

                        <button
                          disabled={isBlocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickBlockIp(alert.srcIp);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            isBlocked
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isBlocked ? 'Blocked' : 'Block IP'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Drill-Down Modal */}
      <EvidenceDrillDownModal
        alert={evidenceAlert}
        onClose={() => setEvidenceAlert(null)}
        onQuickBlockIp={onQuickBlockIp}
        onAnalyzeWithGemini={(a) => {
          setEvidenceAlert(null);
          onSelectAlert(a);
        }}
      />
    </div>
  );
};
