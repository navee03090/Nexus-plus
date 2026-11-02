"""
Pydantic schemas for Profiles, Preferences, and Saved Opportunities.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ProfileBase(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    country: str = "Pakistan"
    city: str = "Peshawar"
    education_level: Optional[str] = None
    university: Optional[str] = None
    field_of_study: Optional[str] = None
    semester: Optional[str] = None
    graduation_year: Optional[int] = None
    professional_status: Optional[str] = None


class ProfileUpdate(ProfileBase):
    interests: Optional[List[str]] = None


class ProfileRead(ProfileBase):
    id: str
    user_id: str
    role: str
    interests: List[str] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPreferenceBase(BaseModel):
    preferred_cities: List[str] = ["Peshawar", "Islamabad"]
    preferred_opportunity_types: List[str] = []
    online_only: bool = False
    in_person_only: bool = False
    daily_digest: bool = True
    instant_urgent: bool = True


class UserPreferenceUpdate(UserPreferenceBase):
    pass


class UserPreferenceRead(UserPreferenceBase):
    id: str
    user_id: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavedOpportunityRead(BaseModel):
    id: str
    user_id: str
    opportunity_id: str
    notes: Optional[str] = None
    created_at: datetime
    opportunity_title: Optional[str] = None
    opportunity_slug: Optional[str] = None
    registration_deadline: Optional[datetime] = None
    deadline_status: Optional[str] = None  # upcoming, closing_soon, expired

    model_config = ConfigDict(from_attributes=True)
