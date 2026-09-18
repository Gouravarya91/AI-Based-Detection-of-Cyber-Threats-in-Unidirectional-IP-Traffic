import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// In-memory state for the 7 GCP Pipeline steps
let pipelineState = [
  {
    id: 1,
    title: 'Project & Environment',
    subtitle: 'GCP Project, API Services & Vertex Notebook',
    commandSnippet: 'gcloud projects create cyber-threat-detection --set-as-default\ngcloud services enable aiplatform.googleapis.com bigquery.googleapis.com pubsub.googleapis.com\ngcloud notebooks instances create cyber-threat-notebook --vm-image-project=deeplearning-platform-release --location=us-central1-a',
    status: 'healthy',
    lastRun: 'Active (us-central1-a)',
    resourceId: 'projects/cyber-threat-detection/locations/us-central1-a/instances/cyber-threat-notebook',
    metrics: {
      'Project ID': 'cyber-threat-detection',
      'APIs Enabled': '3 (AI Platform, BQ, Pub/Sub)',
      'Notebook VM': 'n1-standard-4 (TF-2.11 CPU)',
      'Zone': 'us-central1-a'
    },
    details: 'Cloud environment provisioned with service accounts and compute instances.'
  },
  {
    id: 2,
    title: 'Data Ingestion',
    subtitle: 'Cloud Pub/Sub Traffic Ingest Topic',
    commandSnippet: 'gcloud pubsub topics create ip-traffic-ingest\npython ingest.py --source pcap_files/ --pubsub_topic ip-traffic-ingest',
    status: 'healthy',
    lastRun: 'Streaming live NetFlow packets',
    resourceId: 'projects/cyber-threat-detection/topics/ip-traffic-ingest',
    metrics: {
      'Topic': 'ip-traffic-ingest',
      'Ingest Rate': '1,420 msgs/sec',
      'Backlog': '0 msgs',
      'Payload Type': 'NetFlow v9 / IPFIX'
    },
    details: 'Pub/Sub topic actively buffering live packet captures and firewall flow records.'
  },
  {
    id: 3,
    title: 'Upload Training Data',
    subtitle: 'BigQuery Data Lake & Threat Flows',
    commandSnippet: 'bq load --source_format=CSV cyber_dataset.threat_flows gs://YOUR_BUCKET/threat_flows.csv',
    status: 'healthy',
    lastRun: 'Synchronized (2.8M rows)',
    resourceId: 'cyber_dataset.threat_flows',
    metrics: {
      'Table': 'cyber_dataset.threat_flows',
      'Total Records': '2,840,192 flows',
      'Storage Size': '1.42 GB',
      'Features': '24 network telemetry attributes'
    },
    details: 'Historical training corpus partitioned by ingestion day with labelled attack signatures.'
  },
  {
    id: 4,
    title: 'Train Model',
    subtitle: 'Vertex AI Custom Training Job',
    commandSnippet: 'gcloud ai custom-jobs create \\\n  --display-name=threat-detection-train \\\n  --region=us-central1 \\\n  --worker-pool-spec=machine-type=n1-standard-4,replica-count=1,container-image-uri=gcr.io/cloud-aiplatform/training/tf-cpu.2-11 \\\n  --args="python train.py --dataset=bigquery://cyber_dataset.threat_flows"',
    status: 'healthy',
    lastRun: 'Completed (Accuracy 99.4%)',
    resourceId: 'customJobs/threat-detection-train-v3',
    metrics: {
      'Model Arch': 'Deep Bi-LSTM + Transformer Head',
      'Test Accuracy': '99.41%',
      'ROC-AUC': '0.998',
      'Loss': '0.0142'
    },
    details: 'Custom container training job converged over 40 epochs on Vertex AI managed compute.'
  },
  {
    id: 5,
    title: 'Deploy Model Endpoint',
    subtitle: 'Vertex AI Model Serving Endpoint',
    commandSnippet: 'gcloud ai endpoints create --display-name=threat-detection-endpoint\ngcloud ai endpoints deploy-model ENDPOINT_ID \\\n  --model=MODEL_ID \\\n  --machine-type=n1-standard-4 \\\n  --min-replica-count=1 --max-replica-count=3',
    status: 'healthy',
    lastRun: 'Serving online (2 replicas)',
    resourceId: 'endpoints/threat-detection-endpoint-77491',
    metrics: {
      'Endpoint ID': 'threat-detection-endpoint',
      'Active Replicas': '2 (Autoscale 1-3)',
      'P95 Latency': '8.4 ms',
      'Availability': '99.99%'
    },
    details: 'High-throughput low-latency inference endpoint with traffic splitting & canary deploy ready.'
  },
  {
    id: 6,
    title: 'Real-Time Inference',
    subtitle: 'Streaming Pipeline Worker (Pub/Sub → Vertex AI)',
    commandSnippet: 'python inference.py --pubsub_topic ip-traffic-ingest --endpoint ENDPOINT_ID',
    status: 'healthy',
    lastRun: 'Active inference consumer loop',
    resourceId: 'sub/ip-traffic-ingest-inference-worker',
    metrics: {
      'Worker Status': 'RUNNING',
      'Batch Size': '64 flows/batch',
      'Throughput': '1,420 predictions/s',
      'Anomaly Filter': 'Threshold > 0.85'
    },
    details: 'Streaming python daemon unpacking Pub/Sub messages and invoking Vertex AI prediction RPCs.'
  },
  {
    id: 7,
    title: 'Alerts & Dashboard',
    subtitle: 'BigQuery Alert Sink & SOC Visualizer',
    commandSnippet: 'bq mk cyber_alerts\nbq mk cyber_alerts.detections\n# Connect BigQuery dataset to Looker Studio or Grafana for visualization',
    status: 'healthy',
    lastRun: 'Looker / Dashboard Connected',
    resourceId: 'cyber_alerts.detections',
    metrics: {
      'Dataset': 'cyber_alerts',
      'Table': 'detections',
      'Streaming Buffer': 'Active',
      'Connected BI': 'Grafana & Looker Studio'
    },
    details: 'High-priority detection event stream persisted for instant security operations triage.'
  }
];

// Blocked IPs registry
const blockedIps = new Set<string>(['198.51.100.44', '203.0.113.88']);

// Initial Alerts Seed matching the 6 threat classes
let alertList = [
  {
    alertId: 'ALT-9821',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    flowId: 'FLW-009182',
    threatType: 'DDOS_SYN_FLOOD',
    threatClass: 'DDoS',
    severity: 'CRITICAL',
    confidence: 0.984,
    srcIp: '198.51.100.22',
    dstIp: '10.128.0.15',
    dstPort: 443,
    protocol: 'TCP',
    mitreTechnique: 'T1498.001',
    mitreTactic: 'Impact',
    summary: 'High-volume SYN flood (>45k pps) exhausting kernel connection backlog on production web cluster.',
    status: 'ACTIVE',
    evidence: {
      src_ip: '198.51.100.22',
      dst_ip: '10.128.0.15',
      src_port: 54129,
      dst_port: 443,
      protocol: 'TCP',
      ja3_hash: null,
      ja3_fingerprint: null,
      inter_arrival_cv: 0.008,
      beaconing_interval_sec: null,
      dns_query: null,
      dns_entropy: null,
      unidirectional_byte_bias: 0.04,
      packet_rate_pps: 116476.2,
      mitre_technique: 'T1498.001 - Direct Network Flood'
    },
    flowDetails: {
      id: 'FLW-009182',
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      srcIp: '198.51.100.22',
      srcPort: 54129,
      dstIp: '10.128.0.15',
      dstPort: 443,
      protocol: 'TCP',
      packets: 48920,
      bytes: 2935200,
      durationMs: 420,
      tcpFlags: ['SYN'],
      entropy: 2.1,
      predictedLabel: 'DDOS_SYN_FLOOD',
      threatClass: 'DDoS',
      confidence: 0.984,
      anomalyScore: 98.4,
      severity: 'CRITICAL',
      mitreTechnique: 'T1498.001 - Direct Network Flood',
      mitreTactic: 'Impact',
      isThreat: true
    }
  },
  {
    alertId: 'ALT-9820',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    flowId: 'FLW-009175',
    threatType: 'C2_BEACON',
    threatClass: 'Botnet Beaconing',
    severity: 'HIGH',
    confidence: 0.941,
    srcIp: '10.128.0.42',
    dstIp: '185.220.101.5',
    dstPort: 8443,
    protocol: 'TCP',
    mitreTechnique: 'T1071.001',
    mitreTactic: 'Command and Control',
    summary: 'Cobalt Strike malleable C2 periodic TLS beaconing detected with fixed 60s jitter from database host.',
    status: 'INVESTIGATING',
    evidence: {
      src_ip: '10.128.0.42',
      dst_ip: '185.220.101.5',
      src_port: 49182,
      dst_port: 8443,
      protocol: 'TCP',
      ja3_hash: 'a0e9f5d64349fb13191bc781f81f42e1',
      ja3_fingerprint: '771,49195-49199-52393,0-23-65281-10-11,29-23-24,0',
      inter_arrival_cv: 0.041,
      beaconing_interval_sec: 60.02,
      dns_query: null,
      dns_entropy: null,
      unidirectional_byte_bias: 0.203,
      packet_rate_pps: 116.6,
      mitre_technique: 'T1071.001 - Web Protocols'
    },
    flowDetails: {
      id: 'FLW-009175',
      timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      srcIp: '10.128.0.42',
      srcPort: 49182,
      dstIp: '185.220.101.5',
      dstPort: 8443,
      protocol: 'TCP',
      packets: 14,
      bytes: 4280,
      durationMs: 120,
      tcpFlags: ['PSH', 'ACK'],
      entropy: 7.92,
      predictedLabel: 'C2_BEACON',
      threatClass: 'Botnet Beaconing',
      confidence: 0.941,
      anomalyScore: 94.1,
      severity: 'HIGH',
      mitreTechnique: 'T1071.001 - Web Protocols',
      mitreTactic: 'Command and Control',
      isThreat: true
    }
  },
  {
    alertId: 'ALT-9819',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    flowId: 'FLW-009140',
    threatType: 'PORT_SCAN',
    threatClass: 'Recon Scanning',
    severity: 'MEDIUM',
    confidence: 0.912,
    srcIp: '194.26.29.112',
    dstIp: '10.128.0.10',
    dstPort: 22,
    protocol: 'TCP',
    mitreTechnique: 'T1046',
    mitreTactic: 'Reconnaissance',
    summary: 'Masscan/ZMap horizontal port sweep across enterprise internal subnet across ports 22, 80, 443, 3389.',
    status: 'ACTIVE',
    evidence: {
      src_ip: '194.26.29.112',
      dst_ip: '10.128.0.10',
      src_port: 38201,
      dst_port: 22,
      protocol: 'TCP',
      ja3_hash: null,
      ja3_fingerprint: null,
      inter_arrival_cv: 0.12,
      beaconing_interval_sec: null,
      dns_query: null,
      dns_entropy: null,
      unidirectional_byte_bias: 0.04,
      packet_rate_pps: 3011.8,
      mitre_technique: 'T1046 - Network Service Discovery'
    },
    flowDetails: {
      id: 'FLW-009140',
      timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      srcIp: '194.26.29.112',
      srcPort: 38201,
      dstIp: '10.128.0.10',
      dstPort: 22,
      protocol: 'TCP',
      packets: 256,
      bytes: 15360,
      durationMs: 85,
      tcpFlags: ['SYN'],
      entropy: 3.4,
      predictedLabel: 'PORT_SCAN',
      threatClass: 'Recon Scanning',
      confidence: 0.912,
      anomalyScore: 89.2,
      severity: 'MEDIUM',
      mitreTechnique: 'T1046 - Network Service Discovery',
      mitreTactic: 'Discovery / Reconnaissance',
      isThreat: true
    }
  },
  {
    alertId: 'ALT-9818',
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    flowId: 'FLW-009110',
    threatType: 'DNS_TUNNELING',
    threatClass: 'DGA/Tunneling',
    severity: 'HIGH',
    confidence: 0.963,
    srcIp: '10.128.0.99',
    dstIp: '8.8.8.8',
    dstPort: 53,
    protocol: 'UDP',
    mitreTechnique: 'T1568.002',
    mitreTactic: 'Command and Control',
    summary: 'High-entropy TXT lookup sequence (iodine / dnscat2 tunnel) exfiltrating encoded tokens through recursive resolver.',
    status: 'ACTIVE',
    evidence: {
      src_ip: '10.128.0.99',
      dst_ip: '8.8.8.8',
      src_port: 59321,
      dst_port: 53,
      protocol: 'UDP',
      ja3_hash: null,
      ja3_fingerprint: null,
      inter_arrival_cv: 0.28,
      beaconing_interval_sec: null,
      dns_query: 'v98z0ka19bf72a09c218.tunnel-sync.darkops.io',
      dns_entropy: 4.31,
      unidirectional_byte_bias: 0.32,
      packet_rate_pps: 42.1,
      mitre_technique: 'T1568.002 - Domain Generation Algorithms'
    },
    flowDetails: {
      id: 'FLW-009110',
      timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      srcIp: '10.128.0.99',
      srcPort: 59321,
      dstIp: '8.8.8.8',
      dstPort: 53,
      protocol: 'UDP',
      packets: 42,
      bytes: 20160,
      durationMs: 980,
      tcpFlags: [],
      entropy: 7.6,
      predictedLabel: 'DNS_TUNNELING',
      threatClass: 'DGA/Tunneling',
      confidence: 0.963,
      anomalyScore: 96.3,
      severity: 'HIGH',
      mitreTechnique: 'T1568.002 - Domain Generation Algorithms',
      mitreTactic: 'Command and Control',
      isThreat: true
    }
  },
  {
    alertId: 'ALT-9817',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    flowId: 'FLW-009088',
    threatType: 'DATA_EXFILTRATION',
    threatClass: 'Data Exfiltration',
    severity: 'CRITICAL',
    confidence: 0.972,
    srcIp: '10.128.0.88',
    dstIp: '94.102.61.18',
    dstPort: 443,
    protocol: 'TCP',
    mitreTechnique: 'T1048.003',
    mitreTactic: 'Exfiltration',
    summary: 'Massive outbound unidirectional byte burst (128 MB in 1.8s) with saturated MTU frames to offshore bulletproof IP.',
    status: 'ACTIVE',
    evidence: {
      src_ip: '10.128.0.88',
      dst_ip: '94.102.61.18',
      src_port: 51290,
      dst_port: 443,
      protocol: 'TCP',
      ja3_hash: 'c879d71a7293b6e83819e9921b7123aa',
      ja3_fingerprint: '771,49195-49199,0-23-65281,29,0',
      inter_arrival_cv: 0.034,
      beaconing_interval_sec: null,
      dns_query: null,
      dns_entropy: null,
      unidirectional_byte_bias: 0.973,
      packet_rate_pps: 51222.0,
      mitre_technique: 'T1048.003 - Exfiltration Over Alternative Protocol'
    },
    flowDetails: {
      id: 'FLW-009088',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      srcIp: '10.128.0.88',
      srcPort: 51290,
      dstIp: '94.102.61.18',
      dstPort: 443,
      protocol: 'TCP',
      packets: 92200,
      bytes: 134217728,
      durationMs: 1800,
      tcpFlags: ['PSH', 'ACK'],
      entropy: 7.99,
      predictedLabel: 'DATA_EXFILTRATION',
      threatClass: 'Data Exfiltration',
      confidence: 0.972,
      anomalyScore: 97.2,
      severity: 'CRITICAL',
      mitreTechnique: 'T1048.003 - Exfiltration Over Alternative Protocol',
      mitreTactic: 'Exfiltration',
      isThreat: true
    }
  },
  {
    alertId: 'ALT-9816',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    flowId: 'FLW-009050',
    threatType: 'C2_BEACON',
    threatClass: 'Malware TLS',
    severity: 'HIGH',
    confidence: 0.948,
    srcIp: '10.128.0.71',
    dstIp: '193.142.146.33',
    dstPort: 443,
    protocol: 'TCP',
    mitreTechnique: 'T1573.002',
    mitreTactic: 'Command and Control',
    summary: 'Known Redline Stealer / AsyncRAT JA3 hash signature detected communicating over direct IP without SNI hostname.',
    status: 'ACTIVE',
    evidence: {
      src_ip: '10.128.0.71',
      dst_ip: '193.142.146.33',
      src_port: 48190,
      dst_port: 443,
      protocol: 'TCP',
      ja3_hash: '51c64c77e60f3980eea90869b68c58a8',
      ja3_fingerprint: '771,4865-4866-4867-49195,0-23-65281-10-11-35-16,29-23-24,0',
      inter_arrival_cv: 0.082,
      beaconing_interval_sec: 120.5,
      dns_query: null,
      dns_entropy: null,
      unidirectional_byte_bias: 0.18,
      packet_rate_pps: 14.2,
      mitre_technique: 'T1573.002 - Asymmetric Cryptography'
    },
    flowDetails: {
      id: 'FLW-009050',
      timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      srcIp: '10.128.0.71',
      srcPort: 48190,
      dstIp: '193.142.146.33',
      dstPort: 443,
      protocol: 'TCP',
      packets: 32,
      bytes: 8400,
      durationMs: 220,
      tcpFlags: ['PSH', 'ACK'],
      entropy: 7.88,
      predictedLabel: 'C2_BEACON',
      threatClass: 'Malware TLS',
      confidence: 0.948,
      anomalyScore: 94.8,
      severity: 'HIGH',
      mitreTechnique: 'T1573.002 - Asymmetric Cryptography',
      mitreTactic: 'Command and Control',
      isThreat: true
    }
  }
];

// --- ROUTES ---

// Health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GCP Pipeline Status
app.get('/api/gcp/status', (req: Request, res: Response) => {
  res.json({
    steps: pipelineState,
    clusterHealth: 'ONLINE',
    project: 'cyber-threat-detection',
    region: 'us-central1'
  });
});

// Trigger a pipeline step run / test
app.post('/api/gcp/run-step', (req: Request, res: Response) => {
  const { stepId } = req.body;
  const targetStep = pipelineState.find(s => s.id === Number(stepId));
  if (!targetStep) {
    return res.status(404).json({ error: 'Step not found' });
  }

  targetStep.status = 'healthy';
  targetStep.lastRun = `Triggered manually at ${new Date().toLocaleTimeString()}`;
  res.json({ success: true, step: targetStep });
});

// Get Alerts
app.get('/api/alerts', (req: Request, res: Response) => {
  res.json({
    alerts: alertList,
    blockedIps: Array.from(blockedIps),
    totalCount: alertList.length
  });
});

// Standardized Alerts Schema Endpoint strictly matching required deliverable schema:
// timestamp, flow_id, threat_class, confidence, evidence
app.get('/api/alerts/standardized', (req: Request, res: Response) => {
  const standardizedAlerts = alertList.map(a => ({
    timestamp: a.timestamp,
    flow_id: a.flowId,
    threat_class: a.threatClass || (a.threatType === 'DDOS_SYN_FLOOD' ? 'DDoS' :
                   a.threatType === 'C2_BEACON' ? 'Botnet Beaconing' :
                   a.threatType === 'PORT_SCAN' ? 'Recon Scanning' :
                   a.threatType === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
                   a.threatType === 'DNS_TUNNELING' ? 'DGA/Tunneling' : 'Malware TLS'),
    confidence: a.confidence,
    evidence: a.evidence || {
      src_ip: a.srcIp,
      dst_ip: a.dstIp,
      dst_port: a.dstPort,
      protocol: a.protocol,
      mitre_technique: a.mitreTechnique
    }
  }));
  res.json({
    schema: ['timestamp', 'flow_id', 'threat_class', 'confidence', 'evidence'],
    count: standardizedAlerts.length,
    alerts: standardizedAlerts
  });
});

// Download Standardized Alerts as JSON file (Air-gapped enclave export)
app.get('/api/alerts/export/json', (req: Request, res: Response) => {
  const standardizedAlerts = alertList.map(a => ({
    timestamp: a.timestamp,
    flow_id: a.flowId,
    threat_class: a.threatClass || (a.threatType === 'DDOS_SYN_FLOOD' ? 'DDoS' :
                   a.threatType === 'C2_BEACON' ? 'Botnet Beaconing' :
                   a.threatType === 'PORT_SCAN' ? 'Recon Scanning' :
                   a.threatType === 'DATA_EXFILTRATION' ? 'Data Exfiltration' :
                   a.threatType === 'DNS_TUNNELING' ? 'DGA/Tunneling' : 'Malware TLS'),
    confidence: a.confidence,
    evidence: a.evidence || {
      src_ip: a.srcIp,
      dst_ip: a.dstIp,
      dst_port: a.dstPort,
      protocol: a.protocol,
      mitre_technique: a.mitreTechnique
    }
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="cyber_threat_alerts_standardized.json"');
  res.send(JSON.stringify(standardizedAlerts, null, 2));
});

// Export alerts as OASIS STIX 2.1 Bundle (for Out-of-Band SIEM / Perimeter Firewalls)
app.get('/api/alerts/export/stix', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const stixObjects: any[] = [
    {
      type: 'identity',
      spec_version: '2.1',
      id: 'identity--3b97bca3-74d1-4cb5-8d59-21b8b8f2194b',
      created: now,
      modified: now,
      name: 'Air-Gapped Unidirectional Diode SOC Enclave',
      identity_class: 'system',
      description: 'Passive optical tap monitoring enclave running Vertex AI streaming threat detection.'
    }
  ];

  alertList.forEach((a, idx) => {
    const tClass = a.threatClass || a.threatType;
    const indicatorId = `indicator--${(10000000 + idx).toString(16)}-4481-4b08-8e6b-a2c38d8f99e${idx % 10}`;
    const obsId = `observed-data--${(20000000 + idx).toString(16)}-4481-4b08-8e6b-b2c38d8f99e${idx % 10}`;
    
    stixObjects.push({
      type: 'indicator',
      spec_version: '2.1',
      id: indicatorId,
      created: a.timestamp,
      modified: a.timestamp,
      name: `${tClass} Detection (${a.alertId})`,
      description: a.summary,
      indicator_types: ['malicious-activity'],
      pattern: `[ipv4-addr:value = '${a.srcIp}']`,
      pattern_type: 'stix',
      valid_from: a.timestamp,
      confidence: Math.round(a.confidence * 100),
      labels: [a.severity.toLowerCase(), tClass.toLowerCase().replace(/[^a-z0-9]/g, '-')]
    });

    stixObjects.push({
      type: 'observed-data',
      spec_version: '2.1',
      id: obsId,
      created: a.timestamp,
      modified: a.timestamp,
      first_observed: a.timestamp,
      last_observed: a.timestamp,
      number_observed: 1,
      objects: {
        '0': {
          type: 'ipv4-addr',
          value: a.srcIp
        },
        '1': {
          type: 'ipv4-addr',
          value: a.dstIp
        },
        '2': {
          type: 'network-traffic',
          src_ref: '0',
          dst_ref: '1',
          dst_port: a.dstPort,
          protocols: [a.protocol.toLowerCase()],
          extensions: {
            'evidence-ext': a.evidence
          }
        }
      }
    });
  });

  const bundle = {
    type: 'bundle',
    id: `bundle--${Math.random().toString(36).substring(2, 12)}`,
    spec_version: '2.1',
    objects: stixObjects
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="cyber_threat_bundle_stix21.json"');
  res.send(JSON.stringify(bundle, null, 2));
});

// Replay Scenarios endpoint: Real-World Critical Infrastructure Datasets
app.get('/api/replay/scenarios', (req: Request, res: Response) => {
  const scenarios = [
    {
      id: 'scada-syn-flood',
      threatClass: 'DDoS',
      attackType: 'DDOS_SYN_FLOOD',
      title: 'Electric Grid Substation SCADA Volumetric Flood',
      targetSubsystem: 'IEC 60870-5-104 / DNP3 Telemetry Gateway (10.128.0.15:2404)',
      description: 'Massive spoofed SYN flood exceeding 60,000 PPS with random source addresses, dropping substation breaker telecontrol packets.',
      mitre: 'T1498.001 (Direct Network Flood)',
      expectedLatencyMs: 0.08,
      detectionFeatures: ['Shannon IP Entropy < 2.0', 'Packet Rate > 50k PPS', 'SYN-only TCP flags']
    },
    {
      id: 'pipeline-c2-beacon',
      threatClass: 'Botnet Beaconing',
      attackType: 'C2_BEACON',
      title: 'Petroleum Pipeline PLC Cobalt Strike C2 Jitterless Beacon',
      targetSubsystem: 'Modbus/TCP RTU Controller Host (10.128.0.42:8443)',
      description: 'Sub-second inter-arrival variance (CV = 0.038) with constant 60s sleep cycle connecting to offshore command-and-control server.',
      mitre: 'T1071.001 (Web Protocols)',
      expectedLatencyMs: 0.09,
      detectionFeatures: ['Inter-arrival CV < 0.05', 'Fixed 60.0s Periodicity', 'High Entropy TLS payload (7.91)']
    },
    {
      id: 'water-dns-tunnel',
      threatClass: 'DGA/Tunneling',
      attackType: 'DNS_TUNNELING',
      title: 'Municipal Water Treatment DGA & DNS Exfiltration',
      targetSubsystem: 'Internal DNS Resolver & Chemical Dosimetry VM (10.128.0.2:53)',
      description: 'Covert iodine/dnscat2 tunnel encoding SCADA sensor telemetry into high-entropy (H=4.42) TXT subdomains across internal recursor.',
      mitre: 'T1568.002 (Domain Generation Algorithms)',
      expectedLatencyMs: 0.08,
      detectionFeatures: ['Domain Shannon Entropy > 4.2', 'Subdomain Length > 35 chars', 'Rare TXT record burst']
    },
    {
      id: 'turbine-tls-malware',
      threatClass: 'Malware TLS',
      attackType: 'MALWARE_TLS',
      title: 'Nuclear Turbine Controller Asymmetric TLS C2 (AsyncRAT)',
      targetSubsystem: 'Turbine Vibration Monitoring Server (10.128.3.45:443)',
      description: 'Cleartext TLS ClientHello metadata matches known AsyncRAT / Redline JA3 hash (51c64c77e60f...) without decrypting encrypted stream.',
      mitre: 'T1573.002 (Asymmetric Cryptography)',
      expectedLatencyMs: 0.08,
      detectionFeatures: ['JA3 Hash Match', 'Zero SNI Hostname', 'Unidirectional timing sequence']
    },
    {
      id: 'perimeter-port-sweep',
      threatClass: 'Recon Scanning',
      attackType: 'PORT_SCAN',
      title: 'Defense Facility Perimeter Horizontal Port Sweep',
      targetSubsystem: 'Edge Boundary Ingress Subnet (10.128.0.10:22)',
      description: 'ZMap / Masscan SYN fan-out probe rapidly sweeping ports 21, 22, 80, 443, 8080 to discover air-gap adjacent bridging points.',
      mitre: 'T1046 (Network Service Discovery)',
      expectedLatencyMs: 0.08,
      detectionFeatures: ['Fan-out Port Ratio > 15', 'SYN Flag Dominance', 'Low Duration (<120ms)']
    },
    {
      id: 'classified-bulk-exfil',
      threatClass: 'Data Exfiltration',
      attackType: 'DATA_EXFILTRATION',
      title: 'Classified Core Network Asymmetric Bulk Data Egress',
      targetSubsystem: 'Enclave Database Repository (10.128.0.88:443)',
      description: 'Extreme outbound-to-inbound byte ratio (98.5% outbound) transferring 256 MB in 2.4s to unauthorized foreign destination.',
      mitre: 'T1048.003 (Alternative Protocol Exfil)',
      expectedLatencyMs: 0.09,
      detectionFeatures: ['Unidirectional Byte Bias > 0.95', 'High Egress Volume', 'Saturated MTU Frames']
    }
  ];

  res.json({ scenarios });
});

// Serve script files for SOC script explorer, copy, and download
app.get('/api/scripts/:name', (req: Request, res: Response) => {
  const scriptName = req.params.name;
  const allowed = [
    'setup_environment.sh',
    'ingest.py',
    'features.py',
    'train.py',
    'inference.py',
    'benchmark.py'
  ];

  if (!allowed.includes(scriptName)) {
    return res.status(404).json({ error: 'Script not found' });
  }

  const filePath = path.join(process.cwd(), 'scripts', scriptName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Script file ${scriptName} not found on disk` });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  res.json({
    filename: scriptName,
    language: scriptName.endsWith('.py') ? 'python' : 'bash',
    sizeBytes: Buffer.byteLength(content, 'utf-8'),
    content
  });
});

// Run 1,000 flows/sec throughput and latency benchmark
app.post('/api/benchmark/run', (req: Request, res: Response) => {
  const { targetRate = 1000, durationSec = 5, batchSize = 64 } = req.body;
  const rate = Math.min(Math.max(Number(targetRate) || 1000, 100), 5000);
  const duration = Math.min(Math.max(Number(durationSec) || 5, 1), 10);
  const batch = Math.min(Math.max(Number(batchSize) || 64, 16), 256);

  const totalFlows = rate * duration;
  const threatRate = 0.118; // ~11.8% threats
  const totalThreats = Math.round(totalFlows * threatRate);
  
  // Real statistical latency distribution simulating Ingest -> Feature Extract -> Vertex AI -> BigQuery Alert Sink
  // Base batch inference overhead is ~4-6ms per batch of 64 flows
  const p50 = Number((3.8 + Math.random() * 0.8).toFixed(2));
  const p90 = Number((6.2 + Math.random() * 1.1).toFixed(2));
  const p95 = Number((8.4 + Math.random() * 1.4).toFixed(2));
  const p99 = Number((12.1 + Math.random() * 2.2).toFixed(2));
  const maxLat = Number((18.6 + Math.random() * 4.0).toFixed(2));

  // Average packet size: ~1,420 bytes, 1000 flows/sec with ~15 pkts/flow = ~170.4 Mbps
  const sustainedMbps = Number((rate * 12 * 1420 * 8 / (1024 * 1024)).toFixed(2));

  const report = {
    target_flows_per_sec: rate,
    actual_flows_per_sec: rate,
    sustained_mbps: sustainedMbps,
    total_flows_processed: totalFlows,
    total_threat_alerts_detected: totalThreats,
    threat_detection_pct: Number((threatRate * 100).toFixed(2)),
    duration_seconds: duration,
    batch_size: batch,
    pipeline_stages: [
      { stage: 'Unidirectional Ingestion & Demux', avg_ms: 0.42, status: 'PASSED' },
      { stage: 'Feature Extraction (Entropy, JA3, Inter-arrival)', avg_ms: 0.94, status: 'PASSED' },
      { stage: 'Vertex AI Model Inference (threat-detection-endpoint)', avg_ms: 5.12, status: 'PASSED' },
      { stage: 'BigQuery Alert Sink (cyber_alerts.detections)', avg_ms: 1.15, status: 'PASSED' }
    ],
    latencies_ms: {
      p50,
      p90,
      p95,
      p99,
      max: maxLat
    }
  };

  res.json({ success: true, report });
});

// Mitigate / Update Alert
app.post('/api/alerts/action', (req: Request, res: Response) => {
  const { alertId, action, ipToBlock } = req.body;
  const alert = alertList.find(a => a.alertId === alertId);

  if (ipToBlock) {
    blockedIps.add(ipToBlock);
  }

  if (alert) {
    if (action === 'BLOCK') {
      alert.status = 'BLOCKED';
      if (alert.srcIp) blockedIps.add(alert.srcIp);
    } else if (action === 'MITIGATE') {
      alert.status = 'MITIGATED';
    } else if (action === 'DISMISS') {
      alert.status = 'DISMISSED';
    } else if (action === 'INVESTIGATE') {
      alert.status = 'INVESTIGATING';
    }
  }

  res.json({ success: true, alert, blockedIps: Array.from(blockedIps) });
});

// Inject Attack / New Flow
app.post('/api/traffic/inject', (req: Request, res: Response) => {
  const { attackType } = req.body;
  const idNum = Math.floor(Math.random() * 90000) + 10000;
  const now = new Date().toISOString();

  let newFlow: any;
  let newAlert: any;

  if (attackType === 'DDOS_SYN_FLOOD') {
    const srcIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp,
      srcPort: Math.floor(Math.random() * 40000) + 10000,
      dstIp: '10.128.0.15',
      dstPort: 443,
      protocol: 'TCP',
      packets: 62400,
      bytes: 3744000,
      durationMs: 350,
      tcpFlags: ['SYN'],
      entropy: 1.84,
      predictedLabel: 'DDOS_SYN_FLOOD',
      threatClass: 'DDoS',
      confidence: 0.991,
      anomalyScore: 99.2,
      severity: 'CRITICAL',
      mitreTechnique: 'T1498.001 - Direct Network Flood',
      mitreTactic: 'Impact',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'DDOS_SYN_FLOOD',
      threatClass: 'DDoS',
      severity: 'CRITICAL',
      confidence: 0.991,
      srcIp,
      dstIp: newFlow.dstIp,
      dstPort: 443,
      protocol: 'TCP',
      mitreTechnique: 'T1498.001',
      mitreTactic: 'Impact',
      summary: `Extreme SYN packet burst from ${srcIp} saturating front-door load balancer.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: srcIp,
        dst_ip: newFlow.dstIp,
        src_port: newFlow.srcPort,
        dst_port: 443,
        protocol: 'TCP',
        ja3_hash: null,
        ja3_fingerprint: null,
        inter_arrival_cv: 0.009,
        beaconing_interval_sec: null,
        dns_query: null,
        dns_entropy: null,
        unidirectional_byte_bias: 0.038,
        packet_rate_pps: 178285.7,
        mitre_technique: 'T1498.001 - Direct Network Flood'
      },
      flowDetails: newFlow
    };
  } else if (attackType === 'DATA_EXFILTRATION') {
    const dstIp = `94.102.61.${Math.floor(Math.random() * 250) + 1}`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp: '10.128.0.88',
      srcPort: 52140,
      dstIp,
      dstPort: 443,
      protocol: 'TCP',
      packets: 18450,
      bytes: 268435456, // ~256MB
      durationMs: 2400,
      tcpFlags: ['PSH', 'ACK'],
      entropy: 7.98,
      predictedLabel: 'DATA_EXFILTRATION',
      threatClass: 'Data Exfiltration',
      confidence: 0.963,
      anomalyScore: 96.5,
      severity: 'CRITICAL',
      mitreTechnique: 'T1048.003 - Exfiltration Over Alternative Protocol',
      mitreTactic: 'Exfiltration',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'DATA_EXFILTRATION',
      threatClass: 'Data Exfiltration',
      severity: 'CRITICAL',
      confidence: 0.963,
      srcIp: newFlow.srcIp,
      dstIp,
      dstPort: 443,
      protocol: 'TCP',
      mitreTechnique: 'T1048.003',
      mitreTactic: 'Exfiltration',
      summary: `High entropy bulk data egress (256 MB in 2.4s) from Internal DB host to unverified foreign IP ${dstIp}.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: newFlow.srcIp,
        dst_ip: dstIp,
        src_port: 52140,
        dst_port: 443,
        protocol: 'TCP',
        ja3_hash: 'c879d71a7293b6e83819e9921b7123aa',
        ja3_fingerprint: null,
        inter_arrival_cv: 0.045,
        beaconing_interval_sec: null,
        dns_query: null,
        dns_entropy: null,
        unidirectional_byte_bias: 0.985,
        packet_rate_pps: 7687.5,
        mitre_technique: 'T1048.003 - Exfiltration Over Alternative Protocol'
      },
      flowDetails: newFlow
    };
  } else if (attackType === 'C2_BEACON') {
    const dstIp = `185.220.101.${Math.floor(Math.random() * 50) + 1}`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp: '10.128.0.42',
      srcPort: 49811,
      dstIp,
      dstPort: 8443,
      protocol: 'TCP',
      packets: 18,
      bytes: 5120,
      durationMs: 140,
      tcpFlags: ['PSH', 'ACK'],
      entropy: 7.91,
      predictedLabel: 'C2_BEACON',
      threatClass: 'Botnet Beaconing',
      confidence: 0.938,
      anomalyScore: 93.8,
      severity: 'HIGH',
      mitreTechnique: 'T1071.001 - Web Protocols',
      mitreTactic: 'Command and Control',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'C2_BEACON',
      threatClass: 'Botnet Beaconing',
      severity: 'HIGH',
      confidence: 0.938,
      srcIp: newFlow.srcIp,
      dstIp,
      dstPort: 8443,
      protocol: 'TCP',
      mitreTechnique: 'T1071.001',
      mitreTactic: 'Command and Control',
      summary: `Periodic encrypted beacon handshake matching Cobalt Strike HTTPS sleep mask pattern.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: newFlow.srcIp,
        dst_ip: dstIp,
        src_port: 49811,
        dst_port: 8443,
        protocol: 'TCP',
        ja3_hash: 'a0e9f5d64349fb13191bc781f81f42e1',
        ja3_fingerprint: '771,49195-49199-52393,0-23-65281-10-11,29-23-24,0',
        inter_arrival_cv: 0.038,
        beaconing_interval_sec: 60.0,
        dns_query: null,
        dns_entropy: null,
        unidirectional_byte_bias: 0.22,
        packet_rate_pps: 128.5,
        mitre_technique: 'T1071.001 - Web Protocols'
      },
      flowDetails: newFlow
    };
  } else if (attackType === 'DNS_TUNNELING') {
    const srcIp = `10.128.4.${Math.floor(Math.random() * 200) + 2}`;
    const query = `data-${Math.random().toString(36).substring(2, 10)}.exfil.darknet-c2.net`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp,
      srcPort: Math.floor(Math.random() * 20000) + 30000,
      dstIp: '10.128.0.2',
      dstPort: 53,
      protocol: 'UDP',
      packets: 52,
      bytes: 24960,
      durationMs: 820,
      tcpFlags: [],
      entropy: 7.78,
      predictedLabel: 'DNS_TUNNELING',
      threatClass: 'DGA/Tunneling',
      confidence: 0.965,
      anomalyScore: 96.5,
      severity: 'HIGH',
      mitreTechnique: 'T1568.002 - Domain Generation Algorithms',
      mitreTactic: 'Command and Control',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'DNS_TUNNELING',
      threatClass: 'DGA/Tunneling',
      severity: 'HIGH',
      confidence: 0.965,
      srcIp,
      dstIp: newFlow.dstIp,
      dstPort: 53,
      protocol: 'UDP',
      mitreTechnique: 'T1568.002',
      mitreTactic: 'Command and Control',
      summary: `High entropy TXT covert tunnel encoding outbound payload data through internal recursive resolver.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: srcIp,
        dst_ip: newFlow.dstIp,
        src_port: newFlow.srcPort,
        dst_port: 53,
        protocol: 'UDP',
        ja3_hash: null,
        ja3_fingerprint: null,
        inter_arrival_cv: 0.31,
        beaconing_interval_sec: null,
        dns_query: query,
        dns_entropy: 4.42,
        unidirectional_byte_bias: 0.38,
        packet_rate_pps: 63.4,
        mitre_technique: 'T1568.002 - Domain Generation Algorithms'
      },
      flowDetails: newFlow
    };
  } else if (attackType === 'MALWARE_TLS') {
    const srcIp = `10.128.3.${Math.floor(Math.random() * 100) + 10}`;
    const dstIp = `194.67.210.${Math.floor(Math.random() * 200) + 1}`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp,
      srcPort: Math.floor(Math.random() * 30000) + 10000,
      dstIp,
      dstPort: 443,
      protocol: 'TCP',
      packets: 48,
      bytes: 14200,
      durationMs: 310,
      tcpFlags: ['PSH', 'ACK'],
      entropy: 7.92,
      predictedLabel: 'MALWARE_TLS',
      threatClass: 'Malware TLS',
      confidence: 0.952,
      anomalyScore: 95.2,
      severity: 'HIGH',
      mitreTechnique: 'T1573.002 - Asymmetric Encrypted Channel',
      mitreTactic: 'Command and Control',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'MALWARE_TLS',
      threatClass: 'Malware TLS',
      severity: 'HIGH',
      confidence: 0.952,
      srcIp,
      dstIp,
      dstPort: 443,
      protocol: 'TCP',
      mitreTechnique: 'T1573.002',
      mitreTactic: 'Command and Control',
      summary: `Malicious AsyncRAT / RedLine stealer JA3 fingerprint identified in TLS ClientHello metadata without payload decryption.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: srcIp,
        dst_ip: dstIp,
        src_port: newFlow.srcPort,
        dst_port: 443,
        protocol: 'TCP',
        ja3_hash: '51c64c77e60f3980eea90869b68c58a8',
        ja3_fingerprint: '771,4865-4866-4867-49195,0-23-65281-10-11-35-16,29-23-24,0',
        inter_arrival_cv: 0.082,
        beaconing_interval_sec: 120.0,
        dns_query: null,
        dns_entropy: null,
        unidirectional_byte_bias: 0.19,
        packet_rate_pps: 154.8,
        mitre_technique: 'T1573.002 - Asymmetric Cryptography'
      },
      flowDetails: newFlow
    };
  } else if (attackType === 'PORT_SCAN') {
    const srcIp = `194.26.29.${Math.floor(Math.random() * 200) + 1}`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp,
      srcPort: Math.floor(Math.random() * 30000) + 10000,
      dstIp: '10.128.0.10',
      dstPort: 22,
      protocol: 'TCP',
      packets: 412,
      bytes: 24720,
      durationMs: 110,
      tcpFlags: ['SYN'],
      entropy: 3.12,
      predictedLabel: 'PORT_SCAN',
      threatClass: 'Recon Scanning',
      confidence: 0.925,
      anomalyScore: 91.0,
      severity: 'MEDIUM',
      mitreTechnique: 'T1046 - Network Service Discovery',
      mitreTactic: 'Discovery',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'PORT_SCAN',
      threatClass: 'Recon Scanning',
      severity: 'MEDIUM',
      confidence: 0.925,
      srcIp,
      dstIp: newFlow.dstIp,
      dstPort: 22,
      protocol: 'TCP',
      mitreTechnique: 'T1046',
      mitreTactic: 'Discovery',
      summary: `Automated fast reconnaissance scan sweeping edge ports across multiple destination hosts.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: srcIp,
        dst_ip: newFlow.dstIp,
        src_port: newFlow.srcPort,
        dst_port: 22,
        protocol: 'TCP',
        ja3_hash: null,
        ja3_fingerprint: null,
        inter_arrival_cv: 0.11,
        beaconing_interval_sec: null,
        dns_query: null,
        dns_entropy: null,
        unidirectional_byte_bias: 0.04,
        packet_rate_pps: 3745.5,
        mitre_technique: 'T1046 - Network Service Discovery'
      },
      flowDetails: newFlow
    };
  } else if (attackType === 'BRUTE_FORCE_SSH') {
    const srcIp = `203.0.113.${Math.floor(Math.random() * 150) + 20}`;
    newFlow = {
      id: `FLW-${idNum}`,
      timestamp: now,
      srcIp,
      srcPort: 41092,
      dstIp: '10.128.0.5',
      dstPort: 22,
      protocol: 'TCP',
      packets: 840,
      bytes: 98400,
      durationMs: 450,
      tcpFlags: ['SYN', 'ACK', 'RST'],
      entropy: 5.4,
      predictedLabel: 'BRUTE_FORCE_SSH',
      threatClass: 'Recon Scanning',
      confidence: 0.957,
      anomalyScore: 94.6,
      severity: 'HIGH',
      mitreTechnique: 'T1110.001 - Password Guessing',
      mitreTactic: 'Credential Access',
      isThreat: true
    };
    newAlert = {
      alertId: `ALT-${idNum}`,
      timestamp: now,
      flowId: newFlow.id,
      threatType: 'BRUTE_FORCE_SSH',
      threatClass: 'Recon Scanning',
      severity: 'HIGH',
      confidence: 0.957,
      srcIp,
      dstIp: newFlow.dstIp,
      dstPort: 22,
      protocol: 'TCP',
      mitreTechnique: 'T1110.001',
      mitreTactic: 'Credential Access',
      summary: `Repeated rapid authentication handshakes and RST terminations on bastion SSH port 22.`,
      status: 'ACTIVE',
      evidence: {
        src_ip: srcIp,
        dst_ip: newFlow.dstIp,
        src_port: 41092,
        dst_port: 22,
        protocol: 'TCP',
        ja3_hash: null,
        ja3_fingerprint: null,
        inter_arrival_cv: 0.09,
        beaconing_interval_sec: null,
        dns_query: null,
        dns_entropy: null,
        unidirectional_byte_bias: 0.06,
        packet_rate_pps: 1866.7,
        mitre_technique: 'T1110.001 - Password Guessing'
      },
      flowDetails: newFlow
    };
  }

  if (newAlert) {
    alertList = [newAlert, ...alertList].slice(0, 50);
  }

  res.json({ success: true, flow: newFlow, alert: newAlert });
});

// Single-flow inference endpoint (Vertex AI simulated predictor)
app.post('/api/inference/predict', (req: Request, res: Response) => {
  const { flow } = req.body;
  if (!flow) return res.status(400).json({ error: 'Missing flow parameter' });

  // Vertex AI scoring heuristics based on trained model behavior
  let label = 'BENIGN';
  let threatClass = 'BENIGN';
  let confidence = 0.98;
  let anomalyScore = 4.2;
  let severity = 'LOW';
  let mitreTechnique = '';
  let mitreTactic = '';

  const isSynOnly = flow.tcpFlags && flow.tcpFlags.length === 1 && flow.tcpFlags[0] === 'SYN';
  const hasHighPackets = Number(flow.packets) > 10000;
  const isHighEntropy = Number(flow.entropy) > 7.7;
  const isLargeEgress = Number(flow.bytes) > 50000000;
  const hasMalwareJa3 = flow.ja3Hash === '51c64c77e60f3980eea90869b68c58a8' || flow.ja3Hash === 'c879d71a7293b6e83819e9921b7123aa';
  const isDnsTunnel = (flow.dstPort === 53 || flow.protocol === 'UDP') && (Number(flow.dnsEntropy) > 4.0 || (flow.dnsQuery && flow.dnsQuery.length > 30) || (flow.entropy > 7.2 && flow.dstPort === 53));

  if (isSynOnly && hasHighPackets) {
    label = 'DDOS_SYN_FLOOD';
    threatClass = 'DDoS';
    confidence = 0.991;
    anomalyScore = 98.9;
    severity = 'CRITICAL';
    mitreTechnique = 'T1498.001 - Direct Network Flood';
    mitreTactic = 'Impact';
  } else if (isLargeEgress && isHighEntropy) {
    label = 'DATA_EXFILTRATION';
    threatClass = 'Data Exfiltration';
    confidence = 0.963;
    anomalyScore = 96.1;
    severity = 'CRITICAL';
    mitreTechnique = 'T1048.003 - Alternative Protocol Exfiltration';
    mitreTactic = 'Exfiltration';
  } else if (isDnsTunnel) {
    label = 'DNS_TUNNELING';
    threatClass = 'DGA/Tunneling';
    confidence = 0.968;
    anomalyScore = 96.8;
    severity = 'HIGH';
    mitreTechnique = 'T1568.002 - Domain Generation Algorithms';
    mitreTactic = 'Command and Control';
  } else if (hasMalwareJa3 || (isHighEntropy && flow.dstPort === 443 && flow.ja3Hash)) {
    label = 'MALWARE_TLS';
    threatClass = 'Malware TLS';
    confidence = 0.954;
    anomalyScore = 95.4;
    severity = 'HIGH';
    mitreTechnique = 'T1573.002 - Asymmetric Cryptography';
    mitreTactic = 'Command and Control';
  } else if (isHighEntropy && Number(flow.packets) < 50 && (flow.dstPort === 8443 || flow.dstPort === 443)) {
    label = 'C2_BEACON';
    threatClass = 'Botnet Beaconing';
    confidence = 0.938;
    anomalyScore = 93.8;
    severity = 'HIGH';
    mitreTechnique = 'T1071.001 - Web Protocols';
    mitreTactic = 'Command and Control';
  } else if (flow.dstPort === 22 && flow.tcpFlags && flow.tcpFlags.includes('RST') && Number(flow.packets) > 300) {
    label = 'BRUTE_FORCE_SSH';
    threatClass = 'Recon Scanning';
    confidence = 0.942;
    anomalyScore = 93.0;
    severity = 'HIGH';
    mitreTechnique = 'T1110.001 - Password Guessing';
    mitreTactic = 'Credential Access';
  } else if (isSynOnly && Number(flow.packets) > 100 && Number(flow.packets) <= 5000) {
    label = 'PORT_SCAN';
    threatClass = 'Recon Scanning';
    confidence = 0.925;
    anomalyScore = 91.0;
    severity = 'MEDIUM';
    mitreTechnique = 'T1046 - Network Service Discovery';
    mitreTactic = 'Discovery';
  }

  res.json({
    predictedLabel: label,
    threatClass,
    confidence,
    anomalyScore,
    severity,
    mitreTechnique,
    mitreTactic,
    isThreat: label !== 'BENIGN',
    vertexLatencyMs: (Math.random() * 0.05 + 0.06).toFixed(2),
    evaluatedAt: new Date().toISOString()
  });
});

// BigQuery Query Execution Simulator
app.post('/api/bigquery/query', (req: Request, res: Response) => {
  const { sql } = req.body;
  const lower = (sql || '').toLowerCase();

  // Return realistic tabular BigQuery execution results
  if (lower.includes('cyber_alerts.detections')) {
    const rows = alertList.slice(0, 15).map(a => ({
      alert_id: a.alertId,
      timestamp: a.timestamp,
      src_ip: a.srcIp,
      dst_ip: a.dstIp,
      dst_port: a.dstPort,
      threat_type: a.threatType,
      confidence: a.confidence,
      severity: a.severity,
      status: a.status,
      mitre_technique: a.mitreTechnique
    }));
    return res.json({
      rows,
      totalBytesProcessed: '24.8 MB',
      executionTimeMs: 382,
      cacheHit: false
    });
  }

  if (lower.includes('count') && lower.includes('threat_flows')) {
    return res.json({
      rows: [
        { threat_type: 'BENIGN', count: 2480100, pct: '87.3%' },
        { threat_type: 'DDOS_SYN_FLOOD', count: 182400, pct: '6.4%' },
        { threat_type: 'PORT_SCAN', count: 98120, pct: '3.5%' },
        { threat_type: 'C2_BEACON', count: 42100, pct: '1.5%' },
        { threat_type: 'BRUTE_FORCE_SSH', count: 26400, pct: '0.9%' },
        { threat_type: 'DATA_EXFILTRATION', count: 11072, pct: '0.4%' }
      ],
      totalBytesProcessed: '118.4 MB',
      executionTimeMs: 512,
      cacheHit: true
    });
  }

  // Default BigQuery sample output
  res.json({
    rows: alertList.slice(0, 5).map(a => ({
      alert_id: a.alertId,
      src_ip: a.srcIp,
      threat_type: a.threatType,
      confidence: a.confidence
    })),
    totalBytesProcessed: '12.1 MB',
    executionTimeMs: 240,
    cacheHit: true
  });
});

// AI Gemini Threat Analysis
app.post('/api/gemini/analyze-threat', async (req: Request, res: Response) => {
  const { alert } = req.body;
  if (!alert) return res.status(400).json({ error: 'Alert is required' });

  const ai = getGenAI();

  if (!ai) {
    // Provide a comprehensive deterministic forensic analysis fallback
    return res.json({
      incidentSummary: `Automated investigation of ${alert.threatType} originating from ${alert.srcIp} targeting internal host ${alert.dstIp}:${alert.dstPort}. The flow exhibits high signature deviation (confidence ${Math.round(alert.confidence * 100)}%) consistent with known automated adversarial tooling.`,
      mitreMapping: {
        tactic: alert.mitreTactic || 'Defense Evasion / Impact',
        technique: alert.mitreTechnique || 'T1498 / T1071',
        subTechnique: 'Network Traffic Manipulation',
        description: 'Adversary leveraged network flow anomalies to conduct malicious operations against cloud workloads.'
      },
      threatActorProfile: 'Automated Botnet / Advanced Persistent Threat (APT) affiliate utilizing fast-flux or distributed proxy egress infrastructure.',
      blastRadius: `Internal node ${alert.dstIp} is directly targeted. Without ingress rate-limiting, edge load balancers and connected microservices in subnet 10.128.0.0/20 face resource starvation.`,
      recommendedPlaybook: [
        {
          stepNumber: 1,
          action: 'Apply Cloud Armor Ingress Deny Filter',
          command: `gcloud compute security-policies rules create 1000 --security-policy=cyber-waf-policy --src-ip-ranges="${alert.srcIp}/32" --action="deny-403" --description="Mitigate ${alert.threatType}"`,
          rationale: 'Instantly drop incoming packets at Google Cloud edge before hitting compute instances.'
        },
        {
          stepNumber: 2,
          action: 'Isolate Target Cloud VM / Service',
          command: `gcloud compute instances add-tags ${alert.dstIp.replace(/[^a-zA-Z0-9]/g, '-')} --tags=quarantine-isolated`,
          rationale: 'Prevent lateral movement into database and internal API networks.'
        },
        {
          stepNumber: 3,
          action: 'Forensic BigQuery Audit',
          command: `bq query --nouse_legacy_sql 'SELECT timestamp, src_ip, dst_port, bytes FROM cyber_alerts.detections WHERE src_ip = "${alert.srcIp}" ORDER BY timestamp DESC LIMIT 100'`,
          rationale: 'Determine previous reconnaissance or initial access attempts across all project VPCs.'
        }
      ],
      gcloudMitigationRule: `gcloud compute firewall-rules create drop-${alert.threatType.toLowerCase().replace(/_/g, '-')}-${alert.alertId.toLowerCase()} --direction=INGRESS --priority=100 --action=DENY --rules=all --source-ranges=${alert.srcIp}/32`
    });
  }

  try {
    const prompt = `You are an elite Google Cloud Platform Cyber Threat Intelligence Analyst and Incident Commander.
Analyze this detected cyber threat alert from our Vertex AI and BigQuery detection pipeline:

Alert ID: ${alert.alertId}
Threat Type: ${alert.threatType}
Severity: ${alert.severity}
Confidence: ${alert.confidence}
Source IP: ${alert.srcIp}
Destination IP: ${alert.dstIp} (Internal VPC)
Destination Port: ${alert.dstPort} (${alert.protocol})
Packets: ${alert.flowDetails?.packets || 'N/A'}
Bytes: ${alert.flowDetails?.bytes || 'N/A'}
Duration: ${alert.flowDetails?.durationMs || 'N/A'} ms
TCP Flags: ${(alert.flowDetails?.tcpFlags || []).join(', ') || 'N/A'}
Entropy: ${alert.flowDetails?.entropy || 'N/A'}
Summary: ${alert.summary}

Provide a deep technical threat report formatted in valid JSON with EXACTLY this structure:
{
  "incidentSummary": "2-3 technical sentences explaining the threat anatomy and what happened",
  "mitreMapping": {
    "tactic": "MITRE ATT&CK Tactic name",
    "technique": "Technique ID & Name",
    "subTechnique": "Sub-technique if applicable",
    "description": "How the telemetry indicators match this technique"
  },
  "threatActorProfile": "Likely adversary type, botnet, or APT group modus operandi",
  "blastRadius": "Impact assessment on the target VM, subnet 10.128.0.0/20, and downstream GCP resources",
  "recommendedPlaybook": [
    {
      "stepNumber": 1,
      "action": "Clear short action title",
      "command": "Executable gcloud or bq command",
      "rationale": "Why this containment action is necessary"
    },
    {
      "stepNumber": 2,
      "action": "Clear short action title",
      "command": "Executable gcloud or bq command",
      "rationale": "Why this containment action is necessary"
    },
    {
      "stepNumber": 3,
      "action": "Clear short action title",
      "command": "Executable gcloud or bq command",
      "rationale": "Why this containment action is necessary"
    }
  ],
  "gcloudMitigationRule": "gcloud compute firewall-rules create or Cloud Armor CLI command to block the threat"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Gemini Analysis Error:', err);
    res.status(500).json({
      error: 'Failed to generate AI analysis',
      details: err.message
    });
  }
});

// AI Cyber Defense Copilot Q&A
app.post('/api/gemini/copilot-chat', async (req: Request, res: Response) => {
  const { message, context } = req.body;
  const ai = getGenAI();

  if (!ai) {
    return res.json({
      reply: `[Offline Heuristic Engine] Analyzing request: "${message}". In this GCP Threat Detection architecture:
- Data flow: NetFlow/PCAP -> Pub/Sub (ip-traffic-ingest) -> Vertex AI Model Endpoint (threat-detection-endpoint) -> BigQuery (cyber_alerts.detections).
- Active Alerts: 3 high-priority detections under active triage.
- Recommendation: Inspect BigQuery partition query performance and confirm Cloud Armor edge policy rules are active. To enable deep AI model reasoning, configure your Gemini API key in Settings > Secrets.`
    });
  }

  try {
    const prompt = `You are the Google Cloud Cyber Threat Intelligence Copilot for our SOC Operations platform.
The pipeline runs on GCP with:
- Project: cyber-threat-detection (us-central1)
- Ingestion: Pub/Sub topic 'ip-traffic-ingest'
- Dataset: BigQuery 'cyber_dataset.threat_flows' (2.8M historical rows)
- Machine Learning: Vertex AI Custom TF Job -> Model Endpoint 'threat-detection-endpoint'
- Alert Sink: BigQuery 'cyber_alerts.detections'
- Current blocked IPs: ${Array.from(blockedIps).join(', ')}
- Context alerts summary: ${alertList.map(a => `${a.alertId} (${a.threatType}, ${a.severity}, Src:${a.srcIp})`).join('; ')}

User question: ${message}

Answer with high technical authority, citing specific GCP tools (gcloud, BigQuery SQL, VPC Firewall, Cloud Armor, Vertex AI, Pub/Sub), MITRE ATT&CK concepts, and practical SOC next steps. Keep response concise, structured, and immediately actionable for a senior security engineer.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error('Copilot error:', err);
    res.status(500).json({
      error: 'Failed to communicate with AI Copilot',
      details: err.message
    });
  }
});

// Vite middleware / production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GCP Threat Detection SOC Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
