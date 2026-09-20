"""
Pydantic schemas for Module E: Prediction & Analytics
"""
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel


class PredictTimelineRequest(BaseModel):
    application: Dict[str, Any]


class StageTimeline(BaseModel):
    name: str
    days_min: int
    days_max: int


class PredictTimelineResponse(BaseModel):
    current_stage: str
    estimated_days_interval: Tuple[int, int]
    statutory_sla_days: int = 45
    stage_breakdown: Dict[str, Any]
    confidence: str
    model_version: str = "gradient-boost-v1.0"
    is_fallback: bool = False


class PredictQueryRiskRequest(BaseModel):
    application: Dict[str, Any]
    completeness: Optional[Dict[str, Any]] = None


class PredictQueryRiskResponse(BaseModel):
    risk_score: float # 0.0 to 100.0
    risk_level: str # Low | Moderate | High
    reasons: List[str] = []
    recommended_actions: List[str] = []
    is_fallback: bool = False
