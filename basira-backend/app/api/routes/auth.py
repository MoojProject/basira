import random
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models import User, VerificationCode
from app.schemas import RegisterRequest, TokenResponse, UserOut
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services.email import send_verification_email, send_reset_password_email, send_password_changed_email

log = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

def generate_code() -> str:
    return str(random.randint(100000, 999999))

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    log.info(f"تسجيل جديد: {req.email}")
    exists = await db.execute(select(User).where(User.email == req.email))
    if exists.scalar_one_or_none():
        raise HTTPException(409, "البريد الإلكتروني مستخدم مسبقاً")
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        is_verified=False
    )
    db.add(user)
    await db.flush()
    code = generate_code()
    verification = VerificationCode(
        email=req.email,
        code=code,
        type="verify",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(verification)
    await db.commit()
    await send_verification_email(req.email, code)
    log.info(f"تم إرسال كود التحقق إلى: {req.email}")
    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        user_id=user.id,
        full_name=user.full_name,
        is_verified=False
    )

@router.post("/verify-email")
async def verify_email(email: str, code: str, db: AsyncSession = Depends(get_db)):
    log.info(f"محاولة تحقق: {email}")
    result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.type == "verify"
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(400, "الكود غير صحيح")
    if datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(400, "انتهت صلاحية الكود")
    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    user.is_verified = True
    await db.delete(record)
    await db.commit()
    log.info(f"تم التحقق بنجاح: {email}")
    return {"message": "تم التحقق من البريد الإلكتروني بنجاح"}

@router.post("/forgot-password")
async def forgot_password(email: str, db: AsyncSession = Depends(get_db)):
    log.info(f"طلب إعادة تعيين كلمة المرور: {email}")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "البريد الإلكتروني غير مسجل")
    code = generate_code()
    reset = VerificationCode(
        email=email,
        code=code,
        type="reset",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(reset)
    await db.commit()
    await send_reset_password_email(email, code)
    log.info(f"تم إرسال كود إعادة التعيين إلى: {email}")
    return {"message": "تم إرسال كود إعادة التعيين على بريدك"}

@router.post("/reset-password")
async def reset_password(email: str, code: str, new_password: str, db: AsyncSession = Depends(get_db)):
    log.info(f"محاولة إعادة تعيين كلمة المرور: {email}")
    result = await db.execute(
        select(VerificationCode).where(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.type == "reset"
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(400, "الكود غير صحيح")
    if datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(400, "انتهت صلاحية الكود")
    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    user.hashed_password = hash_password(new_password)
    await db.delete(record)
    await db.commit()
    await send_password_changed_email(email)
    log.info(f"تم تغيير كلمة المرور بنجاح: {email}")
    return {"message": "تم تغيير كلمة المرور بنجاح"}

@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    log.info(f"محاولة تسجيل دخول: {form.username}")
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "البريد أو كلمة المرور غير صحيحة")
    if not user.is_active:
        raise HTTPException(403, "الحساب موقوف")
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    log.info(f"تسجيل دخول ناجح: {form.username}")
    return TokenResponse(
        access_token=create_access_token(user.id, user.email),
        user_id=user.id,
        full_name=user.full_name,
        is_verified=user.is_verified
    )

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
