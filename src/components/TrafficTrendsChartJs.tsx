import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { NetworkFlow, ThreatAlert } from '../types';
import { Activity, Radio, Zap, ShieldAlert } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrafficTrendsChartJsProps {
  flows: NetworkFlow[];
  alerts: ThreatAlert[];
}

export const TrafficTrendsChartJs: React.FC<TrafficTrendsChartJsProps> = ({ flows, alerts }) => {
  // Extract rolling 15 timeline points
  const recentFlows = useMemo(() => flows.slice(0, 15).reverse(), [flows]);

  const labels = recentFlows.map((f, i) => {
    const d = new Date(f.timestamp);
    return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  });

  // Calculate sustained bandwidth in Mbps per flow (bytes * 8 / duration_ms / 1000)
  const bandwidthData = recentFlows.map(f => {
    const durationSec = Math.max(f.durationMs / 1000, 0.001);
    const mbps = (f.bytes * 8) / (durationSec * 1024 * 1024);
    return Number(Math.min(mbps, 400).toFixed(2));
  });

  // Flow anomaly score or confidence (%)
  const anomalyScores = recentFlows.map(f => Number(f.anomalyScore.toFixed(1)));

  // Packet rates (PPS)
  const packetRates = recentFlows.map(f => {
    const durationSec = Math.max(f.durationMs / 1000, 0.001);
    return Math.round(f.packets / durationSec);
  });

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Vertex AI Anomaly Score (%)',
        data: anomalyScores,
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#f43f5e',
        yAxisID: 'y'
      },
      {
        label: 'Bandwidth (Sustained Mbps)',
        data: bandwidthData,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor: '#06b6d4',
        yAxisID: 'y1'
      }
    ]
  };

  const lineOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { family: 'ui-monospace, monospace', size: 11 },
          boxWidth: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        titleFont: { family: 'ui-monospace, monospace' },
        bodyFont: { family: 'ui-monospace, monospace' }
      }
    },
    scales: {
      x: {
        grid: { color: '#1e293b' },
        ticks: { color: '#64748b', font: { family: 'ui-monospace, monospace', size: 10 } }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        grid: { color: '#1e293b' },
        ticks: {
          color: '#f43f5e',
          font: { family: 'ui-monospace, monospace', size: 10 },
          callback: (value: any) => `${value}%`
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#06b6d4',
          font: { family: 'ui-monospace, monospace', size: 10 },
          callback: (value: any) => `${value}M`
        }
      }
    }
  };

  const barChartData = {
    labels,
    datasets: [
      {
        label: 'Flow Packet Rate (PPS)',
        data: packetRates,
        backgroundColor: packetRates.map(pps => pps > 10000 ? 'rgba(244, 63, 94, 0.75)' : 'rgba(59, 130, 246, 0.65)'),
        borderColor: packetRates.map(pps => pps > 10000 ? '#f43f5e' : '#3b82f6'),
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'ui-monospace, monospace', size: 11 },
          boxWidth: 10
        }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1'
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'ui-monospace, monospace', size: 10 } }
      },
      y: {
        grid: { color: '#1e293b' },
        ticks: { color: '#94a3b8', font: { family: 'ui-monospace, monospace', size: 10 } }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart.js Line Chart: Anomaly & Bandwidth Trends */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white font-tech uppercase tracking-wide">
              Traffic Trends (Chart.js)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] font-tech text-cyan-300">
            Sustained Rate & Anomaly
          </span>
        </div>
        <div className="h-48 w-full">
          <Line data={lineChartData} options={lineOptions} />
        </div>
        <div className="flex items-center justify-between text-[10px] font-tech text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
          <span>Dual Axis: Left Anomaly % | Right Sustained Mbps</span>
          <span className="text-emerald-400">Vertex AI Real-time Feed</span>
        </div>
      </div>

      {/* Chart.js Bar Chart: Packet Rate Volumetric Burst */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white font-tech uppercase tracking-wide">
              Flow Packet Burst Rate (PPS)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-[10px] font-tech text-blue-300">
            PPS Distribution
          </span>
        </div>
        <div className="h-48 w-full">
          <Bar data={barChartData} options={barOptions} />
        </div>
        <div className="flex items-center justify-between text-[10px] font-tech text-slate-400 pt-2 border-t border-slate-800/80 mt-2">
          <span>Volumetric Red Bars &gt; 10,000 PPS (DDoS/Flood Signatures)</span>
          <span className="text-cyan-400">Sampling 15 flows</span>
        </div>
      </div>
    </div>
  );
};
