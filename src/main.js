import './style.css';
import { createDefaultAvatar, processUploadedFile, loadImageFromUrl } from './imageProcessor.js';
import { renderPFPFrame, renderBuilderCard, preloadBrandAssets, computePhotoDrawParams } from './frameRenderer.js';
import { downloadCanvasImage, copyCanvasToClipboard, shareToX } from './shareHandler.js';
import { generateRandomTitle, generateRandomBuilderId, ROLE_PRESETS } from './titleGenerator.js';
import { createIcons, icons } from 'lucide';

// Application State
const state = {
  currentFormat: 'pfp', // 'pfp' | 'card'
  userImage: null,
  transform: {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    rotation: 0
  },
  pfpOptions: {
    style: 'classic',
    shape: 'circle'
  },
  cardOptions: {
    theme: 'emerald'
  },
  cardData: {
    name: '',
    role: '',
    title: 'Autonomous Alchemist',
    builderId: '#HHG-26-042'
  },
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  isRendering: false
};

// DOM Elements
const canvas = document.getElementById('renderCanvas');
const canvasWrapper = document.getElementById('canvasWrapper');
const tabFormatA = document.getElementById('tabFormatA');
const tabFormatB = document.getElementById('tabFormatB');
const formatAOptions = document.getElementById('formatAOptions');
const formatBOptions = document.getElementById('formatBOptions');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const zoomSlider = document.getElementById('zoomSlider');
const btnRotate = document.getElementById('btnRotate');
const btnResetTransform = document.getElementById('btnResetTransform');
const btnSample1 = document.getElementById('btnSample1');
const btnSample2 = document.getElementById('btnSample2');
const inputName = document.getElementById('inputName');
const inputRole = document.getElementById('inputRole');
const inputTitle = document.getElementById('inputTitle');
const btnRerollTitle = document.getElementById('btnRerollTitle');
const roleChipsContainer = document.getElementById('roleChipsContainer');
const btnDownload = document.getElementById('btnDownload');
const btnShareX = document.getElementById('btnShareX');
const btnCopyClipboard = document.getElementById('btnCopyClipboard');
const toastContainer = document.getElementById('toastContainer');

/**
 * Returns the active photo cutout bounds in canvas coordinate space
 */
function getActiveCutoutBounds() {
  if (state.currentFormat === 'pfp') {
    return {
      x: 185,
      y: 135,
      width: 710,
      height: 710,
      cx: 540,
      cy: 490,
      radius: 355,
      shape: state.pfpOptions.shape || 'circle'
    };
  } else {
    return {
      x: 80,
      y: 230,
      width: 430,
      height: 430,
      cx: 295,
      cy: 445,
      radius: 215,
      shape: 'square'
    };
  }
}

/**
 * Checks if a point (canvasX, canvasY) is inside the active cutout
 */
function isCoordInCutout(canvasX, canvasY) {
  const b = getActiveCutoutBounds();
  if (b.shape === 'circle') {
    const distSq = (canvasX - b.cx) ** 2 + (canvasY - b.cy) ** 2;
    return distSq <= b.radius ** 2;
  }
  return canvasX >= b.x &&
         canvasX <= (b.x + b.width) &&
         canvasY >= b.y &&
         canvasY <= (b.y + b.height);
}

/**
 * Strictly clamps current transform.panX and panY within image bounds
 */
function clampCurrentPan() {
  if (!state.userImage) return;
  const bounds = getActiveCutoutBounds();
  const params = computePhotoDrawParams(
    state.userImage,
    bounds.width,
    bounds.height,
    state.transform
  );
  state.transform.panX = params.panX;
  state.transform.panY = params.panY;
}

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Request Canvas Re-render
 */
let renderPending = false;
function requestRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(async () => {
    renderPending = false;
    if (!state.userImage) return;

    if (state.currentFormat === 'pfp') {
      canvas.classList.remove('card-aspect');
      await renderPFPFrame(canvas, state.userImage, {
        style: state.pfpOptions.style,
        shape: state.pfpOptions.shape,
        transform: state.transform
      });
    } else {
      canvas.classList.add('card-aspect');
      await renderBuilderCard(canvas, state.userImage, state.cardData, {
        theme: state.cardOptions.theme,
        transform: state.transform
      });
    }
  });
}

/**
 * Switch Format Tabs
 */
function setFormat(format) {
  state.currentFormat = format;
  if (format === 'pfp') {
    tabFormatA.classList.add('active');
    tabFormatA.setAttribute('aria-selected', 'true');
    tabFormatB.classList.remove('active');
    tabFormatB.setAttribute('aria-selected', 'false');
    formatAOptions.style.display = 'block';
    formatBOptions.style.display = 'none';
  } else {
    tabFormatB.classList.add('active');
    tabFormatB.setAttribute('aria-selected', 'true');
    tabFormatA.classList.remove('active');
    tabFormatA.setAttribute('aria-selected', 'false');
    formatAOptions.style.display = 'none';
    formatBOptions.style.display = 'block';
  }
  clampCurrentPan();
  requestRender();
}

/**
 * Setup Role Quick-Chips
 */
function setupRoleChips() {
  roleChipsContainer.innerHTML = '';
  ROLE_PRESETS.slice(0, 6).forEach(preset => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'role-chip';
    chip.textContent = preset;
    chip.addEventListener('click', () => {
      inputRole.value = preset;
      state.cardData.role = preset;
      requestRender();
    });
    roleChipsContainer.appendChild(chip);
  });
}

/**
 * Handle File Upload
 */
async function handleFile(file) {
  if (!file) return;
  try {
    const img = await processUploadedFile(file, (status) => showToast(status, 'info'));
    state.userImage = img;
    state.transform.panX = 0;
    state.transform.panY = 0;
    state.transform.zoom = 1.0;
    state.transform.rotation = 0;
    zoomSlider.value = 1;
    clampCurrentPan();
    showToast('Photo loaded successfully! 🎉', 'success');
    requestRender();
  } catch (err) {
    showToast(err.message || 'Failed to load photo.', 'warn');
  }
}

/**
 * Drag & Pan on Canvas — Restricted strictly to image cutout area & clamped to photo bounds
 */
function setupCanvasDrag() {
  const getEventCanvasCoords = (e) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;
    return { clientX, clientY, canvasX, canvasY, rect };
  };

  const onStart = (e) => {
    const coords = getEventCanvasCoords(e);
    // Only allow drag initiation strictly within the image cutout area
    if (!isCoordInCutout(coords.canvasX, coords.canvasY)) {
      return;
    }
    state.isDragging = true;
    state.dragStart = { x: coords.clientX, y: coords.clientY };
    canvas.style.cursor = 'grabbing';
    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }
  };

  const onMove = (e) => {
    const coords = getEventCanvasCoords(e);

    if (!state.isDragging) {
      // Update hover cursor based on whether mouse is over the active photo cutout
      if (isCoordInCutout(coords.canvasX, coords.canvasY)) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = 'default';
      }
      return;
    }

    if (e.cancelable && e.type.startsWith('touch')) {
      e.preventDefault();
    }

    const dx = coords.clientX - state.dragStart.x;
    const dy = coords.clientY - state.dragStart.y;
    state.dragStart = { x: coords.clientX, y: coords.clientY };

    // Scale delta relative to canvas pixel dimensions
    const scaleX = canvas.width / coords.rect.width;
    const scaleY = canvas.height / coords.rect.height;

    state.transform.panX += dx * scaleX;
    state.transform.panY += dy * scaleY;

    // Strictly clamp pan coordinates to image bounds
    clampCurrentPan();
    requestRender();
  };

  const onEnd = () => {
    if (state.isDragging) {
      state.isDragging = false;
      canvas.style.cursor = 'default';
    }
  };

  canvas.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  canvas.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);
}

/**
 * Initialize Application
 */
async function init() {
  await preloadBrandAssets();

  // Load default retro avatar
  const defaultAvatarUrl = createDefaultAvatar();
  state.userImage = await loadImageFromUrl(defaultAvatarUrl);
  state.cardData.title = generateRandomTitle();
  state.cardData.builderId = generateRandomBuilderId();
  inputTitle.value = state.cardData.title;

  setupRoleChips();
  setupCanvasDrag();

  // Format Tabs
  tabFormatA.addEventListener('click', () => setFormat('pfp'));
  tabFormatB.addEventListener('click', () => setFormat('card'));

  // Dropzone Events
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  ['dragenter', 'dragover'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Sample Avatars
  btnSample1.addEventListener('click', async () => {
    state.userImage = await loadImageFromUrl(createDefaultAvatar());
    state.transform = { zoom: 1, panX: 0, panY: 0, rotation: 0 };
    zoomSlider.value = 1;
    showToast('Loaded Retro Hacker avatar', 'info');
    requestRender();
  });

  btnSample2.addEventListener('click', async () => {
    // Generate Sunset avatar
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 600;
    sCanvas.height = 600;
    const sCtx = sCanvas.getContext('2d');
    const grad = sCtx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#ff0080');
    grad.addColorStop(0.6, '#fee101');
    grad.addColorStop(1, '#0b6839');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 600, 600);

    // Palm silhouette
    sCtx.fillStyle = '#0b6839';
    sCtx.beginPath();
    sCtx.arc(300, 300, 120, 0, Math.PI * 2);
    sCtx.fill();

    state.userImage = await loadImageFromUrl(sCanvas.toDataURL('image/png'));
    state.transform = { zoom: 1, panX: 0, panY: 0, rotation: 0 };
    zoomSlider.value = 1;
    showToast('Loaded Sunset avatar', 'info');
    requestRender();
  });

  // Adjustments
  zoomSlider.addEventListener('input', (e) => {
    state.transform.zoom = parseFloat(e.target.value);
    clampCurrentPan();
    requestRender();
  });

  btnRotate.addEventListener('click', () => {
    state.transform.rotation = (state.transform.rotation + 90) % 360;
    clampCurrentPan();
    requestRender();
  });

  btnResetTransform.addEventListener('click', () => {
    state.transform.zoom = 1.0;
    state.transform.panX = 0;
    state.transform.panY = 0;
    state.transform.rotation = 0;
    zoomSlider.value = 1;
    clampCurrentPan();
    requestRender();
  });

  // Format A: Style Selector
  const styleButtons = document.querySelectorAll('#frameStyleSelector .pill-option');
  styleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      styleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.pfpOptions.style = btn.getAttribute('data-style');
      requestRender();
    });
  });

  // Format A: Shape Selector
  const shapeButtons = document.querySelectorAll('#frameShapeSelector .pill-option');
  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.pfpOptions.shape = btn.getAttribute('data-shape');
      clampCurrentPan();
      requestRender();
    });
  });

  // Format B: Builder Name
  inputName.addEventListener('input', (e) => {
    state.cardData.name = e.target.value;
    requestRender();
  });

  // Format B: Builder Role
  inputRole.addEventListener('input', (e) => {
    state.cardData.role = e.target.value;
    requestRender();
  });

  // Format B: Re-roll Title
  btnRerollTitle.addEventListener('click', () => {
    const newTitle = generateRandomTitle();
    state.cardData.title = newTitle;
    inputTitle.value = newTitle;
    requestRender();
  });

  // Format B: Theme Selector
  const themeButtons = document.querySelectorAll('#cardThemeSelector .pill-option');
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.cardData.theme = btn.getAttribute('data-theme');
      state.cardOptions.theme = btn.getAttribute('data-theme');
      requestRender();
    });
  });

  // Action CTAs
  btnDownload.addEventListener('click', async () => {
    const filename = state.currentFormat === 'pfp' ? 'hh-goa-2026-pfp-frame.png' : 'hh-goa-2026-builder-card.png';
    try {
      await downloadCanvasImage(canvas, filename);
      showToast('Downloaded high-res PNG! 🚀', 'success');
    } catch (err) {
      showToast('Download failed. Please try again.', 'warn');
    }
  });

  btnShareX.addEventListener('click', () => {
    shareToX(canvas, state.currentFormat, (msg, type) => showToast(msg, type), state.cardData);
  });

  btnCopyClipboard.addEventListener('click', async () => {
    const success = await copyCanvasToClipboard(canvas);
    if (success) {
      showToast('Copied graphic to clipboard! (Ctrl+V to paste) 📋', 'success');
    } else {
      showToast('Clipboard permission is required to copy the image.', 'warn');
    }
  });

  // Initial render & Icon initialization
  createIcons({ icons });
  requestRender();
}

// Start app when DOM is ready
window.addEventListener('DOMContentLoaded', init);
