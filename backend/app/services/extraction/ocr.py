"""
OCR image processing abstraction (Section 29).
Includes image preprocessing (grayscale, thresholding, noise removal)
and OCR text extraction with graceful engine fallback.
"""
from typing import Optional
import cv2
import numpy as np
from app.core.logging import logger


class OCRProcessor:
    """Preprocesses images and extracts raw readable text."""

    @classmethod
    def preprocess_image(cls, image_bytes: bytes) -> Optional[np.ndarray]:
        """Converts raw image bytes to a cleaned grayscale thresholded numpy array."""
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return None

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Denoise
            denoised = cv2.fastNlMeansDenoising(gray, h=10)
            # Adaptive threshold for document/poster legibility
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            return thresh
        except Exception as e:
            logger.warning(f"Image preprocessing warning: {e}")
            return None

    @classmethod
    def extract_text(cls, image_bytes: bytes) -> str:
        """
        Extracts OCR text from flyer images.
        Uses pytesseract if system tesseract is available, or returns basic structural info.
        """
        if not image_bytes:
            return ""

        try:
            import pytesseract
            from PIL import Image
            import io

            # Load PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            text = pytesseract.image_to_string(image)
            return text.strip()
        except (ImportError, Exception) as e:
            # Fallback if tesseract system binary is not installed in current host environment
            logger.debug(f"Native Tesseract not invoked ({e}), relying on Gemini direct multimodal vision.")
            return ""
