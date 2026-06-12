import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

// ─── Config ────────────────────────────────────────────────
const CATEGORIES = {
  eyewear: {
    label: 'Eyewear Try-On',
    panelTitle: 'Select a Frame',
    guideType: 'face',
    products: [
      { id: 'classic', name: 'Classic', type: 'svg', color: '#1a1a2e', frameWidth: 280 },
      { id: 'aviator', name: 'Aviator', type: 'svg', color: '#2d2d44', frameWidth: 300 },
      { id: 'round', name: 'Round', type: 'svg', color: '#8B4513', frameWidth: 260 },
      { id: 'cateye', name: 'Cat Eye', type: 'svg', color: '#4a0e3c', frameWidth: 280 },
      { id: 'wayfarer', name: 'Wayfarer', type: 'svg', color: '#0a0a1a', frameWidth: 290 },
      { id: 'oversized', name: 'Oversized', type: 'svg', color: '#1c1c3a', frameWidth: 320 },
    ]
  },
  apparel: {
    label: 'Apparel Try-On',
    panelTitle: 'Select a Garment',
    guideType: 'body',
    products: [
      { id: 'blazer', name: 'Blazer', type: 'svg', color: '#1a1a2e' },
      { id: 'tshirt', name: 'T-Shirt', type: 'svg', color: '#2d3436' },
      { id: 'hoodie', name: 'Hoodie', type: 'svg', color: '#6c3483' },
      { id: 'jacket', name: 'Jacket', type: 'svg', color: '#1B4332' },
      { id: 'vest', name: 'Vest', type: 'svg', color: '#4a4e69' },
    ]
  },
  jewelry: {
    label: 'Jewelry Try-On',
    panelTitle: 'Select a Piece',
    guideType: 'face',
    products: [
      { id: 'necklace-gold', name: 'Gold Chain', type: 'svg', color: '#DAA520' },
      { id: 'necklace-silver', name: 'Silver Chain', type: 'svg', color: '#C0C0C0' },
      { id: 'earring-drop', name: 'Drop Earrings', type: 'svg', color: '#DAA520' },
      { id: 'earring-stud', name: 'Stud Earrings', type: 'svg', color: '#E5E4E2' },
      { id: 'choker', name: 'Choker', type: 'svg', color: '#B8860B' },
    ]
  },
  cosmetics: {
    label: 'Cosmetics Try-On',
    panelTitle: 'Select a Shade',
    guideType: 'face',
    products: [
      { id: 'lip-red', name: 'Classic Red', type: 'color', color: '#C0392B' },
      { id: 'lip-rose', name: 'Rosé', type: 'color', color: '#E75480' },
      { id: 'lip-berry', name: 'Berry', type: 'color', color: '#8E4585' },
      { id: 'lip-nude', name: 'Nude', type: 'color', color: '#C69C72' },
      { id: 'lip-coral', name: 'Coral', type: 'color', color: '#FF6F61' },
      { id: 'lip-plum', name: 'Plum', type: 'color', color: '#6B2D5B' },
      { id: 'lip-pink', name: 'Hot Pink', type: 'color', color: '#FF1493' },
      { id: 'lip-mauve', name: 'Mauve', type: 'color', color: '#B784A7' },
    ]
  }
};

// ─── State ─────────────────────────────────────────────────
let currentCategory = 'eyewear';
let currentProduct = null;
let stream = null;
let baseScale = 1;
let userOffsetY = 0;

let faceLandmarker;
let lastVideoTime = -1;
let isTracking = false;

// ─── DOM ───────────────────────────────────────────────────
const categoryLabel = document.getElementById('tryon-category-label');
const permissionScreen = document.getElementById('tryon-permission');
const enableCameraBtn = document.getElementById('enable-camera-btn');
const viewport = document.getElementById('tryon-viewport');
const errorScreen = document.getElementById('tryon-error');
const cameraFeed = document.getElementById('camera-feed');
const arCanvas = document.getElementById('ar-canvas');
const faceGuide = document.getElementById('face-guide');
const captureBtn = document.getElementById('capture-btn');
const captureFlash = document.getElementById('capture-flash');
const captureModal = document.getElementById('capture-modal');
const captureCanvas = document.getElementById('capture-canvas');
const downloadBtn = document.getElementById('download-btn');
const closeCaptureBtn = document.getElementById('close-capture');
const panel = document.getElementById('tryon-panel');
const panelTitle = document.getElementById('panel-title');
const panelProducts = document.getElementById('panel-products');
const panelToggle = document.getElementById('panel-toggle');
const sizeSlider = document.getElementById('size-slider');
const positionSlider = document.getElementById('position-slider');

// ─── Init ──────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  currentCategory = params.get('category') || 'eyewear';

  if (!CATEGORIES[currentCategory]) {
    currentCategory = 'eyewear';
  }

  const cat = CATEGORIES[currentCategory];
  document.title = `${cat.label} — AELTRIX`;
  categoryLabel.textContent = cat.label;

  enableCameraBtn.addEventListener('click', startCamera);
  captureBtn.addEventListener('click', capturePhoto);
  closeCaptureBtn.addEventListener('click', closeCaptureModal);
  panelToggle.addEventListener('click', togglePanel);

  sizeSlider.addEventListener('input', (e) => {
    baseScale = e.target.value / 100;
  });

  positionSlider.addEventListener('input', (e) => {
    userOffsetY = parseInt(e.target.value);
  });

  // Preload MediaPipe
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: false,
      runningMode: "VIDEO",
      numFaces: 1
    });
    console.log("MediaPipe initialized successfully.");
  } catch (err) {
    console.error("Failed to load MediaPipe:", err);
  }
}

// ─── Camera ────────────────────────────────────────────────
async function startCamera() {
  enableCameraBtn.textContent = "Loading AI Engine...";
  enableCameraBtn.disabled = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    cameraFeed.srcObject = stream;
    
    cameraFeed.addEventListener('loadedmetadata', () => {
      arCanvas.width = cameraFeed.videoWidth;
      arCanvas.height = cameraFeed.videoHeight;
      cameraFeed.play();
    });

    cameraFeed.addEventListener('playing', () => {
      permissionScreen.style.display = 'none';
      viewport.style.display = 'block';
      panel.style.display = 'block';

      buildProductPanel();
      
      // Start render loop
      isTracking = true;
      requestAnimationFrame(renderLoop);
    });

  } catch (err) {
    console.error('Camera error:', err);
    permissionScreen.style.display = 'none';
    errorScreen.style.display = 'flex';
  }
}

// ─── Product Panel ─────────────────────────────────────────
function buildProductPanel() {
  const cat = CATEGORIES[currentCategory];
  panelTitle.textContent = cat.panelTitle;
  panelProducts.innerHTML = '';

  cat.products.forEach((product, index) => {
    const option = document.createElement('div');

    if (product.type === 'color') {
      option.className = 'product-option color-swatch';
      option.innerHTML = `<div class="swatch-inner" style="background:${product.color}"></div>`;
    } else {
      option.className = 'product-option';
      option.innerHTML = getProductThumbnail(product);
    }

    const label = document.createElement('span');
    label.className = 'product-label';
    label.textContent = product.name;
    option.appendChild(label);

    option.addEventListener('click', () => selectProduct(product, option));
    panelProducts.appendChild(option);

    if (index === 0) {
      setTimeout(() => selectProduct(product, option), 300);
    }
  });
}

function selectProduct(product, element) {
  currentProduct = product;
  panelProducts.querySelectorAll('.product-option').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
}

function togglePanel() {
  panel.classList.toggle('collapsed');
}

// ─── Continuous Render Loop ────────────────────────────────
async function renderLoop() {
  if (!isTracking || !currentProduct || !faceLandmarker) {
    requestAnimationFrame(renderLoop);
    return;
  }

  const ctx = arCanvas.getContext('2d');
  const vw = arCanvas.width;
  const vh = arCanvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, vw, vh);

  // Detect faces
  let startTimeMs = performance.now();
  if (lastVideoTime !== cameraFeed.currentTime) {
    lastVideoTime = cameraFeed.currentTime;
    try {
      const results = faceLandmarker.detectForVideo(cameraFeed, startTimeMs);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        renderOverlay(ctx, vw, vh, landmarks);
      } else {
        // Fallback for apparel or if face not found - center it
        renderFallback(ctx, vw, vh);
      }
    } catch (e) {
      console.error("Tracking error:", e);
      renderFallback(ctx, vw, vh);
    }
  } else {
    // Just re-draw the fallback if video hasn't updated to avoid flickering
    // Wait, no, we only draw when video updates.
  }

  requestAnimationFrame(renderLoop);
}

// ─── Render AR Overlay ─────────────────────────────────────
function renderOverlay(ctx, vw, vh, landmarks) {
  // Landmarks to extract coordinates
  // MediaPipe coordinates are normalized [0, 1]. Multiply by canvas dimensions.
  
  // Nose tip
  const nose = { x: landmarks[1].x * vw, y: landmarks[1].y * vh };
  // Cheeks
  const leftCheek = { x: landmarks[234].x * vw, y: landmarks[234].y * vh };
  const rightCheek = { x: landmarks[454].x * vw, y: landmarks[454].y * vh };
  // Eyes (for rotation)
  const leftEyeOuter = { x: landmarks[33].x * vw, y: landmarks[33].y * vh };
  const rightEyeOuter = { x: landmarks[263].x * vw, y: landmarks[263].y * vh };
  
  // Calculate face rotation (roll)
  // MediaPipe un-mirrored: leftEyeOuter (actual left eye) is on the right side of the image.
  // rightEyeOuter (actual right eye) is on the left side.
  // To get an upright angle (~0 deg), we point from the left side of the image (rightEyeOuter) 
  // to the right side of the image (leftEyeOuter).
  const angle = Math.atan2(leftEyeOuter.y - rightEyeOuter.y, leftEyeOuter.x - rightEyeOuter.x);
  
  // Calculate scale based on interpupillary distance (IPD) which is extremely stable
  const eyeDist = Math.sqrt(Math.pow(rightEyeOuter.x - leftEyeOuter.x, 2) + Math.pow(rightEyeOuter.y - leftEyeOuter.y, 2));

  // The center of the glasses should be exactly between the eyes
  const bridgeCenter = {
    x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
    y: (leftEyeOuter.y + rightEyeOuter.y) / 2
  };

  switch (currentCategory) {
    case 'eyewear':
      // Dynamic scale: glasses frame width is ~1.6x the outer eye distance
      const eyeScale = (eyeDist * 1.6 / (currentProduct.frameWidth || 280)) * baseScale;
      // Draw centered on nose bridge
      drawEyewear(ctx, bridgeCenter.x, bridgeCenter.y + userOffsetY, angle, eyeScale);
      break;
    case 'apparel':
      renderFallback(ctx, vw, vh);
      break;
    case 'jewelry':
      const jawBottom = { x: landmarks[152].x * vw, y: landmarks[152].y * vh };
      const jewelScale = (eyeDist * 1.5 / 300) * baseScale;
      // Choker vs necklace vs earrings
      drawJewelry(ctx, bridgeCenter, jawBottom, leftCheek, rightCheek, angle, jewelScale, landmarks, vw, vh);
      break;
    case 'cosmetics':
      drawCosmetics(ctx, landmarks, vw, vh);
      break;
  }
}

function renderFallback(ctx, vw, vh) {
  const cx = vw / 2;
  const cy = vh / 2 + (userOffsetY * (vh / 400));
  
  if (currentCategory === 'apparel') {
    drawApparel(ctx, cx, cy + vh * 0.2, vw, vh, baseScale);
  } else if (currentCategory === 'eyewear') {
    drawEyewear(ctx, cx, cy - vh * 0.1, 0, baseScale * 0.5);
  } else if (currentCategory === 'jewelry') {
    // Just mock points for jewelry fallback
    const jaw = {x: cx, y: cy + vh * 0.1};
    const bridge = {x: cx, y: cy - vh * 0.1};
    drawJewelry(ctx, bridge, jaw, {x: cx - vw*0.1, y: cy}, {x: cx + vw*0.1, y: cy}, 0, baseScale * 0.5, null, vw, vh);
  }
}

// ─── EYEWEAR DRAWING ──────────────────────────────────────
function drawEyewear(ctx, cx, cy, angle, scale) {
  const p = currentProduct;
  const baseW = (p.frameWidth || 280) * scale;
  const baseH = baseW * 0.38;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const frameColor = p.color;
  const lensW = baseW * 0.38;
  const lensH = baseH * 0.85;
  const bridgeW = baseW * 0.08;
  const templeLen = baseW * 0.25;

  switch (p.id) {
    case 'classic':
      drawRectLenses(ctx, lensW, lensH, bridgeW, frameColor, 8 * scale, scale);
      break;
    case 'aviator':
      drawAviatorLenses(ctx, lensW * 1.05, lensH * 1.1, bridgeW, frameColor, scale);
      break;
    case 'round':
      drawRoundLenses(ctx, lensH * 0.9, bridgeW, frameColor, scale);
      break;
    case 'cateye':
      drawCatEyeLenses(ctx, lensW, lensH, bridgeW, frameColor, scale);
      break;
    case 'wayfarer':
      drawRectLenses(ctx, lensW * 1.02, lensH * 1.05, bridgeW, frameColor, 4 * scale, scale);
      break;
    case 'oversized':
      drawRoundLenses(ctx, lensH * 1.15, bridgeW * 0.8, frameColor, scale);
      break;
    default:
      drawRectLenses(ctx, lensW, lensH, bridgeW, frameColor, 8 * scale, scale);
  }

  // Temples (arms)
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-lensW - bridgeW / 2, -lensH * 0.2);
  ctx.lineTo(-lensW - bridgeW / 2 - templeLen, -lensH * 0.3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lensW + bridgeW / 2, -lensH * 0.2);
  ctx.lineTo(lensW + bridgeW / 2 + templeLen, -lensH * 0.3);
  ctx.stroke();

  ctx.restore();
}

function drawRectLenses(ctx, w, h, bridge, color, radius, scale) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * scale;
  roundRect(ctx, -w - bridge / 2, -h / 2, w, h, radius);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, bridge / 2, -h / 2, w, h, radius);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-bridge / 2, -h * 0.1);
  ctx.quadraticCurveTo(0, -h * 0.35, bridge / 2, -h * 0.1);
  ctx.stroke();
}

function drawRoundLenses(ctx, r, bridge, color, scale) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath(); ctx.arc(-r - bridge / 2, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(r + bridge / 2, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-bridge / 2, -r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.5, bridge / 2, -r * 0.1);
  ctx.stroke();
}

function drawAviatorLenses(ctx, w, h, bridge, color, scale) {
  ctx.fillStyle = 'rgba(30,60,30,0.4)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 * scale;
  
  ctx.beginPath();
  ctx.moveTo(-bridge / 2, -h * 0.3);
  ctx.quadraticCurveTo(-w * 0.3 - bridge / 2, -h * 0.8, -w - bridge / 2, -h * 0.2);
  ctx.quadraticCurveTo(-w * 1.1 - bridge / 2, h * 0.5, -w * 0.5 - bridge / 2, h * 0.6);
  ctx.quadraticCurveTo(-bridge / 2, h * 0.5, -bridge / 2, -h * 0.3);
  ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bridge / 2, -h * 0.3);
  ctx.quadraticCurveTo(w * 0.3 + bridge / 2, -h * 0.8, w + bridge / 2, -h * 0.2);
  ctx.quadraticCurveTo(w * 1.1 + bridge / 2, h * 0.5, w * 0.5 + bridge / 2, h * 0.6);
  ctx.quadraticCurveTo(bridge / 2, h * 0.5, bridge / 2, -h * 0.3);
  ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-bridge / 2, -h * 0.3);
  ctx.quadraticCurveTo(0, -h * 0.6, bridge / 2, -h * 0.3);
  ctx.stroke();
}

function drawCatEyeLenses(ctx, w, h, bridge, color, scale) {
  ctx.fillStyle = 'rgba(40,10,30,0.4)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 5 * scale;
  
  ctx.beginPath();
  ctx.moveTo(-bridge / 2, 0);
  ctx.quadraticCurveTo(-bridge / 2, -h * 0.9, -w * 0.8 - bridge / 2, -h * 0.85);
  ctx.lineTo(-w - bridge / 2, -h * 0.5);
  ctx.quadraticCurveTo(-w * 1.05 - bridge / 2, h * 0.4, -w * 0.5 - bridge / 2, h * 0.5);
  ctx.quadraticCurveTo(-bridge / 2, h * 0.4, -bridge / 2, 0);
  ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bridge / 2, 0);
  ctx.quadraticCurveTo(bridge / 2, -h * 0.9, w * 0.8 + bridge / 2, -h * 0.85);
  ctx.lineTo(w + bridge / 2, -h * 0.5);
  ctx.quadraticCurveTo(w * 1.05 + bridge / 2, h * 0.4, w * 0.5 + bridge / 2, h * 0.5);
  ctx.quadraticCurveTo(bridge / 2, h * 0.4, bridge / 2, 0);
  ctx.fill(); ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-bridge / 2, -h * 0.1);
  ctx.quadraticCurveTo(0, -h * 0.4, bridge / 2, -h * 0.1);
  ctx.stroke();
}

// ─── APPAREL DRAWING (Fallback) ───────────────────────────
function drawApparel(ctx, cx, cy, vw, vh, scale) {
  const p = currentProduct;
  const w = vw * 0.55 * scale;
  const h = vh * 0.5 * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.55;

  ctx.fillStyle = p.color;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(-w * 0.12, -h * 0.5);
  ctx.quadraticCurveTo(0, -h * 0.42, w * 0.12, -h * 0.5);
  ctx.lineTo(w * 0.45, -h * 0.45);
  ctx.lineTo(w * 0.48, -h * 0.18);
  ctx.lineTo(w * 0.28, -h * 0.15);
  ctx.lineTo(w * 0.25, h * 0.5);
  ctx.lineTo(-w * 0.25, h * 0.5);
  ctx.lineTo(-w * 0.28, -h * 0.15);
  ctx.lineTo(-w * 0.48, -h * 0.18);
  ctx.lineTo(-w * 0.45, -h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ─── JEWELRY DRAWING ──────────────────────────────────────
function drawJewelry(ctx, bridge, jaw, leftCheek, rightCheek, angle, scale, landmarks, vw, vh) {
  const p = currentProduct;
  ctx.save();

  if (p.id.includes('earring')) {
    // Earrings anchor to the ears (tragus)
    // Actually we use landmarks[234] and [454] which are on the cheek/ear line
    const lEar = { x: landmarks[234].x * vw, y: landmarks[234].y * vh };
    const rEar = { x: landmarks[454].x * vw, y: landmarks[454].y * vh };
    
    // Draw left earring
    ctx.translate(lEar.x, lEar.y);
    ctx.rotate(angle);
    drawEarringPiece(ctx, p, scale);
    ctx.restore();
    ctx.save();
    
    // Draw right earring
    ctx.translate(rEar.x, rEar.y);
    ctx.rotate(angle);
    drawEarringPiece(ctx, p, scale);
    
  } else {
    // Necklaces anchor below the jaw
    const neckY = jaw.y + (30 * scale) + userOffsetY;
    ctx.translate(jaw.x, neckY);
    ctx.rotate(angle);
    
    const w = Math.abs(rightCheek.x - leftCheek.x) * 0.8 * scale;
    const drop = (p.id === 'choker') ? 15 * scale : 60 * scale;

    ctx.strokeStyle = p.color;
    ctx.lineWidth = (p.id === 'choker' ? 6 : 3) * scale;
    ctx.lineCap = 'round';
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(-w/2, -drop*0.5);
    ctx.quadraticCurveTo(0, drop, w/2, -drop*0.5);
    ctx.stroke();

    if (p.id.includes('necklace')) {
      ctx.shadowBlur = 12;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, drop * 0.75, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawEarringPiece(ctx, p, scale) {
  ctx.fillStyle = p.color;
  ctx.strokeStyle = p.color;
  ctx.shadowColor = p.color;
  
  if (p.id === 'earring-stud') {
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 7 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30 * scale);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, 30 * scale);
    ctx.lineTo(-6 * scale, 42 * scale);
    ctx.lineTo(0, 50 * scale);
    ctx.lineTo(6 * scale, 42 * scale);
    ctx.closePath();
    ctx.fill();
  }
}

// ─── COSMETICS DRAWING ────────────────────────────────────
function drawCosmetics(ctx, landmarks, vw, vh) {
  const p = currentProduct;
  const lipColor = p.color;
  
  // Upper Lip Outline indices (MediaPipe Face Mesh): 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291
  const upperLipOuter = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
  const upperLipInner = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
  const lowerLipOuter = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
  const lowerLipInner = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

  ctx.save();
  ctx.fillStyle = lipColor;
  ctx.globalAlpha = 0.55; // Semi-transparent for realistic blend

  // Draw Upper Lip
  ctx.beginPath();
  upperLipOuter.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (i === 0) ctx.moveTo(pt.x * vw, pt.y * vh);
    else ctx.lineTo(pt.x * vw, pt.y * vh);
  });
  // Connect inner backwards
  for (let i = upperLipInner.length - 1; i >= 0; i--) {
    const pt = landmarks[upperLipInner[i]];
    ctx.lineTo(pt.x * vw, pt.y * vh);
  }
  ctx.closePath();
  ctx.fill();

  // Draw Lower Lip
  ctx.beginPath();
  lowerLipOuter.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (i === 0) ctx.moveTo(pt.x * vw, pt.y * vh);
    else ctx.lineTo(pt.x * vw, pt.y * vh);
  });
  // Connect inner backwards
  for (let i = lowerLipInner.length - 1; i >= 0; i--) {
    const pt = landmarks[lowerLipInner[i]];
    ctx.lineTo(pt.x * vw, pt.y * vh);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ─── UTILITY ───────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Product Thumbnails ────────────────────────────────────
function getProductThumbnail(product) {
  switch (currentCategory) {
    case 'eyewear':
      return `<svg viewBox="0 0 60 30" fill="none">
        <rect x="2" y="5" width="22" height="18" rx="4" stroke="${product.color === '#8B4513' ? '#C07040' : 'rgba(255,255,255,0.6)'}" stroke-width="1.5" fill="rgba(255,255,255,0.08)"/>
        <rect x="36" y="5" width="22" height="18" rx="4" stroke="${product.color === '#8B4513' ? '#C07040' : 'rgba(255,255,255,0.6)'}" stroke-width="1.5" fill="rgba(255,255,255,0.08)"/>
        <path d="M24 12 Q30 8 36 12" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" fill="none"/>
      </svg>`;
    case 'apparel':
      return `<svg viewBox="0 0 50 50" fill="none">
        <path d="M18 8L8 15v30h34V15L32 8H18z" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" fill="${product.color}40"/>
        <path d="M18 8l7 7 7-7" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      </svg>`;
    case 'jewelry':
      if (product.id.includes('necklace') || product.id === 'choker') {
        return `<svg viewBox="0 0 50 50" fill="none">
          <path d="M10 15 Q25 35 40 15" stroke="${product.color}" stroke-width="2" fill="none"/>
          <circle cx="25" cy="32" r="3" fill="${product.color}"/>
        </svg>`;
      }
      return `<svg viewBox="0 0 50 50" fill="none">
        <circle cx="16" cy="25" r="5" fill="${product.color}" opacity="0.7"/>
        <circle cx="34" cy="25" r="5" fill="${product.color}" opacity="0.7"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/></svg>`;
  }
}

// ─── Capture Photo ─────────────────────────────────────────
function capturePhoto() {
  if (!stream) return;
  captureFlash.classList.add('flash');
  setTimeout(() => captureFlash.classList.remove('flash'), 400);

  const cc = captureCanvas;
  const cctx = cc.getContext('2d');
  cc.width = cameraFeed.videoWidth;
  cc.height = cameraFeed.videoHeight;

  cctx.save();
  cctx.translate(cc.width, 0);
  cctx.scale(-1, 1);
  cctx.drawImage(cameraFeed, 0, 0);
  cctx.restore();

  cctx.save();
  cctx.translate(cc.width, 0);
  cctx.scale(-1, 1);
  cctx.drawImage(arCanvas, 0, 0);
  cctx.restore();

  cctx.fillStyle = 'rgba(255,255,255,0.4)';
  cctx.font = '600 16px Outfit, sans-serif';
  cctx.textAlign = 'right';
  cctx.fillText('AELTRIX', cc.width - 24, cc.height - 24);

  downloadBtn.href = cc.toDataURL('image/png');
  captureModal.style.display = 'flex';
}

function closeCaptureModal() {
  captureModal.style.display = 'none';
}

// ─── Start ─────────────────────────────────────────────────
init();
