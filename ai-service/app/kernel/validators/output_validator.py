"""
Udyog Samyog — Output Validator (Entities, Numbers, Citations, Forbidden Phrases)
"""
import re
from typing import List, Dict, Any, Tuple
from app.kernel.rules.definitions import STATUTORY_RULES, STATUTORY_SCHEMES

FORBIDDEN_PHRASES = [
    r"guaranteed\s+approval",
    r"approval\s+is\s+guaranteed",
    r"you\s+are\s+(hereby\s+)?approved",
    r"application\s+(is|has\s+been)\s+approved\s+by\s+ai",
    r"guaranteed\s+(subsidy|grant|waiver)",
    r"official\s+government\s+sanction\s+certificate",
    r"will\s+definitely\s+receive",
    r"legally\s+binding\s+clearance",
]

FORBIDDEN_REGEXES = [re.compile(p, re.IGNORECASE) for p in FORBIDDEN_PHRASES]

VALID_CLEARANCE_IDS = {c["id"] for c in STATUTORY_RULES}
VALID_SCHEME_IDS = {s["id"] for s in STATUTORY_SCHEMES}


class OutputValidationResult:
    def __init__(
        self,
        is_valid: bool,
        violations: List[str],
        sanitized_text: str,
        citations_found: List[str],
    ):
        self.is_valid = is_valid
        self.violations = violations
        self.sanitized_text = sanitized_text
        self.citations_found = citations_found

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "violations": self.violations,
            "sanitized_text": self.sanitized_text,
            "citations_found": self.citations_found,
        }


def check_forbidden_phrases(text: str) -> Tuple[bool, List[str]]:
    """
    Ensures AI output never hallucinates guarantees or claims autonomous authority.
    """
    violations = []
    for reg in FORBIDDEN_REGEXES:
        match = reg.search(text)
        if match:
            violations.append(f"Forbidden phrase detected: '{match.group(0)}'")
    return len(violations) == 0, violations


def check_statutory_entities(entity_ids: List[str]) -> Tuple[bool, List[str]]:
    """
    Verifies that all referenced clearance and scheme IDs exist in the statutory database.
    """
    invalid = []
    for eid in entity_ids:
        if eid not in VALID_CLEARANCE_IDS and eid not in VALID_SCHEME_IDS:
            invalid.append(eid)
    return len(invalid) == 0, invalid


def extract_citations(text: str) -> List[str]:
    """
    Extracts statutory citations like Section ..., Rule ..., GR ... from generated text.
    """
    citation_patterns = [
        r"(Section\s+\d+([A-Z])?(\s+of\s+the\s+[A-Za-z\s]+Act)?)",
        r"(Rule\s+\d+([A-Z])?)",
        r"(GR\s+No\.\s*[A-Za-z0-9\-]+)",
        r"(Article\s+\d+)",
        r"(Water\s+Act|Air\s+Act|Factories\s+Act|MSMED\s+Act)",
    ]
    citations = set()
    for pat in citation_patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        for m in matches:
            if isinstance(m, tuple):
                citations.add(m[0].strip())
            else:
                citations.add(m.strip())
    return sorted(list(citations))


def validate_ai_output(text: str, entity_ids: List[str] = None) -> OutputValidationResult:
    """
    Comprehensive output validation pipeline.
    """
    violations = []
    
    # 1. Check forbidden phrases
    has_no_forbidden, phrase_violations = check_forbidden_phrases(text)
    if not has_no_forbidden:
        violations.extend(phrase_violations)
        
    # 2. Check entities if provided
    if entity_ids:
        entities_valid, invalid_entities = check_statutory_entities(entity_ids)
        if not entities_valid:
            violations.append(f"Unrecognized statutory IDs referenced: {', '.join(invalid_entities)}")
            
    # 3. Extract citations
    citations = extract_citations(text)
    
    # 4. Sanitize text if minor violations exist
    sanitized = text
    for reg in FORBIDDEN_REGEXES:
        sanitized = reg.sub("[Subject to official departmental verification]", sanitized)
        
    return OutputValidationResult(
        is_valid=len(violations) == 0,
        violations=violations,
        sanitized_text=sanitized,
        citations_found=citations,
    )
