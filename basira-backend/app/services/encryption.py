import re
import json
import logging
from cryptography.fernet import Fernet
from app.core.config import settings

log = logging.getLogger(__name__)
_fernet: Fernet | None = None


def fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = settings.ENCRYPTION_KEY
        if not key:
            log.warning("encryption key not set in config — generating a temporary one")
            key = Fernet.generate_key().decode()
        try:
            _fernet = Fernet(key.encode() if isinstance(key, str) else key)
        except Exception:
            _fernet = Fernet(Fernet.generate_key())
    return _fernet


def encrypt(text: str) -> str:
    return fernet().encrypt(text.encode()).decode() if text else ""


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return fernet().decrypt(token.encode()).decode()
    except Exception:
        return ""


def encrypt_json(data: list | dict) -> str:
    return encrypt(json.dumps(data, ensure_ascii=False))


def decrypt_json(token: str) -> list | dict:
    raw = decrypt(token)
    if not raw:
        return []
    try:
        return json.loads(raw)
    except Exception:
        return []


PII_PATTERNS = [

    (r"\b[12]\d{9}\b",                                     "[NATIONAL_ID]"),
    (r"\b(?:\+966|00966|0)?5\d{8}\b",                    "[PHONE]"),
    (r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+",  "[EMAIL]"),
    (r"\bSA\d{22}\b",                                      "[IBAN]"),

]


def redact_pii(text: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text


def generate_new_key() -> str:
    return Fernet.generate_key().decode()