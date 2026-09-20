"""
Udyog Samyog — Audit Logging & Telemetry Tracking
"""
import time
import json
import logging
from collections import deque
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger("udyog_ai.audit")

# Maintain an in-memory buffer of recent telemetry records (up to 1000 events)
_TELEMETRY_BUFFER = deque(maxlen=1000)
_FEEDBACK_STORE: List[Dict[str, Any]] = []

# Counters
_METRICS = {
    "total_requests": 0,
    "fallback_count": 0,
    "guardrail_violations": 0,
    "total_latency_ms": 0.0,
    "endpoints": {},
}


class AuditRecord:
    def __init__(
        self,
        endpoint: str,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
        latency_ms: float = 0.0,
        tokens_in: int = 0,
        tokens_out: int = 0,
        is_fallback: bool = False,
        status_code: int = 200,
        guardrail_violation: Optional[str] = None,
        prompt_version: str = "v1",
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.endpoint = endpoint
        self.user_id = user_id
        self.role = role
        self.latency_ms = latency_ms
        self.tokens_in = tokens_in
        self.tokens_out = tokens_out
        self.is_fallback = is_fallback
        self.status_code = status_code
        self.guardrail_violation = guardrail_violation
        self.prompt_version = prompt_version
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "endpoint": self.endpoint,
            "user_id": self.user_id,
            "role": self.role,
            "latency_ms": round(self.latency_ms, 2),
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "is_fallback": self.is_fallback,
            "status_code": self.status_code,
            "guardrail_violation": self.guardrail_violation,
            "prompt_version": self.prompt_version,
            "metadata": self.metadata,
        }


def log_telemetry(record: AuditRecord):
    """
    Records an invocation in memory and outputs structured log.
    """
    rec_dict = record.to_dict()
    _TELEMETRY_BUFFER.append(rec_dict)
    
    # Update aggregate metrics
    _METRICS["total_requests"] += 1
    if record.is_fallback:
        _METRICS["fallback_count"] += 1
    if record.guardrail_violation:
        _METRICS["guardrail_violations"] += 1
    _METRICS["total_latency_ms"] += record.latency_ms
    
    ep = record.endpoint
    _METRICS["endpoints"][ep] = _METRICS["endpoints"].get(ep, 0) + 1
    
    # Append to JSONL audit file in data_dir
    try:
        audit_file = settings.data_dir / "audit_telemetry.jsonl"
        with open(audit_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec_dict) + "\n")
    except Exception as exc:
        logger.error(f"Failed to persist audit log: {exc}")


def record_feedback(
    request_id: str,
    endpoint: str,
    rating: int,
    user_id: Optional[str] = None,
    comments: Optional[str] = None,
    module: Optional[str] = None,
) -> Dict[str, Any]:
    item = {
        "id": f"fb-{int(time.time() * 1000)}",
        "request_id": request_id,
        "endpoint": endpoint,
        "rating": rating,
        "user_id": user_id,
        "comments": comments or "",
        "module": module or "general",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _FEEDBACK_STORE.append(item)
    return item


def get_telemetry_summary() -> Dict[str, Any]:
    """
    Returns aggregated metrics for the Operations & Admin console.
    """
    tot = _METRICS["total_requests"]
    avg_lat = round(_METRICS["total_latency_ms"] / tot, 2) if tot > 0 else 0.0
    fb_rate = round((_METRICS["fallback_count"] / tot) * 100, 2) if tot > 0 else 0.0
    
    return {
        "total_requests": tot,
        "fallback_count": _METRICS["fallback_count"],
        "fallback_rate_pct": fb_rate,
        "guardrail_violations": _METRICS["guardrail_violations"],
        "average_latency_ms": avg_lat,
        "endpoints": _METRICS["endpoints"],
        "recent_events": list(_TELEMETRY_BUFFER)[-50:],
        "feedback_count": len(_FEEDBACK_STORE),
        "recent_feedback": _FEEDBACK_STORE[-20:],
    }
