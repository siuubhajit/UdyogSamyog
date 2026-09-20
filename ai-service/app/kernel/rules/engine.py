"""
Pure Deterministic Rules Engine for Maharashtra Single Window System
Enforces Section 4.1: Deterministic First, Cycle-Free, Tested
"""
from typing import Dict, Any, List, Optional
from app.schemas.profile import (
    CompanyProfile,
    ClearanceRequirement,
    SchemeEligibility,
    SourceCitation,
)
from app.kernel.rules.definitions import STATUTORY_RULES, STATUTORY_SCHEMES


def _eval_condition(condition: Dict[str, Any], data: Dict[str, Any]) -> bool:
    if "all" in condition:
        return all(_eval_condition(c, data) for c in condition["all"])
    if "any" in condition:
        return any(_eval_condition(c, data) for c in condition["any"])
    if "not" in condition:
        return not _eval_condition(condition["not"], data)

    field = condition.get("field")
    op = condition.get("op", "==")
    target = condition.get("value")

    val = data.get(field)
    if val is None:
        return False

    try:
        if op == "==":
            return val == target
        if op == "!=":
            return val != target
        if op == ">":
            return float(val) > float(target)
        if op == ">=":
            return float(val) >= float(target)
        if op == "<":
            return float(val) < float(target)
        if op == "<=":
            return float(val) <= float(target)
        if op == "in":
            return val in target
        if op == "contains":
            return target in val
    except (ValueError, TypeError):
        return False

    return False


def calculate_msme_category(project_cost: float) -> str:
    if project_cost > 50.0:
        return "Large"
    if project_cost > 10.0:
        return "Medium"
    if project_cost > 1.0:
        return "Small"
    return "Micro"


def calculate_risk_tier(profile: CompanyProfile) -> str:
    if (
        profile.hazardous
        or profile.industry_category in ["Chemicals", "Pharmaceuticals"]
        or profile.land_size > 20.0
        or profile.water_use > 100.0
    ):
        return "Red"
    if (
        profile.land_size > 5.0
        or profile.water_use > 30.0
        or profile.electricity > 350.0
        or profile.industry_category in ["Food Processing", "Textile"]
    ):
        return "Orange"
    return "Green"


class RulesEngine:
    def __init__(self, custom_rules: Optional[List[Dict[str, Any]]] = None):
        self.rules = custom_rules or STATUTORY_RULES
        self.schemes = STATUTORY_SCHEMES

    def evaluate(self, profile: Any) -> Dict[str, Any]:
        if isinstance(profile, dict):
            norm = {
                "industry_category": profile.get("industry_category") or profile.get("industryCategory") or "General Manufacturing",
                "project_cost": float(profile.get("project_cost") or profile.get("projectCost") or 1.0),
                "land_size": float(profile.get("land_size") or profile.get("landSize") or 1.0),
                "built_up_area_sqm": float(profile.get("built_up_area_sqm") or 0.0),
                "water_use": float(profile.get("water_use") or profile.get("waterUse") or 10.0),
                "electricity": float(profile.get("electricity") or 50.0),
                "hazardous": bool(profile.get("hazardous", False)),
                "hazard_level": profile.get("hazard_level") or "Low Risk",
                "district": profile.get("district") or "Pune",
                "location": profile.get("location") or "Industrial Area",
                "employment_potential": int(profile.get("employment_potential") or profile.get("employment") or 50),
                "is_expansion": bool(profile.get("is_expansion", False)),
                "ownership_type": profile.get("ownership_type") or "Private Limited",
                "export_oriented": bool(profile.get("export_oriented", False)),
            }
            profile_obj = CompanyProfile(**norm)
        else:
            profile_obj = profile

        data = profile_obj.model_dump()
        msme_category = calculate_msme_category(profile_obj.project_cost)
        risk_tier = calculate_risk_tier(profile_obj)
        data["msme_category"] = msme_category
        data["risk_tier"] = risk_tier

        # Evaluate Clearances
        fired_clearances: List[ClearanceRequirement] = []
        raw_clearances: List[Dict[str, Any]] = []
        for r in self.rules:
            if r.get("status") != "active":
                continue
            cond = r.get("when", {})
            if _eval_condition(cond, data):
                src_data = r.get("source", {})
                source = SourceCitation(
                    doc=src_data.get("doc", "Maharashtra Statutory Act"),
                    section=src_data.get("section", "General Provision"),
                    url=src_data.get("url", "https://industries.maharashtra.gov.in"),
                    last_verified=src_data.get("last_verified", "2026-09"),
                )
                try:
                    why_text = r["reason_template"].format(**data)
                except Exception:
                    why_text = r["reason_template"]

                c_req = ClearanceRequirement(
                    name=r["requires"],
                    department=r["department"],
                    task_dept=r["task_dept"],
                    statutory_act=r["statutory_act"],
                    phase=r["phase"],
                    order=r["order"],
                    why=why_text,
                    documents=r.get("documents", []),
                    sources=[source],
                )
                fired_clearances.append(c_req)
                raw_c = dict(r)
                raw_c["why"] = why_text
                raw_clearances.append(raw_c)

        # Sort by phase, then order
        fired_clearances.sort(key=lambda c: (c.phase, c.order))
        raw_clearances.sort(key=lambda c: (c.get("phase", 1), c.get("order", 1)))

        # Evaluate Schemes
        applicable_schemes: List[SchemeEligibility] = []
        raw_schemes: List[Dict[str, Any]] = []
        for s in self.schemes:
            cond = s.get("when", {})
            is_eligible = _eval_condition(cond, data)
            unmet = []
            if not is_eligible:
                if s["id"] == "scheme-psi-2019" and profile_obj.project_cost < 0.5:
                    unmet.append("Requires minimum ₹0.5 Crore fixed capital investment.")
                elif s["id"] == "scheme-msins-seed-grant" and profile_obj.project_cost > 15.0:
                    unmet.append("Requires capital investment under ₹15 Crores.")
                elif s["id"] == "scheme-electricity-duty-waiver" and profile_obj.electricity < 20.0:
                    unmet.append("Requires connected power load of 20 kVA or above.")

            src_data = s.get("source", {})
            source = SourceCitation(
                doc=src_data.get("doc", "Government Resolution"),
                section=src_data.get("section", "Eligibility Clause"),
                url=src_data.get("url", "https://industries.maharashtra.gov.in"),
                last_verified=src_data.get("last_verified", "2026-09"),
            )
            sc_elig = SchemeEligibility(
                title=s["title"],
                department=s["department"],
                benefits=s["benefits"],
                eligibility=s["eligibility"],
                eligible=is_eligible,
                unmet_conditions=unmet,
                sources=[source],
            )
            applicable_schemes.append(sc_elig)
            raw_s = dict(s)
            raw_s["eligible"] = is_eligible
            raw_schemes.append(raw_s)

        # Warnings & Action Plan
        warnings = []
        if profile_obj.hazardous and profile_obj.water_use > 50.0:
            warnings.append("High water use with hazardous chemicals requires dedicated zero-liquid-discharge (ZLD) ETP.")
        if profile_obj.project_cost > 10.0 and profile_obj.employment_potential < 10:
            warnings.append("Declared workforce potential is unusually low for project scale; review during DISH scrutiny.")

        action_plan = [
            "1. Upload Phase 1 Environmental plan & process flow for Maharashtra Pollution Control Board.",
            "2. Upload Phase 2 Civil site master plan, machine layout blueprint, and fire hydrant network for simultaneous scrutiny.",
            "3. Submit self-attested corporate identity and Udyam certification for Phase 3 consolidated license sanction.",
        ]

        explanation = (
            f"Statutory evaluation for enterprise '{profile_obj.industry_category}' in {profile_obj.district} District: "
            f"Classified as {msme_category} Enterprise under MSMED Act with {risk_tier} Environmental Risk tier. "
            f"A total of {len(fired_clearances)} mandatory statutory clearances and "
            f"{sum(1 for sc in applicable_schemes if sc.eligible)} eligible Maharashtra incentive schemes have been determined."
        )

        return {
            "msme_category": msme_category,
            "risk_tier": risk_tier,
            "applicable_clearances": fired_clearances,
            "clearances": raw_clearances,
            "applicable_schemes": applicable_schemes,
            "schemes": raw_schemes,
            "warnings": warnings,
            "action_plan": action_plan,
            "explanation": explanation,
        }


rules_engine = RulesEngine()
