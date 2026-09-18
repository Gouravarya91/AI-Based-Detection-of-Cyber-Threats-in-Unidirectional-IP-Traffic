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


## 📌 Architecture Overview
<img width="474" height="263" alt="image" src="https://github.com/user-attachments/assets/c659c466-6d46-4f70-b34a-f4c365a0f3f5" />


## 📊 Threat Detection Dashboard
<img width="474" height="474" alt="image" src="https://github.com/user-attachments/assets/5618342d-1d9c-4333-a1fb-00e346529a68" />


## 🔐 Blockchain Identity & Access Control
<img width="474" height="338" alt="image" src="https://github.com/user-attachments/assets/5ab7e345-5f09-4243-8700-d5ed1276849d" />


## 🔄 Data Pipeline
<img width="474" height="616" alt="image" src="https://github.com/user-attachments/assets/07119417-58db-427b-806c-9e96ba77827f" />


## ☁️ Cloud-Native Microservices
<img width="474" height="296" alt="image" src="https://github.com/user-attachments/assets/f083a0d9-4b61-4729-9887-761427454168" />

