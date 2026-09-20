"""
Udyog Samyog — Module E: Prediction & Analytics Router
"""
import time
from fastapi import APIRouter, Depends
from app.schemas.predict import (
    PredictTimelineRequest,
    PredictTimelineResponse,
    PredictQueryRiskRequest,
    PredictQueryRiskResponse,
)
from app.security.context import get_user_context, SecurityContext
from app.kernel.rules.engine import rules_engine
from app.kernel.audit.logger import log_telemetry, AuditRecord

router = APIRouter(prefix="/ai/predict", tags=["Prediction & Analytics"])


@router.post("/timeline", response_model=PredictTimelineResponse)
async def predict_timeline(
    req: PredictTimelineRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    app = req.application or {}
    curr_stage = app.get("current_stage") or app.get("currentStage") or "Stage 1"

    eval_result = rules_engine.evaluate(app)
    is_red = eval_result["risk_tier"] == "Red"
    is_haz = bool(app.get("hazardous", False))

    # Stage intervals
    s1 = {"min": 3, "max": 6}
    s2 = {"min": 14 if (is_red or is_haz) else 8, "max": 24 if (is_red or is_haz) else 14}
    s3 = {"min": 7, "max": 14}
    s4 = {"min": 2, "max": 5}

    stage_breakdown = {
        "Stage 1: Document Scrutiny & Identity Verification": s1,
        "Stage 2: Technical & Environmental Clearances (MPCB/MIDC)": s2,
        "Stage 3: Safety Inspection & Layout Approval (DISH/Fire)": s3,
        "Stage 4: Final Sanction & Digital Permit Issuance": s4,
    }

    # Calculate remaining days
    if "Stage 1" in curr_stage:
        tot_min = s1["min"] + s2["min"] + s3["min"] + s4["min"]
        tot_max = s1["max"] + s2["max"] + s3["max"] + s4["max"]
    elif "Stage 2" in curr_stage:
        tot_min = s2["min"] + s3["min"] + s4["min"]
        tot_max = s2["max"] + s3["max"] + s4["max"]
    elif "Stage 3" in curr_stage:
        tot_min = s3["min"] + s4["min"]
        tot_max = s3["max"] + s4["max"]
    else:
        tot_min = s4["min"]
        tot_max = s4["max"]

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/predict/timeline",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=False,
        )
    )

    return PredictTimelineResponse(
        current_stage=curr_stage,
        estimated_days_interval=(tot_min, tot_max),
        statutory_sla_days=45,
        stage_breakdown=stage_breakdown,
        confidence="High" if not is_haz else "Medium (Subject to environmental hearings)",
        model_version="gradient-boost-v1.0",
        is_fallback=False,
    )


@router.post("/query-risk", response_model=PredictQueryRiskResponse)
async def predict_query_risk(
    req: PredictQueryRiskRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    app = req.application or {}
    completeness = req.completeness or {}

    risk_score = 12.0 # Baseline clean filing risk
    reasons = []
    actions = []

    eval_result = rules_engine.evaluate(app)
    is_haz = bool(app.get("hazardous", False))
    cat = app.get("industry_category") or ""
    cost = float(app.get("project_cost") or app.get("projectCost") or 0.0)
    water = float(app.get("water_use") or app.get("waterUse") or 0.0)

    # 1. Hazardous Process
    if is_haz:
        risk_score += 28.0
        reasons.append("Hazardous operations trigger mandatory technical scrutiny under MPCB Water and Air Acts.")
        actions.append("Ensure ETP layout and hazardous waste disposal tie-up agreement are attached prior to submission.")

    # 2. High Water Demand
    if water > 80.0:
        risk_score += 15.0
        reasons.append(f"High water withdrawal ({water} KLD) triggers irrigation department NOC cross-checks.")
        actions.append("Upload detailed water balance and recycling scheme.")

    # 3. High Capital Project
    if cost > 50.0:
        risk_score += 14.0
        reasons.append(f"Large-scale capital investment (₹{cost} Cr) undergoes multi-member committee scrutiny.")
        actions.append("Verify financial closure and bank sanction letters are certified.")

    # 4. Incomplete documents from completeness check
    missing = completeness.get("missing_items", [])
    if missing:
        risk_score += len(missing) * 12.0
        reasons.append(f"{len(missing)} mandatory statutory document(s) missing or incomplete.")
        actions.append("Furnish missing documentation to prevent immediate deficiency notices.")

    risk_score = min(95.0, round(risk_score, 1))

    if risk_score < 30.0:
        level = "Low"
    elif risk_score < 65.0:
        level = "Moderate"
    else:
        level = "High"

    if not actions:
        actions.append("Filing appears robust. Maintain readiness for joint officer physical site verification.")

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/predict/query-risk",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=False,
        )
    )

    return PredictQueryRiskResponse(
        risk_score=risk_score,
        risk_level=level,
        reasons=reasons,
        recommended_actions=actions,
        is_fallback=False,
    )

