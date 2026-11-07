import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base, GUID


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(500), unique=True, index=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    organization_id: Mapped[str] = mapped_column(GUID, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    category_id: Mapped[str] = mapped_column(GUID, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    venue: Mapped[str] = mapped_column(String(500), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="Pakistan")
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    registration_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    registration_url: Mapped[str] = mapped_column(String(2048), nullable=True)
    application_url: Mapped[str] = mapped_column(String(2048), nullable=True)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str] = mapped_column(String(100), nullable=True)
    eligibility_summary: Mapped[str] = mapped_column(Text, nullable=True)
    target_audience: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(50), default="published")
    trust_score: Mapped[float] = mapped_column(Float, default=0.85)
    ai_confidence: Mapped[float] = mapped_column(Float, default=0.85)
    verification_status: Mapped[str] = mapped_column(String(50), default="source_verified")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    save_count: Mapped[int] = mapped_column(Integer, default=0)
    flyer_url: Mapped[str] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="opportunities")
    category = relationship("Category", back_populates="opportunities")
    sources = relationship("OpportunitySource", back_populates="opportunity", cascade="all, delete-orphan")
    changes = relationship("OpportunityChange", back_populates="opportunity", cascade="all, delete-orphan")
    embedding = relationship("OpportunityEmbedding", back_populates="opportunity", uselist=False, cascade="all, delete-orphan")
    eligibility_rules = relationship("EligibilityRule", back_populates="opportunity", cascade="all, delete-orphan")


class OpportunitySource(Base):
    __tablename__ = "opportunity_sources"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id: Mapped[str] = mapped_column(GUID, ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    source_item_id: Mapped[str] = mapped_column(GUID, ForeignKey("source_items.id", ondelete="CASCADE"), index=True)
    relationship_type: Mapped[str] = mapped_column(String(50), default="original")  # original, confirmation, duplicate, update, registration, reference
    is_primary_source: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    opportunity = relationship("Opportunity", back_populates="sources")
    source_item = relationship("SourceItem", back_populates="opportunity_sources")


class OpportunityChange(Base):
    __tablename__ = "opportunity_changes"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id: Mapped[str] = mapped_column(GUID, ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[str] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text, nullable=True)
    source_item_id: Mapped[str] = mapped_column(GUID, ForeignKey("source_items.id", ondelete="SET NULL"), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)  # deadline_extension, venue_change, date_change, cancelled, postponed

    opportunity = relationship("Opportunity", back_populates="changes")


class OpportunityEmbedding(Base):
    __tablename__ = "opportunity_embeddings"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id: Mapped[str] = mapped_column(GUID, ForeignKey("opportunities.id", ondelete="CASCADE"), unique=True)
    # Stored as JSON list of floats for portability across SQLite and PostgreSQL pgvector
    vector_data: Mapped[list] = mapped_column(JSON, nullable=True)
    model: Mapped[str] = mapped_column(String(100), default="text-embedding-004")
    content_hash: Mapped[str] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    opportunity = relationship("Opportunity", back_populates="embedding")
