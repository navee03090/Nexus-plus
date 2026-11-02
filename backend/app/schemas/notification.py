"""
Pydantic schemas for Notifications and alerts.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationPreferenceBase(BaseModel):
    email_enabled: bool = True
    telegram_enabled: bool = False
    telegram_chat_id: Optional[str] = None
    push_enabled: bool = True
    in_app_enabled: bool = True
    remind_7_days: bool = True
    remind_3_days: bool = True
    remind_24_hours: bool = True
    remind_6_hours: bool = True


class NotificationPreferenceUpdate(NotificationPreferenceBase):
    pass


class NotificationPreferenceRead(NotificationPreferenceBase):
    id: str
    user_id: str
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationDeliveryRead(BaseModel):
    id: str
    user_id: str
    opportunity_id: str
    notification_type: str
    channel: str
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    status: str
    error_message: Optional[str] = None
    opportunity_title: Optional[str] = None

    class Config:
        from_attributes = True
