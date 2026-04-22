import logging
from typing import Optional
 
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
 
from app.db.database import get_db
from app.models import User, Contract, ChatSession, UsageLog
from app.schemas import ChatRequest, ChatResponse, HistoryResponse, MessageOut, GeneralChatRequest
from app.services.auth import get_current_user, get_current_user_optional
from app.services.encryption import encrypt_json, decrypt_json, decrypt
from app.services.rag import chat_with_contract
 
log = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])
 
MAX_HISTORY = 20
 
 
@router.post("/", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == req.session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.is_active == True,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "الجلسة غير موجودة أو انتهت.")
 
    contract_text = ""
    if session.contract_id:
        c_res = await db.execute(
            select(Contract).where(Contract.id == session.contract_id)
        )
        contract = c_res.scalar_one_or_none()
        if contract:
            # ★ نجيب نص العقد الأصلي أولاً — وإن ما يوجد نرجع للتحليل كـfallback
            if contract.contract_text_encrypted:
                contract_text = decrypt(contract.contract_text_encrypted)
            elif contract.analysis_encrypted:
                contract_text = decrypt(contract.analysis_encrypted)
 
    history: list[dict] = decrypt_json(session.history_encrypted or "") or []
    history.append({"role": "user", "content": req.message})
 
    reply, tokens = await chat_with_contract(
        user_message=req.message,
        contract_text=contract_text,
        namespace=session.namespace,
        history=history[:-1],
    )
 
    history.append({"role": "assistant", "content": reply})
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
 
    session.history_encrypted = encrypt_json(history)
    session.message_count = len(history)
 
    db.add(UsageLog(
        user_id=current_user.id,
        endpoint="chat",
        tokens_used=tokens,
        success=True,
    ))
 
    return ChatResponse(
        reply=reply,
        session_id=req.session_id,
        message_count=len(history),
    )
 
 
@router.post("/general", response_model=ChatResponse)
async def general_chat_endpoint(
    req: GeneralChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    reply, tokens = await chat_with_contract(
        user_message=req.message,
        contract_text="",
        namespace=req.namespace,
        history=req.history[-10:],
    )
 
    if current_user:
        db.add(UsageLog(
            user_id=current_user.id,
            endpoint="general_chat",
            tokens_used=tokens,
            success=True,
        ))
 
    return ChatResponse(
        reply=reply,
        session_id="general",
        message_count=len(req.history) + 2,
    )
 
 
@router.get("/{session_id}/history", response_model=HistoryResponse)
async def get_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "الجلسة غير موجودة.")
 
    history = decrypt_json(session.history_encrypted or "") or []
    return HistoryResponse(
        session_id=session_id,
        message_count=len(history),
        history=[MessageOut(role=m["role"], content=m["content"]) for m in history],
    )
 
 
@router.get("/", response_model=list[dict])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(20)
    )
    return [
        {
            "session_id":    s.id,
            "contract_id":   s.contract_id,
            "message_count": s.message_count,
            "namespace":     s.namespace,
            "updated_at":    s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in result.scalars().all()
    ]
 
 
@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "الجلسة غير موجودة.")
    await db.delete(session)