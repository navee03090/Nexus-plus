"""
Pydantic schemas for Opportunities and Gemini structured AI output.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class GeminiExtractionOutput(BaseModel):
    """
    Structured multimodal schema returned by Google Gemini (Section 32).
    Must return null for unknown values, never invent or hallucinate.
    """
    is_opportunity: bool = Field(..., description="Whether this announcement describes a real opportunity/event")
    title: Optional[str] = Field(None, description="Official title of the opportunity")
    summary: Optional[str] = Field(None, description="Concise 1-2 sentence executive summary")
    description: Optional[str] = Field(None, description="Full comprehensive description of the event")
    organization: Optional[str] = Field(None, description="Host organization, university, or institute")
    category: Optional[str] = Field(None, description="Opportunity category (e.g. Hackathon, Workshop, Scholarship)")
    tags: Optional[List[str]] = Field(default_factory=list, description="Keywords and topic tags (e.g. AI, Cybersecurity)")
    target_audience: Optional[List[str]] = Field(default_factory=list, description="Intended audience (e.g. Undergraduates)")
    venue: Optional[str] = Field(None, description="Physical location or building name")
    city: Optional[str] = Field(None, description="City where the event is held")
    country: Optional[str] = Field("Pakistan", description="Country")
    is_online: bool = Field(False, description="Whether the event is hosted virtually")
    start_date: Optional[str] = Field(None, description="ISO-8601 string or YYYY-MM-DD HH:MM of event start")
    end_date: Optional[str] = Field(None, description="ISO-8601 string or YYYY-MM-DD HH:MM of event end")
    registration_deadline: Optional[str] = Field(None, description="ISO-8601 string of application deadline")
    registration_url: Optional[str] = Field(None, description="Direct URL to register (never hallucinate)")
    application_url: Optional[str] = Field(None, description="Official application or details link")
    contact_email: Optional[str] = Field(None, description="Official contact email")
    contact_phone: Optional[str] = Field(None, description="Official contact phone number")
    eligibility: Optional[List[str]] = Field(default_factory=list, description="Eligibility requirements listed")
    requirements: Optional[List[str]] = Field(default_factory=list, description="Items needed to apply or bring")
    language: str = Field("en", description="Primary language of the announcement")
    confidence_score: float = Field(0.0, ge=0.0, le=1.0, description="Extraction confidence score")
    evidence: Optional[List[str]] = Field(default_factory=list, description="Verbatim quotes from source supporting extraction")
    possible_duplicate: bool = Field(False, description="Whether announcement indicates this is a duplicate")
    possible_update: bool = Field(False, description="Whether text indicates deadline extension or date change")
    status: str = Field("new", description="Status indicator: new, update, cancelled, postponed")


class OpportunitySourceRead(BaseModel):
    id: str
    source_item_id: str
    relationship_type: str
    is_primary_source: bool
    platform: Optional[str] = None
    source_name: Optional[str] = None
    canonical_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpportunityChangeRead(BaseModel):
    id: str
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_type: str
    detected_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpportunityBase(BaseModel):
    title: str
    slug: str
    summary: str
    description: str
    organization_id: Optional[str] = None
    category_id: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = "Peshawar"
    country: str = "Pakistan"
    is_online: bool = False
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    registration_url: Optional[str] = None
    application_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    eligibility_summary: Optional[str] = None
    target_audience: List[str] = []
    status: str = "published"
    trust_score: float = 0.85
    ai_confidence: float = 0.85
    verification_status: str = "source_verified"
    featured: bool = False
    flyer_url: Optional[str] = None


class OpportunityCreate(OpportunityBase):
    pass


class OpportunityUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    is_online: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    registration_url: Optional[str] = None
    application_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
    featured: Optional[bool] = None


class OpportunityRead(OpportunityBase):
    id: str
    view_count: int = 0
    save_count: int = 0
    created_at: datetime
    updated_at: datetime
    published_at: datetime
    organization_name: Optional[str] = None
    organization_slug: Optional[str] = None
    organization_logo: Optional[str] = None
    category_name: Optional[str] = None
    category_slug: Optional[str] = None
    tags: List[str] = []
    match_score: Optional[int] = None
    match_reasons: List[str] = []
    deadline_urgency: Optional[str] = None  # Normal, Closing Soon, Urgent, Expired

    model_config = ConfigDict(from_attributes=True)


class OpportunityDetail(OpportunityRead):
    sources: List[OpportunitySourceRead] = []
    changes: List[OpportunityChangeRead] = []
    provenance_reasons: List[str] = []
