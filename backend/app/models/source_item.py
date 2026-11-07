import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base, GUID


class SourceItem(Base):
    __tablename__ = "source_items"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id: Mapped[str] = mapped_column(GUID, ForeignKey("sources.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[str] = mapped_column(String(255), nullable=True)
    canonical_url: Mapped[str] = mapped_column(String(2048), nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    title_raw: Mapped[str] = mapped_column(String(500), nullable=True)
    caption_raw: Mapped[str] = mapped_column(Text, nullable=True)
    body_raw: Mapped[str] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    raw_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    content_type: Mapped[str] = mapped_column(String(50), default="html")  # text, image, video, pdf, html, mixed
    language: Mapped[str] = mapped_column(String(20), default="en")
    status: Mapped[str] = mapped_column(String(50), default="discovered")  # discovered, processing, extracted, duplicated, rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    source = relationship("Source", back_populates="source_items")
    media = relationship("SourceMedia", back_populates="source_item", cascade="all, delete-orphan")
    extractions = relationship("Extraction", back_populates="source_item", cascade="all, delete-orphan")
    opportunity_sources = relationship("OpportunitySource", back_populates="source_item", cascade="all, delete-orphan")


class SourceMedia(Base):
    __tablename__ = "source_media"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_item_id: Mapped[str] = mapped_column(GUID, ForeignKey("source_items.id", ondelete="CASCADE"), index=True)
    media_type: Mapped[str] = mapped_column(String(50), nullable=False)  # flyer, poster, document, photo
    original_url: Mapped[str] = mapped_column(String(2048), nullable=True)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    file_hash: Mapped[str] = mapped_column(String(64), nullable=True)
    width: Mapped[int] = mapped_column(Integer, nullable=True)
    height: Mapped[int] = mapped_column(Integer, nullable=True)
    ocr_text: Mapped[str] = mapped_column(Text, nullable=True)
    qr_data: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    source_item = relationship("SourceItem", back_populates="media")
