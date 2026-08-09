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
 * Loads a File into an HTMLImageElement
 * Converts HEIC/HEIF to JPEG lazily if necessary
 * @param {File} file
 * @param {(progress: string) => void} onStatus
 * @returns {Promise<HTMLImageElement>}
 */
export async function processUploadedFile(file, onStatus = () => {}) {
  let blob = file;
  const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                file.name.toLowerCase().endsWith('.heif') ||
                file.type === 'image/heic' || 
                file.type === 'image/heif';

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
      blob = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error('HEIC conversion failed:', err);
      throw new Error('Failed to convert iPhone HEIC photo. Please try a JPG or PNG.');
    }
  }

  onStatus('Loading photo...');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Invalid image file format.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsDataURL(blob);
  });
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
