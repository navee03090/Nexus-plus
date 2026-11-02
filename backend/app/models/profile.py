import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(1024), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="Pakistan")
    city: Mapped[str] = mapped_column(String(100), default="Peshawar")
    education_level: Mapped[str] = mapped_column(String(100), nullable=True)
    university: Mapped[str] = mapped_column(String(255), nullable=True)
    field_of_study: Mapped[str] = mapped_column(String(255), nullable=True)
    semester: Mapped[str] = mapped_column(String(50), nullable=True)
    graduation_year: Mapped[int] = mapped_column(Integer, nullable=True)
    professional_status: Mapped[str] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
