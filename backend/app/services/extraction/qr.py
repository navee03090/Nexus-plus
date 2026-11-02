"""
QR Code detector and decoder (Section 29).
Uses OpenCV QR Code Detector to extract registration and information URLs directly from posters.
"""
from typing import List, Dict, Any
import cv2
import numpy as np
from app.core.logging import logger


class QRCodeProcessor:
    """
    Detects and decodes QR codes from image byte buffers or arrays.
    """

    @classmethod
    def decode_from_bytes(cls, image_bytes: bytes) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        if not image_bytes:
            return results

        try:
            # Decode image bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return results

            detector = cv2.QRCodeDetector()
            # Try detectAndDecodeMulti first
            retval, decoded_info, points, _ = detector.detectAndDecodeMulti(img)

            if retval and decoded_info:
                for text in decoded_info:
                    if text and text.strip():
                        results.append({
                            "type": "QR_CODE",
                            "data": text.strip(),
                            "is_url": text.strip().startswith(("http://", "https://")),
                        })
            else:
                # Single detector fallback
                data, bbox, _ = detector.detectAndDecode(img)
                if data and data.strip():
                    results.append({
                        "type": "QR_CODE",
                        "data": data.strip(),
                        "is_url": data.strip().startswith(("http://", "https://")),
                    })

        except Exception as e:
            logger.warning(f"QR code decoding encountered non-fatal error: {e}")

        return results
