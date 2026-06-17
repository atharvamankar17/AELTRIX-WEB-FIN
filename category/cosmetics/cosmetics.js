import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs";

/* ============================================================
   AELTRIX - 3D AR Try-On Engine
   Three.js + MediaPipe Face Landmarker
   ============================================================ */

// ─── Product Catalog ───────────────────────────────────────
const CATEGORIES = {
  eyewear: {
    label: 'Eyewear Try-On',
    panelTitle: 'Select a Frame',
    products: [
      { id: 'classic',   name: 'Classic',     color: '#1a1a2e', lensColor: '#4488aa', frameWidth: 0.14 },
      { id: 'aviator',   name: 'Aviator',     color: '#C0C0C0', lensColor: '#2a5a2a', frameWidth: 0.15 },
      { id: 'round',     name: 'Round',       color: '#8B4513', lensColor: '#553322', frameWidth: 0.12 },
      { id: 'cateye',    name: 'Cat Eye',     color: '#4a0e3c', lensColor: '#442244', frameWidth: 0.14 },
      { id: 'wayfarer',  name: 'Wayfarer',    color: '#0a0a1a', lensColor: '#333355', frameWidth: 0.14 },
      { id: 'oversized', name: 'Oversized',   color: '#1c1c3a', lensColor: '#334466', frameWidth: 0.16 },
    ]
  },
  jewelry: {
    label: 'Jewelry Try-On',
    panelTitle: 'Select a Piece',
    products: [
      { id: 'necklace-gold',   name: 'Gold Chain',    color: '#DAA520', metalness: 0.9 },
      { id: 'necklace-silver', name: 'Silver Chain',   color: '#C0C0C0', metalness: 0.95 },
      { id: 'earring-drop',    name: 'Drop Earrings',  color: '#DAA520', metalness: 0.9 },
      { id: 'earring-stud',    name: 'Stud Earrings',  color: '#E5E4E2', metalness: 0.95 },
      { id: 'choker',          name: 'Choker',         color: '#B8860B', metalness: 0.85 },
    ]
  },
  cosmetics: {
    label: 'Cosmetics Try-On',
    panelTitle: 'Select a Shade',
    products: [
      { id: 'lip-red',   name: 'Classic Red', color: '#C0392B' },
      { id: 'lip-rose',  name: 'Rosé',        color: '#E75480' },
      { id: 'lip-berry', name: 'Berry',       color: '#8E4585' },
      { id: 'lip-nude',  name: 'Nude',         color: '#C69C72' },
      { id: 'lip-coral', name: 'Coral',       color: '#FF6F61' },
      { id: 'lip-plum',  name: 'Plum',        color: '#6B2D5B' },
      { id: 'lip-pink',  name: 'Hot Pink',    color: '#FF1493' },
      { id: 'lip-mauve', name: 'Mauve',       color: '#B784A7' },
    ]
  },
  apparel: {
    label: 'Apparel Try-On',
    panelTitle: 'Select a Garment',
    products: [
      { id: 'blazer',  name: 'Blazer',  color: '#1a1a2e' },
      { id: 'tshirt',  name: 'T-Shirt', color: '#2d3436' },
      { id: 'hoodie',  name: 'Hoodie',  color: '#6c3483' },
      { id: 'jacket',  name: 'Jacket',  color: '#1B4332' },
      { id: 'vest',    name: 'Vest',    color: '#4a4e69' },
    ]
  }
};

// ─── State ─────────────────────────────────────────────────
let currentCategory = 'cosmetics';
let currentProduct = null;
let stream = null;
let baseScale = 1;
let userOffsetY = 0;

// MediaPipe
let faceLandmarker;
let lastVideoTime = -1;

// Three.js
let scene, camera, renderer;
let currentModel = null; // Currently displayed 3D group
let ambientLight, dirLight, pointLight;

// ─── DOM ───────────────────────────────────────────────────
const categoryLabel = document.getElementById('tryon-category-label');
const permissionScreen = document.getElementById('tryon-permission');
const enableCameraBtn = document.getElementById('enable-camera-btn');
const viewport = document.getElementById('tryon-viewport');
const errorScreen = document.getElementById('tryon-error');
const cameraFeed = document.getElementById('camera-feed');
const arCanvas = document.getElementById('ar-canvas');
const arLoading = document.getElementById('ar-loading');
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

// ─── Three.js Setup ────────────────────────────────────────
/**
 * Initializes the Three.js scene, camera, and renderer.
 * Sets up the WebGL environment and lighting for AR overlays.
 */
function initThreeJS() {
  scene = new THREE.Scene();

  // Orthographic camera matching normalized coords
  camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 100);
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({
    canvas: arCanvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true // needed for screenshot capture
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(0.3, 0.5, 1);
  scene.add(dirLight);

  pointLight = new THREE.PointLight(0x88ccff, 0.4, 2);
  pointLight.position.set(-0.3, 0.2, 0.5);
  scene.add(pointLight);
}

// ─── 3D Model Builders ────────────────────────────────────
// ─── Build 3D Model for Current Product ───────────────────
function buildModel(product) {
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }
  let model;
  if (model) { scene.add(model); currentModel = model; }
}

// ─── Landmark → 3D Position Mapping ───────────────────────
/**
 * Converts MediaPipe 2D normalized face landmarks into 3D space coordinates.
 * @param {Object} landmark - A single MediaPipe landmark {x, y, z}.
 * @returns {THREE.Vector3} The mapped 3D vector.
 */
function landmarkTo3D(landmark) {
  // MediaPipe landmarks are normalized [0,1]. Convert to Three.js coords:
  // x: 0→1 maps to -0.5→+0.5 (but mirrored for selfie)
  // y: 0→1 maps to +0.5→-0.5 (flip Y)
  // z: depth (small values)
  return new THREE.Vector3(
    -(landmark.x - 0.5),
    -(landmark.y - 0.5),
    -landmark.z * 0.5
  );
}

/**
 * Calculates head pitch, yaw, and roll based on specific facial landmarks.
 * Uses trigonometry on eye corners and nose tip to estimate rotation.
 * @param {Array} landmarks - The array of face landmarks.
 * @returns {Object} An object containing {roll, yaw, pitch} in radians.
 */
function getHeadRotation(landmarks) {
  // Use eye corners + nose to compute head rotation
  const leftEye = landmarkTo3D(landmarks[33]);
  const rightEye = landmarkTo3D(landmarks[263]);
  const noseTip = landmarkTo3D(landmarks[1]);
  const forehead = landmarkTo3D(landmarks[10]);
  const chin = landmarkTo3D(landmarks[152]);

  // Roll (tilt) from eye line
  const eyeDelta = new THREE.Vector3().subVectors(rightEye, leftEye);
  const roll = Math.atan2(eyeDelta.y, eyeDelta.x);

  // Yaw from nose position relative to eye center
  const eyeCenter = new THREE.Vector3().addVectors(leftEye, rightEye).multiplyScalar(0.5);
  const eyeDist = leftEye.distanceTo(rightEye);
  const noseOffset = noseTip.x - eyeCenter.x;
  const yaw = Math.asin(Math.max(-1, Math.min(1, noseOffset / (eyeDist * 0.5)))) * 1.5;

  // Pitch from forehead-chin vs nose
  const faceHeight = forehead.distanceTo(chin);
  const noseUp = noseTip.y - chin.y;
  const pitch = -(noseUp / faceHeight - 0.35) * 2.0;

  return { roll, yaw, pitch };
}

// ─── Render Loop ──────────────────────────────────────────
/**
 * The main rendering loop. Constantly updates the camera feed and 
 * runs the face landmark detection on every frame if active.
 */
function renderLoop() {
  if (!faceLandmarker || !currentProduct) {
    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
    return;
  }

  const now = performance.now();
  if (lastVideoTime !== cameraFeed.currentTime) {
    lastVideoTime = cameraFeed.currentTime;

    try {
      const results = faceLandmarker.detectForVideo(cameraFeed, now);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        updateModelPosition(landmarks);
        if (currentModel) currentModel.visible = true;
      } else {
        if (currentModel) currentModel.visible = false;
      }
    } catch (e) {
      console.error("Tracking error:", e);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

/**
 * Updates the 3D model's position, scale, and rotation based on facial landmarks.
 * @param {Array} landmarks - The array of face landmarks.
 */
function updateModelPosition(landmarks) {
  if (!currentModel) return;

  const leftEye = landmarkTo3D(landmarks[33]);
  const rightEye = landmarkTo3D(landmarks[263]);
  const eyeCenter = new THREE.Vector3().addVectors(leftEye, rightEye).multiplyScalar(0.5);
  const eyeDist = leftEye.distanceTo(rightEye);
  const { roll, yaw, pitch } = getHeadRotation(landmarks);

  const offsetY = (userOffsetY / 100) * 0.05;

  switch (currentCategory) {
    case 'eyewear': {
      // Scale based on interpupillary distance
      const targetWidth = eyeDist * 2.2 * baseScale;
      const modelWidth = currentProduct.frameWidth || 0.14;
      const scale = targetWidth / modelWidth;

      currentModel.position.set(eyeCenter.x, eyeCenter.y + offsetY, eyeCenter.z);
      currentModel.scale.set(scale, scale, scale);
      currentModel.rotation.set(pitch, yaw, roll);
      break;
    }
    case 'jewelry': {
      if (currentProduct.id.includes('earring')) {
        const lEar = landmarkTo3D(landmarks[234]);
        const rEar = landmarkTo3D(landmarks[454]);
        const earScale = eyeDist * 8 * baseScale;

        const leftE = currentModel.children.find(c => c.name === 'leftEarring');
        const rightE = currentModel.children.find(c => c.name === 'rightEarring');

        if (leftE) {
          leftE.position.copy(lEar);
          leftE.position.y += offsetY;
          leftE.scale.set(earScale, earScale, earScale);
          leftE.rotation.set(pitch * 0.5, yaw * 0.5, roll);
        }
        if (rightE) {
          rightE.position.copy(rEar);
          rightE.position.y += offsetY;
          rightE.scale.set(earScale, earScale, earScale);
          rightE.rotation.set(pitch * 0.5, yaw * 0.5, roll);
        }

        currentModel.position.set(0, 0, 0);
        currentModel.scale.set(1, 1, 1);
        currentModel.rotation.set(0, 0, 0);
      } else {
        // Necklace: position below chin
        const chin = landmarkTo3D(landmarks[152]);
        const neckScale = eyeDist * 10 * baseScale;

        currentModel.position.set(chin.x, chin.y - 0.02 + offsetY, chin.z);
        currentModel.scale.set(neckScale, neckScale, neckScale);
        currentModel.rotation.set(pitch * 0.3, yaw, roll);
      }
      break;
    }
    case 'cosmetics': {
      // Cosmetics handled via 2D canvas overlay (lip color)
      break;
    }
  }
}

// ─── Cosmetics (2D lip overlay - stays on canvas) ─────────
function renderCosmetics(landmarks) {
  if (currentCategory !== 'cosmetics' || !currentProduct) return;

  const vw = arCanvas.width;
  const vh = arCanvas.height;

  // Get a 2D context on top of Three.js
  // We'll use an offscreen canvas for cosmetics
  if (!window._cosmeticsCanvas) {
    window._cosmeticsCanvas = document.createElement('canvas');
    window._cosmeticsCanvas.style.cssText = arCanvas.style.cssText;
    window._cosmeticsCanvas.style.position = 'absolute';
    window._cosmeticsCanvas.style.top = '0';
    window._cosmeticsCanvas.style.left = '0';
    window._cosmeticsCanvas.style.width = '100%';
    window._cosmeticsCanvas.style.height = '100%';
    window._cosmeticsCanvas.style.pointerEvents = 'none';
    window._cosmeticsCanvas.style.zIndex = '3';
    viewport.appendChild(window._cosmeticsCanvas);
  }

  const cc = window._cosmeticsCanvas;
  cc.width = vw;
  cc.height = vh;
  const ctx = cc.getContext('2d');
  ctx.clearRect(0, 0, vw, vh);

  const lipColor = currentProduct.color;
  const upperLipOuter = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
  const upperLipInner = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
  const lowerLipOuter = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
  const lowerLipInner = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

  ctx.save();
  ctx.fillStyle = lipColor;
  ctx.globalAlpha = 0.55;

  // Upper lip
  ctx.beginPath();
  upperLipOuter.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (i === 0) ctx.moveTo(pt.x * vw, pt.y * vh);
    else ctx.lineTo(pt.x * vw, pt.y * vh);
  });
  for (let i = upperLipInner.length - 1; i >= 0; i--) {
    const pt = landmarks[upperLipInner[i]];
    ctx.lineTo(pt.x * vw, pt.y * vh);
  }
  ctx.closePath();
  ctx.fill();

  // Lower lip
  ctx.beginPath();
  lowerLipOuter.forEach((idx, i) => {
    const pt = landmarks[idx];
    if (i === 0) ctx.moveTo(pt.x * vw, pt.y * vh);
    else ctx.lineTo(pt.x * vw, pt.y * vh);
  });
  for (let i = lowerLipInner.length - 1; i >= 0; i--) {
    const pt = landmarks[lowerLipInner[i]];
    ctx.lineTo(pt.x * vw, pt.y * vh);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Modified render loop to also handle cosmetics ────────
/**
 * The main rendering loop. Constantly updates the camera feed and 
 * runs the face landmark detection on every frame if active.
 */
function renderLoopFull() {
  if (!faceLandmarker || !currentProduct) {
    if (currentCategory !== 'cosmetics') renderer.render(scene, camera);
    requestAnimationFrame(renderLoopFull);
    return;
  }

  const now = performance.now();
  if (lastVideoTime !== cameraFeed.currentTime) {
    lastVideoTime = cameraFeed.currentTime;

    try {
      const results = faceLandmarker.detectForVideo(cameraFeed, now);

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        if (currentCategory === 'cosmetics') {
          renderCosmetics(landmarks);
          if (currentModel) currentModel.visible = false;
        } else {
          // Hide cosmetics overlay if it exists
          if (window._cosmeticsCanvas) {
            const ctx = window._cosmeticsCanvas.getContext('2d');
            ctx.clearRect(0, 0, window._cosmeticsCanvas.width, window._cosmeticsCanvas.height);
          }
          updateModelPosition(landmarks);
          if (currentModel) currentModel.visible = true;
        }
      } else {
        if (currentModel) currentModel.visible = false;
        if (window._cosmeticsCanvas) {
          const ctx = window._cosmeticsCanvas.getContext('2d');
          ctx.clearRect(0, 0, window._cosmeticsCanvas.width, window._cosmeticsCanvas.height);
        }
      }
    } catch (e) {
      console.error("Tracking error:", e);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(renderLoopFull);
}

// ─── Init ──────────────────────────────────────────────────
/**
 * Bootstraps the application, loads dependencies (Three.js, MediaPipe),
 * and attaches UI event listeners.
 * @async
 */
async function init() {
  const params = new URLSearchParams(window.location.search);
  currentCategory = 'cosmetics';
  if (!CATEGORIES[currentCategory]) currentCategory = 'eyewear';

  const cat = CATEGORIES[currentCategory];
  document.title = `${cat.label} - AELTRIX`;
  categoryLabel.textContent = cat.label;

  enableCameraBtn.addEventListener('click', startCamera);
  captureBtn.addEventListener('click', capturePhoto);
  closeCaptureBtn.addEventListener('click', () => { captureModal.style.display = 'none'; });
  panelToggle.addEventListener('click', () => { panel.classList.toggle('collapsed'); });

  sizeSlider.addEventListener('input', (e) => { baseScale = e.target.value / 100; });
  positionSlider.addEventListener('input', (e) => { userOffsetY = parseInt(e.target.value); });

  // Init Three.js
  initThreeJS();

  // Init MediaPipe
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      outputFaceBlendshapes: false,
      runningMode: "VIDEO",
      numFaces: 1
    });
    console.log("✓ MediaPipe FaceLandmarker ready");
  } catch (err) {
    console.error("MediaPipe init failed:", err);
  }
}

// ─── Camera ────────────────────────────────────────────────
/**
 * Requests camera permissions and starts the video stream.
 * Triggers the 3D engine once the stream is successfully running.
 * @async
 */
async function startCamera() {
  enableCameraBtn.textContent = "Loading 3D Engine...";
  enableCameraBtn.disabled = true;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    cameraFeed.srcObject = stream;

    cameraFeed.addEventListener('loadedmetadata', () => {
      const vw = cameraFeed.videoWidth;
      const vh = cameraFeed.videoHeight;
      renderer.setSize(vw, vh);

      // Update camera aspect
      const aspect = vw / vh;
      camera.left = -0.5 * aspect;
      camera.right = 0.5 * aspect;
      camera.top = 0.5;
      camera.bottom = -0.5;
      camera.updateProjectionMatrix();

      cameraFeed.play();
    });

    cameraFeed.addEventListener('playing', () => {
      permissionScreen.style.display = 'none';
      viewport.style.display = 'block';
      panel.style.display = 'block';
      buildProductPanel();
      requestAnimationFrame(renderLoopFull);
    });

  } catch (err) {
    console.error('Camera error:', err);
    permissionScreen.style.display = 'none';
    errorScreen.style.display = 'flex';
  }
}

// ─── Product Panel ─────────────────────────────────────────
/**
 * Builds the UI product selection panel dynamically based on the catalog.
 */
function buildProductPanel() {
  const cat = CATEGORIES[currentCategory];
  panelTitle.textContent = cat.panelTitle;
  panelProducts.innerHTML = '';

  cat.products.forEach((product, index) => {
    const option = document.createElement('div');

    if (currentCategory === 'cosmetics') {
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

/**
 * Handles the selection of a product from the UI panel.
 * Updates the state and re-renders the 3D model.
 * @param {Object} product - The selected product data.
 * @param {HTMLElement} element - The DOM element of the selected option.
 */
function selectProduct(product, element) {
  currentProduct = product;
  panelProducts.querySelectorAll('.product-option').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
  buildModel(product);
}

// ─── Product Thumbnails ────────────────────────────────────
function getProductThumbnail(product) {
  return `<svg viewBox="0 0 50 50" fill="none"><circle cx="25" cy="25" r="15" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/></svg>`;
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

  // Draw mirrored webcam
  cctx.save();
  cctx.translate(cc.width, 0);
  cctx.scale(-1, 1);
  cctx.drawImage(cameraFeed, 0, 0);
  cctx.restore();

  // Draw Three.js render on top
  cctx.save();
  cctx.translate(cc.width, 0);
  cctx.scale(-1, 1);
  cctx.drawImage(renderer.domElement, 0, 0);
  cctx.restore();

  // Draw cosmetics canvas if present
  if (window._cosmeticsCanvas && currentCategory === 'cosmetics') {
    cctx.save();
    cctx.translate(cc.width, 0);
    cctx.scale(-1, 1);
    cctx.drawImage(window._cosmeticsCanvas, 0, 0);
    cctx.restore();
  }

  // Watermark
  cctx.fillStyle = 'rgba(255,255,255,0.4)';
  cctx.font = '600 16px Outfit, sans-serif';
  cctx.textAlign = 'right';
  cctx.fillText('AELTRIX', cc.width - 24, cc.height - 24);

  downloadBtn.href = cc.toDataURL('image/png');
  captureModal.style.display = 'flex';
}

// ─── Start ─────────────────────────────────────────────────
init();
