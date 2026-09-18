import { NetworkFlow, AttackType, SeverityLevel } from '../types';

export function generateRandomFlow(): NetworkFlow {
  const isAttack = Math.random() < 0.28; // ~28% anomalous flows in SOC view
  const id = `FLW-${Math.floor(Math.random() * 900000) + 100000}`;
  const now = new Date().toISOString();

  if (!isAttack) {
    // Normal traffic
    const commonDstPorts = [80, 443, 53, 8080, 3306, 5432];
    const dstPort = commonDstPorts[Math.floor(Math.random() * commonDstPorts.length)];
    const packets = Math.floor(Math.random() * 200) + 4;
    const bytes = packets * (Math.floor(Math.random() * 800) + 64);
    const durationMs = Math.floor(Math.random() * 300) + 15;

    return {
      id,
      timestamp: now,
      srcIp: `172.16.${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 250) + 1}`,
      srcPort: Math.floor(Math.random() * 40000) + 10240,
      dstIp: `10.128.0.${Math.floor(Math.random() * 30) + 5}`,
      dstPort,
      protocol: dstPort === 53 ? 'UDP' : 'TCP',
      packets,
      bytes,
      durationMs,
      tcpFlags: dstPort === 53 ? [] : ['ACK', 'PSH'],
      entropy: Number((Math.random() * 1.5 + 4.5).toFixed(2)),
      predictedLabel: 'BENIGN',
      threatClass: 'BENIGN',
      confidence: Number((Math.random() * 0.04 + 0.95).toFixed(3)),
      anomalyScore: Number((Math.random() * 10 + 2).toFixed(1)),
      severity: 'LOW',
      isThreat: false
    };
  }

  // Attack selection across all 6 required threat classes
  const attackTypes: AttackType[] = [
    'DDOS_SYN_FLOOD',
    'PORT_SCAN',
    'C2_BEACON',
    'DNS_TUNNELING',
    'MALWARE_TLS',
    'DATA_EXFILTRATION',
    'BRUTE_FORCE_SSH'
  ];
  const chosenType = attackTypes[Math.floor(Math.random() * attackTypes.length)];

  switch (chosenType) {
    case 'DDOS_SYN_FLOOD':
      return {
        id,
        timestamp: now,
        srcIp: `198.51.100.${Math.floor(Math.random() * 240) + 10}`,
        srcPort: Math.floor(Math.random() * 50000) + 10000,
        dstIp: '10.128.0.15',
        dstPort: 443,
        protocol: 'TCP',
        packets: Math.floor(Math.random() * 40000) + 25000,
        bytes: Math.floor(Math.random() * 2000000) + 1500000,
        durationMs: Math.floor(Math.random() * 300) + 100,
        tcpFlags: ['SYN'],
        entropy: Number((Math.random() * 0.6 + 1.6).toFixed(2)),
        predictedLabel: 'DDOS_SYN_FLOOD',
        threatClass: 'DDoS',
        confidence: Number((Math.random() * 0.03 + 0.96).toFixed(3)),
        anomalyScore: Number((Math.random() * 4 + 95).toFixed(1)),
        severity: 'CRITICAL',
        mitreTechnique: 'T1498.001 - Direct Network Flood',
        mitreTactic: 'Impact',
        isThreat: true
      };

    case 'PORT_SCAN':
      return {
        id,
        timestamp: now,
        srcIp: `194.26.29.${Math.floor(Math.random() * 240) + 5}`,
        srcPort: Math.floor(Math.random() * 40000) + 10000,
        dstIp: `10.128.0.${Math.floor(Math.random() * 20) + 1}`,
        dstPort: [21, 22, 23, 80, 443, 3389, 8080][Math.floor(Math.random() * 7)],
        protocol: 'TCP',
        packets: Math.floor(Math.random() * 300) + 100,
        bytes: Math.floor(Math.random() * 15000) + 8000,
        durationMs: Math.floor(Math.random() * 120) + 30,
        tcpFlags: ['SYN'],
        entropy: Number((Math.random() * 0.8 + 3.0).toFixed(2)),
        predictedLabel: 'PORT_SCAN',
        threatClass: 'Recon Scanning',
        confidence: Number((Math.random() * 0.05 + 0.91).toFixed(3)),
        anomalyScore: Number((Math.random() * 6 + 86).toFixed(1)),
        severity: 'MEDIUM',
        mitreTechnique: 'T1046 - Network Service Discovery',
        mitreTactic: 'Discovery',
        isThreat: true
      };

    case 'C2_BEACON':
      return {
        id,
        timestamp: now,
        srcIp: '10.128.0.42',
        srcPort: Math.floor(Math.random() * 10000) + 40000,
        dstIp: `185.220.101.${Math.floor(Math.random() * 80) + 1}`,
        dstPort: 8443,
        protocol: 'TCP',
        packets: Math.floor(Math.random() * 15) + 8,
        bytes: Math.floor(Math.random() * 2000) + 3200,
        durationMs: Math.floor(Math.random() * 90) + 50,
        tcpFlags: ['PSH', 'ACK'],
        entropy: Number((Math.random() * 0.15 + 7.85).toFixed(2)),
        predictedLabel: 'C2_BEACON',
        threatClass: 'Botnet Beaconing',
        confidence: Number((Math.random() * 0.04 + 0.93).toFixed(3)),
        anomalyScore: Number((Math.random() * 5 + 91).toFixed(1)),
        severity: 'HIGH',
        mitreTechnique: 'T1071.001 - Web Protocols',
        mitreTactic: 'Command and Control',
        isThreat: true
      };

    case 'DNS_TUNNELING':
      return {
        id,
        timestamp: now,
        srcIp: '10.128.4.12',
        srcPort: Math.floor(Math.random() * 20000) + 30000,
        dstIp: '10.128.4.1',
        dstPort: 53,
        protocol: 'UDP',
        packets: Math.floor(Math.random() * 45) + 30,
        bytes: Math.floor(Math.random() * 12000) + 8500,
        durationMs: Math.floor(Math.random() * 500) + 200,
        tcpFlags: [],
        entropy: Number((Math.random() * 0.3 + 7.8).toFixed(2)),
        predictedLabel: 'DNS_TUNNELING',
        threatClass: 'DGA/Tunneling',
        confidence: Number((Math.random() * 0.03 + 0.96).toFixed(3)),
        anomalyScore: Number((Math.random() * 4 + 93).toFixed(1)),
        severity: 'HIGH',
        mitreTechnique: 'T1568.002 - Domain Generation Algorithms',
        mitreTactic: 'Command and Control',
        isThreat: true
      };

    case 'MALWARE_TLS':
      return {
        id,
        timestamp: now,
        srcIp: '10.128.3.45',
        srcPort: Math.floor(Math.random() * 20000) + 30000,
        dstIp: '194.67.210.8',
        dstPort: 443,
        protocol: 'TCP',
        packets: Math.floor(Math.random() * 80) + 40,
        bytes: Math.floor(Math.random() * 15000) + 12000,
        durationMs: Math.floor(Math.random() * 400) + 150,
        tcpFlags: ['PSH', 'ACK'],
        entropy: Number((Math.random() * 0.2 + 7.9).toFixed(2)),
        predictedLabel: 'MALWARE_TLS',
        threatClass: 'Malware TLS',
        confidence: Number((Math.random() * 0.03 + 0.95).toFixed(3)),
        anomalyScore: Number((Math.random() * 4 + 94).toFixed(1)),
        severity: 'HIGH',
        mitreTechnique: 'T1573.002 - Asymmetric Encrypted Channel',
        mitreTactic: 'Command and Control',
        isThreat: true
      };

    case 'DATA_EXFILTRATION':
      return {
        id,
        timestamp: now,
        srcIp: '10.128.0.88',
        srcPort: 51200,
        dstIp: `94.102.61.${Math.floor(Math.random() * 200) + 1}`,
        dstPort: 443,
        protocol: 'TCP',
        packets: Math.floor(Math.random() * 12000) + 8000,
        bytes: Math.floor(Math.random() * 180000000) + 70000000,
        durationMs: Math.floor(Math.random() * 1500) + 1200,
        tcpFlags: ['PSH', 'ACK'],
        entropy: Number((Math.random() * 0.1 + 7.9).toFixed(2)),
        predictedLabel: 'DATA_EXFILTRATION',
        threatClass: 'Data Exfiltration',
        confidence: Number((Math.random() * 0.03 + 0.95).toFixed(3)),
        anomalyScore: Number((Math.random() * 4 + 95).toFixed(1)),
        severity: 'CRITICAL',
        mitreTechnique: 'T1048 - Exfiltration Over Alternative Protocol',
        mitreTactic: 'Exfiltration',
        isThreat: true
      };

    case 'BRUTE_FORCE_SSH':
    default:
      return {
        id,
        timestamp: now,
        srcIp: `203.0.113.${Math.floor(Math.random() * 150) + 20}`,
        srcPort: Math.floor(Math.random() * 30000) + 20000,
        dstIp: '10.128.0.5',
        dstPort: 22,
        protocol: 'TCP',
        packets: Math.floor(Math.random() * 600) + 400,
        bytes: Math.floor(Math.random() * 50000) + 40000,
        durationMs: Math.floor(Math.random() * 400) + 200,
        tcpFlags: ['SYN', 'ACK', 'RST'],
        entropy: Number((Math.random() * 0.7 + 5.1).toFixed(2)),
        predictedLabel: 'BRUTE_FORCE_SSH',
        threatClass: 'Recon Scanning',
        confidence: Number((Math.random() * 0.04 + 0.94).toFixed(3)),
        anomalyScore: Number((Math.random() * 5 + 92).toFixed(1)),
        severity: 'HIGH',
        mitreTechnique: 'T1110.001 - Password Guessing',
        mitreTactic: 'Credential Access',
        isThreat: true
      };
  }
}
