"""
Pydantic schemas for Module B: Smart Application Form
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class FormFieldSuggestion(BaseModel):
    field: str
    value: Any
    confidence: float
    reason: str
    source: str = "rules_engine"


class FormSuggestRequest(BaseModel):
    application: Dict[str, Any]


class FormSuggestResponse(BaseModel):
    suggestions: List[FormFieldSuggestion]
    status: str = "ok"
    is_fallback: bool = False


class MissingItem(BaseModel):
    item: str
    phase: int
    department: str
    reason: str


class InconsistencyItem(BaseModel):
    field: str
    issue: str


class CompletenessCheckRequest(BaseModel):
    application: Dict[str, Any]
    documents: Optional[List[Dict[str, Any]]] = []


class CompletenessCheckResponse(BaseModel):
    is_complete: bool
    missing_items: List[MissingItem] = []
    inconsistencies: List[InconsistencyItem] = []
    completeness_score: float = 1.0
    status: str = "ok"
    is_fallback: bool = False

