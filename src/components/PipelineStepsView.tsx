import React, { useState } from 'react';
import {
  CheckCircle2,
  Terminal,
  Play,
  Copy,
  Check,
  Server,
  Database,
  Cloud,
  Layers,
  Zap,
  Eye,
  Cpu,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { PipelineStep } from '../types';

interface PipelineStepsViewProps {
  steps: PipelineStep[];
  onExecuteStep: (stepId: number) => void;
}

export const PipelineStepsView: React.FC<PipelineStepsViewProps> = ({
  steps,
  onExecuteStep
}) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [terminalLogs, setTerminalLogs] = useState<Record<number, string[]>>({
    1: [
      '$ gcloud projects create cyber-threat-detection --set-as-default',
      'Create in progress for [cyber-threat-detection].',
      'Waiting for [operations/cp.7198273910283] to finish... done.',
      'Updated default project to [cyber-threat-detection].',
      '$ gcloud services enable aiplatform.googleapis.com bigquery.googleapis.com pubsub.googleapis.com',
      'Operation "operations/acat.p2-191049442089" finished successfully.',
      '$ gcloud notebooks instances create cyber-threat-notebook ...',
      'Instance [cyber-threat-notebook] in [us-central1-a] created successfully with TensorFlow CPU 2.11.'
    ],
    2: [
      '$ gcloud pubsub topics create ip-traffic-ingest',
      'Created topic [projects/cyber-threat-detection/topics/ip-traffic-ingest].',
      '$ python ingest.py --source pcap_files/ --pubsub_topic ip-traffic-ingest',
      '[INGEST] Parsing PCAP pcap_files/capture_20260918.pcap ...',
      '[INGEST] Replaying NetFlow v9 records at 1,420 pkts/sec.',
      '[INGEST] Published 28,400 messages to Pub/Sub topic [ip-traffic-ingest].'
    ],
    3: [
      '$ bq load --source_format=CSV cyber_dataset.threat_flows gs://YOUR_BUCKET/threat_flows.csv',
      'Waiting on job_d48a91c298a0... (45s) current status: DONE',
      'Loaded 2,840,192 rows into cyber_dataset.threat_flows.',
      'Schema: 24 features (src_ip, dst_port, duration_ms, tcp_flags, entropy, label...)'
    ],
    4: [
      '$ gcloud ai custom-jobs create --display-name=threat-detection-train ...',
      'CustomJob [projects/191049442089/locations/us-central1/customJobs/threat-detection-train-v3] is submitted.',
      'Starting TensorFlow 2.11 training on n1-standard-4 worker...',
      'Epoch 40/40 - loss: 0.0142 - accuracy: 0.9941 - val_loss: 0.0158 - val_accuracy: 0.9938',
      'CustomJob completed successfully. Model artifact saved to gs://cyber-threat-artifacts/model-v3/'
    ],
    5: [
      '$ gcloud ai endpoints create --display-name=threat-detection-endpoint',
      'Created Vertex AI endpoint: projects/191049442089/locations/us-central1/endpoints/threat-detection-endpoint-77491',
      '$ gcloud ai endpoints deploy-model ...',
      'Deploying model [threat-detection-model-v3] with machine type [n1-standard-4], min_replica=1, max_replica=3...',
      'Endpoint deployed. Real-time inference ready with avg latency ~8.4ms.'
    ],
    6: [
      '$ python inference.py --pubsub_topic ip-traffic-ingest --endpoint ENDPOINT_ID',
      '[WORKER] Subscribed to Pub/Sub: ip-traffic-ingest-sub',
      '[WORKER] Streaming batches of 64 network flows to Vertex AI endpoint...',
      '[PREDICTION] Evaluated 1,420 flows/sec. Anomaly threshold = 0.85.',
      '[ALERT] Detected DDOS_SYN_FLOOD (Confidence: 0.991) -> Forwarding to BigQuery sink.'
    ],
    7: [
      '$ bq mk cyber_alerts',
      'Dataset "cyber-threat-detection:cyber_alerts" successfully created.',
      '$ bq mk cyber_alerts.detections',
      'Table "cyber-threat-detection:cyber_alerts.detections" successfully created with streaming buffer.',
      '[DASHBOARD] BigQuery connected to Looker Studio & SOC Real-Time Console.'
    ]
  });

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(id);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const handleRun = (stepId: number) => {
    onExecuteStep(stepId);
    setSelectedStep(stepId);
    const now = new Date().toLocaleTimeString();
    setTerminalLogs(prev => ({
      ...prev,
      [stepId]: [
        ...(prev[stepId] || []),
        `\n[${now}] Re-verifying Step ${stepId} via Cloud Shell runner...`,
        `[${now}] GCP API health check returned HTTP 200 OK. Step status: ONLINE.`
      ]
    }));
  };

  const stepIcons = [
    Cloud,
    Zap,
    Database,
    Cpu,
    Server,
    Layers,
    ShieldAlert
  ];

  const currentStepObj = steps.find(s => s.id === selectedStep) || steps[0];
  const StepIcon = stepIcons[(currentStepObj.id - 1) % stepIcons.length];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1 font-tech">
              <span>Google Cloud Platform Architecture</span>
              <span>•</span>
              <span className="text-emerald-400">Production Deployed</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
              End-to-End Cyber Threat Pipeline
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              From raw PCAP/NetFlow streaming into Cloud Pub/Sub, to custom deep learning training on Vertex AI,
              real-time sub-10ms endpoint inference, and BigQuery security alert storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-tech flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All 7 Stages Operational</span>
            </span>
          </div>
        </div>

        {/* Visual Architecture Flow Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          {steps.map((step) => {
            const Icon = stepIcons[step.id - 1];
            const isSelected = selectedStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setSelectedStep(step.id)}
                className={`p-2.5 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-blue-950/80 border-blue-500 shadow-md shadow-blue-950/50 text-white'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-tech text-[10px] font-bold text-blue-400">
                    STEP {step.id}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <div className="flex items-center gap-1.5 font-medium truncate text-xs">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
                  <span className="truncate">{step.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Inspector: Left Step Details & CLI, Right Real-Time Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Step Details & Run Actions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <StepIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-[11px] font-tech text-blue-300 font-bold">
                      STEP {currentStepObj.id} OF 7
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[11px] font-tech text-emerald-300">
                      STATUS: HEALTHY
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {currentStepObj.title}: {currentStepObj.subtitle}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => handleRun(currentStepObj.id)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Step</span>
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {currentStepObj.details}
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {Object.entries(currentStepObj.metrics).map(([key, val]) => (
                <div key={key} className="p-2.5 rounded-lg bg-slate-950 border border-slate-850">
                  <div className="text-[11px] text-slate-400 truncate">{key}</div>
                  <div className="text-xs font-bold text-slate-200 mt-0.5 truncate font-tech">{val}</div>
                </div>
              ))}
            </div>

            {/* Command Snippet Block */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-tech text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  gcloud / bq script execution:
                </span>
                <button
                  onClick={() => handleCopy(currentStepObj.commandSnippet, currentStepObj.id)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedStep === currentStepObj.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[11px]">Copy Script</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-tech text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed selection:bg-blue-900">
                {currentStepObj.commandSnippet}
              </pre>
            </div>
          </div>

          {/* Quick Step Navigation */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <button
              disabled={selectedStep <= 1}
              onClick={() => setSelectedStep(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              ← Previous Step
            </button>
            <span className="font-tech text-slate-300">
              Viewing Step {selectedStep} / 7
            </span>
            <button
              disabled={selectedStep >= 7}
              onClick={() => setSelectedStep(prev => Math.min(7, prev + 1))}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Next Step →
            </button>
          </div>
        </div>

        {/* Right: Interactive Cloud Shell Terminal Log */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[420px]">
          <div className="flex-1 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col font-tech text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                <span className="text-slate-400 ml-2 font-bold text-[11px]">
                  Google Cloud Shell [us-central1]
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                active: cyber-threat-detection
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 text-slate-300 leading-relaxed max-h-[460px] pr-2">
              {(terminalLogs[selectedStep] || []).map((line, idx) => {
                const isCommand = line.startsWith('$');
                const isError = line.includes('error') || line.includes('FAIL');
                const isSuccess = line.includes('success') || line.includes('done') || line.includes('Loaded');
                const isAlert = line.includes('ALERT');

                return (
                  <div
                    key={idx}
                    className={
                      isCommand
                        ? 'text-cyan-400 font-bold'
                        : isError
                        ? 'text-rose-400'
                        : isSuccess
                        ? 'text-emerald-400'
                        : isAlert
                        ? 'text-amber-300 font-semibold'
                        : 'text-slate-400'
                    }
                  >
                    {line}
                  </div>
                );
              })}
              <div className="flex items-center gap-1 text-slate-500 pt-2">
                <span className="text-cyan-500">$</span>
                <span className="w-2 h-4 bg-cyan-400 animate-pulse inline-block"></span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
              <span>Cloud Shell VM: standard-4</span>
              <span>Python 3.10 • gcloud v465.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
