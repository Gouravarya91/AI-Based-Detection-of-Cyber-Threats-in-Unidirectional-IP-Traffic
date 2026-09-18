import React, { useState } from 'react';
import { ThreatAlert, ThreatClass, NetworkFlow } from '../types';
import { Grid, ShieldAlert, Filter, Info } from 'lucide-react';

interface ThreatHeatmapProps {
  alerts: ThreatAlert[];
  flows: NetworkFlow[];
  onSelectSubnetFilter?: (subnet: string, threatClass: string) => void;
}

const THREAT_CLASSES: ThreatClass[] = [
  'DDoS',
  'Botnet Beaconing',
  'DGA/Tunneling',
  'Malware TLS',
  'Recon Scanning',
  'Data Exfiltration'
];

const TARGET_SUBNETS = [
  { id: '10.128.0', label: 'DMZ / Web Tier', cidr: '10.128.0.0/24', icon: '🌐' },
  { id: '10.128.1', label: 'Database Cluster', cidr: '10.128.1.0/24', icon: '🗄️' },
  { id: '10.128.2', label: 'Bastion / SSH', cidr: '10.128.2.0/24', icon: '🔑' },
  { id: '10.128.3', label: 'GKE Microservices', cidr: '10.128.3.0/24', icon: '☸️' },
  { id: '10.128.4', label: 'DNS Resolvers', cidr: '10.128.4.0/24', icon: '📡' },
  { id: 'external', label: 'Offshore / Egress', cidr: '0.0.0.0/0', icon: '🛰️' }
];

export const ThreatHeatmap: React.FC<ThreatHeatmapProps> = ({ alerts, flows, onSelectSubnetFilter }) => {
  const [hoveredCell, setHoveredCell] = useState<{
    threatClass: string;
    subnet: string;
    count: number;
    severity: string;
  } | null>(null);

  // Compute threat density matrix
  const matrix: Record<string, Record<string, number>> = {};
  THREAT_CLASSES.forEach(tc => {
    matrix[tc] = {};
    TARGET_SUBNETS.forEach(sub => {
      matrix[tc][sub.id] = 0;
    });
  });

  // Populate from alerts
  alerts.forEach(a => {
    const tClass = a.threatClass || (a.threatType === 'DDOS_SYN_FLOOD' ? 'DDoS' :
                     a.threatType === 'C2_BEACON' ? 'Botnet Beaconing' :
                     a.threatType === 'PORT_SCAN' ? 'Recon Scanning' :
                     a.threatType === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
                     a.threatType === 'DNS_TUNNELING' ? 'DGA/Tunneling' : 'Malware TLS');

    const dst = a.dstIp || '';
    let matchedSubnet = 'external';
    if (dst.startsWith('10.128.0')) matchedSubnet = '10.128.0';
    else if (dst.startsWith('10.128.1')) matchedSubnet = '10.128.1';
    else if (dst.startsWith('10.128.2')) matchedSubnet = '10.128.2';
    else if (dst.startsWith('10.128.3')) matchedSubnet = '10.128.3';
    else if (dst.startsWith('10.128.4')) matchedSubnet = '10.128.4';
    else if (dst.startsWith('10.128.')) matchedSubnet = '10.128.0';

    if (matrix[tClass]) {
      matrix[tClass][matchedSubnet] = (matrix[tClass][matchedSubnet] || 0) + 1;
    }
  });

  // Also factor in real-time flows
  flows.forEach(f => {
    if (f.isThreat) {
      const tClass = f.threatClass || 'Recon Scanning';
      const dst = f.dstIp || '';
      let matchedSubnet = 'external';
      if (dst.startsWith('10.128.0')) matchedSubnet = '10.128.0';
      else if (dst.startsWith('10.128.1')) matchedSubnet = '10.128.1';
      else if (dst.startsWith('10.128.2')) matchedSubnet = '10.128.2';
      else if (dst.startsWith('10.128.3')) matchedSubnet = '10.128.3';
      else if (dst.startsWith('10.128.4')) matchedSubnet = '10.128.4';

      if (matrix[tClass]) {
        matrix[tClass][matchedSubnet] = (matrix[tClass][matchedSubnet] || 0) + 1;
      }
    }
  });

  // Calculate intensity color
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-slate-900/60 border-slate-800/80 text-slate-600';
    if (count === 1) return 'bg-blue-950/80 border-blue-800/80 text-blue-300 font-bold';
    if (count <= 3) return 'bg-amber-950/90 border-amber-700 text-amber-200 font-bold';
    if (count <= 6) return 'bg-rose-950/90 border-rose-700 text-rose-200 font-bold';
    return 'bg-red-600 border-red-400 text-white font-black shadow-lg shadow-red-950/50 animate-pulse';
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/60 text-rose-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-tech uppercase tracking-wide flex items-center gap-2">
              Threat Heatmap (Threat Class vs. VPC Subnets)
            </h3>
            <p className="text-xs text-slate-400">
              Unidirectional IP ingress density mapped across target enterprise cloud segments
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] font-tech text-slate-400">
          <span>Density:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-600">0 Zero</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300">1 Low</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-200">2-3 Med</span>
          <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-200">4-6 High</span>
          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white">7+ Critical</span>
        </div>
      </div>

      {/* Heatmap Matrix Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-tech border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-400 font-medium border-b border-slate-800 w-44">
                Threat Class / Target
              </th>
              {TARGET_SUBNETS.map(sub => (
                <th key={sub.id} className="p-2 text-center text-slate-300 font-semibold border-b border-slate-800 min-w-[120px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs">{sub.icon} {sub.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{sub.cidr}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {THREAT_CLASSES.map(tClass => (
              <tr key={tClass} className="hover:bg-slate-850/40 transition-colors">
                <td className="p-2.5 font-bold text-slate-200 border-b border-slate-850/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>{tClass}</span>
                </td>

                {TARGET_SUBNETS.map(sub => {
                  const count = matrix[tClass]?.[sub.id] || 0;
                  return (
                    <td key={sub.id} className="p-1.5 border-b border-slate-850/80 text-center">
                      <div
                        onMouseEnter={() => setHoveredCell({
                          threatClass: tClass,
                          subnet: `${sub.label} (${sub.cidr})`,
                          count,
                          severity: count > 3 ? 'CRITICAL' : count > 0 ? 'HIGH' : 'LOW'
                        })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onSelectSubnetFilter && onSelectSubnetFilter(sub.cidr, tClass)}
                        className={`h-10 rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 ${getCellColor(count)}`}
                        title={`${tClass} on ${sub.label}: ${count} detections`}
                      >
                        {count > 0 ? (
                          <span className="text-xs">{count}</span>
                        ) : (
                          <span className="text-slate-700 text-[10px]">-</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hover Information / Inspector Bar */}
      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-tech text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          {hoveredCell ? (
            <span>
              Target: <strong className="text-white">{hoveredCell.subnet}</strong> | Vector:{' '}
              <strong className="text-rose-400">{hoveredCell.threatClass}</strong> ({hoveredCell.count} detections)
            </span>
          ) : (
            <span className="text-slate-400">
              Hover over heatmap cells to inspect targeted subnet blast radius. Click a cell to filter alerts.
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          6 Threat Vectors × 6 VPC Targets
        </span>
      </div>
    </div>
  );
};
