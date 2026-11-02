# 🚀 Nexus Pulse Curator Browser Extension (Manifest V3)

> **"1-Click Ingestion for Real-World Opportunities across Pakistan."**
> Extract, verify, and publish hackathons, scholarships, and grants directly from LinkedIn, Facebook, Instagram, Twitter/X, and university portals without manual data entry.

---

## 🌟 How It Works

1. **Auto-Detection (`content.js`)**:
   - Inspects the active tab DOM on social platforms.
   - Automatically isolates the canonical post link, caption text, and flyer/poster image URL.
2. **Instant Preview & Edit (`popup.html` & `popup.js`)**:
   - Displays a clean dark-mode curation interface.
   - Lets you preview the detected flyer poster, edit post commentary, or specify taxonomy tags.
3. **Multimodal Ingestion Pipeline**:
   - Transmits evidence to `POST /api/v1/ingestion/curator`.
   - Backend scans embedded QR codes (e.g. Google Form links), executes Otsu OCR on graphic text, performs Gemini 2.5 Flash structured reasoning, and deduplicates against existing records.
4. **Live Verification**:
   - Immediate feedback showing the parsed title, trust score, deadline, venue, and a direct link to the live event page on Nexus Pulse.

---

## 🛠️ Installation Guide (Chrome, Edge, Brave)

### Step 1: Open Extension Management
- **Google Chrome**: Navigate to `chrome://extensions`
- **Microsoft Edge**: Navigate to `edge://extensions`
- **Brave**: Navigate to `brave://extensions`

### Step 2: Enable Developer Mode
- Turn ON the **"Developer mode"** toggle located in the top-right corner.

### Step 3: Load the Extension
1. Click the **"Load unpacked"** button in the top-left corner.
2. In the folder picker dialog, navigate to and select:
   ```
   e:\Nexus Plus\extension
   ```
3. You will immediately see **Nexus Pulse Curator (v1.0.0)** appear in your active extensions list!

### Step 4: Pin to Toolbar
- Click the Extensions puzzle piece icon (`🧩`) in your browser's top bar and pin **Nexus Pulse Curator** for instant 1-click access.

---

## 🎯 Usage Walkthrough

### Option A: From Social Media Feeds (LinkedIn / Facebook / Instagram)
1. Open any announcement post (e.g. an AI hackathon posted by UET Peshawar, KPITB, or NIC Peshawar).
2. Click the **Nexus Pulse** extension icon in your toolbar.
3. The popup automatically captures:
   - Canonical post URL
   - Post caption text
   - Highest-resolution flyer image
4. (Optional) Add tags like `AI, Hackathon, KPITB`.
5. Click **"Ingest to Nexus Pulse"**.
6. Within 2-3 seconds, see the extracted opportunity title, deadline, trust score, and decoded QR codes!

### Option B: From University Notice Boards & Web Portals
1. Highlight any portion of text on an announcement page (optional).
2. Click the **Nexus Pulse** icon.
3. The extension captures your highlighted text or the page description and the primary poster.
4. Click **"Ingest to Nexus Pulse"**.

---

## ⚙️ Configuration & Telemetry

- **API Base**: Defaults to `http://localhost:8000`. You can change this directly in the extension footer to point to your deployed production server (e.g., `https://api.nexus-pulse.com`).
- **Zero Hallucination Guarantee**: Every curated opportunity maintains an immutable cryptographic record of the source URL and flyer hash in `source_items` and `source_media`.
