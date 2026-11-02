"""
AI Model Abstraction (Section 74).
Establishes AIProvider interface to prevent hard-coding one model implementation.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.schemas.opportunity import GeminiExtractionOutput


class AIProvider(ABC):
    """Abstract interface for LLM/Multimodal Opportunity Intelligence."""

    @abstractmethod
    async def extract_opportunity(
        self,
        raw_text: str,
        caption: Optional[str] = None,
        ocr_text: Optional[str] = None,
        qr_urls: Optional[List[str]] = None,
        image_bytes: Optional[bytes] = None,
        publication_timestamp: Optional[str] = None,
        source_timezone: str = "Asia/Karachi",
    ) -> GeminiExtractionOutput:
        """Extracts structured opportunity schema from multimodal evidence."""
        pass

    @abstractmethod
    async def classify_content(self, text: str) -> Dict[str, Any]:
        """Classifies content into primary category and target audience."""
        pass

    @abstractmethod
    async def summarize_opportunity(self, title: str, description: str) -> str:
        """Generates a concise 1-2 sentence executive summary."""
        pass

    @abstractmethod
    async def detect_changes(self, old_data: Dict[str, Any], new_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Compares previous opportunity state with newly extracted data."""
        pass

    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        """Generates semantic vector embedding for semantic search and deduplication."""
        pass
