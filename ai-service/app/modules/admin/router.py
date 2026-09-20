"""
Udyog Samyog — Module I: Admin Console & Operations Center Router
"""
import json
import time
from pathlib import Path
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from app.config import settings
from app.schemas.admin import (
    RuleItem,
    KillSwitchItem,
    TelemetryMetrics,
    FeedbackSubmission,
)
from app.security.context import get_user_context, SecurityContext
from app.kernel.rules.definitions import STATUTORY_RULES
from app.kernel.retrieval.kb_store import KB_DOCUMENTS
from app.kernel.retrieval.index import retrieval_index
from app.kernel.llm.prompts import PROMPT_STORE
from app.kernel.audit.logger import (
    log_telemetry,
    record_feedback,
    get_telemetry_summary,
    AuditRecord,
)

router = APIRouter(prefix="/ai/admin", tags=["Admin Console"])

KILL_SWITCH_FILE = settings.data_dir / "kill_switches.json"
_KILL_SWITCHES: Dict[str, Dict[str, Any]] = {
    "advisor": {"enabled": True, "reason": "Operational"},
    "form_assist": {"enabled": True, "reason": "Operational"},
    "doc_intel": {"enabled": True, "reason": "Operational"},
    "copilot": {"enabled": True, "reason": "Operational"},
    "predict": {"enabled": True, "reason": "Operational"},
    "integrity": {"enabled": True, "reason": "Operational"},
    "chat": {"enabled": True, "reason": "Operational"},
}

if KILL_SWITCH_FILE.exists():
    try:
        with open(KILL_SWITCH_FILE, "r", encoding="utf-8") as f:
            _KILL_SWITCHES.update(json.load(f))
    except Exception:
        pass


def _save_kill_switches():
    try:
        with open(KILL_SWITCH_FILE, "w", encoding="utf-8") as f:
            json.dump(_KILL_SWITCHES, f, indent=2)
    except Exception:
        pass


@router.get("/rules")
async def get_rules(ctx: SecurityContext = Depends(get_user_context)):
    return {
        "version": settings.rules_version,
        "count": len(STATUTORY_RULES),
        "rules": STATUTORY_RULES,
    }


@router.post("/rules")
async def add_or_update_rule(
    rule: Dict[str, Any],
    ctx: SecurityContext = Depends(get_user_context),
):
    if ctx.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrative officers may modify statutory rule definitions.")
    
    rule_id = rule.get("id")
    if not rule_id:
        raise HTTPException(status_code=400, detail="Rule ID is required.")

    # Find and update or append
    existing = next((r for r in STATUTORY_RULES if r["id"] == rule_id), None)
    if existing:
        existing.update(rule)
    else:
        STATUTORY_RULES.append(rule)

    return {"ok": True, "message": f"Statutory rule '{rule_id}' updated successfully."}


@router.get("/kb")
async def get_kb_documents(ctx: SecurityContext = Depends(get_user_context)):
    return {
        "version": settings.kb_version,
        "count": len(KB_DOCUMENTS),
        "documents": KB_DOCUMENTS,
    }


@router.post("/kb")
async def add_kb_document(
    doc: Dict[str, Any],
    ctx: SecurityContext = Depends(get_user_context),
):
    if ctx.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative privileges required.")
    
    doc_id = doc.get("id") or f"kb-custom-{int(time.time())}"
    doc["id"] = doc_id
    KB_DOCUMENTS.append(doc)
    retrieval_index.refresh()

    return {"ok": True, "message": f"Knowledge base document '{doc_id}' added and re-indexed."}


@router.get("/prompts")
async def get_prompts(ctx: SecurityContext = Depends(get_user_context)):
    return {
        "count": len(PROMPT_STORE),
        "prompts": PROMPT_STORE,
    }


@router.get("/models")
async def get_models(ctx: SecurityContext = Depends(get_user_context)):
    return {
        "active_primary_llm": "gemini-1.5-flash",
        "has_gemini_key": bool(settings.gemini_api_key),
        "active_fallback": "deterministic-rules-synthesizer-v1.0",
        "active_timeline_estimator": "gradient-boost-v1.0",
        "rules_version": settings.rules_version,
        "kb_version": settings.kb_version,
    }


@router.get("/toggles")
async def get_toggles(ctx: SecurityContext = Depends(get_user_context)):
    return _KILL_SWITCHES


@router.post("/toggles")
async def update_toggle(
    item: KillSwitchItem,
    ctx: SecurityContext = Depends(get_user_context),
):
    if ctx.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative privileges required to toggle module kill-switches.")
    
    _KILL_SWITCHES[item.module] = {
        "enabled": item.enabled,
        "updated_by": ctx.user_id,
        "reason": item.reason or "Manual administrative toggle",
    }
    _save_kill_switches()

    return {
        "ok": True,
        "module": item.module,
        "enabled": item.enabled,
        "message": f"Kill switch for module '{item.module}' set to {'ENABLED' if item.enabled else 'DISABLED'}.",
    }


@router.get("/metrics")
async def get_metrics(ctx: SecurityContext = Depends(get_user_context)):
    summary = get_telemetry_summary()
    active_switches = [k for k, v in _KILL_SWITCHES.items() if not v.get("enabled", True)]

    tot = summary["total_requests"]
    fb_rate = summary["fallback_rate_pct"]

    return {
        "total_requests": tot,
        "error_rate": round(summary["guardrail_violations"] / tot, 3) if tot > 0 else 0.0,
        "fallback_rate": fb_rate,
        "latency_p95_ms": summary["average_latency_ms"] * 1.3,
        "active_kill_switches": active_switches,
        "model_version": "gemini-1.5-flash / fallback-rules-v1.0",
        "kb_version": settings.kb_version,
        "rules_version": settings.rules_version,
        "details": summary,
    }


@router.post("/feedback")
async def submit_feedback(
    fb: FeedbackSubmission,
    ctx: SecurityContext = Depends(get_user_context),
):
    rec = record_feedback(
        request_id=fb.request_id,
        endpoint="/ai/feedback",
        rating=fb.rating,
        user_id=ctx.user_id,
        comments=fb.comment,
    )
    return {"ok": True, "feedback": rec}

