from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg://nextpost:nextpost@db:5432/nextpost"

    # Auth — SECRET_KEY has no default on purpose: the app refuses to start without one.
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 hours; see ADR 0003

    # Post images (see ADR 0009). Relative paths resolve against the working directory.
    UPLOAD_DIR: str = "uploads"

    # Reminder scheduler (see ADR 0004 / 0010)
    SCHEDULER_ENABLED: bool = True
    REMINDER_INTERVAL_MINUTES: int = 60
    REMINDER_LEAD_HOURS: int = 24  # remind when a post is due within this window

    # SMTP — defaults target the Mailpit dev container
    SMTP_HOST: str = "mailpit"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_STARTTLS: bool = False
    EMAIL_FROM: str = "NextPost <no-reply@nextpost.local>"


settings = Settings()
