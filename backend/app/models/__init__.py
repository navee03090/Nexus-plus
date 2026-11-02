"""
ORM Models Package for NEXUS PULSE.
Exposes all canonical entities.
"""
from app.models.profile import Profile
from app.models.organization import Organization
from app.models.source import Source
from app.models.source_item import SourceItem, SourceMedia
from app.models.category import Category, Tag, OpportunityTag
from app.models.extraction import Extraction
from app.models.opportunity import Opportunity, OpportunitySource, OpportunityChange, OpportunityEmbedding
from app.models.eligibility import EligibilityRule, UserInterest, UserPreference, SavedOpportunity
from app.models.notification import NotificationPreference, NotificationDelivery
from app.models.audit import IngestionRun, IngestionError, VerificationQueue, AuditLog, OpportunityReport, Subscription

__all__ = [
    "Profile",
    "Organization",
    "Source",
    "SourceItem",
    "SourceMedia",
    "Category",
    "Tag",
    "OpportunityTag",
    "Extraction",
    "Opportunity",
    "OpportunitySource",
    "OpportunityChange",
    "OpportunityEmbedding",
    "EligibilityRule",
    "UserInterest",
    "UserPreference",
    "SavedOpportunity",
    "NotificationPreference",
    "NotificationDelivery",
    "IngestionRun",
    "IngestionError",
    "VerificationQueue",
    "AuditLog",
    "OpportunityReport",
    "Subscription",
]
