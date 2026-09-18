/**
 * Types for Cyber Threat Detection & GCP Architecture SOC
 */

export type ThreatClass =
  | 'DDoS'
  | 'Botnet Beaconing'
  | 'DGA/Tunneling'
  | 'Malware TLS'
  | 'Recon Scanning'
  | 'Data Exfiltration'
  | 'BENIGN';

export type AttackType =
  | 'BENIGN'
  | 'DDOS_SYN_FLOOD'
  | 'PORT_SCAN'
  | 'C2_BEACON'
  | 'DATA_EXFILTRATION'
  | 'BRUTE_FORCE_SSH'
  | 'DNS_TUNNELING'
  | 'MALWARE_TLS';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AlertEvidence {
  src_ip: string;
  dst_ip: string;
  src_port?: number;
  dst_port: number;
  protocol: string;
  ja3_hash?: string | null;
  ja3_fingerprint?: string | null;
  inter_arrival_cv?: number | null;
  beaconing_interval_sec?: number | null;
  dns_query?: string | null;
  dns_entropy?: number | null;
  unidirectional_byte_bias?: number | null;
  packet_rate_pps?: number | null;
  mitre_technique?: string | null;
}

/**
 * Standardized Alert Schema matching exact required specification:
 * timestamp, flow_id, threat_class, confidence, evidence
 */
export interface StandardizedAlert {
  timestamp: string;
  flow_id: string;
  threat_class: ThreatClass;
  confidence: number;
  severity: SeverityLevel;
  evidence: AlertEvidence;
  status: 'ACTIVE' | 'INVESTIGATING' | 'MITIGATED' | 'BLOCKED' | 'DISMISSED';
  geminiAnalysis?: GeminiAnalysis;
}

export interface NetworkFlow {
  id: string;
  timestamp: string;
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  packets: number;
  bytes: number;
  durationMs: number;
  tcpFlags: string[]; // SYN, ACK, FIN, RST, PSH, URG
  entropy: number; // 0.0 - 8.0 (Shannon entropy)
  // Vertex AI inference results:
  predictedLabel: AttackType;
  threatClass?: ThreatClass;
  confidence: number; // 0.0 - 1.0
  anomalyScore: number; // 0.0 - 100.0
  severity: SeverityLevel;
  mitreTechnique?: string;
  mitreTactic?: string;
  isThreat: boolean;
  evidence?: AlertEvidence;
}

export interface ThreatAlert {
  alertId: string;
  timestamp: string;
  flowId: string;
  threatType: AttackType;
  threatClass?: ThreatClass;
  severity: SeverityLevel;
  confidence: number;
  srcIp: string;
  dstIp: string;
  dstPort: number;
  protocol: string;
  mitreTechnique: string;
  mitreTactic: string;
  summary: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'MITIGATED' | 'BLOCKED' | 'DISMISSED';
  flowDetails?: NetworkFlow;
  evidence?: AlertEvidence;
  geminiAnalysis?: GeminiAnalysis;
}

export interface GeminiAnalysis {
  incidentSummary: string;
  mitreMapping: {
    tactic: string;
    technique: string;
    subTechnique?: string;
    description: string;
  };
  threatActorProfile: string;
  blastRadius: string;
  recommendedPlaybook: {
    stepNumber: number;
    action: string;
    command?: string;
    rationale: string;
  }[];
  gcloudMitigationRule?: string;
}

export interface PipelineStep {
  id: number;
  title: string;
  subtitle: string;
  commandSnippet: string;
  status: 'idle' | 'running' | 'healthy' | 'warning' | 'error';
  lastRun?: string;
  metrics: Record<string, string | number>;
  details: string;
  resourceId: string;
}

export interface BigQueryRow {
  flow_id: string;
  timestamp: string;
  src_ip: string;
  dst_ip: string;
  protocol: string;
  bytes: number;
  packets: number;
  entropy: number;
  threat_type: string;
  confidence: number;
  mitre_id: string;
  severity: string;
}

export interface SOCMetrics {
  totalFlowsIngested: number;
  threatsDetected: number;
  threatRatePct: number;
  vertexAiP95LatencyMs: number;
  pubSubThroughputKbps: number;
  bigQueryAlertsSinkCount: number;
  activeBlockedIps: number;
  criticalAlertsCount: number;
  sustainedMbps?: number;
}

export interface BenchmarkReport {
  target_flows_per_sec: number;
  actual_flows_per_sec: number;
  sustained_mbps: number;
  total_flows_processed: number;
  total_threat_alerts_detected: number;
  threat_detection_pct: number;
  duration_seconds: number;
  latencies_ms: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
  };
}
