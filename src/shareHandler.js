// Social Share and Download utilities for HH Goa 2026

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
 * Uses Web Share API (mobile with image file attachment) or Web Intent URL fallback
 * @param {HTMLCanvasElement} canvas
 * @param {string} formatType 'pfp' | 'card'
 * @param {(msg: string, type?: 'info'|'success'|'warn') => void} notify
 */
export async function shareToX(canvas, formatType = 'pfp', notify = () => {}) {
  const filename = formatType === 'pfp' 
    ? 'hh-goa-2026-pfp-frame.png' 
    : 'hh-goa-2026-builder-id.png';

  const tweetCaption = formatType === 'pfp'
    ? `Framed my official PFP for Hacker House Goa 2026 🌊⚡\n\n4 days of pure building on the Goa sand.\n\n#FrameInGoa @HackerHouseGoa @247pmstudio`
    : `Minted my official Builder ID for Hacker House Goa 2026! 🌴⚡\n\nHeads down. Ship or ship.\n\n#FrameInGoa @HackerHouseGoa @247pmstudio`;

  const tweetUrl = 'https://hhgoa.com';

  // 1. Try Web Share API (Native mobile share sheet with image file)
  if (navigator.share && navigator.canShare) {
    try {
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], filename, { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Hacker House Goa 2026',
          text: `${tweetCaption}\n\n${tweetUrl}`,
          files: [file]
        });
        notify('Shared successfully!', 'success');
        return;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web share failed, falling back to intent:', err);
      } else {
        return; // User canceled share sheet
      }
    }
  }

  // 2. Fallback: Copy image to clipboard + Download + Open Twitter Intent
  const copied = await copyCanvasToClipboard(canvas);
  await downloadCanvasImage(canvas, filename);

  if (copied) {
    notify('Image copied to clipboard & downloaded! Paste (Ctrl+V) into your tweet.', 'success');
  } else {
    notify('Image downloaded! Attach it to your tweet.', 'info');
  }

  // Construct Twitter Intent URL with prefilled text & hashtags
  const intentParams = new URLSearchParams({
    text: tweetCaption,
    url: tweetUrl,
    hashtags: 'FrameInGoa'
  });

  const intentUrl = `https://twitter.com/intent/tweet?${intentParams.toString()}`;
  window.open(intentUrl, '_blank', 'width=620,height=550,noopener,noreferrer');
}
