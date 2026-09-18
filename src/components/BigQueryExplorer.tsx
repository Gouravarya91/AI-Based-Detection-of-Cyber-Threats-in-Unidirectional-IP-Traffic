import React, { useState } from 'react';
import {
  Database,
  Play,
  Terminal,
  Clock,
  HardDrive,
  Copy,
  Check,
  Download,
  Table,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { BigQueryRow } from '../types';

export const BigQueryExplorer: React.FC = () => {
  const [selectedSqlPreset, setSelectedSqlPreset] = useState<string>('alerts');
  const [customSql, setCustomSql] = useState<string>(
    `SELECT alert_id, timestamp, src_ip, dst_ip, dst_port, threat_type, confidence, severity, status
FROM \`cyber-threat-detection.cyber_alerts.detections\`
WHERE severity IN ('CRITICAL', 'HIGH')
ORDER BY timestamp DESC
LIMIT 10;`
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryStats, setQueryStats] = useState<{
    bytesProcessed: string;
    executionTimeMs: number;
    cacheHit: boolean;
  }>({
    bytesProcessed: '24.8 MB',
    executionTimeMs: 382,
    cacheHit: false
  });
  const [results, setResults] = useState<any[]>([
    {
      alert_id: 'ALT-9821',
      timestamp: new Date().toISOString(),
      src_ip: '198.51.100.22',
      dst_ip: '10.128.0.15',
      dst_port: 443,
      threat_type: 'DDOS_SYN_FLOOD',
      confidence: 0.984,
      severity: 'CRITICAL',
      status: 'ACTIVE'
    },
    {
      alert_id: 'ALT-9820',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      src_ip: '10.128.0.42',
      dst_ip: '185.220.101.5',
      dst_port: 8443,
      threat_type: 'C2_BEACON',
      confidence: 0.941,
      severity: 'HIGH',
      status: 'INVESTIGATING'
    },
    {
      alert_id: 'ALT-9819',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      src_ip: '194.26.29.112',
      dst_ip: '10.128.0.10',
      dst_port: 22,
      threat_type: 'PORT_SCAN',
      confidence: 0.912,
      severity: 'MEDIUM',
      status: 'ACTIVE'
    }
  ]);

  const presets = [
    {
      id: 'alerts',
      title: 'Recent Detections',
      sql: `SELECT alert_id, timestamp, src_ip, dst_ip, dst_port, threat_type, confidence, severity, status\nFROM \`cyber-threat-detection.cyber_alerts.detections\`\nWHERE severity IN ('CRITICAL', 'HIGH')\nORDER BY timestamp DESC\nLIMIT 10;`
    },
    {
      id: 'distribution',
      title: 'Training Dataset Classes (2.8M Flows)',
      sql: `SELECT threat_type, COUNT(1) as count, ROUND(COUNT(1) * 100.0 / 2840192, 2) as pct\nFROM \`cyber-threat-detection.cyber_dataset.threat_flows\`\nGROUP BY threat_type\nORDER BY count DESC;`
    },
    {
      id: 'entropy',
      title: 'Shannon Entropy by Attack Type',
      sql: `SELECT threat_type, AVG(entropy) as avg_entropy, AVG(packets) as avg_packets, AVG(bytes) as avg_bytes\nFROM \`cyber-threat-detection.cyber_dataset.threat_flows\`\nGROUP BY threat_type\nORDER BY avg_entropy DESC;`
    }
  ];

  const handleSelectPreset = (presetId: string) => {
    const p = presets.find(x => x.id === presetId);
    if (p) {
      setSelectedSqlPreset(presetId);
      setCustomSql(p.sql);
      runQuery(p.sql);
    }
  };

  const runQuery = async (sqlToRun: string) => {
    setIsExecuting(true);
    try {
      const res = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlToRun })
      });
      const data = await res.json();
      setResults(data.rows || []);
      setQueryStats({
        bytesProcessed: data.totalBytesProcessed || '18.4 MB',
        executionTimeMs: data.executionTimeMs || 320,
        cacheHit: data.cacheHit || false
      });
    } catch (err) {
      console.error('BigQuery query failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportCsv = () => {
    if (!results.length) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bigquery_cyber_results_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1 font-tech">
            <Database className="w-3.5 h-3.5" />
            <span>BigQuery Enterprise Security Data Lake (Steps 3 & 7)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            Security Telemetry & Detections Query Engine
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Query across partitioned training data (<code className="text-blue-300 font-tech">cyber_dataset.threat_flows</code>)
            and real-time streaming detection sinks (<code className="text-purple-300 font-tech">cyber_alerts.detections</code>).
          </p>
        </div>

        <div className="flex items-center gap-2 font-tech text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <div className="text-slate-500 text-[10px]">Dataset Size</div>
            <div className="font-bold text-purple-400">1.42 GB (2.8M rows)</div>
          </div>
        </div>
      </div>

      {/* Query Console Editor */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        {/* Preset Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-tech text-xs">
            <span className="text-slate-400">Pre-built Queries:</span>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1 rounded-md border transition-colors ${
                  selectedSqlPreset === p.id
                    ? 'bg-purple-950 border-purple-600 text-purple-200 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>

          <button
            disabled={isExecuting}
            onClick={() => runQuery(customSql)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-tech flex items-center gap-2 transition-colors disabled:opacity-50 shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isExecuting ? 'Running Query on GCP...' : 'Run Query'}</span>
          </button>
        </div>

        {/* SQL Input Area */}
        <div className="relative">
          <textarea
            value={customSql}
            onChange={(e) => setCustomSql(e.target.value)}
            rows={5}
            className="w-full p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-tech text-cyan-300 focus:outline-none focus:border-blue-500 leading-relaxed resize-y selection:bg-blue-900"
            spellCheck={false}
          />
        </div>

        {/* Query Stats Footer */}
        <div className="flex items-center justify-between text-xs font-tech text-slate-400 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Elapsed: <strong className="text-slate-200">{queryStats.executionTimeMs} ms</strong>
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-slate-500" />
              Bytes Billed: <strong className="text-slate-200">{queryStats.bytesProcessed}</strong>
            </span>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={results.length === 0}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Table className="w-4 h-4 text-purple-400" />
            Query Results ({results.length} rows returned)
          </h3>
          <span className="text-[11px] font-tech text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
            BigQuery Storage API: Active
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          {results.length > 0 ? (
            <table className="w-full text-left text-xs font-tech">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  {Object.keys(results[0]).map(key => (
                    <th key={key} className="py-2.5 px-3 whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-900/60">
                {results.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                    {Object.entries(row).map(([k, v], cIdx) => (
                      <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                        {typeof v === 'number'
                          ? Number.isInteger(v)
                            ? v.toLocaleString()
                            : v.toFixed(3)
                          : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-500 font-tech text-xs">
              No results to display. Run a query above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
