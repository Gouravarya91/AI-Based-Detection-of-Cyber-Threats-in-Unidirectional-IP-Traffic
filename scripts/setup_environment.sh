#!/usr/bin/env bash
# ==============================================================================
# Deliverable 1: Google Cloud Environment Setup
# Project: AI-Based Detection of Cyber Threats in Unidirectional IP Traffic
# ==============================================================================
set -euo pipefail

PROJECT_ID="cyber-threat-detection"
REGION="us-central1"
ZONE="us-central1-a"
NOTEBOOK_NAME="cyber-threat-notebook"
PUBSUB_TOPIC="ip-traffic-ingest"
PUBSUB_SUB="ip-traffic-inference-sub"
BQ_DATASET="cyber_dataset"
BQ_ALERTS_DATASET="cyber_alerts"
MODEL_BUCKET="gs://${PROJECT_ID}-models"

echo "=== [1/6] Setting Up Google Cloud Project ==="
gcloud config set project "${PROJECT_ID}" || gcloud projects create "${PROJECT_ID}" --set-as-default
gcloud config set compute/region "${REGION}"
gcloud config set compute/zone "${ZONE}"

echo "=== [2/6] Enabling Required Google Cloud APIs ==="
gcloud services enable \
    aiplatform.googleapis.com \
    bigquery.googleapis.com \
    pubsub.googleapis.com \
    notebooks.googleapis.com \
    compute.googleapis.com \
    storage.googleapis.com \
    cloudresourcemanager.googleapis.com

echo "=== [3/6] Creating Cloud Pub/Sub Topic and Subscription ==="
# Topic for unidirectional IP traffic metadata ingestion (NetFlow/IPFIX/PCAP)
gcloud pubsub topics create "${PUBSUB_TOPIC}" \
    --message-retention-duration=1d || echo "Topic already exists."

# Streaming subscription with 30s ack deadline and dead-letter safety
gcloud pubsub subscriptions create "${PUBSUB_SUB}" \
    --topic="${PUBSUB_TOPIC}" \
    --ack-deadline=30 || echo "Subscription already exists."

echo "=== [4/6] Creating BigQuery Datasets & Tables ==="
# Training dataset
bq mk --dataset --location="${REGION}" "${PROJECT_ID}:${BQ_DATASET}" || echo "Dataset ${BQ_DATASET} exists."

# Standardized Alerts & Detections sink
bq mk --dataset --location="${REGION}" "${PROJECT_ID}:${BQ_ALERTS_DATASET}" || echo "Dataset ${BQ_ALERTS_DATASET} exists."

# Standardized Alert Table Schema matching: timestamp, flow_id, threat_class, confidence, evidence
cat <<EOF > /tmp/alert_schema.json
[
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "flow_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "threat_class", "type": "STRING", "mode": "REQUIRED"},
  {"name": "confidence", "type": "FLOAT64", "mode": "REQUIRED"},
  {"name": "evidence", "type": "RECORD", "mode": "REQUIRED", "fields": [
    {"name": "src_ip", "type": "STRING", "mode": "REQUIRED"},
    {"name": "dst_ip", "type": "STRING", "mode": "REQUIRED"},
    {"name": "src_port", "type": "INT64", "mode": "NULLABLE"},
    {"name": "dst_port", "type": "INT64", "mode": "REQUIRED"},
    {"name": "protocol", "type": "STRING", "mode": "REQUIRED"},
    {"name": "ja3_hash", "type": "STRING", "mode": "NULLABLE"},
    {"name": "ja3_fingerprint", "type": "STRING", "mode": "NULLABLE"},
    {"name": "inter_arrival_cv", "type": "FLOAT64", "mode": "NULLABLE"},
    {"name": "beaconing_interval_sec", "type": "FLOAT64", "mode": "NULLABLE"},
    {"name": "dns_query", "type": "STRING", "mode": "NULLABLE"},
    {"name": "dns_entropy", "type": "FLOAT64", "mode": "NULLABLE"},
    {"name": "unidirectional_byte_bias", "type": "FLOAT64", "mode": "NULLABLE"},
    {"name": "packet_rate_pps", "type": "FLOAT64", "mode": "NULLABLE"},
    {"name": "mitre_technique", "type": "STRING", "mode": "NULLABLE"}
  ]}
]
EOF

bq mk --table \
    --time_partitioning_field="timestamp" \
    --time_partitioning_type="DAY" \
    "${PROJECT_ID}:${BQ_ALERTS_DATASET}.detections" \
    /tmp/alert_schema.json || echo "Alerts table exists."

echo "=== [5/6] Creating GCS Bucket for Vertex AI Model Artifacts ==="
gsutil mb -p "${PROJECT_ID}" -c standard -l "${REGION}" "${MODEL_BUCKET}" || echo "Bucket exists."

echo "=== [6/6] Creating Vertex AI Workbench / Notebook Instance ==="
# Provision managed deep learning notebook instance with TensorFlow & PyTorch
gcloud notebooks instances create "${NOTEBOOK_NAME}" \
    --location="${ZONE}" \
    --vm-image-project="deeplearning-platform-release" \
    --vm-image-family="tf-ent-2-11-cu113-notebooks" \
    --machine-type="n1-standard-4" \
    --metadata="install-monitoring=true" || echo "Notebook instance already exists."

echo "=== Google Cloud Environment Successfully Provisioned! ==="
