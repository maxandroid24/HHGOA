import './style.css';
import { createDefaultAvatar, processUploadedFile, loadImageFromUrl } from './imageProcessor.js';
import { renderPFPFrame, renderBuilderCard, preloadBrandAssets } from './frameRenderer.js';
import { downloadCanvasImage, copyCanvasToClipboard, shareToX } from './shareHandler.js';
import { generateRandomTitle, generateRandomBuilderId, ROLE_PRESETS } from './titleGenerator.js';

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
    showToast('Photo loaded successfully! 🎉', 'success');
    requestRender();
  } catch (err) {
    showToast(err.message || 'Failed to load photo.', 'warn');
  }
}

/**
 * Drag & Pan on Canvas
 */
function setupCanvasDrag() {
  const getCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const onStart = (e) => {
    state.isDragging = true;
    state.dragStart = getCoords(e);
  };

  const onMove = (e) => {
    if (!state.isDragging) return;
    const current = getCoords(e);
    const dx = current.x - state.dragStart.x;
    const dy = current.y - state.dragStart.y;
    state.dragStart = current;

    // Scale delta relative to 1080px canvas display
    const rect = canvas.getBoundingClientRect();
    const scale = 1080 / rect.width;

    state.transform.panX += dx * scale;
    state.transform.panY += dy * scale;
    requestRender();
  };

  const onEnd = () => {
    state.isDragging = false;
  };

  canvasWrapper.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  canvasWrapper.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
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
    requestRender();
  });

  btnRotate.addEventListener('click', () => {
    state.transform.rotation = (state.transform.rotation + 90) % 360;
    requestRender();
  });

  btnResetTransform.addEventListener('click', () => {
    state.transform.zoom = 1.0;
    state.transform.panX = 0;
    state.transform.panY = 0;
    state.transform.rotation = 0;
    zoomSlider.value = 1;
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
    shareToX(canvas, state.currentFormat, (msg, type) => showToast(msg, type));
  });

  btnCopyClipboard.addEventListener('click', async () => {
    const success = await copyCanvasToClipboard(canvas);
    if (success) {
      showToast('Copied graphic to clipboard! (Ctrl+V to paste)', 'success');
    } else {
      showToast('Clipboard access unavailable, downloading instead...', 'info');
      downloadCanvasImage(canvas, 'hh-goa-2026-graphic.png');
    }
  });

  // Initial render
  requestRender();
}

// Start app when DOM is ready
window.addEventListener('DOMContentLoaded', init);
