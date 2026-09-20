"""
Pydantic schemas for Module C: Document Intelligence
"""
from typing import Dict, Any, Optional
from pydantic import BaseModel


class DocProcessRequest(BaseModel):
    document_id: str
    file_path: Optional[str] = None
    doc_type: Optional[str] = None


class DocExtractionResponse(BaseModel):
    document_id: str
    doc_type: str
    doc_type_confidence: float
    fields: Dict[str, Any]
    field_confidences: Dict[str, float]
    status: str = "extracted" # extracted | needs_review | confirmed
    summary: str = ""
    is_fallback: bool = False


class DocConfirmRequest(BaseModel):
    confirmed_fields: Dict[str, Any]
    reviewed_by: Optional[str] = None


class DocConfirmResponse(BaseModel):
    ok: bool = True
    document_id: str
    message: str
    status: str = "confirmed"

