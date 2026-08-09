// High-Resolution Canvas Rendering Engine for HH Goa 2026
// Renders 1080x1080 PFP Frames and 1080x1350 Builder ID Cards

import { loadImageFromUrl } from './imageProcessor.js';

// Cache brand assets
const assets = {
  hackerHouse: null,
  goaHindi: null,
  twoFortySeven: null,
  footerTrees: null,
  loaded: false
};

export async function preloadBrandAssets() {
  if (assets.loaded) return;
  try {
    const [hh, goa, tfs, trees] = await Promise.allSettled([
      loadImageFromUrl('/brand/hacker_house.png'),
      loadImageFromUrl('/brand/goa_hindi.svg'),
      loadImageFromUrl('/brand/2-47.svg'),
      loadImageFromUrl('/brand/footer_trees.png')
    ]);
    if (hh.status === 'fulfilled') assets.hackerHouse = hh.value;
    if (goa.status === 'fulfilled') assets.goaHindi = goa.value;
    if (tfs.status === 'fulfilled') assets.twoFortySeven = tfs.value;
    if (trees.status === 'fulfilled') assets.footerTrees = trees.value;
  } catch (err) {
    console.warn('Using programmatic vector assets fallback:', err);
  }
  assets.loaded = true;
}

/**
 * Draws the user's photo with zoom, pan, and rotation transformations
 */
function drawUserPhoto(ctx, img, targetX, targetY, targetWidth, targetHeight, transform) {
  if (!img) return;
  ctx.save();

  // Create clip path for target area
  ctx.beginPath();
  ctx.rect(targetX, targetY, targetWidth, targetHeight);
  ctx.clip();

  const centerX = targetX + targetWidth / 2;
  const centerY = targetY + targetHeight / 2;

  // Move to center of target
  ctx.translate(centerX + (transform.panX || 0), centerY + (transform.panY || 0));

  if (transform.rotation) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }

  // Calculate cover aspect ratio
  const imgAspect = img.width / img.height;
  const targetAspect = targetWidth / targetHeight;

  let drawW, drawH;
  if (imgAspect > targetAspect) {
    drawH = targetHeight;
    drawW = targetHeight * imgAspect;
  } else {
    drawW = targetWidth;
    drawH = targetWidth / imgAspect;
  }

  const zoom = transform.zoom || 1.0;
  drawW *= zoom;
  drawH *= zoom;

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * Draws simulated QR code graphic
 */
function drawSimulatedQR(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  const cells = 8;
  const cellSize = size / cells;

  // Finder corners
  const drawFinder = (fx, fy) => {
    ctx.fillRect(fx, fy, cellSize * 3, cellSize * 3);
    ctx.clearRect(fx + cellSize * 0.5, fy + cellSize * 0.5, cellSize * 2, cellSize * 2);
    ctx.fillRect(fx + cellSize, fy + cellSize, cellSize, cellSize);
  };

  drawFinder(x, y);
  drawFinder(x + size - cellSize * 3, y);
  drawFinder(x, y + size - cellSize * 3);

  // Random data pattern
  const pattern = [
    [0,0,0,0,1,0,0,0],
    [0,0,0,0,0,1,0,0],
    [0,0,0,0,1,1,0,0],
    [1,0,1,0,0,1,1,1],
    [0,1,0,1,1,0,1,0],
    [0,0,0,0,1,0,0,1],
    [0,0,0,0,0,1,1,0],
    [0,0,0,1,0,1,0,1]
  ];

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (pattern[r][c] === 1) {
        ctx.fillRect(x + c * cellSize, y + r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
  ctx.restore();
}

// -------------------------------------------------------------
// FORMAT A: PFP FRAME RENDERER (1080 x 1080)
// -------------------------------------------------------------
export async function renderPFPFrame(canvas, userImg, options = {}) {
  await preloadBrandAssets();
  const ctx = canvas.getContext('2d');
  const size = 1080;
  canvas.width = size;
  canvas.height = size;

  const style = options.style || 'classic'; // 'classic', 'sunset', 'terminal', 'sticker'
  const shape = options.shape || 'circle'; // 'circle' or 'square'
  const transform = options.transform || { zoom: 1, panX: 0, panY: 0, rotation: 0 };

  ctx.clearRect(0, 0, size, size);

  // Background frame palette
  let bgPrimary = '#0b6839';
  let accentYellow = '#fee101';
  let accentPink = '#ff0080';
  let textLight = '#fffbe8';

  if (style === 'sunset') {
    bgPrimary = '#a30048';
    accentYellow = '#fee101';
    accentPink = '#0b6839';
  } else if (style === 'terminal') {
    bgPrimary = '#061a0f';
    accentYellow = '#00ff66';
    accentPink = '#fee101';
  } else if (style === 'sticker') {
    bgPrimary = '#fffbe8';
    accentYellow = '#0b6839';
    accentPink = '#ff0080';
    textLight = '#0b6839';
  }

  // 1. Fill base frame background
  ctx.fillStyle = bgPrimary;
  ctx.fillRect(0, 0, size, size);

  // Decorative border ring / corner patterns
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 4;
  for (let r = 90; r < 400; r += 45) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size, size, r, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Draw user photo inside cutout
  const photoSize = 710;
  const cx = size / 2;
  const cy = 490;
  const radius = photoSize / 2;

  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  } else {
    ctx.roundRect(cx - radius, cy - radius, photoSize, photoSize, 48);
  }
  ctx.clip();

  // Photo background (in case image is transparent)
  ctx.fillStyle = '#fffbe8';
  ctx.fillRect(cx - radius, cy - radius, photoSize, photoSize);

  // Draw user image
  drawUserPhoto(ctx, userImg, cx - radius, cy - radius, photoSize, photoSize, transform);
  ctx.restore();

  // 3. Draw Cutout Border / Ring
  ctx.save();
  ctx.lineWidth = 14;
  ctx.strokeStyle = accentYellow;
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  } else {
    ctx.roundRect(cx - radius, cy - radius, photoSize, photoSize, 48);
  }
  ctx.stroke();

  // Outer dashed accent ring
  ctx.lineWidth = 4;
  ctx.strokeStyle = accentPink;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
  } else {
    ctx.roundRect(cx - radius - 18, cy - radius - 18, photoSize + 36, photoSize + 36, 56);
  }
  ctx.stroke();
  ctx.restore();

  // 4. TOP BADGE: "2:47 PM STUDIO" & "GOA, INDIA · 28 – 31 OCT 2026"
  ctx.save();
  const topCardW = 560;
  const topCardH = 74;
  const topCardX = (size - topCardW) / 2;
  const topCardY = 24;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(topCardX + 5, topCardY + 5, topCardW, topCardH, 20);
  ctx.fill();

  // Top Card Body
  ctx.fillStyle = (style === 'sticker') ? '#0b6839' : '#fee101';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(topCardX, topCardY, topCardW, topCardH, 20);
  ctx.fill();
  ctx.stroke();

  // Pushpin dots on top card
  ctx.fillStyle = accentPink;
  ctx.beginPath();
  ctx.arc(topCardX + 16, topCardY + topCardH / 2, 6, 0, Math.PI * 2);
  ctx.arc(topCardX + topCardW - 16, topCardY + topCardH / 2, 6, 0, Math.PI * 2);
  ctx.fill();

  // Line 1: Studio tag
  ctx.fillStyle = (style === 'sticker') ? '#fee101' : '#0b6839';
  ctx.font = '700 14px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ 2:47 PM STUDIO PRESENTS ⚡', cx, topCardY + 24);

  // Line 2: Prominent Event Date & Location
  ctx.fillStyle = (style === 'sticker') ? '#ffffff' : '#000000';
  ctx.font = '800 20px "Victor Mono", monospace';
  ctx.fillText('GOA, INDIA · 28 – 31 OCT 2026', cx, topCardY + 52);
  ctx.restore();

  // 5. BOTTOM BRANDING BANNER: "HACKER HOUSE" + "गोवा" + "#FrameInGoa"
  const bannerY = size - 170;
  const bannerW = 880;
  const bannerH = 115;
  const bannerX = (size - bannerW) / 2;

  ctx.save();
  // Neo-brutalist shadow for banner
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(bannerX + 6, bannerY + 6, bannerW, bannerH, 24);
  ctx.fill();

  // Banner background
  ctx.fillStyle = (style === 'sticker') ? '#fee101' : '#fffbe8';
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 24);
  ctx.fill();
  ctx.stroke();

  // Pushpin dots on corners of banner
  ctx.fillStyle = accentPink;
  ctx.beginPath();
  ctx.arc(bannerX + 22, bannerY + 22, 8, 0, Math.PI * 2);
  ctx.arc(bannerX + bannerW - 22, bannerY + 22, 8, 0, Math.PI * 2);
  ctx.fill();

  // Draw "HACKER HOUSE" in the banner
  if (assets.hackerHouse) {
    const hhW = 340;
    const hhH = 75;
    ctx.drawImage(assets.hackerHouse, bannerX + 40, bannerY + 20, hhW, hhH);
  } else {
    ctx.fillStyle = '#0b6839';
    ctx.font = '900 48px "Imbue", serif';
    ctx.textAlign = 'left';
    ctx.fillText('HACKER HOUSE', bannerX + 40, bannerY + 75);
  }

  // Draw "गोवा" Hindi logo badge
  if (assets.goaHindi) {
    const gW = 140;
    const gH = 95;
    ctx.drawImage(assets.goaHindi, bannerX + 400, bannerY + 10, gW, gH);
  } else {
    ctx.fillStyle = '#ff0080';
    ctx.font = '900 42px "Outfit", sans-serif';
    ctx.fillText('गोवा', bannerX + 410, bannerY + 75);
  }

  // Draw "#FrameInGoa" pill on right of banner
  const tagW = 210;
  const tagH = 46;
  const tagX = bannerX + bannerW - tagW - 25;
  const tagY = bannerY + 35;

  ctx.fillStyle = '#ff0080';
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 23);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 20px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('#FrameInGoa', tagX + tagW / 2, tagY + 30);
  ctx.restore();

  // Bottom tagline
  ctx.save();
  ctx.fillStyle = accentYellow;
  ctx.font = '700 16px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('✦ 247 BUILDERS · HEADS DOWN. SHIP OR SHIP ✦', cx, size - 20);
  ctx.restore();
}

// -------------------------------------------------------------
// FORMAT B: BUILDER ID CARD RENDERER (1080 x 1350)
// -------------------------------------------------------------
export async function renderBuilderCard(canvas, userImg, data = {}, options = {}) {
  await preloadBrandAssets();
  const ctx = canvas.getContext('2d');
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const theme = options.theme || 'emerald'; // 'emerald', 'sunset', 'midnight'
  const transform = options.transform || { zoom: 1, panX: 0, panY: 0, rotation: 0 };

  const name = (data.name && data.name.trim().length > 0 ? data.name.trim() : 'JOHN DOE').toUpperCase();
  const role = (data.role && data.role.trim().length > 0 ? data.role.trim() : 'AI RESEARCH & WEB3').toUpperCase();
  const title = (data.title || 'CONSENSUS ALCHEMIST').toUpperCase();
  const builderId = data.builderId || '#HHG-26-042';

  ctx.clearRect(0, 0, width, height);

  // Palettes
  let bgOuter = '#074827';
  let cardBg = '#fffbe8';
  let primaryGreen = '#0b6839';
  let accentYellow = '#fee101';
  let accentPink = '#ff0080';
  let textDark = '#0b6839';

  if (theme === 'sunset') {
    bgOuter = '#a30048';
    cardBg = '#fffbe8';
    primaryGreen = '#ff0080';
    accentYellow = '#fee101';
    accentPink = '#0b6839';
    textDark = '#2a0014';
  } else if (theme === 'midnight') {
    bgOuter = '#05130b';
    cardBg = '#0b2617';
    primaryGreen = '#fee101';
    accentYellow = '#00ff66';
    accentPink = '#ff0080';
    textDark = '#fffbe8';
  }

  // 1. Outer Background
  ctx.fillStyle = bgOuter;
  ctx.fillRect(0, 0, width, height);

  // Background palm trees at bottom
  if (assets.footerTrees) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.drawImage(assets.footerTrees, 0, height - 320, width, 320);
    ctx.restore();
  }

  // 2. Main Badge Card Container (Balanced full-height container)
  const cardMargin = 40;
  const cardW = width - cardMargin * 2;
  const cardH = height - cardMargin * 2;
  const cardX = cardMargin;
  const cardY = cardMargin;

  // Neo-brutalist heavy shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(cardX + 12, cardY + 14, cardW, cardH, 32);
  ctx.fill();

  // Card Body
  ctx.fillStyle = cardBg;
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 32);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Corner pushpin dots
  const pins = [
    { x: cardX + 32, y: cardY + 32, c: accentPink },
    { x: cardX + cardW - 32, y: cardY + 32, c: accentYellow },
    { x: cardX + 32, y: cardY + cardH - 32, c: accentYellow },
    { x: cardX + cardW - 32, y: cardY + cardH - 32, c: accentPink }
  ];
  pins.forEach(p => {
    ctx.save();
    ctx.fillStyle = p.c;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // 3. CARD HEADER BAR
  const headerY = cardY + 28;

  ctx.save();
  ctx.fillStyle = (theme === 'midnight') ? accentYellow : '#0b6839';
  ctx.font = '700 19px "Victor Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('2:47 PM STUDIO PRESENTS', cardX + 45, headerY + 24);

  ctx.textAlign = 'right';
  ctx.fillText('GOA, INDIA · 28-31 OCT 2026', cardX + cardW - 45, headerY + 24);

  // Divider Line
  ctx.strokeStyle = (theme === 'midnight') ? 'rgba(255,255,255,0.2)' : 'rgba(11, 104, 57, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(cardX + 45, headerY + 42);
  ctx.lineTo(cardX + cardW - 45, headerY + 42);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 4. BIG LOGO HEADER ("HACKER HOUSE" + "गोवा")
  const logoY = headerY + 58;
  if (assets.hackerHouse) {
    const hhW = 420;
    const hhH = 92;
    ctx.drawImage(assets.hackerHouse, cardX + 45, logoY, hhW, hhH);
  } else {
    ctx.fillStyle = (theme === 'midnight') ? '#fee101' : '#0b6839';
    ctx.font = '900 64px "Imbue", serif';
    ctx.textAlign = 'left';
    ctx.fillText('HACKER HOUSE', cardX + 45, logoY + 65);
  }

  if (assets.goaHindi) {
    const gW = 160;
    const gH = 110;
    ctx.drawImage(assets.goaHindi, cardX + 475, logoY - 10, gW, gH);
  } else {
    ctx.fillStyle = '#ff0080';
    ctx.font = '900 54px "Outfit", sans-serif';
    ctx.fillText('गोवा', cardX + 490, logoY + 65);
  }

  // Builder ID Badge pill on top right
  const idBadgeW = 220;
  const idBadgeH = 50;
  const idBadgeX = cardX + cardW - idBadgeW - 45;
  const idBadgeY = logoY + 15;

  ctx.save();
  ctx.fillStyle = accentPink;
  ctx.beginPath();
  ctx.roundRect(idBadgeX, idBadgeY, idBadgeW, idBadgeH, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(builderId, idBadgeX + idBadgeW / 2, idBadgeY + 33);
  ctx.restore();

  // 5. BUILDER PHOTO BOX (Neo-brutalist frame)
  const photoBoxW = 430;
  const photoBoxH = 430;
  const photoBoxX = cardX + 45;
  const photoBoxY = logoY + 115;

  // Photo shadow
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(photoBoxX + 8, photoBoxY + 8, photoBoxW, photoBoxH, 24);
  ctx.fill();

  // Photo container border
  ctx.fillStyle = '#0b6839';
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH, 24);
  ctx.fill();
  ctx.stroke();

  // Clip user photo
  ctx.beginPath();
  ctx.roundRect(photoBoxX + 6, photoBoxY + 6, photoBoxW - 12, photoBoxH - 12, 20);
  ctx.clip();

  ctx.fillStyle = '#fffbe8';
  ctx.fillRect(photoBoxX, photoBoxY, photoBoxW, photoBoxH);

  drawUserPhoto(ctx, userImg, photoBoxX + 6, photoBoxY + 6, photoBoxW - 12, photoBoxH - 12, transform);
  ctx.restore();

  // Status tag on photo bottom
  const statusTagW = 270;
  const statusTagH = 40;
  const statusTagX = photoBoxX + (photoBoxW - statusTagW) / 2;
  const statusTagY = photoBoxY + photoBoxH - 24;

  ctx.save();
  ctx.fillStyle = '#0b6839';
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(statusTagX, statusTagY, statusTagW, statusTagH, 20);
  ctx.fill();
  ctx.stroke();

  // Pulsing dot
  ctx.fillStyle = '#00ff66';
  ctx.beginPath();
  ctx.arc(statusTagX + 24, statusTagY + 20, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fee101';
  ctx.font = '700 16px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFIED RESIDENT', statusTagX + statusTagW / 2 + 10, statusTagY + 26);
  ctx.restore();

  // 6. BUILDER DETAILS (Right of photo)
  const infoX = photoBoxX + photoBoxW + 35;
  const infoY = photoBoxY + 5;
  const infoW = cardX + cardW - infoX - 45;

  // Label: BUILDER NAME
  ctx.save();
  ctx.fillStyle = accentPink;
  ctx.font = '700 16px "Victor Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BUILDER / COHORT 2026', infoX, infoY + 20);

  // Big Builder Name
  ctx.fillStyle = textDark;
  ctx.font = '900 42px "Imbue", "Outfit", serif';
  
  let displayName = name;
  if (displayName.length > 18) {
    displayName = displayName.substring(0, 16) + '...';
  }
  ctx.fillText(displayName, infoX, infoY + 68);

  // Divider
  ctx.strokeStyle = (theme === 'midnight') ? 'rgba(255,255,255,0.2)' : 'rgba(11, 104, 57, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(infoX, infoY + 88);
  ctx.lineTo(infoX + infoW, infoY + 88);
  ctx.stroke();

  // Label: PRIMARY STACK & ROLE
  ctx.fillStyle = accentPink;
  ctx.font = '700 16px "Victor Mono", monospace';
  ctx.fillText('PRIMARY STACK / ROLE', infoX, infoY + 122);

  // Role Pill Box
  const roleBoxH = 52;
  ctx.fillStyle = (theme === 'midnight') ? '#081d11' : '#0b6839';
  ctx.beginPath();
  ctx.roundRect(infoX, infoY + 136, infoW, roleBoxH, 12);
  ctx.fill();

  ctx.fillStyle = '#fee101';
  ctx.font = '700 20px "Victor Mono", monospace';
  ctx.fillText(role.length > 24 ? role.substring(0, 22) + '...' : role, infoX + 16, infoY + 169);

  // Label: GENERATED BUILDER CLASS
  ctx.fillStyle = accentPink;
  ctx.font = '700 16px "Victor Mono", monospace';
  ctx.fillText('BUILDER TITLE & CLASS', infoX, infoY + 225);

  // Title Badge
  const titleBoxH = 58;
  ctx.fillStyle = accentYellow;
  ctx.strokeStyle = '#0b6839';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(infoX, infoY + 238, infoW, titleBoxH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0b6839';
  ctx.font = '900 22px "Victor Mono", monospace';
  ctx.fillText(`✦ ${title} ✦`, infoX + 16, infoY + 275);

  // Stat counters row
  const statBoxY = infoY + 328;
  ctx.fillStyle = (theme === 'midnight') ? 'rgba(255,255,255,0.06)' : 'rgba(11, 104, 57, 0.08)';
  ctx.beginPath();
  ctx.roundRect(infoX, statBoxY, infoW, 76, 14);
  ctx.fill();

  ctx.fillStyle = textDark;
  ctx.font = '700 14px "Victor Mono", monospace';
  ctx.fillText('RESIDENCY STATS', infoX + 16, statBoxY + 28);
  ctx.font = '800 19px "Victor Mono", monospace';
  ctx.fillStyle = accentPink;
  ctx.fillText('247 BUILDERS · 4 DAYS · 0 FLUFF', infoX + 16, statBoxY + 58);

  ctx.restore();

  // 7. MIDDLE HIGHLIGHT BANNER: "HEADS DOWN. SHIP OR SHIP."
  const midBannerY = photoBoxY + photoBoxH + 45;
  const midBannerW = cardW - 90;
  const midBannerX = cardX + 45;
  const midBannerH = 75;

  ctx.save();
  ctx.fillStyle = '#0b6839';
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(midBannerX, midBannerY, midBannerW, midBannerH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fee101';
  ctx.font = '800 24px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ LESS NOISE. MORE SIGNAL · HEADS DOWN. SHIP OR SHIP ⚡', width / 2, midBannerY + 46);
  ctx.restore();

  // 8. EXPANDED BOTTOM AUTHENTICITY PASS & SECURITY SECTION (Zero dead space)
  const passY = midBannerY + midBannerH + 30;
  const passW = cardW - 90;
  const passX = cardX + 45;
  const passH = 210;

  ctx.save();
  ctx.fillStyle = (theme === 'midnight') ? 'rgba(255,255,255,0.04)' : '#f2ecd0';
  ctx.strokeStyle = (theme === 'midnight') ? 'rgba(255,255,255,0.1)' : '#0b6839';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(passX, passY, passW, passH, 20);
  ctx.fill();
  ctx.stroke();

  // Barcode on left
  const barcodeX = passX + 30;
  const barcodeY = passY + 28;
  const barcodeW = 280;
  const barcodeH = 80;

  ctx.fillStyle = (theme === 'midnight') ? '#fee101' : '#0b6839';
  let curX = barcodeX;
  const barPattern = [3, 1, 4, 2, 6, 2, 1, 5, 2, 4, 1, 3, 2, 6, 1, 3, 4, 2, 5, 1, 2, 4, 3, 1, 6, 2, 3, 1, 4, 2, 5, 1, 4, 2];
  barPattern.forEach((barW) => {
    ctx.fillRect(curX, barcodeY, barW, barcodeH);
    curX += barW + 4;
  });

  ctx.font = '700 15px "Victor Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('AUTH: SHA-256//HHG-PASS-2026', barcodeX, barcodeY + barcodeH + 26);
  ctx.font = '500 13px "Victor Mono", monospace';
  ctx.fillStyle = textDark;
  ctx.fillText('VERIFY: DEVFL.IO/HHGOA26', barcodeX, barcodeY + barcodeH + 52);

  // Simulated QR Code in center
  const qrX = passX + 340;
  const qrY = passY + 28;
  const qrSize = 105;
  drawSimulatedQR(ctx, qrX, qrY, qrSize, (theme === 'midnight') ? '#fee101' : '#0b6839');

  ctx.font = '600 12px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN BADGE', qrX + qrSize / 2, qrY + qrSize + 22);

  // Right side badges: #FrameInGoa & Devfolio
  const tagColX = passX + passW - 390;
  
  // #FrameInGoa badge
  ctx.fillStyle = accentPink;
  ctx.beginPath();
  ctx.roundRect(tagColX, passY + 25, 360, 52, 26);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('#FrameInGoa', tagColX + 180, passY + 60);

  // Link & Rights info
  ctx.fillStyle = textDark;
  ctx.font = '700 17px "Victor Mono", monospace';
  ctx.fillText('HHGOA.COM · HACKER HOUSE', tagColX + 180, passY + 115);
  ctx.font = '600 15px "Victor Mono", monospace';
  ctx.fillText('GOA, INDIA · 28 – 31 OCT 2026', tagColX + 180, passY + 144);
  ctx.fillText('OFFICIAL RESIDENCY IDENTITY', tagColX + 180, passY + 172);

  ctx.restore();

  // 9. BOTTOM RESIDENCY PLEDGE BAR (Fills the base of the card cleanly)
  const pledgeY = passY + passH + 20;
  const pledgeW = cardW - 90;
  const pledgeX = cardX + 45;
  const pledgeH = 64;

  ctx.save();
  ctx.fillStyle = (theme === 'midnight') ? '#081d11' : '#0b6839';
  ctx.strokeStyle = accentYellow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(pledgeX, pledgeY, pledgeW, pledgeH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentYellow;
  ctx.font = '800 18px "Victor Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('✦ RESIDENCY ACCESS TIER-1 · OCEAN-FRONT HACK STATION · 2026 ✦', width / 2, pledgeY + 40);
  ctx.restore();
}
