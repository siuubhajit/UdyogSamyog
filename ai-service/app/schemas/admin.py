"""
Pydantic schemas for Module I: Admin Console & Operations Center
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class RuleItem(BaseModel):
    id: str
    rule_key: str
    version: int
    department: str
    requires: str
    phase: int
    when: Dict[str, Any]
    status: str # active | draft | retired
    last_verified: Optional[str] = None


class KillSwitchItem(BaseModel):
    module: str
    enabled: bool
    updated_by: Optional[str] = None
    reason: Optional[str] = None


class TelemetryMetrics(BaseModel):
    total_requests: int
    error_rate: float
    fallback_rate: float
    latency_p95_ms: float
    active_kill_switches: List[str]
    model_version: str
    kb_version: str
    rules_version: str


class FeedbackSubmission(BaseModel):
    request_id: str
    rating: int # 1 to 5
    comment: Optional[str] = None

