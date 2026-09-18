import React, { useState, useEffect, useRef } from 'react';
import {
  NetworkFlow,
  ThreatAlert,
  PipelineStep,
  SOCMetrics,
  AttackType
} from './types';
import { generateRandomFlow } from './data/mockFlows';
import { Header } from './components/Header';
import { LiveSocMonitor } from './components/LiveSocMonitor';
import { PipelineStepsView } from './components/PipelineStepsView';
import { BigQueryExplorer } from './components/BigQueryExplorer';
import { FlowTesterLab } from './components/FlowTesterLab';
import { BenchmarkRunnerView } from './components/BenchmarkRunnerView';
import { ScriptExplorerView } from './components/ScriptExplorerView';
import { DocumentationView } from './components/DocumentationView';
import { ThreatAlertModal } from './components/ThreatAlertModal';
import { TrafficInjectorModal } from './components/TrafficInjectorModal';
import { AiCopilotDrawer } from './components/AiCopilotDrawer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'soc' | 'benchmark' | 'code' | 'docs' | 'pipeline' | 'bigquery' | 'lab'>('soc');
  const [isStreaming, setIsStreaming] = useState(true);

  // Initial flows
  const [flows, setFlows] = useState<NetworkFlow[]>(() => {
    return Array.from({ length: 15 }, () => generateRandomFlow());
  });

  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>(['198.51.100.44', '203.0.113.88']);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);

  // Modals state
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [isInjectorOpen, setIsInjectorOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Metrics
  const [totalFlowsCount, setTotalFlowsCount] = useState(14820);
  const [detectedThreatsCount, setDetectedThreatsCount] = useState(412);

  // Fetch initial GCP Pipeline status & alerts from server backend
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [gcpRes, alertsRes] = await Promise.all([
          fetch('/api/gcp/status'),
          fetch('/api/alerts')
        ]);

        if (gcpRes.ok) {
          const gcpData = await gcpRes.json();
          setPipelineSteps(gcpData.steps || []);
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.alerts || []);
          if (alertsData.blockedIps) {
            setBlockedIps(alertsData.blockedIps);
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }

    loadInitialData();
  }, []);

  // Streaming loop: appends simulated flows from Pub/Sub topic every 1.6s
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const newFlow = generateRandomFlow();
      setFlows(prev => [newFlow, ...prev.slice(0, 49)]);
      setTotalFlowsCount(prev => prev + 1);

      if (newFlow.isThreat) {
        setDetectedThreatsCount(prev => prev + 1);
        const tClass = newFlow.threatClass || (
          newFlow.predictedLabel === 'DDOS_SYN_FLOOD' ? 'DDoS' :
          newFlow.predictedLabel === 'C2_BEACON' ? 'Botnet Beaconing' :
          newFlow.predictedLabel === 'PORT_SCAN' ? 'Recon Scanning' :
          newFlow.predictedLabel === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
          newFlow.predictedLabel === 'DNS_TUNNELING' ? 'DGA/Tunneling' :
          newFlow.predictedLabel === 'MALWARE_TLS' ? 'Malware TLS' : 'Recon Scanning'
        );

        const newAlert: ThreatAlert = {
          alertId: `ALT-${Math.floor(Math.random() * 9000) + 1000}`,
          timestamp: newFlow.timestamp,
          flowId: newFlow.id,
          threatType: newFlow.predictedLabel,
          threatClass: tClass,
          severity: newFlow.severity,
          confidence: newFlow.confidence,
          srcIp: newFlow.srcIp,
          dstIp: newFlow.dstIp,
          dstPort: newFlow.dstPort,
          protocol: newFlow.protocol,
          mitreTechnique: newFlow.mitreTechnique || 'T1498',
          mitreTactic: newFlow.mitreTactic || 'Impact',
          summary: `Real-time stream detection: ${tClass} (${newFlow.predictedLabel}) flagged by Vertex AI endpoint with ${Math.round(newFlow.confidence * 100)}% confidence.`,
          status: 'ACTIVE',
          flowDetails: newFlow,
          evidence: {
            src_ip: newFlow.srcIp,
            dst_ip: newFlow.dstIp,
            src_port: newFlow.srcPort,
            dst_port: newFlow.dstPort,
            protocol: newFlow.protocol,
            ja3_hash: tClass === 'Malware TLS' ? 'a0e9f5d64349fb13191bc781f81f42e1' : tClass === 'Botnet Beaconing' ? '51c64c77e60f39ac3e17764891084e7b' : null,
            ja3_fingerprint: tClass === 'Malware TLS' ? '771,49195-49199-52393,0-23-65281-10-11,29-23-24,0' : null,
            inter_arrival_cv: tClass === 'Botnet Beaconing' ? 0.038 : Number((Math.random() * 0.4 + 0.1).toFixed(3)),
            beaconing_interval_sec: tClass === 'Botnet Beaconing' ? 60.0 : null,
            dns_query: tClass === 'DGA/Tunneling' ? `x9q8m-${Math.random().toString(36).substring(2, 9)}.darknet.org` : null,
            dns_entropy: tClass === 'DGA/Tunneling' ? 4.38 : null,
            unidirectional_byte_bias: Number((newFlow.bytes / (newFlow.bytes + 1000)).toFixed(3)),
            packet_rate_pps: Math.round(newFlow.packets / Math.max(newFlow.durationMs / 1000, 0.001)),
            mitre_technique: newFlow.mitreTechnique
          }
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 29)]);
      }
    }, 1600);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Execute or re-verify a GCP step
  const handleExecuteStep = async (stepId: number) => {
    try {
      const res = await fetch('/api/gcp/run-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId })
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineSteps(prev =>
          prev.map(s => (s.id === stepId ? data.step : s))
        );
      }
    } catch (err) {
      console.error('Failed to execute step:', err);
    }
  };

  // Inject attack vector into live pipeline
  const handleInjectAttack = async (attackType: AttackType) => {
    try {
      const res = await fetch('/api/traffic/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attackType })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.flow) {
          setFlows(prev => [data.flow, ...prev.slice(0, 49)]);
          setTotalFlowsCount(prev => prev + 1);
        }
        if (data.alert) {
          setAlerts(prev => [data.alert, ...prev.slice(0, 29)]);
          setDetectedThreatsCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Failed to inject attack:', err);
    }
  };

  // Block an IP with Cloud Armor
  const handleBlockIp = async (ip: string) => {
    try {
      const res = await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BLOCK',
          ipToBlock: ip
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBlockedIps(data.blockedIps || []);
        if (selectedAlert && selectedAlert.srcIp === ip) {
          setSelectedAlert(prev => (prev ? { ...prev, status: 'BLOCKED' } : null));
        }
      }
    } catch (err) {
      console.error('Failed to block IP:', err);
    }
  };

  // Mark alert mitigated
  const handleMitigateAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          action: 'MITIGATE'
        })
      });

      if (res.ok) {
        setAlerts(prev =>
          prev.map(a => (a.alertId === alertId ? { ...a, status: 'MITIGATED' } : a))
        );
        if (selectedAlert && selectedAlert.alertId === alertId) {
          setSelectedAlert(prev => (prev ? { ...prev, status: 'MITIGATED' } : null));
        }
      }
    } catch (err) {
      console.error('Failed to mitigate alert:', err);
    }
  };

  // Convert inspected flow to alert modal if user clicks an item
  const handleSelectFlow = (flow: NetworkFlow) => {
    const matchingAlert = alerts.find(a => a.flowId === flow.id || a.srcIp === flow.srcIp);
    if (matchingAlert) {
      setSelectedAlert(matchingAlert);
    } else {
      const tClass = flow.threatClass || (
        flow.predictedLabel === 'DDOS_SYN_FLOOD' ? 'DDoS' :
        flow.predictedLabel === 'C2_BEACON' ? 'Botnet Beaconing' :
        flow.predictedLabel === 'PORT_SCAN' ? 'Recon Scanning' :
        flow.predictedLabel === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
        flow.predictedLabel === 'DNS_TUNNELING' ? 'DGA/Tunneling' :
        flow.predictedLabel === 'MALWARE_TLS' ? 'Malware TLS' : 'Recon Scanning'
      );

      setSelectedAlert({
        alertId: `INSP-${flow.id}`,
        timestamp: flow.timestamp,
        flowId: flow.id,
        threatType: flow.predictedLabel,
        threatClass: tClass,
        severity: flow.severity,
        confidence: flow.confidence,
        srcIp: flow.srcIp,
        dstIp: flow.dstIp,
        dstPort: flow.dstPort,
        protocol: flow.protocol,
        mitreTechnique: flow.mitreTechnique || 'T1046',
        mitreTactic: flow.mitreTactic || 'Discovery',
        summary: `Telemetry Inspection for flow ${flow.id}: ${flow.packets} pkts, entropy ${flow.entropy}, label: ${flow.predictedLabel}.`,
        status: flow.isThreat ? 'ACTIVE' : 'INVESTIGATING',
        flowDetails: flow,
        evidence: {
          src_ip: flow.srcIp,
          dst_ip: flow.dstIp,
          src_port: flow.srcPort,
          dst_port: flow.dstPort,
          protocol: flow.protocol,
          ja3_hash: tClass === 'Malware TLS' ? 'a0e9f5d64349fb13191bc781f81f42e1' : null,
          inter_arrival_cv: tClass === 'Botnet Beaconing' ? 0.041 : null,
          dns_entropy: tClass === 'DGA/Tunneling' ? 4.2 : null,
          unidirectional_byte_bias: Number((flow.bytes / (flow.bytes + 1000)).toFixed(3)),
          packet_rate_pps: Math.round(flow.packets / Math.max(flow.durationMs / 1000, 0.001)),
          mitre_technique: flow.mitreTechnique
        }
      });
    }
  };

  const metrics: SOCMetrics = {
    totalFlowsIngested: totalFlowsCount,
    threatsDetected: detectedThreatsCount,
    threatRatePct: Number(((detectedThreatsCount / Math.max(totalFlowsCount, 1)) * 100).toFixed(1)),
    vertexAiP95LatencyMs: 8.4,
    pubSubThroughputKbps: 1420,
    bigQueryAlertsSinkCount: alerts.length + 1840,
    activeBlockedIps: blockedIps.length,
    criticalAlertsCount: alerts.filter(a => a.severity === 'CRITICAL').length
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-blue-900 selection:text-white">
      {/* Top Header & Telemetry */}
      <Header
        metrics={metrics}
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming(!isStreaming)}
        onOpenInjector={() => setIsInjectorOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Content Body */}
      <main className="flex-1 pb-16">
        {activeTab === 'soc' && (
          <LiveSocMonitor
            flows={flows}
            alerts={alerts}
            blockedIps={blockedIps}
            onSelectAlert={setSelectedAlert}
            onSelectFlow={handleSelectFlow}
            onQuickBlockIp={handleBlockIp}
            onOpenInjector={() => setIsInjectorOpen(true)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        )}

        {activeTab === 'benchmark' && <BenchmarkRunnerView />}

        {activeTab === 'code' && <ScriptExplorerView />}

        {activeTab === 'docs' && <DocumentationView />}

        {activeTab === 'pipeline' && (
          <PipelineStepsView
            steps={pipelineSteps}
            onExecuteStep={handleExecuteStep}
          />
        )}

        {activeTab === 'bigquery' && <BigQueryExplorer />}

        {activeTab === 'lab' && <FlowTesterLab />}
      </main>

      {/* Threat Alert Detail & Gemini Triage Modal */}
      <ThreatAlertModal
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onBlockIp={handleBlockIp}
        onMitigate={handleMitigateAlert}
      />

      {/* Traffic & Attack Injector Modal */}
      <TrafficInjectorModal
        isOpen={isInjectorOpen}
        onClose={() => setIsInjectorOpen(false)}
        onInject={handleInjectAttack}
      />

      {/* Gemini AI Cyber Copilot Assistant Drawer */}
      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeBlockedCount={blockedIps.length}
      />
    </div>
  );
}
