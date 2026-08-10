// Image processor supporting JPG, PNG, WebP, and iPhone HEIC files (dynamically loaded)

// High quality sample avatar generator (colorful retro beach hacker placeholder)
export function createDefaultAvatar() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  // Vibrant warm tropical gradient background
  const grad = ctx.createLinearGradient(0, 0, 600, 600);
  grad.addColorStop(0, '#fee101');
  grad.addColorStop(0.5, '#ff0080');
  grad.addColorStop(1, '#0b6839');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 600);

  // Subtle sun circle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(300, 240, 160, 0, Math.PI * 2);
  ctx.fill();

  // Hacker Avatar silhouette
  ctx.fillStyle = '#fffbe8';
  // Head
  ctx.beginPath();
  ctx.arc(300, 230, 90, 0, Math.PI * 2);
  ctx.fill();

  // Cool sunglasses
  ctx.fillStyle = '#0b6839';
  ctx.beginPath();
  ctx.roundRect(235, 215, 55, 30, 6);
  ctx.roundRect(310, 215, 55, 30, 6);
  ctx.fill();
  ctx.fillRect(285, 225, 30, 6); // bridge

  // Sunglasses reflection
  ctx.strokeStyle = '#fee101';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(245, 222);
  ctx.lineTo(275, 238);
  ctx.moveTo(320, 222);
  ctx.lineTo(350, 238);
  ctx.stroke();

  // Body / Hoodie shoulders
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath();
  ctx.ellipse(300, 480, 180, 150, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hoodie collar detail
  ctx.fillStyle = '#ff0080';
  ctx.beginPath();
  ctx.moveTo(260, 320);
  ctx.lineTo(300, 390);
  ctx.lineTo(340, 320);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

/**
 * Helper to load a Blob/File into an HTMLImageElement via object URL
 * @param {Blob|File} blob
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Downscales an HTMLImageElement if it exceeds maximum dimensions (2560px)
 * Prevents Mobile Safari GPU memory limits and canvas texture crashes.
 * @param {HTMLImageElement} img
 * @param {number} [maxDim=2560]
 * @returns {Promise<HTMLImageElement>}
 */
function downscaleImageIfNeeded(img, maxDim = 2560) {
  if (!img || (img.width <= maxDim && img.height <= maxDim)) {
    return Promise.resolve(img);
  }

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const downscaledImg = new Image();
        downscaledImg.crossOrigin = 'anonymous';
        downscaledImg.onload = () => resolve(downscaledImg);
        downscaledImg.onerror = () => resolve(img);
        downscaledImg.src = canvas.toDataURL('image/jpeg', 0.92);
        return;
      }
    } catch (err) {
      console.warn('Image downscaling warning:', err);
    }
    resolve(img);
  });
}

/**
 * Loads a File into an HTMLImageElement
 * Supports native decoding (iOS Safari 17+, Chrome, Firefox),
 * HEIC fallback conversion via heic2any, and automatic mobile downscaling.
 * @param {File} file
 * @param {(progress: string) => void} onStatus
 * @returns {Promise<HTMLImageElement>}
 */
export async function processUploadedFile(file, onStatus = () => {}) {
  onStatus('Loading photo...');

  // 1. Attempt native browser decoding via object URL
  // iOS Safari 17+, macOS, Chrome & Android natively decode HEIC, JPG, PNG, WEBP, GIF
  try {
    const nativeImg = await loadImageFromBlob(file);
    if (nativeImg && nativeImg.width > 0 && nativeImg.height > 0) {
      onStatus('Processing photo...');
      return await downscaleImageIfNeeded(nativeImg, 2560);
    }
  } catch (nativeErr) {
    console.warn('Native image decoding failed, checking for HEIC fallback conversion:', nativeErr);
  }

  // 2. If native decoding failed, check if file is HEIC/HEIF
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();
  const isHeic = fileName.endsWith('.heic') || 
                fileName.endsWith('.heif') ||
                fileType.includes('heic') || 
                fileType.includes('heif');

  let processedBlob = file;

  if (isHeic) {
    onStatus('Converting iPhone HEIC image...');
    try {
      const heic2anyModule = await import('heic2any');
      const heic2any = heic2anyModule.default || heic2anyModule;
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.92
      });
      processedBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch (heicErr) {
      console.error('HEIC conversion failed:', heicErr);
      throw new Error('Failed to convert iPhone HEIC photo. Please try a JPG or PNG.');
    }
  }

  // 3. Load the converted blob into an Image
  try {
    const loadedImg = await loadImageFromBlob(processedBlob);
    onStatus('Processing photo...');
    return await downscaleImageIfNeeded(loadedImg, 2560);
  } catch (err) {
    // 4. Last resort fallback: FileReader readAsDataURL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fallbackImg = new Image();
        fallbackImg.onload = async () => {
          try {
            const finalImg = await downscaleImageIfNeeded(fallbackImg, 2560);
            resolve(finalImg);
          } catch (e) {
            resolve(fallbackImg);
          }
        };
        fallbackImg.onerror = () => reject(new Error('Invalid image file format.'));
        fallbackImg.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(processedBlob);
    });
  }
}

/**
 * Loads an image from a URL or data URI
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFromUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from: ${src}`));
    img.src = src;
  });
}
