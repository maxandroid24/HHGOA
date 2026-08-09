// Social Share and Download utilities for HH Goa 2026

/**
 * Check if current client is a mobile device (phone / tablet / iPad)
 * @returns {boolean}
 */
export function isMobileDevice() {
  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  const isTouchMac = navigator.maxTouchPoints > 1 && /macintosh/i.test(ua); // iPadOS Safari
  return isMobileUA || isTouchMac;
}

/**
 * Check if current client is Android
 * @returns {boolean}
 */
export function isAndroid() {
  return /android/i.test((navigator.userAgent || '').toLowerCase());
}

/**
 * Check if current client is iOS / iPadOS
 * @returns {boolean}
 */
export function isIOS() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const isTouchMac = navigator.maxTouchPoints > 1 && /macintosh/i.test(ua);
  return /iphone|ipad|ipod/i.test(ua) || isTouchMac;
}

/**
 * Download canvas as high-res PNG
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 */
export async function downloadCanvasImage(canvas, filename = 'hh-goa-2026-graphic.png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to generate image file.'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve(true);
    }, 'image/png', 1.0);
  });
}

/**
 * Copy canvas image to system clipboard (supports instant Ctrl+V on desktop)
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<boolean>}
 */
export async function copyCanvasToClipboard(canvas) {
  if (!navigator.clipboard || !window.ClipboardItem) {
    return false;
  }
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return resolve(false);
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve(true);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
        resolve(false);
      }
    }, 'image/png');
  });
}

/**
 * Share graphic to X (Twitter)
 * - Desktop: Copies image to clipboard + downloads PNG + redirects to x.com/intent/tweet with prefilled caption & link
 * - Mobile: Launches X App via Deep Link/Intent with fallback to mobile browser x.com web intent + downloads PNG
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} formatType 'pfp' | 'card'
 * @param {(msg: string, type?: 'info'|'success'|'warn') => void} notify
 * @param {object} [cardData]
 */
export async function shareToX(canvas, formatType = 'pfp', notify = () => {}, cardData = {}) {
  const filename = formatType === 'pfp' 
    ? 'hh-goa-2026-pfp-frame.png' 
    : 'hh-goa-2026-builder-id.png';

  let tweetCaption;
  if (formatType === 'pfp') {
    tweetCaption = `Framed my official PFP for Hacker House Goa 2026 🌊⚡\n\n4 days of pure building on the Goa sand.\n\n#FrameInGoa @HackerHouseGoa @247pmstudio`;
  } else {
    const name = cardData?.name ? cardData.name.trim() : '';
    const role = cardData?.role ? cardData.role.trim() : (cardData?.title || '');
    const metaLine = name && role 
      ? `${name} · ${role} — Heads down. Ship or ship.`
      : name 
      ? `${name} — Heads down. Ship or ship.`
      : role 
      ? `${role} — Heads down. Ship or ship.`
      : `Heads down. Ship or ship.`;

    tweetCaption = `Minted my official Builder ID for Hacker House Goa 2026! 🌴⚡\n\n${metaLine}\n\n#FrameInGoa @HackerHouseGoa @247pmstudio`;
  }

  const tweetUrl = 'https://hhgoa.com';
  const fullTweetText = `${tweetCaption}\n\n${tweetUrl}`;

  // Standard Web Intent URL for 𝕏
  const webIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetCaption)}&url=${encodeURIComponent(tweetUrl)}`;

  const mobile = isMobileDevice();

  if (mobile) {
    // ----------------------------------------------------
    // MOBILE BEHAVIOR: Redirect to X app if available, else X website
    // ----------------------------------------------------
    
    // 1. Download image & copy to clipboard so mobile user has graphic ready
    try {
      await downloadCanvasImage(canvas, filename);
    } catch (e) {
      console.warn('Auto-download failed on mobile:', e);
    }
    await copyCanvasToClipboard(canvas);

    notify('Opening 𝕏! Image saved — attach it to your tweet.', 'success');

    if (isAndroid()) {
      // Android Chrome Intent syntax:
      // Attempts to launch the official X (Twitter) Android app to the compose screen.
      // If not installed, automatically falls back to browser_fallback_url (x.com intent).
      const androidIntentUrl = `intent://post?message=${encodeURIComponent(fullTweetText)}#Intent;package=com.twitter.android;scheme=twitter;S.browser_fallback_url=${encodeURIComponent(webIntentUrl)};end`;
      window.location.href = androidIntentUrl;
      return;
    }

    if (isIOS()) {
      // iOS Universal Link: https://x.com/intent/tweet
      // When opened in Safari / iOS browsers, iOS opens the native X app if installed,
      // or opens the web page on x.com in Safari if not installed without showing invalid address errors.
      window.location.href = webIntentUrl;
      return;
    }

    // Generic mobile fallback
    window.location.href = webIntentUrl;
    return;
  }

  // ------------------------------------------------------
  // DESKTOP BEHAVIOR:
  // Do NOT trigger navigator.share (which opens Windows Share sheet).
  // Directly copy to clipboard, download PNG, and open x.com tweet composer.
  // ------------------------------------------------------
  const copied = await copyCanvasToClipboard(canvas);
  try {
    await downloadCanvasImage(canvas, filename);
  } catch (e) {
    console.warn('Desktop auto-download failed:', e);
  }

  if (copied) {
    notify('Image copied & downloaded! Paste (Ctrl+V) into your tweet on 𝕏.', 'success');
  } else {
    notify('Image downloaded! Attach it to your tweet on 𝕏.', 'info');
  }

  // Open X Web Intent in a new tab/window
  window.open(webIntentUrl, '_blank', 'noopener,noreferrer');
}

