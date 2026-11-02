/**
 * Nexus Pulse Curator - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const platformBadge = document.getElementById("platformBadge");
  const loadingDetector = document.getElementById("loadingDetector");
  const curateForm = document.getElementById("curateForm");
  const sourceUrlInput = document.getElementById("sourceUrl");
  const rawTextInput = document.getElementById("rawText");
  const tagsInput = document.getElementById("tags");
  const flyerUrlInput = document.getElementById("flyerUrl");
  const flyerImg = document.getElementById("flyerImg");
  const noFlyerNotice = document.getElementById("noFlyerNotice");
  const flyerContainer = document.getElementById("flyerPreviewContainer");
  const submitBtn = document.getElementById("submitBtn");
  const apiUrlInput = document.getElementById("apiUrl");

  // Success view elements
  const successView = document.getElementById("successView");
  const resTitle = document.getElementById("resTitle");
  const resStatusBadge = document.getElementById("resStatusBadge");
  const resSummary = document.getElementById("resSummary");
  const resDeadline = document.getElementById("resDeadline");
  const resTrust = document.getElementById("resTrust");
  const qrAlert = document.getElementById("qrAlert");
  const qrLink = document.getElementById("qrLink");
  const viewLiveLink = document.getElementById("viewLiveLink");
  const curateAnotherBtn = document.getElementById("curateAnotherBtn");

  // Error view
  const errorAlert = document.getElementById("errorAlert");
  const errorMsg = document.getElementById("errorMsg");

  let detectedPlatform = "Web";

  // 1. Load saved API base URL
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["nexusApiUrl"], (result) => {
      if (result.nexusApiUrl) {
        apiUrlInput.value = result.nexusApiUrl;
      }
    });
  }

  apiUrlInput.addEventListener("change", () => {
    const val = apiUrlInput.value.trim().replace(/\/+$/, "");
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ nexusApiUrl: val });
    }
  });

  // Helper to show errors
  function showError(msg) {
    errorMsg.textContent = msg;
    errorAlert.classList.remove("hidden");
  }

  function hideError() {
    errorAlert.classList.add("hidden");
  }

  // Update flyer image preview
  function updateFlyerPreview(url) {
    if (url && url.startsWith("http")) {
      flyerImg.src = url;
      flyerImg.classList.remove("hidden");
      noFlyerNotice.classList.add("hidden");
      flyerContainer.classList.remove("empty");
    } else {
      flyerImg.src = "";
      flyerImg.classList.add("hidden");
      noFlyerNotice.classList.remove("hidden");
      flyerContainer.classList.add("empty");
    }
  }

  flyerUrlInput.addEventListener("input", (e) => {
    updateFlyerPreview(e.target.value.trim());
  });

  // 2. Query active browser tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      throw new Error("Unable to identify active browser tab.");
    }

    // Try communicating with content script
    chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_PAGE_DATA" }, (response) => {
      loadingDetector.classList.add("hidden");
      curateForm.classList.remove("hidden");

      if (chrome.runtime.lastError || !response || !response.success) {
        // Fallback: Use basic tab info if content script didn't respond
        sourceUrlInput.value = tab.url || "";
        rawTextInput.value = tab.title || "";
        platformBadge.textContent = "Web";
        detectedPlatform = "Web";
        return;
      }

      const { data } = response;
      detectedPlatform = data.platform || "Web";
      platformBadge.textContent = detectedPlatform;
      sourceUrlInput.value = data.sourceUrl || tab.url || "";
      rawTextInput.value = data.rawText || data.titleHint || "";

      if (data.flyerUrl) {
        flyerUrlInput.value = data.flyerUrl;
        updateFlyerPreview(data.flyerUrl);
      }
    });
  } catch (err) {
    loadingDetector.classList.add("hidden");
    curateForm.classList.remove("hidden");
    platformBadge.textContent = "Web";
    showError("Could not inspect page DOM. You can still paste details manually.");
  }

  // 3. Form Submit Handler
  curateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const sourceUrl = sourceUrlInput.value.trim();
    if (!sourceUrl) {
      showError("Please provide a valid source URL.");
      return;
    }

    const rawText = rawTextInput.value.trim();
    const flyerUrl = flyerUrlInput.value.trim();
    const tags = tagsInput.value.trim();
    const apiBase = (apiUrlInput.value.trim() || "http://localhost:8000").replace(/\/+$/, "");

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.querySelector(".btn-text").textContent = "Curating with Gemini...";
    submitBtn.querySelector(".btn-spinner").classList.remove("hidden");

    try {
      const formData = new FormData();
      formData.append("source_url", sourceUrl);
      formData.append("platform", detectedPlatform);
      if (rawText) formData.append("raw_text", rawText);
      if (flyerUrl) formData.append("flyer_url", flyerUrl);
      if (tags) formData.append("tags", tags);

      const endpoint = `${apiBase}/api/v1/ingestion/curator`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.detail || json.message || `Server returned ${response.status}`);
      }

      // Success! Populate success card
      const opp = json.data.opportunity;
      resTitle.textContent = opp.title || "Curated Opportunity";
      resSummary.textContent = opp.summary || "Parsed and verified successfully.";
      resStatusBadge.textContent = json.data.is_new ? "New Discovered" : "Updated Match";

      if (opp.registration_deadline) {
        const d = new Date(opp.registration_deadline);
        resDeadline.textContent = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      } else {
        resDeadline.textContent = "Open / Ongoing";
      }

      const trustPct = Math.round((opp.trust_score || 0.95) * 100);
      resTrust.textContent = `${trustPct}%`;

      // QR Code check
      if (json.data.qr_codes && json.data.qr_codes.length > 0) {
        qrAlert.classList.remove("hidden");
        qrLink.href = json.data.qr_codes[0];
        qrLink.textContent = json.data.qr_codes[0];
      } else {
        qrAlert.classList.add("hidden");
      }

      // Live portal link
      const portalUrl = `http://localhost:3000/opportunities/${opp.slug}`;
      viewLiveLink.href = portalUrl;

      // Switch to success view
      curateForm.classList.add("hidden");
      successView.classList.remove("hidden");

    } catch (err) {
      showError(`Ingestion Failed: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector(".btn-text").textContent = "Ingest to Nexus Pulse";
      submitBtn.querySelector(".btn-spinner").classList.add("hidden");
    }
  });

  // 4. "Curate Another" Action
  curateAnotherBtn.addEventListener("click", () => {
    successView.classList.add("hidden");
    curateForm.classList.remove("hidden");
    rawTextInput.value = "";
    tagsInput.value = "";
    flyerUrlInput.value = "";
    updateFlyerPreview("");
    hideError();
  });
});
