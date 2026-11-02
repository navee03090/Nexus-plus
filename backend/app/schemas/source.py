"""
Pydantic schemas for Sources and Ingestion.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class SourceBase(BaseModel):
    name: str
    organization_id: Optional[str] = None
    source_type: str  # Website, RSS, Sitemap, API, Social, PDF, Manual
    platform: str
    url: str
    identifier: Optional[str] = None
    crawl_frequency: int = 3600
    parser_key: str
    trust_score: float = 0.85
    requires_authentication: bool = False
    is_active: bool = True


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    crawl_frequency: Optional[int] = None
    parser_key: Optional[str] = None
    trust_score: Optional[float] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None


class SourceRead(SourceBase):
    id: str
    status: str
    consecutive_failures: int
    last_checked_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    organization_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SourceItemRead(BaseModel):
    id: str
    source_id: str
    canonical_url: Optional[str] = None
    content_hash: str
    title_raw: Optional[str] = None
    caption_raw: Optional[str] = None
    published_at: Optional[datetime] = None
    discovered_at: datetime
    content_type: str
    status: str

    model_config = ConfigDict(from_attributes=True)


class SourceTestRequest(BaseModel):
    url: str
    source_type: str = "Website"
    parser_key: str = "generic_website"


class SourceTestResponse(BaseModel):
    status_code: int
    is_reachable: bool
    content_length: int
    discovered_items: int
    sample_titles: List[str]
    sample_images: List[str]
    execution_time_ms: float
    warnings: List[str] = []
