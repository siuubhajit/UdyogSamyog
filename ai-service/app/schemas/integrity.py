"""
Pydantic schemas for Module F: Integrity & Anomaly Detection
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AnomalyFlag(BaseModel):
    id: Optional[str] = None
    type: str # duplicate_doc | data_inconsistency | tampering_hint | outlier | certificate_anomaly
    severity: str # low | medium | high
    evidence: str
    status: str = "open" # open | dismissed | confirmed
    created_at: Optional[str] = None


class IntegrityScanRequest(BaseModel):
    application: Dict[str, Any]
    documents: Optional[List[Dict[str, Any]]] = []


class IntegrityScanResponse(BaseModel):
    application_id: str
    flags_count: int
    flags: List[AnomalyFlag] = []
    is_fallback: bool = False


class VerifyCertificateRequest(BaseModel):
    application_no: str
    certificate_hash: str


class VerifyCertificateResponse(BaseModel):
    valid: bool
    issuer: str = "Directorate of Industries, Maharashtra"
    application_no: str
    issued_at: Optional[str] = None
    fingerprint_match: bool = True

