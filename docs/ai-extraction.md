# NEXUS PULSE — Multimodal AI Extraction & Deterministic Validation

## 1. Overview

NEXUS PULSE uses Google Gemini (`gemini-2.5-flash`) as an intelligence and structured extraction engine, not as an unconstrained content generator.

The system adheres strictly to the **Zero Hallucination Standard**:
- Missing deadlines remain `null`.
- Registration links are never guessed or manufactured.
- Dates and venues are only asserted if explicitly stated in text, flyer OCR, or decoded QR codes.

---

## 2. Multimodal Extraction Pipeline

```
Raw Evidence Item (HTML / Text / Flyer Image)
               │
               ▼
   [ QR Code Decoder ] ──(Found URL)──┐
               │                      │
               ▼                      │
   [ Image Preprocessing ]            │
   (Grayscale, Otsu, Denoise)         │
               │                      │
               ▼                      │
    [ Tesseract OCR Text ]            │
               │                      │
               ├──────────────────────┘
               ▼
     [ Gemini Multimodal API ]
    (Schema: GeminiExtractionOutput)
               │
               ▼
   [ Structured JSON Output ]
               │
               ▼
 [ Deterministic Rule Validator ]
   - registration_deadline <= start_date
   - start_date <= end_date
   - URL regex & scheme verification
   - Contradiction detection
               │
               ▼
    Validated Extraction Record
```

---

## 3. QR Code & OCR Preprocessing

- **QR Decoding (`backend/app/services/extraction/qr.py`)**:
  - Uses `cv2.QRCodeDetector` to detect and decode direct registration links embedded in flyer images.
  - Decoded URLs are tested and passed into the extraction payload with high provenance confidence.
- **Image Preprocessing (`backend/app/services/extraction/ocr.py`)**:
  - Automatically converts uploaded flyers and posters to grayscale.
  - Applies Otsu's binarization thresholding to handle low-contrast event banners.
  - Removes gaussian noise to improve OCR word accuracy.

---

## 4. Prompt Engineering & System Invariants

The extraction system prompt in `backend/app/services/ai/gemini.py` instructs the model:
1. Extract facts with strict fidelity to raw text and poster pixels.
2. If the flyer says "Register before Oct 18", format as ISO 8601 in `Asia/Karachi` timezone (`2026-10-18T23:59:59+05:00`).
3. If an announcement body mentions "Deadline extended to Oct 25", update the deadline and flag `deadline_extended: true`.
4. Output must strictly conform to the Pydantic schema `GeminiExtractionOutput`.

---

## 5. Deterministic Validation Engine

Located in `backend/app/services/extraction/validator.py`:
- **Temporal Consistency**: Checks that registration deadlines precede or equal the event start date. Rejects records where the deadline is in the past relative to the announcement publish date without explanation.
- **URL Syntax & Scheme**: Enforces HTTP/HTTPS protocol and validates domain structures. Flags suspicious shortened links.
- **Contradiction Flags**: Detects conflicting dates between poster header and body copy.
