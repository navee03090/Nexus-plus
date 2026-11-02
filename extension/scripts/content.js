/**
 * Nexus Pulse Curator - Content Script
 * Extracts canonical announcement URLs, flyer image sources, and post copy
 * from LinkedIn, Facebook, Instagram, Twitter/X, and Academic Portals.
 */

(function () {
  function detectPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("linkedin.com")) return "LinkedIn";
    if (host.includes("facebook.com")) return "Facebook";
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("twitter.com") || host.includes("x.com")) return "Twitter";
    return "Web";
  }

  function getSelectedOrPostText(platform) {
    // 1. If user highlighted any text, always respect that first
    const selection = window.getSelection()?.toString()?.trim();
    if (selection && selection.length > 5) {
      return selection;
    }

    // 2. Platform-specific post content extraction
    if (platform === "LinkedIn") {
      const candidates = [
        document.querySelector(".feed-shared-update-v2 .update-components-text"),
        document.querySelector(".feed-shared-update-v2__description-wrapper"),
        document.querySelector(".feed-shared-text"),
        document.querySelector("div.feed-shared-inline-show-more-text"),
        document.querySelector(".attributed-text-segment-list__content")
      ];
      for (const el of candidates) {
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
    } else if (platform === "Facebook") {
      const candidates = [
        document.querySelector('div[data-ad-preview="message"]'),
        document.querySelector('div[dir="auto"][style*="text-align"]'),
        document.querySelector('div.x1iorvi4')
      ];
      for (const el of candidates) {
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
    } else if (platform === "Instagram") {
      const candidates = [
        document.querySelector("h1._a9zs"),
        document.querySelector("div._a9zs"),
        document.querySelector("span._a9zs")
      ];
      for (const el of candidates) {
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
    } else if (platform === "Twitter") {
      const candidates = [
        document.querySelector('div[data-testid="tweetText"]'),
        document.querySelector('article div[lang]')
      ];
      for (const el of candidates) {
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
    }

    // 3. Fallback to OpenGraph / Meta Description
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
    if (ogDesc && ogDesc.trim()) return ogDesc.trim();

    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content");
    if (metaDesc && metaDesc.trim()) return metaDesc.trim();

    // 4. Fallback to primary article or headline text
    const article = document.querySelector("article") || document.querySelector("main");
    if (article) {
      const p = article.querySelector("p");
      if (p && p.innerText.trim()) return p.innerText.trim();
    }

    return "";
  }

  function getFlyerImageUrl(platform) {
    // 1. Platform-specific image selectors
    if (platform === "LinkedIn") {
      const img = document.querySelector(
        '.feed-shared-update-v2 img.update-components-image__image, ' +
        '.feed-shared-update-v2 img.ivm-view-attr__img--centered, ' +
        'img[src*="media.licdn.com/dms/image"]'
      );
      if (img && img.src && !img.src.includes("profile-displayphoto")) {
        return img.src;
      }
    } else if (platform === "Facebook") {
      const img = document.querySelector(
        'img[data-visualcompletion="media-vc-image"], ' +
        'img[src*="scontent"], ' +
        'div[data-ad-preview="message"] ~ div img'
      );
      if (img && img.src) return img.src;
    } else if (platform === "Instagram") {
      const img = document.querySelector(
        'article img[src*="cdninstagram"], ' +
        'article img[style*="object-fit"], ' +
        'div._aagv img'
      );
      if (img && img.src) return img.src;
    }

    // 2. OpenGraph Image
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImage && ogImage.startsWith("http")) {
      return ogImage;
    }

    // 3. Heuristic: Largest image on the page (> 200px width and height)
    const allImages = Array.from(document.querySelectorAll("img"));
    let bestImg = null;
    let maxArea = 0;

    for (const img of allImages) {
      const rect = img.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (
        rect.width >= 200 &&
        rect.height >= 180 &&
        area > maxArea &&
        img.src &&
        !img.src.includes("avatar") &&
        !img.src.includes("logo") &&
        !img.src.includes("icon")
      ) {
        maxArea = area;
        bestImg = img;
      }
    }

    return bestImg ? bestImg.src : "";
  }

  // Handle messages from the extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXTRACT_PAGE_DATA") {
      const platform = detectPlatform();
      const sourceUrl = window.location.href;
      const rawText = getSelectedOrPostText(platform);
      const flyerUrl = getFlyerImageUrl(platform);
      const titleHint = document.title || "";

      sendResponse({
        success: true,
        data: {
          platform,
          sourceUrl,
          rawText,
          flyerUrl,
          titleHint
        }
      });
    }
    return true; // Keep message channel open
  });
})();
