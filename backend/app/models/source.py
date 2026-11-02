import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # Website, RSS, Sitemap, API, Social, PDF, Manual
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    identifier: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, warning, failing, disabled
    trust_score: Mapped[float] = mapped_column(Float, default=0.85)
    crawl_frequency: Mapped[int] = mapped_column(Integer, default=3600)  # seconds
    last_checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_failure_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    parser_key: Mapped[str] = mapped_column(String(100), nullable=False)
    requires_authentication: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="sources")
    source_items = relationship("SourceItem", back_populates="source", cascade="all, delete-orphan")
    ingestion_runs = relationship("IngestionRun", back_populates="source", cascade="all, delete-orphan")
