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

  // Standard Web Intent URL for 𝕏 (passes full text with link and hashtags in text param)
  const webIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullTweetText)}`;

  const mobile = isMobileDevice();

  if (mobile) {
    // ----------------------------------------------------
    // MOBILE BEHAVIOR: Launch X app with prefilled caption, fallback to browser
    // ----------------------------------------------------
    
    // 1. Copy image to clipboard & download image so mobile user has graphic ready
    const copied = await copyCanvasToClipboard(canvas);
    try {
      await downloadCanvasImage(canvas, filename);
    } catch (e) {
      console.warn('Auto-download failed on mobile:', e);
    }

    if (copied) {
      notify('Opening 𝕏! Image copied to clipboard & saved to Photos.', 'success');
    } else {
      notify('Opening 𝕏! Image saved to Photos — attach to your tweet.', 'success');
    }

    if (isAndroid()) {
      // Android Chrome Intent syntax:
      // Passes 'text', 'message', and 'S.android.intent.extra.TEXT' to guarantee
      // that all versions of the X (Twitter) Android app receive the prefilled tweet text.
      const encodedText = encodeURIComponent(fullTweetText);
      const encodedFallback = encodeURIComponent(webIntentUrl);
      const androidIntentUrl = `intent://post?text=${encodedText}&message=${encodedText}#Intent;package=com.twitter.android;scheme=twitter;action=android.intent.action.SEND;type=text/plain;S.android.intent.extra.TEXT=${encodedText};S.browser_fallback_url=${encodedFallback};end`;
      
      window.location.href = androidIntentUrl;
      return;
    }

    if (isIOS()) {
      // iOS: Try deep-link scheme first, fallback to Universal Link / Web Intent
      const iosSchemeUrl = `twitter://post?text=${encodeURIComponent(fullTweetText)}`;
      
      // Fallback timer if X app is not installed
      const start = Date.now();
      const timer = setTimeout(() => {
        if (Date.now() - start < 2500 && !document.hidden) {
          window.location.href = webIntentUrl;
        }
      }, 1000);

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

