"""
Udyog Samyog — Prompt Injection Guardrails and PII Sanitization
"""
import re
from typing import Tuple, List

# Suspicious patterns indicating prompt injection or jailbreak attempts
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior)\s+instructions",
    r"forget\s+(all\s+)?(previous|prior)\s+instructions",
    r"you\s+are\s+now\s+(DAN|unfiltered|jailbroken|an\s+unrestricted\s+ai)",
    r"bypass\s+(all\s+)?(safety|rules|restrictions|filters)",
    r"system\s+prompt\s+override",
    r"reveal\s+(your\s+)?(system\s+prompt|instructions|secret\s+key|api\s+key)",
    r"print\s+your\s+(initial|system)\s+instructions",
    r"roleplay\s+as\s+a\s+rogue",
    r"do\s+anything\s+now",
    r"---.*END.*UNTRUSTED",
    r"---.*BEGIN.*SYSTEM",
]

INJECTION_REGEXES = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]

# PII Patterns
AADHAAR_REGEX = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
PHONE_REGEX = re.compile(r"\b(?:\+?91[-.\s]?)?[6789]\d{9}\b")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
CARD_REGEX = re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b")


class GuardrailViolation(Exception):
    """Raised when an input violates safety or prompt-injection guardrails."""
    pass


def detect_prompt_injection(text: str) -> Tuple[bool, List[str]]:
    """
    Checks whether the input text contains prompt injection signatures.
    Returns (is_injected, matched_patterns).
    """
    if not text:
        return False, []
    
    matches = []
    for reg in INJECTION_REGEXES:
        if reg.search(text):
            matches.append(reg.pattern)
            
    return len(matches) > 0, matches


def redact_pii(text: str, mask_pan: bool = False) -> str:
    """
    Redacts sensitive personal information like Aadhaar, bank cards, emails, and phone numbers.
    Preserves business PAN if mask_pan=False, or masks it if True.
    """
    if not text:
        return ""
    
    cleaned = AADHAAR_REGEX.sub("[REDACTED_AADHAAR]", text)
    cleaned = CARD_REGEX.sub("[REDACTED_CARD]", cleaned)
    cleaned = PHONE_REGEX.sub("[REDACTED_PHONE]", cleaned)
    cleaned = EMAIL_REGEX.sub("[REDACTED_EMAIL]", cleaned)
    
    if mask_pan:
        cleaned = PAN_REGEX.sub("[REDACTED_PAN]", cleaned)
        
    return cleaned


def sanitize_input(text: str, max_chars: int = 4000) -> str:
    """
    Validates against injection attempts and sanitizes text for safe LLM processing.
    """
    if not text:
        return ""
    
    # Truncate to maximum characters to protect token quota
    truncated = text[:max_chars].strip()
    
    is_injected, matched = detect_prompt_injection(truncated)
    if is_injected:
        raise GuardrailViolation(f"Input rejected due to detected injection attempt: {matched[0]}")
        
    return redact_pii(truncated)


def wrap_untrusted_input(text: str, context_label: str = "USER SUBMISSION") -> str:
    """
    Wraps text inside clear defensive boundaries to prevent instruction drift.
    """
    sanitized = sanitize_input(text)
    return (
        f"--- BEGIN UNTRUSTED {context_label} ---\n"
        f"{sanitized}\n"
        f"--- END UNTRUSTED {context_label} ---"
    )

