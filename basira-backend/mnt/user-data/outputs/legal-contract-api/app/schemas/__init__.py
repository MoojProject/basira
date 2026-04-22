from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    full_name:    Optional[str]

class UserOut(BaseModel):
    id:         str
    email:      str
    full_name:  Optional[str]
    role:       str
    created_at: datetime
    class Config:
        from_attributes = True


# ── Contract ──────────────────────────────────────────────────────────────────
class AnalyzeResponse(BaseModel):
    contract_id:       str
    session_id:        str
    contract_type:     str
    verdict:           str
    analysis:          str
    summary:           Optional[str]
    extraction_method: str
    message:           str = "تم تحليل العقد. يمكنك الآن طرح أسئلة."

class ContractOut(BaseModel):
    id:                str
    original_filename: str
    contract_type:     str
    verdict:           Optional[str]
    summary:           Optional[str]
    page_count:        int
    extraction_method: str
    created_at:        datetime
    class Config:
        from_attributes = True

class UserStatsResponse(BaseModel):
    total_contracts: int
    total_messages:  int
    safe_count:      int
    review_count:    int
    dangerous_count: int


# ── Chat ──────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message:    str

    @field_validator("message")
    @classmethod
    def not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("الرسالة لا يمكن أن تكون فارغة")
        if len(v) > 2000:
            raise ValueError("الرسالة طويلة جداً (2000 حرف كحد أقصى)")
        return v

class ChatResponse(BaseModel):
    reply:         str
    session_id:    str
    message_count: int

class MessageOut(BaseModel):
    role:    str
    content: str

class HistoryResponse(BaseModel):
    session_id:    str
    message_count: int
    history:       list[MessageOut]


# ── Admin ─────────────────────────────────────────────────────────────────────
class AdminStatsResponse(BaseModel):
    total_users:     int
    total_contracts: int
    total_tokens:    int
    avg_latency_ms:  float
