import React, { useState } from 'react';
import {
  X,
  Zap,
  Flame,
  Radio,
  ShieldAlert,
  Server,
  Terminal,
  Play,
  CheckCircle2
} from 'lucide-react';
import { AttackType } from '../types';

interface TrafficInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInject: (attackType: AttackType) => void;
}

export const TrafficInjectorModal: React.FC<TrafficInjectorModalProps> = ({
  isOpen,
  onClose,
  onInject
}) => {
  const [selectedAttack, setSelectedAttack] = useState<AttackType>('DDOS_SYN_FLOOD');
  const [isInjecting, setIsInjecting] = useState(false);
  const [lastInjected, setLastInjected] = useState<string | null>(null);

  if (!isOpen) return null;

  const attackPresets: {
    type: AttackType;
    title: string;
    description: string;
    mitre: string;
    protocol: string;
    badgeColor: string;
  }[] = [
    {
      type: 'DDOS_SYN_FLOOD',
      title: 'Volumetric SYN Flood (TCP Denial of Service)',
      description: 'Saturates TCP connection state table with 50k+ spoofed SYN packets/sec with zero ACK handshakes.',
      mitre: 'T1498.001 (Direct Network Flood)',
      protocol: 'TCP / Port 443',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-800'
    },
    {
      type: 'DATA_EXFILTRATION',
      title: 'Bulk Data Exfiltration (Egress Transfer)',
      description: 'High-entropy anomalous egress transfer (256 MB in 2.4s) from database node to foreign VPS.',
      mitre: 'T1048 (Alternative Protocol Exfil)',
      protocol: 'TCP / Port 443',
      badgeColor: 'bg-red-950 text-red-300 border-red-800'
    },
    {
      type: 'C2_BEACON',
      title: 'Cobalt Strike C2 Beaconing (HTTPS)',
      description: 'Periodic jittered TLS heartbeat with high Shannon entropy (7.92) to command & control listener.',
      mitre: 'T1071.001 (Web Protocols)',
      protocol: 'TCP / Port 8443',
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-800'
    },
    {
      type: 'PORT_SCAN',
      title: 'Horizontal Reconnaissance Sweep (Masscan)',
      description: 'High-velocity SYN probe sweeping edge ports 21, 22, 80, 443, 3389, 8080 to map VPC services.',
      mitre: 'T1046 (Network Service Discovery)',
      protocol: 'TCP / Multi-port',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800'
    },
    {
      type: 'DNS_TUNNELING',
      title: 'DGA Domain Generation & DNS Covert Tunnel (iodine/dnscat2)',
      description: 'Covert TXT tunnel encoding exfiltrated data into pseudo-random subdomains (Shannon Entropy > 4.2).',
      mitre: 'T1568.002 / T1071.004',
      protocol: 'UDP / Port 53',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    },
    {
      type: 'MALWARE_TLS',
      title: 'Malware in Encrypted Channel (AsyncRAT / RedLine Stealer)',
      description: 'Cleartext TLS ClientHello metadata matches known malware JA3 hash without decrypting session payload.',
      mitre: 'T1573.002 (Asymmetric Cryptography)',
      protocol: 'TCP / Port 443',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800'
    },
    {
      type: 'BRUTE_FORCE_SSH',
      title: 'SSH Authentication Brute Force (Hydra)',
      description: 'Continuous credential stuffing bursts against bastion host port 22 with repeated RST flag resets.',
      mitre: 'T1110.001 (Password Guessing)',
      protocol: 'TCP / Port 22',
      badgeColor: 'bg-orange-950 text-orange-300 border-orange-800'
    }
  ];

  const handleTrigger = () => {
    setIsInjecting(true);
    onInject(selectedAttack);
    setLastInjected(selectedAttack);
    setTimeout(() => {
      setIsInjecting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-750 rounded-xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Attack Simulator & Traffic Injector
              </h3>
              <p className="text-xs text-slate-400">
                Targeting Cloud Pub/Sub topic: <span className="text-blue-400 font-tech">ip-traffic-ingest</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="text-slate-300">
            Select an adversarial vector to publish into the live GCP ingestion pipeline.
            The streaming worker (<code className="text-cyan-300 font-tech">inference.py</code>) will evaluate it against the Vertex AI model in real time.
          </div>

          <div className="space-y-2.5">
            {attackPresets.map((preset) => {
              const isSelected = selectedAttack === preset.type;
              return (
                <div
                  key={preset.type}
                  onClick={() => setSelectedAttack(preset.type)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/70 border-blue-500 shadow-md shadow-blue-950/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-tech font-bold text-white text-xs">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                      <span>{preset.title}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-tech border ${preset.badgeColor}`}>
                      {preset.protocol}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed pl-4">
                    {preset.description}
                  </p>

                  <div className="pl-4 mt-2 text-[10px] font-tech text-slate-500">
                    MITRE ATT&CK: <span className="text-slate-300">{preset.mitre}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {lastInjected && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-tech text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Injected <strong>{lastInjected}</strong> into Pub/Sub. Alert dispatched to BigQuery sink!</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-slate-400 text-xs font-tech">
            Pipeline: Pub/Sub → Vertex AI Endpoint → BigQuery
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={isInjecting}
              onClick={handleTrigger}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-tech flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isInjecting ? 'Publishing Flow...' : 'Inject Attack Vector'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
