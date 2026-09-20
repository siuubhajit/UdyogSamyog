"""
Pydantic schemas for Module G: Grounded Conversational Assistant
"""
from typing import List, Optional
from pydantic import BaseModel


class ChatCitation(BaseModel):
    title: str
    section: Optional[str] = None
    url: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    language: Optional[str] = "en" # en | mr | hi


class ChatResponse(BaseModel):
    reply: str
    citations: List[ChatCitation] = []
    tools_used: List[str] = []
    conversation_id: str
    is_fallback: bool = False
    disclaimer: str = "Guidance only. Maharashtra Government departmental decisions are final and binding."

