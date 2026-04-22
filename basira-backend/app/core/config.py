from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str    = "Legal Contract Analyzer"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool      = False

    # Database
    DATABASE_URL: str = ""

    # Auth
    SECRET_KEY: str                  = ""
    ALGORITHM: str                   = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    
    OPENAI_API_KEY: str  = ""
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str  = ""

    NS_RENT: str  = "rent"
    NS_LABOR: str = "labor"
    NS_NDA: str   = "nda"

    VLM_API_URL: str = ""

    
    ENCRYPTION_KEY: str = ""
    MAIL_USERNAME: str = "basira.noreply@gmail.com"
    MAIL_PASSWORD: str = "sfusrmprgwwtteva"
    MAIL_FROM: str = "basira.noreply@gmail.com"
    MAIL_FROM_NAME: str = "بصيرة"


    class Config:
        env_file        = ".env"
        case_sensitive  = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
