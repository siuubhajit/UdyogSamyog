"""
Pydantic schemas for Module D: Officer Copilot
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class CopilotBriefRequest(BaseModel):
    application: Dict[str, Any]
    documents: Optional[List[Dict[str, Any]]] = []
    queries: Optional[List[Dict[str, Any]]] = []


class DiscrepancyItem(BaseModel):
    title: str
    description: str
    severity: str = "medium" # low | medium | high
    evidence_field: str


class CopilotBriefResponse(BaseModel):
    application_no: str
    company_name: str
    district: str
    msme_category: str
    risk_tier: str
    current_stage: str
    overall_status: str
    summary: str
    total_documents: int
    verified_documents: int
    pending_documents: int
    open_queries: int
    checklist_pre_verification: List[Dict[str, Any]] = []
    discrepancies: List[DiscrepancyItem] = []
    suggested_next_action: str
    is_fallback: bool = False


class DraftQueryRequest(BaseModel):
    application: Dict[str, Any]
    missing_items: List[Dict[str, Any]] = []


class DraftQueryResponse(BaseModel):
    notice_text: str
    statutory_citations: List[str] = []
    is_fallback: bool = False


class SimilarCase(BaseModel):
    application_no: str
    company_name: str
    industry_category: str
    district: str
    risk_tier: str
    outcome: str
    days_to_clear: int
    similarity_score: float
    key_queries: List[str] = []


class SimilarCasesResponse(BaseModel):
    similar_cases: List[SimilarCase] = []
    is_fallback: bool = False

