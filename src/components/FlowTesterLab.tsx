import React, { useState } from 'react';
import {
  Zap,
  Server,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  FileCode2,
  Clock
} from 'lucide-react';
import { AttackType, SeverityLevel } from '../types';

export const FlowTesterLab: React.FC = () => {
  // Configurable flow parameters
  const [srcIp, setSrcIp] = useState('198.51.100.44');
  const [dstIp, setDstIp] = useState('10.128.0.15');
  const [dstPort, setDstPort] = useState(443);
  const [protocol, setProtocol] = useState<'TCP' | 'UDP' | 'ICMP'>('TCP');
  const [packets, setPackets] = useState(45000);
  const [bytes, setBytes] = useState(2800000);
  const [durationMs, setDurationMs] = useState(400);
  const [tcpFlags, setTcpFlags] = useState<string[]>(['SYN']);
  const [entropy, setEntropy] = useState(1.95);
  const [ja3Hash, setJa3Hash] = useState('');
  const [dnsQuery, setDnsQuery] = useState('');
  const [dnsEntropy, setDnsEntropy] = useState(0.0);

  // Prediction state
  const [evaluating, setEvaluating] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);

  // Quick preset templates covering all 6 threat classes
  const presets = [
    {
      name: '1. Volumetric SYN Flood (DDoS)',
      port: 443,
      proto: 'TCP',
      pkts: 52000,
      b: 3120000,
      dur: 350,
      flags: ['SYN'],
      ent: 1.85,
      src: '198.51.100.99',
      ja3: '',
      dnsQ: '',
      dnsEnt: 0.0
    },
    {
      name: '2. Stealth Port Recon (Recon)',
      port: 22,
      proto: 'TCP',
      pkts: 280,
      b: 16800,
      dur: 80,
      flags: ['SYN'],
      ent: 3.2,
      src: '194.26.29.50',
      ja3: '',
      dnsQ: '',
      dnsEnt: 0.0
    },
    {
      name: '3. Cobalt Strike Heartbeat (C2)',
      port: 8443,
      proto: 'TCP',
      pkts: 16,
      b: 4800,
      dur: 110,
      flags: ['PSH', 'ACK'],
      ent: 7.92,
      src: '10.128.0.42',
      ja3: 'a0e9f5d64349fb13191bc781f81f42e1',
      dnsQ: '',
      dnsEnt: 0.0
    },
    {
      name: '4. AsyncRAT Encrypted (Malware TLS)',
      port: 443,
      proto: 'TCP',
      pkts: 48,
      b: 14200,
      dur: 310,
      flags: ['PSH', 'ACK'],
      ent: 7.92,
      src: '10.128.3.45',
      ja3: '51c64c77e60f3980eea90869b68c58a8',
      dnsQ: '',
      dnsEnt: 0.0
    },
    {
      name: '5. High-Entropy DGA (DNS Tunnel)',
      port: 53,
      proto: 'UDP',
      pkts: 52,
      b: 24960,
      dur: 820,
      flags: [],
      ent: 7.78,
      src: '10.128.4.12',
      ja3: '',
      dnsQ: 'x8f92a10c9.exfil.darknet-c2.net',
      dnsEnt: 4.42
    },
    {
      name: '6. Mass Bulk Egress (Exfiltration)',
      port: 443,
      proto: 'TCP',
      pkts: 18450,
      b: 268435456,
      dur: 2400,
      flags: ['PSH', 'ACK'],
      ent: 7.98,
      src: '10.128.0.88',
      ja3: 'c879d71a7293b6e83819e9921b7123aa',
      dnsQ: '',
      dnsEnt: 0.0
    },
    {
      name: '7. Benign Enterprise HTTPS Web',
      port: 443,
      proto: 'TCP',
      pkts: 45,
      b: 24000,
      dur: 210,
      flags: ['ACK', 'PSH'],
      ent: 5.1,
      src: '172.16.1.10',
      ja3: '',
      dnsQ: '',
      dnsEnt: 0.0
    }
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setDstPort(p.port);
    setProtocol(p.proto as any);
    setPackets(p.pkts);
    setBytes(p.b);
    setDurationMs(p.dur);
    setTcpFlags(p.flags);
    setEntropy(p.ent);
    setSrcIp(p.src);
    setJa3Hash(p.ja3);
    setDnsQuery(p.dnsQ);
    setDnsEntropy(p.dnsEnt);
    setPredictionResult(null);
  };

  const toggleFlag = (flag: string) => {
    if (tcpFlags.includes(flag)) {
      setTcpFlags(tcpFlags.filter(f => f !== flag));
    } else {
      setTcpFlags([...tcpFlags, flag]);
    }
  };

  const handlePredict = async () => {
    setEvaluating(true);
    try {
      const flow = {
        srcIp,
        dstIp,
        dstPort,
        protocol,
        packets,
        bytes,
        durationMs,
        tcpFlags,
        entropy,
        ja3Hash,
        dnsQuery,
        dnsEntropy
      };

      const res = await fetch('/api/inference/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow })
      });
      const data = await res.json();
      setPredictionResult(data);
    } catch (err) {
      console.error('Inference error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1 font-tech">
            <Server className="w-3.5 h-3.5" />
            <span>Vertex AI Model Endpoint Tester (Step 5 & Step 6)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            Real-Time Network Flow Inference Lab
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Directly test the deployed TensorFlow classifier (<code className="text-indigo-300 font-tech">threat-detection-endpoint</code>)
            by manipulating raw flow attributes and observing online prediction latency and anomaly scoring.
          </p>
        </div>

        <div className="flex items-center gap-2 font-tech text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
            <div className="text-slate-500 text-[10px]">Endpoint Status</div>
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              2 Replicas Serving (P95: 8.4ms)
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Prediction Card Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Flow Crafter */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-slate-400 font-tech text-[11px]">Load Feature Preset:</span>
              <div className="flex flex-wrap gap-2">
                {presets.map(p => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-300 text-xs font-tech transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-slate-400 font-tech text-[11px]">Source IP Address</label>
                <input
                  type="text"
                  value={srcIp}
                  onChange={(e) => setSrcIp(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white font-tech text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-tech text-[11px]">Destination Internal IP</label>
                <input
                  type="text"
                  value={dstIp}
                  onChange={(e) => setDstIp(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white font-tech text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-tech text-[11px]">Destination Port</label>
                <input
                  type="number"
                  value={dstPort}
                  onChange={(e) => setDstPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white font-tech text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-tech text-[11px]">Transport Protocol</label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value as any)}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white font-tech text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                  <option value="ICMP">ICMP</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-tech text-[11px]">Flow Packet Count</label>
                <input
                  type="number"
                  value={packets}
                  onChange={(e) => setPackets(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white font-tech text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-tech text-[11px]">Flow Volume (Bytes)</label>
                <input
                  type="number"
                  value={bytes}
                  onChange={(e) => setBytes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-white font-tech text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* TCP Flags */}
            <div className="space-y-1.5 pt-1">
              <label className="text-slate-400 font-tech text-[11px]">TCP Header Flags:</label>
              <div className="flex flex-wrap gap-2">
                {['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'].map(flag => {
                  const isSet = tcpFlags.includes(flag);
                  return (
                    <button
                      key={flag}
                      type="button"
                      onClick={() => toggleFlag(flag)}
                      className={`px-3 py-1 rounded text-xs font-tech font-bold transition-all border ${
                        isSet
                          ? flag === 'SYN'
                            ? 'bg-rose-950 border-rose-600 text-rose-300'
                            : flag === 'RST'
                            ? 'bg-amber-950 border-amber-600 text-amber-300'
                            : 'bg-blue-950 border-blue-600 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      {flag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Entropy Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[11px] font-tech">
                <span className="text-slate-400">Payload Shannon Entropy:</span>
                <span className="text-cyan-400 font-bold">{entropy.toFixed(2)} / 8.0</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.05"
                value={entropy}
                onChange={(e) => setEntropy(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-950 h-2 rounded cursor-pointer"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                disabled={evaluating}
                onClick={handlePredict}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-tech flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-950/50 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{evaluating ? 'Evaluating on Vertex AI...' : 'Invoke Vertex AI Model Prediction'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Endpoint Output Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="font-display font-bold text-sm text-white">
                    Prediction Response
                  </span>
                </div>
                <span className="text-[10px] font-tech text-slate-400">
                  gcloud.ai.models.predict
                </span>
              </div>

              {predictionResult ? (
                <div className="space-y-3 font-tech text-xs">
                  {/* Result Verdict Badge */}
                  <div className={`p-3.5 rounded-xl border ${
                    predictionResult.isThreat
                      ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                      : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        {predictionResult.isThreat ? 'Standardized Threat Class' : 'Traffic Assessment'}
                      </span>
                      <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-emerald-400 font-mono">
                        Latency: {predictionResult.vertexLatencyMs} ms
                      </span>
                    </div>
                    <div className="text-base font-bold mt-1 flex items-center justify-between">
                      <span>{predictionResult.threatClass || predictionResult.predictedLabel.replace(/_/g, ' ')}</span>
                      {predictionResult.isThreat && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {predictionResult.severity}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Internal Label: <code className="text-cyan-300">{predictionResult.predictedLabel}</code>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Model Confidence</div>
                      <div className="text-sm font-bold text-slate-200 mt-0.5">
                        {Math.round(predictionResult.confidence * 100)}%
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Anomaly Index</div>
                      <div className="text-sm font-bold text-rose-400 mt-0.5">
                        {predictionResult.anomalyScore}%
                      </div>
                    </div>
                  </div>

                  {predictionResult.isThreat && (
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase">MITRE ATT&CK Mapping</div>
                      <div className="text-amber-300 font-bold">
                        {predictionResult.mitreTechnique} ({predictionResult.mitreTactic})
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Severity: <strong className="text-rose-400">{predictionResult.severity}</strong>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-850 text-[10px] text-slate-400 space-y-1">
                    <div>Endpoint: <span className="text-indigo-300">projects/191049442089/endpoints/threat-detection-endpoint</span></div>
                    <div>Evaluated At: <span className="text-slate-300">{new Date(predictionResult.evaluatedAt).toLocaleTimeString()}</span></div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <Activity className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <p className="text-xs font-tech">
                    Configure flow attributes on the left and invoke prediction to test the Vertex AI model.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-tech">
              TensorFlow 2.11 Bi-LSTM Inference Container on Vertex AI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
