"""
Udyog Samyog — Module G & H: Grounded Conversational Assistant & Multilingual Router
"""
import uuid
import time
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatCitation,
)
from app.security.context import get_user_context, SecurityContext
from app.kernel.retrieval.index import retrieval_index
from app.kernel.llm.client import get_llm_client
from app.kernel.llm.prompts import get_prompt
from app.kernel.guardrails.injection import sanitize_input, wrap_untrusted_input, GuardrailViolation
from app.kernel.validators.output_validator import validate_ai_output
from app.kernel.audit.logger import log_telemetry, AuditRecord

router = APIRouter(prefix="/ai/chat", tags=["Conversational Assistant"])


@router.post("", response_model=ChatResponse)
async def send_chat(
    req: ChatRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    conv_id = req.conversation_id or f"conv-{uuid.uuid4().hex[:8]}"
    lang = (req.language or "en").lower()

    # 1. Guardrail & Injection Protection
    try:
        sanitized_msg = sanitize_input(req.message)
    except GuardrailViolation as gv:
        log_telemetry(
            AuditRecord(
                endpoint="/ai/chat",
                user_id=ctx.user_id,
                role=ctx.role,
                latency_ms=10.0,
                status_code=400,
                guardrail_violation=str(gv),
            )
        )
        raise HTTPException(status_code=400, detail="Security check failed: Input text contains unauthorized instruction override or safety bypass pattern.")

    # 2. Scoped Hybrid Retrieval
    retrieved_docs = retrieval_index.search(sanitized_msg, top_k=3)
    
    citations: list[ChatCitation] = []
    kb_context_parts = []
    for d in retrieved_docs:
        sec = d.get("section", "Clause")
        doc_title = d.get("title", "Statutory Regulations")
        citations.append(
            ChatCitation(
                title=doc_title,
                section=sec,
                url=d.get("url"),
            )
        )
        kb_context_parts.append(f"[{doc_title} - {sec}]: {d.get('content')}")

    kb_context = "\n\n".join(kb_context_parts)

    # 3. Multilingual System Prompt Selection
    system_prompt, prompt_version = get_prompt("chat-assistant-v1")
    if lang == "mr":
        system_prompt += "\nRespond entirely in formal, polite Marathi (मराठी) using official administrative terminology."
    elif lang == "hi":
        system_prompt += "\nRespond entirely in formal, polite Hindi (हिन्दी) using clear official terminology."
    else:
        system_prompt += "\nRespond in clear, professional English."

    wrapped_user_query = wrap_untrusted_input(sanitized_msg, context_label="APPLICANT QUERY")
    prompt = (
        f"Role Scope: {ctx.role.upper()} (Department: {ctx.department or 'Single Window'})\n"
        f"Official Statutory Context:\n{kb_context}\n\n"
        f"Applicant Query:\n{wrapped_user_query}\n\n"
        f"Provide a helpful, precise answer strictly grounded in the official statutory text above. "
        f"If the information is not covered, state clearly that it is outside available guidelines."
    )

    # 4. LLM Generation
    llm = get_llm_client()
    reply = ""
    is_fallback = False
    try:
        raw_text, fallback_used = await llm.generate(prompt=prompt, system_prompt=system_prompt, temperature=0.2)
        if fallback_used or not raw_text:
            is_fallback = True
            if lang == "mr":
                reply = "आपल्या अर्जाच्या संदर्भात महाराष्ट्र प्रदूषण नियंत्रण मंडळ (MPCB), एमआयडीसी (MIDC) आणि उद्योग संचालनालयाच्या मार्गदर्शक तत्त्वांनुसार अधिकृत कागदपत्रे तपासली जात आहेत. कृपया पोर्टलवरील संबंधित विभागाचे परिपत्रक पहा."
            elif lang == "hi":
                reply = "आपके आवेदन के संबंध में महाराष्ट्र प्रदूषण नियंत्रण बोर्ड (MPCB), एमआईडीसी (MIDC) और उद्योग निदेशालय के नियमों के अनुसार दस्तावेजों की जांच की जा रही है। कृपया आधिकारिक पोर्टल दिशानिर्देश देखें।"
            else:
                reply = (
                    "Based on Maharashtra Single-Window industrial statutory guidelines, clearances are processed across 3 coordinated phases. "
                    "For detailed regulations, please review the MPCB Water & Air Act requirements, MIDC industrial zoning rules, and Directorate of Industries schemes."
                )
        else:
            validated = validate_ai_output(raw_text)
            reply = validated.sanitized_text
            is_fallback = False
    except Exception:
        is_fallback = True
        reply = "Our statutory information engine is currently operating in offline mode. Please refer to the statutory documents section."

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/chat",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=is_fallback,
            prompt_version=prompt_version,
        )
    )

    return ChatResponse(
        reply=reply,
        citations=citations,
        tools_used=["retrieval_index_search"],
        conversation_id=conv_id,
        is_fallback=is_fallback,
    )


@router.post("/stream")
async def stream_chat(
    req: ChatRequest,
    ctx: SecurityContext = Depends(get_user_context),
):
    start_time = time.time()
    conv_id = req.conversation_id or f"conv-{uuid.uuid4().hex[:8]}"
    lang = (req.language or "en").lower()

    # 1. Guardrail & Injection Protection
    try:
        sanitized_msg = sanitize_input(req.message)
    except GuardrailViolation as gv:
        log_telemetry(
            AuditRecord(
                endpoint="/ai/chat/stream",
                user_id=ctx.user_id,
                role=ctx.role,
                latency_ms=10.0,
                status_code=400,
                guardrail_violation=str(gv),
            )
        )
        raise HTTPException(status_code=400, detail="Security check failed: Input text contains unauthorized instruction override or safety bypass pattern.")

    # 2. Scoped Hybrid Retrieval
    retrieved_docs = retrieval_index.search(sanitized_msg, top_k=3)
    citations = []
    kb_context_parts = []
    for d in retrieved_docs:
        sec = d.get("section", "Clause")
        doc_title = d.get("title", "Statutory Regulations")
        citations.append({
            "title": doc_title,
            "section": sec,
            "url": d.get("url"),
        })
        kb_context_parts.append(f"[{doc_title} - {sec}]: {d.get('content')}")

    kb_context = "\n\n".join(kb_context_parts)

    # 3. Multilingual System Prompt Selection
    system_prompt, prompt_version = get_prompt("chat-assistant-v1")
    if lang == "mr":
        system_prompt += "\nRespond entirely in formal, polite Marathi (मराठी) using official administrative terminology."
    elif lang == "hi":
        system_prompt += "\nRespond entirely in formal, polite Hindi (हिन्दी) using clear official terminology."
    else:
        system_prompt += "\nRespond in clear, professional English."

    wrapped_user_query = wrap_untrusted_input(sanitized_msg, context_label="APPLICANT QUERY")
    prompt = (
        f"Role Scope: {ctx.role.upper()} (Department: {ctx.department or 'Single Window'})\n"
        f"Official Statutory Context:\n{kb_context}\n\n"
        f"Applicant Query:\n{wrapped_user_query}\n\n"
        f"Provide a helpful, precise answer strictly grounded in the official statutory text above. "
        f"If the information is not covered, state clearly that it is outside available guidelines."
    )

    llm = get_llm_client()
    reply = ""
    is_fallback = False
    try:
        raw_text, fallback_used = await llm.generate(prompt=prompt, system_prompt=system_prompt, temperature=0.2)
        if fallback_used or not raw_text:
            is_fallback = True
            if lang == "mr":
                reply = "आपल्या अर्जाच्या संदर्भात महाराष्ट्र प्रदूषण नियंत्रण मंडळ (MPCB), एमआयडीसी (MIDC) आणि उद्योग संचालनालयाच्या मार्गदर्शक तत्त्वांनुसार अधिकृत कागदपत्रे तपासली जात आहेत. कृपया पोर्टलवरील संबंधित विभागाचे परिपत्रक पहा."
            elif lang == "hi":
                reply = "आपके आवेदन के संबंध में महाराष्ट्र प्रदूषण नियंत्रण बोर्ड (MPCB), एमआईडीसी (MIDC) और उद्योग निदेशालय के नियमों के अनुसार दस्तावेजों की जांच की जा रही है। कृपया आधिकारिक पोर्टल दिशानिर्देश देखें।"
            else:
                reply = (
                    "Based on Maharashtra Single-Window industrial statutory guidelines, clearances are processed across 3 coordinated phases. "
                    "For detailed regulations, please review the MPCB Water & Air Act requirements, MIDC industrial zoning rules, and Directorate of Industries schemes."
                )
        else:
            validated = validate_ai_output(raw_text)
            reply = validated.sanitized_text
            is_fallback = False
    except Exception:
        is_fallback = True
        reply = "Our statutory information engine is currently operating in offline mode. Please refer to the statutory documents section."

    latency = (time.time() - start_time) * 1000
    log_telemetry(
        AuditRecord(
            endpoint="/ai/chat/stream",
            user_id=ctx.user_id,
            role=ctx.role,
            latency_ms=latency,
            is_fallback=is_fallback,
            prompt_version=prompt_version,
        )
    )

    async def event_generator():
        words = reply.split(" ")
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            payload = json.dumps({"token": chunk, "done": False})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.015)
        final_payload = json.dumps({
            "token": "",
            "done": True,
            "citations": citations,
            "conversation_id": conv_id,
            "is_fallback": is_fallback,
        })
        yield f"data: {final_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


