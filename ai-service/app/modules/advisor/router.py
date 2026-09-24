"""
Udyog Samyog — Module A: Applicant Advisor & What-if Simulation Router
"""
import uuid
import time
from fastapi import APIRouter, Depends, HTTPException
from app.config import settings
from app.schemas.profile import (
    CompanyProfile,
    AdviseRequest,
    AdvisorResponse,
    ClearanceRequirement,
    SchemeEligibility,
    SourceCitation,
    WhatIfRequest,
    WhatIfResponse,
)
from app.security.context import get_user_context, SecurityContext
from app.kernel.rules.engine import rules_engine
from app.kernel.retrieval.index import retrieval_index
from app.kernel.llm.client import get_llm_client
from app.kernel.llm.prompts import get_prompt
from app.kernel.validators.output_validator import validate_ai_output
from app.kernel.audit.logger import log_telemetry, AuditRecord

router = APIRouter(prefix="/ai/advisor", tags=["Advisor"])


def _build_advisor_response(profile_data: dict, is_fallback_forced: bool = False) -> tuple[AdvisorResponse, bool]:
    eval_result = rules_engine.evaluate(profile_data)
    
    # Map clearances
    clearances: list[ClearanceRequirement] = []
    clearance_ids = []
    for c in eval_result["clearances"]:
        clearance_ids.append(c.get("id", ""))
        src = c.get("source", {})
        citations = []
        if src:
            citations.append(
                SourceCitation(
                    doc=src.get("doc", "Statutory Rulebook"),
                    section=src.get("section", "General Clause"),
                    url=src.get("url", "https://industry.maharashtra.gov.in/"),
                    last_verified=src.get("last_verified", "2026-09"),
                )
            )
        clearances.append(
            ClearanceRequirement(
                name=c.get("requires", "Statutory Clearance"),
                department=c.get("department", "State Department"),
                task_dept=c.get("task_dept", "general"),
                statutory_act=c.get("statutory_act", "State Industrial Regulations"),
                phase=c.get("phase", 1),
                order=c.get("order", 1),
                why=c.get("why", "Mandatory legal requirement"),
                documents=c.get("documents", []),
                sources=citations,
            )
        )

    # Map schemes
    schemes: list[SchemeEligibility] = []
    for s in eval_result["schemes"]:
        src = s.get("source", {})
        citations = []
        if src:
            citations.append(
                SourceCitation(
                    doc=src.get("doc", "Incentive Policy"),
                    section=src.get("section", "Schedule A"),
                    url=src.get("url", "https://industry.maharashtra.gov.in/"),
                    last_verified=src.get("last_verified", "2026-09"),
                )
            )
        schemes.append(
            SchemeEligibility(
                title=s.get("title", "State Subsidy Scheme"),
                department=s.get("department", "Directorate of Industries"),
                benefits=s.get("benefits", "Fiscal and regulatory incentives"),
                eligibility=s.get("eligibility", "Applicable based on enterprise criteria"),
                eligible=s.get("eligible", True),
                unmet_conditions=[],
                sources=citations,
            )
        )

    # Action Plan
    action_plan = [
        f"Phase 1: Secure environmental CTE from MPCB ({'Red Category' if eval_result['risk_tier'] == 'Red' else 'Orange/Green Category'}).",
        "Phase 2: Complete MIDC land use sanction, DISH factory layout vetting, and Fire Life Safety NOC.",
        "Phase 3: Apply for Consolidated Single-Window Industrial Establishment Permit via Directorate of Industries.",
    ]

    # Generate synthesis
    explanation = (
        f"Under Maharashtra statutory regulations, this unit is categorized as a {eval_result['msme_category']} enterprise "
        f"with a {eval_result['risk_tier']} environmental and structural risk tier. A total of {len(clearances)} clearances "
        f"are required across 3 operational phases. The unit qualifies for {len(schemes)} industrial incentive policies."
    )

    is_fallback = is_fallback_forced
    return AdvisorResponse(
        advice_id=f"adv-{uuid.uuid4().hex[:8]}",
        msme_category=eval_result["msme_category"],
        risk_tier=eval_result["risk_tier"],
        applicable_clearances=clearances,
        applicable_schemes=schemes,
        warnings=eval_result.get("warnings", []),
        action_plan=action_plan,
        explanation=explanation,
        engine_version=settings.rules_version,
        kb_version=settings.kb_version,
        is_fallback=is_fallback,
    ), is_fallback


@router.post("/advise", response_model=AdvisorResponse)
async def get_advice(
    req: AdviseRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    profile = req.get_profile()
    profile_data = profile.model_dump()

    # Deterministic evaluation
    resp, is_fallback = _build_advisor_response(profile_data)

    # Contextual query retrieval
    query = f"{profile.industry_category} {'hazardous' if profile.hazardous else 'standard'} {profile.district}"
    retrieval_docs = retrieval_index.search(query, top_k=2)

    # LLM Enhancement if available
    llm = get_llm_client()
    system_prompt, prompt_version = get_prompt("advisor-v1")
    prompt = (
        f"Applicant Profile: {profile_data}\n"
        f"Determined MSME Category: {resp.msme_category}, Risk Tier: {resp.risk_tier}\n"
        f"Clearances Count: {len(resp.applicable_clearances)}\n"
        f"Statutory References: {[d['content'] for d in retrieval_docs]}\n"
        f"Summarize the filing path concisely for the applicant without making any guarantees."
    )

    try:
        llm_text, fallback_used = await llm.generate(prompt=prompt, system_prompt=system_prompt, temperature=0.2)
        if not fallback_used and llm_text:
            validation = validate_ai_output(llm_text)
            resp.explanation = validation.sanitized_text
            resp.is_fallback = False
        else:
            resp.is_fallback = True
    except Exception:
        resp.is_fallback = True

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/advisor/advise",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=resp.is_fallback,
            prompt_version=prompt_version,
        )
    )
    return resp


@router.post("/whatif", response_model=WhatIfResponse)
async def what_if_analysis(
    req: WhatIfRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    base_data = req.profile.model_dump()
    base_resp, _ = _build_advisor_response(base_data)

    modified_data = base_data.copy()
    modified_data.update(req.changes)
    mod_resp, _ = _build_advisor_response(modified_data)

    base_clearance_names = {c.name for c in base_resp.applicable_clearances}
    mod_clearance_names = {c.name for c in mod_resp.applicable_clearances}

    added_clearances = list(mod_clearance_names - base_clearance_names)
    removed_clearances = list(base_clearance_names - mod_clearance_names)

    base_scheme_names = {s.title for s in base_resp.applicable_schemes}
    mod_scheme_names = {s.title for s in mod_resp.applicable_schemes}

    added_schemes = list(mod_scheme_names - base_scheme_names)
    removed_schemes = list(base_scheme_names - mod_scheme_names)

    diff_parts = []
    if added_clearances:
        diff_parts.append(f"Added clearances: {', '.join(added_clearances)}.")
    if removed_clearances:
        diff_parts.append(f"Exempted clearances: {', '.join(removed_clearances)}.")
    if added_schemes:
        diff_parts.append(f"New scheme entitlements: {', '.join(added_schemes)}.")
    if removed_schemes:
        diff_parts.append(f"Ineligible schemes: {', '.join(removed_schemes)}.")
    if not diff_parts:
        diff_parts.append("No change in statutory requirements for the requested parameter modifications.")

    diff_summary = " ".join(diff_parts)

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/advisor/whatif",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=False,
            prompt_version="v1",
        )
    )

    return WhatIfResponse(
        base=base_resp,
        modified=mod_resp,
        diff_summary=diff_summary,
        clearances_added=added_clearances,
        clearances_removed=removed_clearances,
        schemes_added=added_schemes,
        schemes_removed=removed_schemes,
        is_fallback=False,
    )
