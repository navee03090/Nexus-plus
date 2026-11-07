import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base, GUID


class EligibilityRule(Base):
    __tablename__ = "eligibility_rules"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    opportunity_id: Mapped[str] = mapped_column(GUID, ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    rule_type: Mapped[str] = mapped_column(String(100), nullable=False)  # education_level, university, field, location, age
    operator: Mapped[str] = mapped_column(String(50), nullable=False)   # in, equals, contains, gte, lte
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    opportunity = relationship("Opportunity", back_populates="eligibility_rules")


class UserInterest(Base):
    __tablename__ = "user_interests"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(GUID, index=True, nullable=False)
    tag_id: Mapped[str] = mapped_column(GUID, ForeignKey("tags.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(GUID, unique=True, index=True, nullable=False)
    preferred_cities: Mapped[list] = mapped_column(JSON, default=lambda: ["Peshawar", "Islamabad"])
    preferred_opportunity_types: Mapped[list] = mapped_column(JSON, default=list)
    online_only: Mapped[bool] = mapped_column(Boolean, default=False)
    in_person_only: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_digest: Mapped[bool] = mapped_column(Boolean, default=True)
    instant_urgent: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class SavedOpportunity(Base):
    __tablename__ = "saved_opportunities"

    id: Mapped[str] = mapped_column(GUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(GUID, index=True, nullable=False)
    opportunity_id: Mapped[str] = mapped_column(GUID, ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
