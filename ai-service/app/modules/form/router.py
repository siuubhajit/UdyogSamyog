"""
Udyog Samyog — Module B: Smart Form Assistance & Completeness Checker Router
"""
import time
from fastapi import APIRouter, Depends
from app.schemas.form import (
    FormSuggestRequest,
    FormSuggestResponse,
    FormFieldSuggestion,
    CompletenessCheckRequest,
    CompletenessCheckResponse,
    MissingItem,
    InconsistencyItem,
)
from app.security.context import get_user_context, SecurityContext
from app.kernel.rules.engine import rules_engine
from app.kernel.audit.logger import log_telemetry, AuditRecord

router = APIRouter(prefix="/ai/form", tags=["Smart Form"])


@router.post("/suggest", response_model=FormSuggestResponse)
async def suggest_fields(
    req: FormSuggestRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    app = req.application or {}
    suggestions: list[FormFieldSuggestion] = []

    cat = app.get("industry_category") or app.get("industryCategory") or ""
    cost = float(app.get("project_cost") or app.get("projectCost") or 0.0)
    land = float(app.get("land_size") or app.get("landSize") or 0.0)
    haz = app.get("hazardous")

    # Suggest hazardous status if empty
    if haz is None:
        if cat in ["Chemicals", "Pharmaceuticals", "Dyes & Pigments", "Pesticides"]:
            suggestions.append(
                FormFieldSuggestion(
                    field="hazardous",
                    value=True,
                    confidence=0.92,
                    reason=f"Operations in '{cat}' generally utilize regulated scheduled chemicals under MPCB Schedule I.",
                    source="statutory_rules",
                )
            )
        elif cat in ["IT & Electronics", "Software", "Textile Garments"]:
            suggestions.append(
                FormFieldSuggestion(
                    field="hazardous",
                    value=False,
                    confidence=0.95,
                    reason=f"Sector '{cat}' operates non-hazardous clean assembly or software development.",
                    source="statutory_rules",
                )
            )

    # Suggest MSME Category
    if not app.get("msme_category") and not app.get("msmeCategory") and cost > 0:
        if cost <= 1.0:
            msme = "Micro"
        elif cost <= 10.0:
            msme = "Small"
        elif cost <= 50.0:
            msme = "Medium"
        else:
            msme = "Large"
        suggestions.append(
            FormFieldSuggestion(
                field="msme_category",
                value=msme,
                confidence=0.98,
                reason=f"Calculated from ₹{cost} Cr capital investment under MSMED Act 2020 definitions.",
                source="msmed_act_2020",
            )
        )

    # Suggest Water Use
    if (not app.get("water_use") and not app.get("waterUse")) and land > 0:
        if cat in ["Chemicals", "Pharmaceuticals", "Food Processing"]:
            suggested_water = round(land * 15.0, 1)
        else:
            suggested_water = round(land * 3.0, 1)
        suggestions.append(
            FormFieldSuggestion(
                field="water_use",
                value=suggested_water,
                confidence=0.80,
                reason=f"Standard baseline industrial consumption benchmark for {land} acres in {cat or 'General manufacturing'}.",
                source="industrial_benchmarks",
            )
        )

    # Suggest Connected Power Load
    if (not app.get("electricity")) and cost > 0:
        suggested_power = round(cost * 35.0, 1)
        suggestions.append(
            FormFieldSuggestion(
                field="electricity",
                value=suggested_power,
                confidence=0.82,
                reason=f"Estimated connected load demand ({suggested_power} kVA) derived from machinery capital outlay.",
                source="msedcl_tariff_norms",
            )
        )

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/form/suggest",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=False,
        )
    )

    return FormSuggestResponse(
        suggestions=suggestions,
        status="ok",
        is_fallback=False,
    )


@router.post("/completeness", response_model=CompletenessCheckResponse)
async def check_completeness(
    req: CompletenessCheckRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    app = req.application or {}
    docs = req.documents or []
    
    missing_items: list[MissingItem] = []
    inconsistencies: list[InconsistencyItem] = []

    # 1. Evaluate required clearances
    eval_result = rules_engine.evaluate(app)
    req_clearances = eval_result.get("clearances", [])

    uploaded_doc_types = {d.get("doc_type") or d.get("docType") or d.get("name", "").lower() for d in docs}

    # Verify critical document requirements
    for cl in req_clearances:
        doc_list = cl.get("documents", [])
        for doc_name in doc_list:
            found = any(
                doc_name.lower() in u.lower() or u in doc_name.lower()
                for u in uploaded_doc_types
            )
            if not found and doc_name not in [m.item for m in missing_items]:
                missing_items.append(
                    MissingItem(
                        item=doc_name,
                        phase=cl.get("phase", 1),
                        department=cl.get("department", "State Authority"),
                        reason=f"Required for {cl.get('requires', 'clearance')} approval.",
                    )
                )

    # 2. Cross-Field Inconsistency Verification
    cat = app.get("industry_category") or app.get("industryCategory") or ""
    cost = float(app.get("project_cost") or app.get("projectCost") or 0.0)
    land = float(app.get("land_size") or app.get("landSize") or 0.0)
    haz = bool(app.get("hazardous", False))
    water = float(app.get("water_use") or app.get("waterUse") or 0.0)
    elec = float(app.get("electricity") or 0.0)

    if haz and water <= 0:
        inconsistencies.append(
            InconsistencyItem(
                field="water_use",
                issue="Hazardous manufacturing processes require positive daily water balance for effluent and scrubber systems.",
            )
        )

    if cost >= 50.0 and app.get("msme_category") in ["Micro", "Small"]:
        inconsistencies.append(
            InconsistencyItem(
                field="msme_category",
                issue=f"Project cost ₹{cost} Cr exceeds Small enterprise ceiling of ₹10 Cr under MSMED Act.",
            )
        )

    if land > 0 and cost <= 0.01:
        inconsistencies.append(
            InconsistencyItem(
                field="project_cost",
                issue="Capital investment reported is unusually low for the declared land allocation.",
            )
        )

    if cat in ["Chemicals", "Pharmaceuticals", "Heavy Engineering"] and elec < 10:
        inconsistencies.append(
            InconsistencyItem(
                field="electricity",
                issue=f"Reported connected load ({elec} HP/kVA) is below industrial requirements for {cat}.",
            )
        )

    # Calculate Completeness Score
    penalty = (len(missing_items) * 0.08) + (len(inconsistencies) * 0.12)
    score = max(0.1, min(1.0, round(1.0 - penalty, 2)))
    is_complete = len(missing_items) == 0 and len(inconsistencies) == 0

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/form/completeness",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=False,
        )
    )

    return CompletenessCheckResponse(
        is_complete=is_complete,
        missing_items=missing_items,
        inconsistencies=inconsistencies,
        completeness_score=score,
        status="ok",
        is_fallback=False,
    )

