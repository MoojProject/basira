from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: Optional[str]
    is_verified: bool = False


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    created_at: datetime
    class Config:
        from_attributes = True


class AnalyzeResponse(BaseModel):
    contract_id: str
    session_id: str
    contract_type: str
    verdict: str
    analysis: str
    summary: Optional[str]
    extraction_method: str
    confidence_score: Optional[float] = None
    message: str = "تم تحليل العقد. يمكنك الآن طرح أسئلة."


class ContractOut(BaseModel):
    id: str
    original_filename: str
    contract_type: str
    verdict: Optional[str]
    summary: Optional[str]
    page_count: int
    extraction_method: str
    created_at: datetime
    class Config:
        from_attributes = True


class UserStatsResponse(BaseModel):
    total_contracts: int
    total_messages: int
    safe_count: int
    review_count: int
    dangerous_count: int


class ChatRequest(BaseModel):
    session_id: str
    message: str


class GeneralChatRequest(BaseModel):
    message: str
    namespace: str = "both"
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    message_count: int


class MessageOut(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    session_id: str
    message_count: int
    history: list[MessageOut]


class AdminStatsResponse(BaseModel):
    total_users: int
    total_contracts: int
    total_tokens: int
    avg_latency_ms: float