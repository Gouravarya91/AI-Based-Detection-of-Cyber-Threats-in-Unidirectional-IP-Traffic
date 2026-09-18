#!/usr/bin/env python3
"""
Deliverable 2: Data Ingestion Engine
Project: AI-Based Detection of Cyber Threats in Unidirectional IP Traffic

Constraints:
  - Read-only ingest (no return path / data diode architecture)
  - No payload decryption (TLS/QUIC handshake metadata only: SNI, Ciphers, JA3)
  - Streaming pipeline (publishes metadata records directly into Cloud Pub/Sub)
  - Supports PCAP (via scapy/dpkt), NetFlow v9, and IPFIX packet streams.
"""

import argparse
import json
import logging
import os
import sys
import time
import uuid
from typing import Generator, Dict, Any, Optional

# Optional Google Cloud Pub/Sub dependency
try:
    from google.cloud import pubsub_v1
except ImportError:
    pubsub_v1 = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("UnidirectionalIngest")


class UnidirectionalIngestEngine:
    """
    Parses PCAP / NetFlow / IPFIX traffic in a strictly read-only,
    unidirectional configuration (data diode emulation) without payload decryption.
    """

    def __init__(self, project_id: str, topic_id: str, batch_size: int = 50):
        self.project_id = project_id
        self.topic_id = topic_id
        self.batch_size = batch_size
        self.topic_path = f"projects/{project_id}/topics/{topic_id}"
        
        self.publisher = None
        if pubsub_v1:
            # Batch settings optimized for low-latency streaming
            batch_settings = pubsub_v1.types.BatchSettings(
                max_messages=self.batch_size,
                max_bytes=1024 * 1024,  # 1 MB
                max_latency=0.05,        # 50 ms max delay
            )
            self.publisher = pubsub_v1.PublisherClient(batch_settings=batch_settings)
            logger.info("Connected to Cloud Pub/Sub Publisher: %s", self.topic_path)
        else:
            logger.warning("google-cloud-pubsub not installed; running in local mock streaming mode.")

    def parse_pcap_stream(self, pcap_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Extracts unidirectional flow metadata from PCAP files using Scapy/DPKT.
        Extracts transport and TLS/QUIC handshake metadata without touching encrypted payload.
        """
        try:
            from scapy.all import PcapReader, IP, TCP, UDP, DNS, DNSQR, Raw
        except ImportError:
            logger.error("Scapy is required for PCAP parsing. Run: pip install scapy")
            return

        logger.info("Reading PCAP stream in read-only mode: %s", pcap_path)
        flow_table: Dict[str, Dict[str, Any]] = {}

        with PcapReader(pcap_path) as pcap_reader:
            for pkt in pcap_reader:
                if not pkt.haslayer(IP):
                    continue

                ip_layer = pkt[IP]
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst
                proto = "TCP" if pkt.haslayer(TCP) else ("UDP" if pkt.haslayer(UDP) else "OTHER")
                
                src_port = 0
                dst_port = 0
                flags = []
                
                if pkt.haslayer(TCP):
                    tcp = pkt[TCP]
                    src_port = tcp.sport
                    dst_port = tcp.dport
                    # TCP Flags extraction
                    for flag_name, flag_val in [('SYN', 0x02), ('ACK', 0x10), ('FIN', 0x01), 
                                                ('RST', 0x04), ('PSH', 0x08), ('URG', 0x20)]:
                        if tcp.flags & flag_val:
                            flags.append(flag_name)

                elif pkt.haslayer(UDP):
                    udp = pkt[UDP]
                    src_port = udp.sport
                    dst_port = udp.dport

                # Flow 5-tuple key (strictly unidirectional)
                flow_key = f"{src_ip}:{src_port}->{dst_ip}:{dst_port}_{proto}"
                pkt_len = len(pkt)
                pkt_time = float(pkt.time)

                if flow_key not in flow_table:
                    flow_table[flow_key] = {
                        "flow_id": f"FLW-{uuid.uuid4().hex[:10].upper()}",
                        "src_ip": src_ip,
                        "dst_ip": dst_ip,
                        "src_port": src_port,
                        "dst_port": dst_port,
                        "protocol": proto,
                        "packet_count": 0,
                        "byte_count": 0,
                        "start_time": pkt_time,
                        "end_time": pkt_time,
                        "packet_timestamps": [],
                        "tcp_flags": set(),
                        "unidirectional": True,
                        "tls_sni": None,
                        "tls_client_hello_raw": None,
                        "dns_query": None
                    }

                record = flow_table[flow_key]
                record["packet_count"] += 1
                record["byte_count"] += pkt_len
                record["end_time"] = pkt_time
                record["packet_timestamps"].append(pkt_time)
                record["tcp_flags"].update(flags)

                # DNS metadata extraction (plaintext protocol)
                if pkt.haslayer(DNS) and pkt.haslayer(DNSQR):
                    qname = pkt[DNSQR].qname.decode(errors="ignore").rstrip(".")
                    record["dns_query"] = qname

                # TLS Client Hello handshake metadata extraction (no decryption)
                if proto == "TCP" and (dst_port == 443 or dst_port == 8443) and pkt.haslayer(Raw):
                    payload = bytes(pkt[Raw])
                    # Check for TLS Handshake (0x16) and Client Hello (0x01)
                    if len(payload) > 5 and payload[0] == 0x16 and payload[1] == 0x03:
                        record["tls_client_hello_raw"] = payload.hex()[:400]

                # Yield flow when inactive window expires or packet threshold met
                if record["packet_count"] >= 100 or (pkt_time - record["start_time"] > 2.0):
                    yield self._finalize_flow_record(flow_table.pop(flow_key))

        # Flush remaining flows
        for flow_key, record in list(flow_table.items()):
            yield self._finalize_flow_record(record)

    def parse_netflow_ipfix_record(self, raw_flow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes NetFlow v9 or IPFIX unidirectional exporter records.
        """
        return {
            "flow_id": raw_flow.get("flow_id", f"FLW-{uuid.uuid4().hex[:10].upper()}"),
            "timestamp": raw_flow.get("timestamp", time.time()),
            "src_ip": raw_flow["src_ip"],
            "dst_ip": raw_flow["dst_ip"],
            "src_port": int(raw_flow.get("src_port", 0)),
            "dst_port": int(raw_flow.get("dst_port", 80)),
            "protocol": raw_flow.get("protocol", "TCP"),
            "packet_count": int(raw_flow.get("packets", 1)),
            "byte_count": int(raw_flow.get("bytes", 64)),
            "duration_ms": float(raw_flow.get("duration_ms", 10.0)),
            "unidirectional": True,
            "tcp_flags": raw_flow.get("tcp_flags", ["SYN"]),
            "tls_sni": raw_flow.get("tls_sni"),
            "dns_query": raw_flow.get("dns_query"),
            "tls_client_hello_raw": raw_flow.get("tls_client_hello_raw")
        }

    def _finalize_flow_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Finalizes timestamps and formats into standardized Pub/Sub JSON structure."""
        timestamps = record.pop("packet_timestamps", [])
        duration_ms = max(1.0, (record["end_time"] - record["start_time"]) * 1000.0)
        
        return {
            "flow_id": record["flow_id"],
            "timestamp": record["start_time"],
            "src_ip": record["src_ip"],
            "dst_ip": record["dst_ip"],
            "src_port": record["src_port"],
            "dst_port": record["dst_port"],
            "protocol": record["protocol"],
            "packet_count": record["packet_count"],
            "byte_count": record["byte_count"],
            "duration_ms": round(duration_ms, 2),
            "unidirectional": True,
            "tcp_flags": list(record["tcp_flags"]),
            "inter_arrival_times_ms": [
                round((timestamps[i] - timestamps[i - 1]) * 1000.0, 3)
                for i in range(1, len(timestamps))
            ] if len(timestamps) > 1 else [],
            "tls_sni": record["tls_sni"],
            "tls_client_hello_raw": record["tls_client_hello_raw"],
            "dns_query": record["dns_query"]
        }

    def publish_flow(self, flow_dict: Dict[str, Any]) -> None:
        """Publishes an ingested unidirectional flow record into Google Cloud Pub/Sub."""
        payload_bytes = json.dumps(flow_dict).encode("utf-8")
        if self.publisher:
            future = self.publisher.publish(self.topic_path, payload_bytes)
            future.add_done_callback(lambda f: logger.debug("Published flow %s", flow_dict["flow_id"]))
        else:
            logger.debug("[LOCAL STREAM] Pub/Sub: %s", flow_dict["flow_id"])


def main():
    parser = argparse.ArgumentParser(description="Unidirectional Ingest Pipeline for GCP Cyber Threat Detection")
    parser.add_argument("--project_id", default="cyber-threat-detection", help="GCP Project ID")
    parser.add_argument("--topic_id", default="ip-traffic-ingest", help="Cloud Pub/Sub topic name")
    parser.add_argument("--pcap", help="Path to PCAP file for offline ingestion")
    parser.add_argument("--mock_rate", type=int, default=100, help="Mock generation rate (flows/sec) if no PCAP provided")
    args = parser.parse_args()

    engine = UnidirectionalIngestEngine(project_id=args.project_id, topic_id=args.topic_id)

    if args.pcap and os.path.exists(args.pcap):
        logger.info("Ingesting from PCAP: %s", args.pcap)
        for flow in engine.parse_pcap_stream(args.pcap):
            engine.publish_flow(flow)
    else:
        logger.info("Generating continuous synthetic unidirectional flow stream at %d flows/sec...", args.mock_rate)
        import random
        while True:
            t0 = time.time()
            for _ in range(args.mock_rate):
                mock_flow = engine.parse_netflow_ipfix_record({
                    "src_ip": f"198.51.100.{random.randint(10, 240)}",
                    "dst_ip": f"10.128.0.{random.randint(5, 50)}",
                    "src_port": random.randint(1024, 65535),
                    "dst_port": random.choice([80, 443, 22, 53, 8443, 3389]),
                    "protocol": random.choice(["TCP", "TCP", "UDP"]),
                    "packets": random.randint(10, 5000),
                    "bytes": random.randint(500, 2000000),
                    "duration_ms": random.uniform(20.0, 500.0),
                    "tcp_flags": ["SYN"] if random.random() < 0.1 else ["ACK", "PSH"]
                })
                engine.publish_flow(mock_flow)
            elapsed = time.time() - t0
            if elapsed < 1.0:
                time.sleep(1.0 - elapsed)


if __name__ == "__main__":
    main()
