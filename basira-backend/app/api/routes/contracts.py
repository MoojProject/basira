import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models import User, Contract, ChatSession, UsageLog, ContractType, ContractVerdict
from app.schemas import AnalyzeResponse, ContractOut, UserStatsResponse
from app.services.auth import get_current_user, get_current_user_optional
from app.services.encryption import encrypt, encrypt_json
from app.services.pdf_extractor import extract_text_from_pdf, extract_text_from_image
from app.services.rag import detect_contract_type, analyze_contract
from app.services.rag import detect_contract_type, analyze_contract, validate_contract_elements

log = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["Contracts"])

MAX_FILE_BYTES = 15 * 1024 * 1024  # 15 MB

SUPPORTED_NAMESPACES = {"rent", "labor", "nda"}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    allowed = ('.pdf', '.jpg', '.jpeg', '.png')
    if not file.filename or not file.filename.lower().endswith(allowed):
        raise HTTPException(400, "يرجى رفع ملف PDF أو صورة (JPG, PNG).")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_FILE_BYTES:
        raise HTTPException(413, "حجم الملف يتجاوز 15MB.")

    user_label = current_user.id if current_user else "guest"
    log.info(f"[{user_label}] تحليل: {file.filename} ({len(pdf_bytes)//1024}KB)")

    if file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
        contract_text, page_count, method = extract_text_from_image(pdf_bytes)
    else:
        contract_text, page_count, method = extract_text_from_pdf(pdf_bytes)

    log.info(f"استخرج {len(contract_text)} حرف بـ {method}")

    namespace = detect_contract_type(contract_text)

    # ── تحقق من نوع العقد — نقبل فقط إيجار أو عمل أو سرية ──
    if namespace not in SUPPORTED_NAMESPACES:
        raise HTTPException(
            422,
            "نعتذر، بصيرة تحلل حالياً ثلاثة أنواع من العقود فقط: "
            "عقود العمل، عقود الإيجار، واتفاقيات السرية. "
            "الملف الذي رفعته لا يبدو من هذه الأنواع."
        )
    # تحقق من العناصر الأساسية
    elements_error = validate_contract_elements(contract_text, namespace)
    if elements_error:
        raise HTTPException(422, elements_error)
    try:
        contract_type = ContractType(namespace)
    except ValueError:
        contract_type = ContractType.other

    result = await analyze_contract(contract_text, namespace)

    contract = None
    session  = None

    if current_user:
        contract = Contract(
            user_id=current_user.id,
            original_filename=file.filename,
            file_size_kb=len(pdf_bytes) // 1024,
            contract_type=contract_type,
            page_count=page_count,
            extraction_method=method,
            verdict=ContractVerdict(result["verdict"]),
            analysis_encrypted=encrypt(result["analysis"]),
            contract_text_encrypted=encrypt(contract_text[:8000]),
            summary=result["summary"][:500] if result["summary"] else None,
        )
        db.add(contract)
        await db.flush()

        initial_history = [
            {"role": "assistant", "content": f"تم تحليل العقد:\n\n{result['analysis']}"}
        ]
        session = ChatSession(
            user_id=current_user.id,
            contract_id=contract.id,
            namespace=namespace,
            history_encrypted=encrypt_json(initial_history),
            message_count=1,
        )
        db.add(session)
        await db.flush()

        db.add(UsageLog(
            user_id=current_user.id,
            endpoint="analyze",
            tokens_used=result["tokens_used"],
            latency_ms=result["latency_ms"],
            success=True,
        ))

    return AnalyzeResponse(
        contract_id=contract.id if contract else "",
        session_id=session.id if session else "",
        contract_type=namespace,
        verdict=result["verdict"],
        analysis=result["analysis"],
        summary=result["summary"],
        extraction_method=method,
        confidence_score=result.get("confidence_score", 0.0),
    )


@router.get("/", response_model=list[ContractOut])
async def list_contracts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == current_user.id)
        .order_by(Contract.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.get("/stats", response_model=UserStatsResponse)
async def user_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contracts = (await db.execute(
        select(Contract).where(Contract.user_id == current_user.id)
    )).scalars().all()

    total_msgs = (await db.execute(
        select(func.sum(ChatSession.message_count))
        .where(ChatSession.user_id == current_user.id)
    )).scalar() or 0

    return UserStatsResponse(
        total_contracts=len(contracts),
        total_messages=total_msgs,
        safe_count=sum(1 for c in contracts if c.verdict and c.verdict.value == "safe"),
        review_count=sum(1 for c in contracts if c.verdict and c.verdict.value == "review"),
        dangerous_count=sum(1 for c in contracts if c.verdict and c.verdict.value == "dangerous"),
    )


@router.get("/{contract_id}/detail")
async def get_contract_detail(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c_result = await db.execute(
        select(Contract).where(
            Contract.id == contract_id,
            Contract.user_id == current_user.id,
        )
    )
    contract = c_result.scalar_one_or_none()
    if not contract:
        raise HTTPException(404, "العقد غير موجود.")

    s_result = await db.execute(
        select(ChatSession).where(ChatSession.contract_id == contract_id)
    )
    session = s_result.scalar_one_or_none()

    from app.services.encryption import decrypt
    analysis = decrypt(contract.analysis_encrypted) if contract.analysis_encrypted else ""

    return {
        "contract_id":       contract.id,
        "session_id":        session.id if session else "",
        "contract_type":     contract.contract_type.value,
        "verdict":           contract.verdict.value if contract.verdict else "review",
        "analysis":          analysis,
        "summary":           contract.summary or "",
        "original_filename": contract.original_filename,
        "extraction_method": contract.extraction_method,
    }


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contract).where(
            Contract.id == contract_id,
            Contract.user_id == current_user.id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(404, "العقد غير موجود.")
    await db.delete(contract)

