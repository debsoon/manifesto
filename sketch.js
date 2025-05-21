console.log('sketch.js loaded');

// List of PNG filenames
const imgFiles = [
  'images/prism.png',
  'images/starburst.png',
  'images/football.png',
  'images/atom.png',
  'images/globe.png',
  'images/lightningbolt.png',
  'images/smileyface.png',
  'images/hurricane.png'
];

// Each entry: { img: p5.Image|null, loaded: bool, alpha: 0-255 }
const bgImages = imgFiles.map(() => ({ img: null, loaded: false, alpha: 0 }));

// Define anchor positions and sizes for each image (as percentages)
const imgAnchors = [
  { x: 0.18, y: 0.22, s: 0.44 },
  { x: 0.50, y: 0.18, s: 0.48 },
  { x: 0.80, y: 0.30, s: 0.42 },
  { x: 0.16, y: 0.80, s: 0.40 },
  { x: 0.80, y: 0.80, s: 0.44 },
  { x: 0.68, y: 0.13, s: 0.40 },
  { x: 0.22, y: 0.38, s: 0.40 },
  { x: 0.50, y: 0.75, s: 0.46 },
];

let imgPositions = [];
let imgSizes = [];
let imgRotations = [];
let imgIndices = [];
let rotatingIndices = [];
let rotatingLeftIdx = null;
let rotatingRightIdx = null;
let draggingIdx = null;
let dragOffset = null;

const TARGET_ELEMENTS = 18; // visually full
const MAX_ROTATING = 3;

let videoCondRegular, videoCondLight, argentPixelItalic;

let firstDraw = true;

// Empty preload to satisfy p5.js and prevent fatal errors
function preload() {
  // Intentionally left blank
}

function setup() {
  console.log('setup() starting');
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('p5-canvas'); // Attach canvas to the correct div

  // Load all PNGs asynchronously and fade in as they load
  imgFiles.forEach((file, i) => {
    console.log('Loading image:', file);
    loadImage(file, (img) => {
      console.log('Image loaded:', file);
      bgImages[i].img = img;
      bgImages[i].loaded = true;
      bgImages[i].alpha = 0;
    }, (err) => {
      console.log('Image failed to load:', file, err);
    });
  });

  // Load fonts
  try {
    console.log('Loading font: Video Cond Regular');
    videoCondRegular = loadFont('fonts/Video Cond Regular.ttf');
    console.log('Loaded font: Video Cond Regular');
    console.log('Loading font: Video Cond Light');
    videoCondLight = loadFont('fonts/Video Cond Light.ttf');
    console.log('Loaded font: Video Cond Light');
    console.log('Loading font: Argent Pixel CF Italic');
    argentPixelItalic = loadFont('fonts/Argent Pixel CF Italic.ttf');
    console.log('Loaded font: Argent Pixel CF Italic');
  } catch (e) {
    console.log('Font load error:', e);
  }

  recalcPositionsAndSizes();
  pickRotatingElements();
  console.log('setup() finished');
}

function recalcPositionsAndSizes() {
  imgPositions = [];
  imgSizes = [];
  imgRotations = [];
  imgIndices = [];
  // Mobile size scaling
  let mobileScale = (windowWidth <= 768) ? 1.25 : 1.0;
  // Sort anchors by size descending so larger elements are placed first
  let sortedAnchors = imgAnchors.map((a, i) => ({...a, idx: i}))
    .sort((a, b) => b.s - a.s);
  // Place initial anchors
  for (let k = 0; k < sortedAnchors.length; k++) {
    let i = sortedAnchors[k].idx;
    let placed = false;
    let maxTries = 700;
    let s = imgAnchors[i].s * min(width, height) * mobileScale;
    let attempts = 0;
    while (!placed && attempts < maxTries) {
      // Allow elements to extend beyond viewport
      let x = imgAnchors[i].x * width + random(-0.18, 0.18) * width;
      let y = imgAnchors[i].y * height + random(-0.18, 0.18) * height;
      let candidate = createVector(x, y);
      // Check for overlap
      let overlap = false;
      for (let j = 0; j < imgPositions.length; j++) {
        let d = dist(candidate.x, candidate.y, imgPositions[j].x, imgPositions[j].y);
        if (d < (s + imgSizes[j]) * 0.65) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        imgPositions.push(candidate);
        imgSizes.push(s);
        imgRotations.push(random(-PI / 6, PI / 6));
        imgIndices.push(i);
        placed = true;
      }
      attempts++;
    }
    // Fallback
    if (!placed) {
      let x = imgAnchors[i].x * width;
      let y = imgAnchors[i].y * height;
      imgPositions.push(createVector(x, y));
      imgSizes.push(s);
      imgRotations.push(random(-PI / 6, PI / 6));
      imgIndices.push(i);
    }
  }
  // Add more elements to fill space
  let tries = 0;
  while (imgPositions.length < TARGET_ELEMENTS && tries < 1000) {
    let s = random(0.38, 0.48) * min(width, height) * mobileScale;
    let x = random(-0.18, 1.18) * width;
    let y = random(-0.18, 1.18) * height;
    let candidate = createVector(x, y);
    let overlap = false;
    for (let j = 0; j < imgPositions.length; j++) {
      let d = dist(candidate.x, candidate.y, imgPositions[j].x, imgPositions[j].y);
      if (d < (s + imgSizes[j]) * 0.65) {
        overlap = true;
        break;
      }
    }
    if (!overlap) {
      imgPositions.push(candidate);
      imgSizes.push(s);
      imgRotations.push(random(-PI / 6, PI / 6));
      imgIndices.push(floor(random(bgImages.length))); // pick a random image
    }
    tries++;
  }
}

function pickRotatingElements() {
  // Pick 3 unique random indices
  rotatingIndices = [];
  let pool = Array.from({length: imgPositions.length}, (_, i) => i);
  for (let i = 0; i < MAX_ROTATING && pool.length > 0; i++) {
    let idx = floor(random(pool.length));
    rotatingIndices.push(pool[idx]);
    pool.splice(idx, 1);
  }
}

function draw() {
  if (firstDraw) {
    console.log('draw() called (first frame)');
    firstDraw = false;
  }
  clear();
  background(255);
  let rotationSpeed = 0.012; // per 16ms (typical frame)
  let speed = rotationSpeed * (deltaTime / 16.67); // 16.67ms = 60fps
  for (let i = 0; i < imgPositions.length; i++) {
    push();
    translate(imgPositions[i].x, imgPositions[i].y);
    // Animate rotation for the chosen elements (frame-rate independent)
    if (rotatingIndices.includes(i)) {
      imgRotations[i] += speed;
    }
    rotate(imgRotations[i]);
    imageMode(CENTER);
    // Fade in effect for each image
    let imgObj = bgImages[imgIndices[i]];
    if (imgObj.loaded && imgObj.img) {
      if (imgObj.alpha < 255) {
        imgObj.alpha += 12; // Fade speed (adjust as needed)
        if (imgObj.alpha > 255) imgObj.alpha = 255;
      }
      tint(255, imgObj.alpha);
      image(imgObj.img, 0, 0, imgSizes[i], imgSizes[i]);
      noTint();
    }
    pop();
  }
}

function mousePressed() {
  // Check if mouse is over any element (from topmost to bottom)
  for (let i = imgPositions.length - 1; i >= 0; i--) {
    let d = dist(mouseX, mouseY, imgPositions[i].x, imgPositions[i].y);
    if (d < imgSizes[i] / 2) {
      // Rotation control logic
      let idx = rotatingIndices.indexOf(i);
      if (idx !== -1) {
        // If already rotating, stop rotating
        rotatingIndices.splice(idx, 1);
      } else {
        // If not rotating, add to rotating set (max 3)
        if (rotatingIndices.length >= MAX_ROTATING) {
          rotatingIndices.shift(); // Remove oldest
        }
        rotatingIndices.push(i);
      }
      // Drag logic
      draggingIdx = i;
      dragOffset = createVector(imgPositions[i].x - mouseX, imgPositions[i].y - mouseY);
      return;
    }
  }
}

function mouseDragged() {
  if (draggingIdx !== null) {
    imgPositions[draggingIdx].x = mouseX + dragOffset.x;
    imgPositions[draggingIdx].y = mouseY + dragOffset.y;
  }
}

function mouseReleased() {
  draggingIdx = null;
  dragOffset = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recalcPositionsAndSizes();
  pickRotatingElements();
  redraw();
} 