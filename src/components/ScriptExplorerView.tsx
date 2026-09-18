import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Terminal,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldAlert,
  Server,
  Cpu,
  Database,
  Radio,
  Gauge
} from 'lucide-react';

interface ScriptFile {
  id: string;
  name: string;
  title: string;
  deliverable: string;
  language: string;
  desc: string;
  icon: any;
}

const SCRIPTS: ScriptFile[] = [
  {
    id: 'setup_environment.sh',
    name: 'setup_environment.sh',
    title: 'Google Cloud Setup Script',
    deliverable: 'Deliverable 1',
    language: 'bash',
    desc: 'gcloud commands creating GCP project, enabling Vertex AI, Pub/Sub, BigQuery, and provisioning Vertex AI Notebooks instance.',
    icon: Terminal
  },
  {
    id: 'ingest.py',
    name: 'ingest.py',
    title: 'Unidirectional Traffic Ingestion',
    deliverable: 'Deliverable 2',
    language: 'python',
    desc: 'Python ingestion worker parsing PCAP / NetFlow / IPFIX and streaming JSON flow metadata into Pub/Sub topic ip-traffic-ingest.',
    icon: Radio
  },
  {
    id: 'features.py',
    name: 'features.py',
    title: 'Flow Feature Extraction Module',
    deliverable: 'Deliverable 3',
    language: 'python',
    desc: 'Extracts IP Shannon entropy, PPS burst rates, unidirectional byte ratios, DNS query entropy, TLS/QUIC JA3 fingerprints, and inter-arrival timing CV.',
    icon: Cpu
  },
  {
    id: 'train.py',
    name: 'train.py',
    title: 'Vertex AI Model Training Job',
    deliverable: 'Deliverable 4',
    language: 'python',
    desc: 'Loads BigQuery dataset cyber_dataset.threat_flows, trains TensorFlow deep classifier, evaluates precision/recall/F1, and exports SavedModel to GCS.',
    icon: Database
  },
  {
    id: 'inference.py',
    name: 'inference.py',
    title: 'Streaming Real-Time Inference Worker',
    deliverable: 'Deliverable 5',
    language: 'python',
    desc: 'Consumes Pub/Sub stream, calls Vertex AI endpoint, and sinks threat detections to BigQuery cyber_alerts.detections in standardized schema.',
    icon: ShieldAlert
  },
  {
    id: 'benchmark.py',
    name: 'benchmark.py',
    title: '1,000 Flows/s Benchmark Pipeline',
    deliverable: 'Deliverable 7',
    language: 'python',
    desc: 'Simulates sustained 1000 flows/sec, measures end-to-end processing latencies (P50, P90, P95, P99), and tests pipeline SLA.',
    icon: Gauge
  }
];

export const ScriptExplorerView: React.FC = () => {
  const [selectedScript, setSelectedScript] = useState<ScriptFile>(SCRIPTS[0]);
  const [scriptContent, setScriptContent] = useState<string>('Loading script content...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetchScript(selectedScript.name);
  }, [selectedScript]);

  const fetchScript = async (name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/scripts/${name}`);
      const data = await res.json();
      if (data.content) {
        setScriptContent(data.content);
      } else {
        setScriptContent('# Error loading script');
      }
    } catch (err) {
      setScriptContent('# Error fetching script content from backend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedScript.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-950/50 border border-indigo-400/30">
            <FileCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white font-tech tracking-wide">
                Production Deliverables Code Explorer
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 text-xs font-tech font-bold">
                6 Deliverables Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Inspect, copy, or download the Python and Shell codebases built for Google Cloud Vertex AI and Pub/Sub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-tech font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-tech font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-blue-950/50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {selectedScript.name}</span>
          </button>
        </div>
      </div>

      {/* Script Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {SCRIPTS.map(s => {
          const Icon = s.icon;
          const isSelected = selectedScript.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedScript(s)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-blue-950/80 border-blue-600 shadow-md shadow-blue-950/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-tech font-bold px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {s.deliverable}
                </span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
              </div>
              <div>
                <span className={`text-xs font-tech font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {s.name}
                </span>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                  {s.title}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Code Viewer Box */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
        {/* Editor Top Bar */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-tech">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            <span className="text-slate-600 ml-2">|</span>
            <span className="text-slate-300 font-bold ml-1">{selectedScript.name}</span>
            <span className="text-slate-500 text-[11px]">({selectedScript.language.toUpperCase()})</span>
          </div>

          <div className="text-slate-400 text-xs truncate max-w-lg">
            {selectedScript.desc}
          </div>
        </div>

        {/* Code Content Display */}
        <div className="p-4 sm:p-5 overflow-x-auto max-h-[620px] font-mono text-xs leading-relaxed text-slate-300 select-text">
          {isLoading ? (
            <div className="py-20 text-center text-slate-500 font-tech">
              <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block mr-2"></span>
              Loading script content...
            </div>
          ) : (
            <pre className="text-cyan-200/90">
              {scriptContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
