"""
Pydantic schemas for Module A: Applicant Advisor & What-if Analysis
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SourceCitation(BaseModel):
    doc: str
    section: str
    url: str
    last_verified: Optional[str] = "2026-09"


class ClearanceRequirement(BaseModel):
    name: str
    department: str
    task_dept: str
    statutory_act: str
    phase: int
    order: int
    why: str
    documents: List[str]
    sources: List[SourceCitation] = []


class SchemeEligibility(BaseModel):
    title: str
    department: str
    benefits: str
    eligibility: str
    eligible: bool
    unmet_conditions: List[str] = []
    sources: List[SourceCitation] = []


class CompanyProfile(BaseModel):
    industry_category: str = Field(..., description="Industrial sector name")
    project_cost: float = Field(..., ge=0.0, description="Capital investment in INR Crores")
    land_size: float = Field(..., ge=0.0, description="Plot size in Acres")
    built_up_area_sqm: Optional[float] = Field(None, ge=0.0, description="Built-up factory area in sqm")
    water_use: float = Field(default=10.0, ge=0.0, description="Daily water demand in KLD")
    electricity: float = Field(default=100.0, ge=0.0, description="Connected power load in kVA/HP")
    hazardous: bool = Field(default=False, description="Whether hazardous chemicals/processes are involved")
    hazard_level: Optional[str] = Field(default="Low Risk", description="Hazard category")
    district: str = Field(default="Pune", description="District in Maharashtra")
    location: Optional[str] = Field(default="Industrial Estate", description="Specific locality")
    employment_potential: int = Field(default=50, ge=0, description="Estimated direct workforce")
    is_expansion: bool = Field(default=False, description="New unit or expansion")
    ownership_type: Optional[str] = Field(default="Private Limited", description="Enterprise ownership")
    export_oriented: bool = Field(default=False, description="Export-oriented unit")


class AdviseRequest(BaseModel):
    profile: Optional[CompanyProfile] = None
    industry_category: Optional[str] = None
    project_cost: Optional[float] = None
    land_size: Optional[float] = None
    built_up_area_sqm: Optional[float] = None
    water_use: Optional[float] = 10.0
    electricity: Optional[float] = 100.0
    hazardous: Optional[bool] = False
    hazard_level: Optional[str] = "Low Risk"
    district: Optional[str] = "Pune"
    location: Optional[str] = "Industrial Estate"
    employment_potential: Optional[int] = 50
    is_expansion: Optional[bool] = False
    ownership_type: Optional[str] = "Private Limited"
    export_oriented: Optional[bool] = False

    def get_profile(self) -> CompanyProfile:
        if self.profile:
            return self.profile
        return CompanyProfile(
            industry_category=self.industry_category or "Light Engineering",
            project_cost=self.project_cost if self.project_cost is not None else 1.0,
            land_size=self.land_size if self.land_size is not None else 1.0,
            built_up_area_sqm=self.built_up_area_sqm,
            water_use=self.water_use if self.water_use is not None else 10.0,
            electricity=self.electricity if self.electricity is not None else 100.0,
            hazardous=self.hazardous if self.hazardous is not None else False,
            hazard_level=self.hazard_level or "Low Risk",
            district=self.district or "Pune",
            location=self.location or "Industrial Estate",
            employment_potential=self.employment_potential if self.employment_potential is not None else 50,
            is_expansion=self.is_expansion if self.is_expansion is not None else False,
            ownership_type=self.ownership_type or "Private Limited",
            export_oriented=self.export_oriented if self.export_oriented is not None else False,
        )


class AdvisorResponse(BaseModel):
    advice_id: str
    msme_category: str
    risk_tier: str
    applicable_clearances: List[ClearanceRequirement]
    applicable_schemes: List[SchemeEligibility]
    warnings: List[str] = []
    action_plan: List[str] = []
    explanation: str
    engine_version: str
    kb_version: str
    disclaimer: str = "Guidance only. Final requirements and permits are strictly determined by the statutory departments."
    is_fallback: bool = False


class WhatIfRequest(BaseModel):
    profile: CompanyProfile
    changes: Dict[str, Any]


class WhatIfResponse(BaseModel):
    base: AdvisorResponse
    modified: AdvisorResponse
    diff_summary: str
    clearances_added: List[str] = []
    clearances_removed: List[str] = []
    schemes_added: List[str] = []
    schemes_removed: List[str] = []
    is_fallback: bool = False
