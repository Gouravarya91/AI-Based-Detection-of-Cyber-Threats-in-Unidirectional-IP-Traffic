# AI-Based Detection of Cyber Threats in Unidirectional IP Traffic

## 📌 Overview
This project implements a **streaming AI/ML pipeline** that detects and classifies cyber threats in **unidirectional IP traffic** (PCAP/NetFlow/IPFIX).  
It is designed for **critical infrastructure operators** who use passive mirroring or hardware data diodes, ensuring **read-only ingest** with no return path into production networks.

---

## 🎯 Objectives
- Detect and classify threats in **near real-time** using passive traffic data.
- Provide **structured alerts** with confidence scores and supporting evidence.
- Deliver a **modern web dashboard** for visualization and analysis.
- Ensure compliance with architectural constraints:
  - ✅ Read-only ingest  
  - ✅ No payload decryption (TLS/QUIC metadata only)  
  - ✅ Streaming pipeline (not batch)  
  - ✅ Standardized alert schema  

---

## 🛡️ Threats Detected
- **Volumetric / Protocol DDoS** (SYN floods, UDP amplification, spoofed floods)  
- **Botnet C2 Beaconing** (periodicity and inter-arrival analysis)  
- **DGA Domains & DNS Tunneling** (entropy/n-gram analysis of queries)  
- **Malware in Encrypted Sessions** (TLS/QUIC metadata, JA3/JA4 fingerprints)  
- **Reconnaissance & Port Scanning** (fan-out patterns across hosts/ports)  
- **Data Exfiltration** (asymmetric flow-volume anomalies)

---

## 🏗️ Architecture
1. **Data Ingestion** → PCAP/NetFlow/IPFIX → Pub/Sub  
2. **Feature Extraction** → Entropy, JA3 fingerprints, ratios, timing  
3. **Model Training** → Vertex AI (Random Forest / LSTM)  
4. **Real-Time Inference** → Pub/Sub → Vertex AI Endpoint → BigQuery  
5. **Alerting** → Structured JSON schema → BigQuery storage  
6. **Dashboard** → React + TailwindCSS + Chart.js (modern web UI)  
7. **Benchmarking** → Simulate 1000 flows/sec, measure latency & throughput  

---

## 🚀 Tech Stack
- **Backend:** Python, FastAPI, Pub/Sub, BigQuery, Vertex AI  
- **Frontend:** React, Next.js, TailwindCSS, Chart.js  
- **Infrastructure:** Google Cloud (Vertex AI, Pub/Sub, BigQuery, GKE)  
- **Data:** PCAP, NetFlow/IPFIX, DNS metadata, TLS fingerprints  

---

## 📂 Repository Structure

---

## 📊 Alert Schema
```json
{
  "timestamp": "2026-09-18T17:20:00Z",
  "flow_id": "flow12345",
  "threat_class": "Botnet C2 Beaconing",
  "confidence": 0.92,
  "evidence": {
    "periodicity": "30s",
    "dst_ip": "192.0.2.5"
  }
}
# AI-Based Detection of Cyber Threats in Unidirectional IP Traffic

## 📌 Architecture Overview
![Cybersecurity Architecture](IMAGE_LINK_1)

## 📊 Threat Detection Dashboard
![Threat Detection Dashboard](IMAGE_LINK_2)

## 🔐 Blockchain Identity & Access Control
![Blockchain Identity](IMAGE_LINK_3)

## 🔄 Data Pipeline
![Data Pipeline](IMAGE_LINK_4)

## ☁️ Cloud-Native Microservices
![Cloud-Native Architecture](IMAGE_LINK_5)
