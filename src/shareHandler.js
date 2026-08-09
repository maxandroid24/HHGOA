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
 * - Checks and requests clipboard image permission
 * - If permitted (or previously allowed): copies image to clipboard and fires native App deep-links / Web Intent
 * - If not permitted: stops execution and alerts user that clipboard permission is required
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} formatType 'pfp' | 'card'
 * @param {(msg: string, type?: 'info'|'success'|'warn') => void} notify
 * @param {object} [cardData]
 */
export async function shareToX(canvas, formatType = 'pfp', notify = () => {}, cardData = {}) {
  // 1. Check if clipboard write is supported
  if (!navigator.clipboard || !window.ClipboardItem) {
    notify('Clipboard permission is required to share the image. Your browser does not support clipboard image copying.', 'warn');
    return;
  }

  // 2. Check existing permission status if supported by browser
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'clipboard-write' });
      if (perm && perm.state === 'denied') {
        notify('Clipboard permission is blocked in your browser settings. Please allow clipboard access to share.', 'warn');
        return;
      }
    } catch (e) {
      // clipboard-write query is not supported in some browsers, proceed to write attempt
    }
  }

  // 3. Attempt to copy image to clipboard (prompts user if not yet permitted, or directly succeeds if already permitted)
  const copied = await copyCanvasToClipboard(canvas);
  if (!copied) {
    notify('Clipboard permission is required to copy and share the image to 𝕏. Please allow clipboard access.', 'warn');
    return; // DO NOT fire intents or open X if permission is denied/not granted!
  }

  // 4. Permission was granted / already allowed! Now fire intents / deep links / web intent
  notify('Image copied to clipboard! Opening 𝕏...', 'success');

  const filename = formatType === 'pfp' 
    ? 'hh-goa-2026-pfp-frame.png' 
    : 'hh-goa-2026-builder-id.png';

  let tweetCaption;
  const appUrl = 'https://hhgoa.navneetkhar24.workers.dev/';

  if (formatType === 'pfp') {
    tweetCaption = `Framed my official PFP for Hacker House Goa 2026 🌊⚡\n\n4 days of pure building on the Goa sand.\n\n#FrameInGoa @HackerHouseGoa @247pmstudio\n\nCreate your own frame here:\n${appUrl}`;
  } else {
    const name = cardData?.name ? cardData.name.trim() : '';
    const title = cardData?.title ? cardData.title.trim() : '';

    let metaLine = '';
    if (name && title) {
      metaLine = `Builder: ${name}\nTitle & Class: ${title} — Heads down. Ship or ship.`;
    } else if (name) {
      metaLine = `Builder: ${name} — Heads down. Ship or ship.`;
    } else if (title) {
      metaLine = `Title & Class: ${title} — Heads down. Ship or ship.`;
    } else {
      metaLine = `Heads down. Ship or ship.`;
    }

    tweetCaption = `Minted my official Builder ID for Hacker House Goa 2026! 🌴⚡\n\n${metaLine}\n\n#FrameInGoa @HackerHouseGoa @247pmstudio\n\nCreate your own builder badge here:\n${appUrl}`;
  }

  const fullTweetText = tweetCaption;

  // Standard Web Intent URL for 𝕏 (passes full text with link and hashtags in text param)
  const webIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullTweetText)}`;

  const mobile = isMobileDevice();

  if (mobile) {
    if (isAndroid()) {
      // Android Chrome Intent syntax:
      // Launches com.twitter.android if installed, falls back to webIntentUrl if not.
      const encodedText = encodeURIComponent(fullTweetText);
      const encodedFallback = encodeURIComponent(webIntentUrl);
      const androidIntentUrl = `intent://post?text=${encodedText}#Intent;package=com.twitter.android;scheme=twitter;S.browser_fallback_url=${encodedFallback};end`;
      
      window.location.href = androidIntentUrl;
      return;
    }

    if (isIOS()) {
      // iOS: Launch native X app via scheme
      const iosSchemeUrl = `twitter://post?text=${encodeURIComponent(fullTweetText)}`;
      
      // Fallback timer if X app is not installed
      const start = Date.now();
      const timer = setTimeout(() => {
        if (Date.now() - start < 2500 && !document.hidden) {
          window.location.href = webIntentUrl;
        }
      }, 1200);

      const onVisibilityChange = () => {
        if (document.hidden) {
          clearTimeout(timer);
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      window.location.href = iosSchemeUrl;
      return;
    }

    // Generic mobile fallback
    window.location.href = webIntentUrl;
    return;
  }

  // ------------------------------------------------------
  // DESKTOP BEHAVIOR:
  // Open X Web Intent in a new tab/window
  // ------------------------------------------------------
  window.open(webIntentUrl, '_blank', 'noopener,noreferrer');
}

