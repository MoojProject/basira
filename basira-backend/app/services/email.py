from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

async def send_verification_email(email: EmailStr, code: str):
    message = MessageSchema(
        subject="كود التحقق - بصيرة",
        recipients=[email],
        body=f"""
        <div dir="rtl" style="font-family: Arial; padding: 20px;">
            <h2>مرحباً بك في بصيرة</h2>
            <p>كود التحقق الخاص بك:</p>
            <h1 style="color: #C2A878; letter-spacing: 5px;">{code}</h1>
            <p>صالح لمدة 5 دقائق.</p>
        </div>
        """,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_reset_password_email(email: EmailStr, code: str):
    message = MessageSchema(
        subject="إعادة تعيين كلمة المرور - بصيرة",
        recipients=[email],
        body=f"""
        <div dir="rtl" style="font-family: Arial; padding: 20px;">
            <h2>إعادة تعيين كلمة المرور</h2>
            <p>كود إعادة التعيين:</p>
            <h1 style="color: #C2A878; letter-spacing: 5px;">{code}</h1>
            <p>صالح لمدة 5 دقائق.</p>
            <p>إذا لم تطلب هذا، تجاهل الرسالة.</p>
        </div>
        """,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_password_changed_email(email: EmailStr):
    message = MessageSchema(
        subject="تم تغيير كلمة المرور - بصيرة",
        recipients=[email],
        body=f"""
        <div dir="rtl" style="font-family: Arial; padding: 20px;">
            <h2>تنبيه أمني</h2>
            <p>تم تغيير كلمة المرور لحسابك في بصيرة بنجاح.</p>
            <p style="color: #C2A878;">إذا لم تقم بهذا التغيير، يرجى التواصل معنا فوراً.</p>
            <hr style="border-color: #2E515B;" />
            <p style="color: #6B7D75; font-size: 12px;">فريق بصيرة</p>
        </div>
        """,
        subtype=MessageType.html
    )
    fm = FastMail(conf)
    await fm.send_message(message)