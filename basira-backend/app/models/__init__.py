"""
 جداول:
  User         — المستخدمين
  Contract     — العقود المحللة
  ChatSession  — جلسات الدردشة + هيستوري مشفر
  UsageLog     — إحصائيات الاستخدام
"""
import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    String, Text, DateTime, Boolean, Integer,
    ForeignKey, Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class ContractType(str, enum.Enum):
    rent  = "rent"
    labor = "labor"
    nda   = "nda"
    other = "other"

class ContractVerdict(str, enum.Enum):
    safe      = "safe"
    review    = "review"
    dangerous = "dangerous"

class UserRole(str, enum.Enum):
    user  = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id:              Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email:           Mapped[str]      = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str]      = mapped_column(String(255))
    full_name:       Mapped[str|None] = mapped_column(String(255), nullable=True)
    role:            Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.user)
    is_active:       Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_login:      Mapped[datetime|None] = mapped_column(DateTime, nullable=True)

    contracts: Mapped[list["Contract"]]    = relationship(back_populates="user", cascade="all, delete")
    sessions:  Mapped[list["ChatSession"]] = relationship(back_populates="user", cascade="all, delete")
    usage:     Mapped[list["UsageLog"]]    = relationship(back_populates="user")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

class Contract(Base):
    __tablename__ = "contracts"

    id:                Mapped[str]               = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:           Mapped[str]               = mapped_column(ForeignKey("users.id"), index=True)
    original_filename: Mapped[str]               = mapped_column(String(255))
    file_size_kb:      Mapped[int]               = mapped_column(Integer)
    contract_type:     Mapped[ContractType]      = mapped_column(SAEnum(ContractType))
    page_count:        Mapped[int]               = mapped_column(Integer, default=0)
    extraction_method: Mapped[str]               = mapped_column(String(20), default="pymupdf")  # pymupdf | vlm
    verdict:           Mapped[ContractVerdict|None] = mapped_column(SAEnum(ContractVerdict), nullable=True)
    analysis_encrypted: Mapped[str|None]         = mapped_column(Text, nullable=True)
    contract_text_encrypted:  Mapped[str|None] = mapped_column(Text, nullable=True)
    summary:           Mapped[str|None]          = mapped_column(String(500), nullable=True)
    created_at:        Mapped[datetime]          = mapped_column(DateTime, server_default=func.now())

    user:    Mapped["User"]              = relationship(back_populates="contracts")
    session: Mapped["ChatSession|None"]  = relationship(back_populates="contract", uselist=False)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id:                Mapped[str]      = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:           Mapped[str]      = mapped_column(ForeignKey("users.id"), index=True)
    contract_id:       Mapped[str|None] = mapped_column(ForeignKey("contracts.id"), nullable=True, index=True)
    history_encrypted: Mapped[str|None] = mapped_column(Text, nullable=True)
    message_count:     Mapped[int]      = mapped_column(Integer, default=0)
    namespace:         Mapped[str]      = mapped_column(String(50), default="rent")
    is_active:         Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:        Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at:        Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user:     Mapped["User"]             = relationship(back_populates="sessions")
    contract: Mapped["Contract|None"]    = relationship(back_populates="session")


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id:     Mapped[str|None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    endpoint:    Mapped[str]      = mapped_column(String(100))
    tokens_used: Mapped[int]      = mapped_column(Integer, default=0)
    latency_ms:  Mapped[int]      = mapped_column(Integer, default=0)
    success:     Mapped[bool]     = mapped_column(Boolean, default=True)
    error_msg:   Mapped[str|None] = mapped_column(String(500), nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User|None"] = relationship(back_populates="usage")

class VerificationCode(Base):
    __tablename__ = "verification_codes"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, autoincrement=True)
    email:      Mapped[str]      = mapped_column(String(255), index=True)
    code:       Mapped[str]      = mapped_column(String(6))
    type:       Mapped[str]      = mapped_column(String(20))  # verify | reset
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

all_models = [User, Contract, ChatSession, UsageLog, VerificationCode]
