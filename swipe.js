// Smooth vertical slide navigation between sections
let currentSection = 0;
let isTransitioning = false;

const sectionEls = document.querySelectorAll('.section');
const numSections = sectionEls.length;

function updateNav() {
  const nav = document.getElementById('section-nav');
  nav.innerHTML = '';
  for (let i = 0; i < numSections; i++) {
    const item = document.createElement('div');
    item.className = 'nav-item' + (i === currentSection ? ' active' : '');
    item.addEventListener('click', () => goToSection(i));
    nav.appendChild(item);
  }
}

function goToSection(idx) {
  if (isTransitioning || idx < 0 || idx >= numSections) return;
  isTransitioning = true;
  currentSection = idx;
  sectionEls.forEach((el, i) => {
    el.style.transform = `translateY(${(i - currentSection) * 100}vh)`;
  });
  // Fade in background for section-2
  const sec2 = document.getElementById('section-2');
  if (sec2) {
    if (currentSection === 1) {
      sec2.classList.add('fade-bg');
    } else {
      sec2.classList.remove('fade-bg');
    }
  }
  updateNav();
  
  // Trigger animations immediately
  triggerPixelDissolve(idx);
  triggerSection6Wipe(idx);
  
  setTimeout(() => {
    isTransitioning = false;
  }, 800); // match CSS transition
}

// Initial position
window.addEventListener('DOMContentLoaded', () => {
  goToSection(0);
  updateNav();
});

// Wheel event for desktop
window.addEventListener('wheel', (e) => {
  if (isTransitioning) return;
  if (e.deltaY > 0) {
    goToSection(currentSection + 1);
  } else if (e.deltaY < 0) {
    goToSection(currentSection - 1);
  }
});

// Touch events for mobile
let touchStartY = null;
window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartY = e.touches[0].clientY;
  }
});
window.addEventListener('touchend', (e) => {
  if (touchStartY === null) return;
  let touchEndY = e.changedTouches[0].clientY;
  let diff = touchStartY - touchEndY;
  if (Math.abs(diff) > 50 && !isTransitioning) {
    if (diff > 0) {
      goToSection(currentSection + 1);
    } else {
      goToSection(currentSection - 1);
    }
  }
  touchStartY = null;
});

// --- Pixel Dissolve Reveal for Section 2 and 3 ---
function pixelDissolveLoop(canvasId, imgSrc, blockSize = 8, duration = 2800, pattern = 'random', loop = true, direction = 'horizontal') {
  console.log('Starting pixel dissolve loop for:', canvasId, 'with image:', imgSrc);
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error('Canvas not found:', canvasId);
    return;
  }
  const ctx = canvas.getContext('2d');
  // Clear the canvas first
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = new window.Image();
  img.src = imgSrc;
  let running = true;
  canvas.dataset.running = 'true';

  function stopIfNotVisible() {
    return canvas.dataset.running === 'true';
  }

  img.onload = () => {
    console.log('Image loaded:', imgSrc);
    function revealOrHide(reveal = true, cb) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cols = Math.ceil(canvas.width / blockSize);
      const rows = Math.ceil(canvas.height / blockSize);
      let blocks = [];
      if (pattern === 'snake') {
        if (direction === 'horizontal') {
          for (let y = 0; y < rows; y++) {
            if (y % 2 === 0) {
              for (let x = cols - 1; x >= 0; x--) { // start right-to-left
                blocks.push({x, y});
              }
            } else {
              for (let x = 0; x < cols; x++) {
                blocks.push({x, y});
              }
            }
          }
        } else { // vertical
          for (let x = 0; x < cols; x++) {
            if (x % 2 === 0) {
              for (let y = rows - 1; y >= 0; y--) { // start bottom-to-top
                blocks.push({x, y});
              }
            } else {
              for (let y = 0; y < rows; y++) {
                blocks.push({x, y});
              }
            }
          }
        }
      } else {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            blocks.push({x, y});
          }
        }
        for (let i = blocks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
        }
      }
      let revealed = reveal ? 0 : blocks.length;
      const total = blocks.length;
      const step = Math.ceil(total / (duration / 16));
      function drawStep() {
        if (!stopIfNotVisible()) return;
        if (reveal) {
          for (let i = 0; i < step && revealed < total; i++, revealed++) {
            const {x, y} = blocks[revealed];
            ctx.drawImage(
              img,
              x * blockSize * img.width / canvas.width,
              y * blockSize * img.height / canvas.height,
              blockSize * img.width / canvas.width,
              blockSize * img.height / canvas.height,
              x * blockSize,
              y * blockSize,
              blockSize,
              blockSize
            );
          }
          if (revealed < total) {
            requestAnimationFrame(drawStep);
          } else if (cb) {
            setTimeout(cb, 800);
          }
        } else {
          for (let i = 0; i < step && revealed > 0; i++, revealed--) {
            const {x, y} = blocks[revealed - 1];
            ctx.clearRect(x * blockSize, y * blockSize, blockSize, blockSize);
          }
          if (revealed > 0) {
            requestAnimationFrame(drawStep);
          } else if (cb) {
            setTimeout(cb, 800);
          }
        }
      }
      if (reveal) ctx.clearRect(0, 0, canvas.width, canvas.height);
      else ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawStep();
    }
    if (loop) {
      function loopFn() {
        if (!stopIfNotVisible()) return;
        revealOrHide(true, () => revealOrHide(false, loopFn));
      }
      loopFn();
    } else {
      revealOrHide(true);
    }
  };
  img.onerror = (e) => {
    console.error('Error loading image:', imgSrc, e);
  };
  return () => { 
    canvas.dataset.running = 'false';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}

// --- Trigger pixel dissolve when section becomes visible ---
let pixelDissolveStopFns = {2: null, 3: null, 7: null};
function triggerPixelDissolve(sectionIdx) {
  // Only run if sectionIdx is valid (0 to 6)
  if (sectionIdx < 0 || sectionIdx > 6) return;
  console.log('Triggering pixel dissolve for section:', sectionIdx);
  if (pixelDissolveStopFns[2]) pixelDissolveStopFns[2]();
  if (pixelDissolveStopFns[3]) pixelDissolveStopFns[3]();
  if (pixelDissolveStopFns[7]) pixelDissolveStopFns[7]();
  if (sectionIdx === 1) {
    console.log('Starting section 2 animation');
    pixelDissolveStopFns[2] = pixelDissolveLoop('section2-canvas', 'images/page1.png', 8, 2800, 'random', false);
  } else if (sectionIdx === 2) {
    console.log('Starting section 3 animation');
    pixelDissolveStopFns[3] = pixelDissolveLoop('section3-canvas', 'images/page2.png', 8, 1600, 'snake', false, 'horizontal');
  } else if (sectionIdx === 6) {
    console.log('Starting section 7 animation');
    pixelDissolveStopFns[7] = pixelDissolveLoop('section7-canvas', 'images/page6.png', 8, 2800, 'snake', false, 'vertical');
  }
}

// Patch goToSection to trigger pixel dissolve
const originalGoToSection = goToSection;
goToSection = function(idx) {
  originalGoToSection(idx);
  triggerPixelDissolve(idx);
};

function animateSection6Wipe() {
  const section = document.getElementById('section-6');
  const img = section ? section.querySelector('.wipe-img') : null;
  if (!img) return () => {};
  let running = true;
  let wipeDuration = 3200; // ms
  let fadeDuration = 1600; // ms
  let delay = 900; // ms between wipe and fade

  function runWipe() {
    if (!running) return;
    img.style.transition = 'none';
    img.style.clipPath = 'inset(0 0 100% 0)';
    img.style.opacity = '1';
    setTimeout(() => {
      if (!running) return;
      img.style.transition = `clip-path ${wipeDuration}ms linear`;
      img.style.clipPath = 'inset(0 0 0 0)';
      setTimeout(() => {
        if (!running) return;
        // After wipe, do nothing (no fade out)
      }, wipeDuration + delay);
    }, 100);
  }
  runWipe();
  return () => { running = false; };
}

let section6WipeStop = null;
function triggerSection6Wipe(sectionIdx) {
  if (section6WipeStop) section6WipeStop();
  if (sectionIdx === 5) {
    section6WipeStop = animateSection6Wipe();
  }
}

// Patch goToSection to trigger section 6 wipe
const originalGoToSection2 = goToSection;
goToSection = function(idx) {
  originalGoToSection2(idx);
  triggerPixelDissolve(idx);
  triggerSection6Wipe(idx);
};

// Add intersection observer to ensure animations trigger when section is visible
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const section = entry.target;
      const sectionIdx = parseInt(section.id.split('-')[1]) - 1;
      if (sectionIdx === 6) { // Section 7
        triggerPixelDissolve(sectionIdx);
      }
    }
  });
}, {
  threshold: 0.5 // Trigger when section is 50% visible
});

// Observe section 7
const section7 = document.getElementById('section-7');
if (section7) {
  observer.observe(section7);
} 