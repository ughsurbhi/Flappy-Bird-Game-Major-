// ---------- Constants & Tuning (base defaults kept) ----------
const MOVE_SPEED = 3;
const GRAVITY = 0.5;
const FLAP_VELOCITY = -7.6;
const PIPE_SEPARATION_THRESHOLD = 115;
const PIPE_GAP_VH = 50;

const FLAP_COOLDOWN_MS = 250;
const FLAP_DY_THRESHOLD = 0.03; // sensitivity for upward flick

// ---------- Difficulty runtime vars & presets ----------
let MOVE_SPEED_VAR = MOVE_SPEED;
let GRAVITY_VAR = GRAVITY;
let FLAP_VELOCITY_VAR = FLAP_VELOCITY; // kept same, but left adjustable if needed
let PIPE_SEPARATION_THRESHOLD_VAR = PIPE_SEPARATION_THRESHOLD;
let PIPE_GAP_VH_VAR = PIPE_GAP_VH;

const DIFFICULTY = {
  easy: {
    moveSpeed: 2.0,
    gravity: 0.38,
    flapVelocity: -7.6,
    pipeGapVH: 58,
    pipeSep: 135,
  },
  medium: {
    moveSpeed: 3.0,
    gravity: 0.5,
    flapVelocity: -7.6,
    pipeGapVH: 50,
    pipeSep: 115,
  },
  hard: {
    moveSpeed: 4.5,
    gravity: 0.62,
    flapVelocity: -7.6,
    pipeGapVH: 42,
    pipeSep: 95,
  },
};

function applyDifficulty(key) {
  const p = DIFFICULTY[key] || DIFFICULTY.medium;
  MOVE_SPEED_VAR = p.moveSpeed;
  GRAVITY_VAR = p.gravity;
  FLAP_VELOCITY_VAR = p.flapVelocity;
  PIPE_GAP_VH_VAR = p.pipeGapVH;
  PIPE_SEPARATION_THRESHOLD_VAR = p.pipeSep;
  // Update select element to match
  if (diffEl) diffEl.value = key;
}

// --- HEALTH SYSTEM ---
let currentHealth = 3;
let isInvincible = false;
const heartEls = [
  document.getElementById("heart-1"),
  document.getElementById("heart-2"),
  document.getElementById("heart-3"),
];
function updateHearts() {
  heartEls.forEach((h, i) => {
    if (!h) return;
    h.textContent = i < currentHealth ? "❤️" : "🖤";
    h.style.opacity = i < currentHealth ? "1" : "0.35";
  });
}
function resetHealth() {
  currentHealth = 3;
  isInvincible = false;
  updateHearts();
}
function takeDamage() {
  if (isInvincible || gameState !== "Play") return;
  currentHealth--;
  updateHearts();
  bird.classList.add("hit-flash");
  setTimeout(() => bird.classList.remove("hit-flash"), 600);
  try {
    soundDie.currentTime = 0;
    soundDie.play();
  } catch (e) {}
  if (currentHealth <= 0) {
    endGame();
    return;
  }
  isInvincible = true;
  setTimeout(() => {
    isInvincible = false;
  }, 1500);
}

// --- FLAME SYSTEM ---
const flameCanvas = document.getElementById("flame-canvas");
const fCtx = flameCanvas.getContext("2d");
let flameParticles = [];
let flameSpawnHandle;

function resizeFlameCanvas() {
  flameCanvas.width = window.innerWidth;
  flameCanvas.height = window.innerHeight;
}
resizeFlameCanvas();
window.addEventListener("resize", resizeFlameCanvas);

class FlameParticle {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 3 + dir * 1.5;
    this.vy = -(Math.random() * 3 + 1);
    this.life = 1;
    this.decay = Math.random() * 0.025 + 0.015;
    this.size = Math.random() * 12 + 6;
    this.hueShift = Math.random() * 20 - 10; // slight color variation
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy -= 0.08;
    this.life -= this.decay;
    this.size *= 0.98;
  }
  draw(ctx) {
    const a = Math.max(0, this.life);
    const g = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.size,
    );
    // Enhanced gradient for more realistic flames
    g.addColorStop(0, `rgba(255,255,255,${a})`); // white hot center
    g.addColorStop(0.1, `rgba(255,255,200,${a * 0.95})`); // bright yellow
    g.addColorStop(0.3, `rgba(255,220,100,${a * 0.9})`); // yellow-orange
    g.addColorStop(0.5, `rgba(255,150,50,${a * 0.8})`); // orange
    g.addColorStop(0.7, `rgba(255,80,20,${a * 0.6})`); // red-orange
    g.addColorStop(0.9, `rgba(200,30,0,${a * 0.3})`); // deep red
    g.addColorStop(1, `rgba(50,0,0,0)`); // transparent
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }
}
function spawnFlamesFromPipes() {
  if (gameState !== "Play") return;
  document.querySelectorAll(".pipe_sprite").forEach((pipe) => {
    const r = pipe.getBoundingClientRect();
    const isTop = r.top < window.innerHeight * 0.3;
    const edgeY = isTop ? r.bottom : r.top;

    // Visual particles
    for (let i = 0; i < 3; i++)
      flameParticles.push(
        new FlameParticle(
          r.left + Math.random() * r.width,
          edgeY,
          isTop ? 1 : -1,
        ),
      );

    // Fresh bird position right before checking
    const freshBirdRect = bird.getBoundingClientRect();
    const flameTop = isTop ? edgeY - 5 : edgeY - 50;
    const flameBottom = isTop ? edgeY + 50 : edgeY + 5;

    if (
      freshBirdRect.left < r.right &&
      freshBirdRect.right > r.left &&
      freshBirdRect.top < flameBottom &&
      freshBirdRect.bottom > flameTop
    )
      takeDamage();
  });
}
function startFlameSpawner() {
  clearInterval(flameSpawnHandle);
  flameSpawnHandle = setInterval(spawnFlamesFromPipes, 60);
}
(function renderFlames() {
  fCtx.clearRect(0, 0, flameCanvas.width, flameCanvas.height);
  flameParticles = flameParticles.filter((p) => p.life > 0);
  flameParticles.forEach((p) => {
    p.update();
    p.draw(fCtx);
  });
  requestAnimationFrame(renderFlames);
})();
// --- MONSTERS ---
const MONSTER_EMOJIS = ["👾", "🦇", "💀", "🐙", "🔮"];
let monsters = [];
let monsterSpawnHandle;

function spawnMonster() {
  if (gameState !== "Play") return;
  const em = document.createElement("div");
  em.className = "monster";
  em.textContent =
    MONSTER_EMOJIS[Math.floor(Math.random() * MONSTER_EMOJIS.length)];
  const yPct = Math.random() * 55 + 15;
  em.style.top = yPct + "vh";
  em.style.left = "105vw";
  document.body.appendChild(em);
  monsters.push({
    el: em,
    x: window.innerWidth * 1.05,
    baseY: (yPct * window.innerHeight) / 100,
    speed: MOVE_SPEED_VAR * (1.1 + Math.random() * 0.8),
    phase: Math.random() * Math.PI * 2,
    amplitude: 0.4 + Math.random() * 1.2,
    frame: 0,
  });
}
function updateMonsters() {
  if (gameState !== "Play") {
    monsters.forEach((m) => m.el.remove());
    monsters = [];
    return;
  }
  birdRect = bird.getBoundingClientRect();
  monsters = monsters.filter((m) => {
    m.frame++;
    m.x -= m.speed;
    m.el.style.left = m.x + "px";
    m.el.style.top =
      m.baseY + Math.sin(m.phase + m.frame * 0.04) * 30 * m.amplitude + "px";
    if (m.x < -80) {
      m.el.remove();
      return false;
    }
    const mr = m.el.getBoundingClientRect();
    if (
      birdRect.left < mr.right &&
      birdRect.right > mr.left &&
      birdRect.top < mr.bottom &&
      birdRect.bottom > mr.top
    ) {
      takeDamage();
      m.el.style.fontSize = "0px";
      setTimeout(() => m.el.remove(), 200);
      return false;
    }
    return true;
  });
  requestAnimationFrame(updateMonsters);
}
function startMonsterSpawner() {
  clearTimeout(monsterSpawnHandle);
  const next = () => {
    if (gameState !== "Play") return;
    monsterSpawnHandle = setTimeout(
      () => {
        spawnMonster();
        next();
      },
      8000 + Math.random() * 5000,
    );
  };
  next();
}

// --- HEALTH BOOSTER ---
let boosterSpawnHandle;

function spawnBooster() {
  if (gameState !== "Play") return;

  const booster = document.createElement("div");
  booster.id = "health-booster";
  booster.textContent = "💊";
  booster.style.cssText = `
    position: fixed;
    font-size: 2rem;
    z-index: 160;
    pointer-events: none;
    filter: drop-shadow(0 0 8px rgba(255,100,100,0.9));
    left: 105vw;
  `;

  const yPct = Math.random() * 50 + 20;
  booster.style.top = yPct + "vh";
  document.body.appendChild(booster);

  let x = window.innerWidth * 1.05;

  function moveBooster() {
    if (gameState !== "Play") {
      booster.remove();
      return;
    }

    x -= MOVE_SPEED_VAR * 0.8;
    booster.style.left = x + "px";

    if (x < -50) {
      booster.remove();
      return;
    }

    // Collision with bird
    const br = bird.getBoundingClientRect();
    const hr = booster.getBoundingClientRect();
    if (
      br.left < hr.right &&
      br.right > hr.left &&
      br.top < hr.bottom &&
      br.bottom > hr.top
    ) {
      if (currentHealth < 3) {
        currentHealth++;
        updateHearts();
      }
      booster.style.fontSize = "0px";
      setTimeout(() => booster.remove(), 200);
      return;
    }

    requestAnimationFrame(moveBooster);
  }

  requestAnimationFrame(moveBooster);
}

function startBoosterSpawner() {
  clearTimeout(boosterSpawnHandle);
  const next = () => {
    if (gameState !== "Play") return;
    // Spawns every 15–25 seconds — rare!
    boosterSpawnHandle = setTimeout(
      () => {
        spawnBooster();
        next();
      },
      15000 + Math.random() * 10000,
    );
  };
  next();
}

// try to wire up selector if present; otherwise default to medium
const diffEl = document.getElementById("difficulty_select");
if (diffEl) {
  diffEl.addEventListener("change", (e) => {
    if (gameState !== "Play") {
      applyDifficulty(e.target.value);
    } else {
      // Revert the change if game is playing
      e.target.value = getCurrentDifficulty();
    }
  });
  applyDifficulty(diffEl.value || "medium");
} else {
  applyDifficulty("medium");
}

function getCurrentDifficulty() {
  if (Math.abs(MOVE_SPEED_VAR - 2.0) < 0.1) return "easy";
  if (Math.abs(MOVE_SPEED_VAR - 4.5) < 0.1) return "hard";
  return "medium";
}

// ---------- DOM References ----------
const bird = document.querySelector(".bird");
const birdImg = document.getElementById("bird-1");
const backgroundEl = document.querySelector(".background");

const scoreValEl = document.querySelector(".score_val");
const scoreTitleEl = document.querySelector(".score_title");
const messageEl = document.querySelector(".message");

// ---------- Day/Night biome effect ----------
let dayNightState = "day";

function applyDayNight(state) {
  const body = document.body;
  if (state === "night") {
    body.classList.remove("day");
    body.classList.add("night");
    dayNightState = "night";
  } else {
    body.classList.remove("night");
    body.classList.add("day");
    dayNightState = "day";
  }
}

function initDayNightCycle() {
  const now = new Date();
  const hour = now.getHours();

  // Set initial mode once (day 6am-6pm; night else)
  if (hour >= 6 && hour < 18) {
    applyDayNight("day");
  } else {
    applyDayNight("night");
  }

  // No automatic mode switching; manual toggle only
  updateDayNightButton();
}

function updateDayNightButton() {
  const btn = document.getElementById("day-night-toggle");
  if (!btn) return;
  btn.textContent =
    dayNightState === "day" ? "Switch to Night" : "Switch to Day";
}

initDayNightCycle();

const dayNightButton = document.getElementById("day-night-toggle");
if (dayNightButton) {
  dayNightButton.addEventListener("click", () => {
    applyDayNight(dayNightState === "day" ? "night" : "day");
    updateDayNightButton();
    dayNightButton.blur();
  });

  dayNightButton.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
    }
  });
}

updateDayNightButton();

// Audio
const soundPoint = new Audio("sounds effect/point.mp3");
const soundDie = new Audio("sounds effect/die.mp3");

// ---------- State ----------
let gameState = "Start"; // 'Start' | 'Ready' | 'Play' | 'End'
let birdDy = 0;
let birdRect = bird.getBoundingClientRect();
let backgroundRect = backgroundEl.getBoundingClientRect();

// MediaPipe / camera flags
let cameraStarted = false;

// Gesture state
let prevTipY = null;
let lastFlapTime = 0;

// Initialize UI state
if (birdImg) birdImg.style.display = "none";
if (messageEl) messageEl.classList.add("messageStyle");

// ---------- Keyboard Controls ----------
document.addEventListener("keydown", (e) => {
  // Don’t use game controls when the Day/Night button is focused.
  if (e.target && e.target.id === "day-night-toggle") {
    // Avoid default Space / Enter button click behavior from interfering with gameplay.
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
    }
    return;
  }

  if ((e.key === "ArrowUp" || e.key === " ") && gameState === "Ready") {
    startPlayFromInput();
  } else if ((e.key === "ArrowUp" || e.key === " ") && gameState === "Play") {
    flap();
  }

  // Ensure camera is started when user interacts (avoid autoplay block)
  if (
    (e.key === "Enter" || e.key === "ArrowUp" || e.key === " ") &&
    !cameraStarted
  ) {
    startCameraAndMediapipe();
  }

  if (e.key === "Enter" && gameState !== "Play") {
    resetToReady();
  }
});

document.addEventListener("keyup", (e) => {
  if ((e.key === "ArrowUp" || e.key === " ") && gameState === "Play") {
    if (birdImg) birdImg.src = "images/Bird.png";
  }
});

// ---------- Small helpers ----------
function startPlayFromInput() {
  gameState = "Play";
  if (messageEl) messageEl.innerHTML = "";
  play();
  if (birdImg) birdImg.src = "images/Bird-2.png";
  birdDy = FLAP_VELOCITY_VAR;
  if (birdImg) birdImg.style.display = "block";
  startFlameSpawner();
  startMonsterSpawner();
  requestAnimationFrame(updateMonsters);
  // Disable difficulty selector during gameplay
  if (diffEl) diffEl.disabled = true;
}

function flap() {
  if (birdImg) birdImg.src = "images/Bird-2.png";
  birdDy = FLAP_VELOCITY_VAR;
}

function resetToReady() {
  clearTimeout(boosterSpawnHandle);
  const oldBooster = document.getElementById("health-booster");
  if (oldBooster) oldBooster.remove();
  monsters.forEach((m) => m.el.remove());
  monsters = [];
  flameParticles = [];
  clearInterval(flameSpawnHandle);
  clearTimeout(monsterSpawnHandle);
  resetHealth();
  document.querySelectorAll(".pipe_sprite").forEach((p) => p.remove());
  if (birdImg) birdImg.style.display = "block";
  if (bird) bird.style.top = "40vh";
  birdDy = 0;
  birdRect = bird.getBoundingClientRect();
  backgroundRect = backgroundEl.getBoundingClientRect();
  gameState = "Ready";
  if (messageEl) messageEl.innerHTML = "Press ArrowUp or Space to Start";
  if (scoreTitleEl) scoreTitleEl.innerHTML = "Score : ";
  if (scoreValEl) scoreValEl.innerHTML = "0";
  if (messageEl) messageEl.classList.remove("messageStyle");
  // Enable difficulty selector when not playing
  if (diffEl) diffEl.disabled = false;
}

// ---------- MediaPipe Hands Setup ----------
const videoElement =
  document.getElementById("input_video") ||
  (() => {
    const v = document.createElement("video");
    v.id = "input_video";
    v.autoplay = true;
    v.playsInline = true;
    v.classList.add("debug-video"); // class-controlled styling
    document.body.appendChild(v);
    return v;
  })();

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6,
});

// MediaPipe results callback -> gesture detection
hands.onResults((results) => {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    prevTipY = null;
    return;
  }

  const landmarks = results.multiHandLandmarks[0];
  const tip = landmarks[8];
  const tipY = tip.y;
  const now = performance.now();

  if (prevTipY !== null) {
    const dy = prevTipY - tipY; // positive when hand moved up
    if (dy > FLAP_DY_THRESHOLD && now - lastFlapTime > FLAP_COOLDOWN_MS) {
      lastFlapTime = now;
      if (gameState === "Ready") {
        startPlayFromInput();
      } else if (gameState === "Play") {
        flap();
      }
    }
  }

  prevTipY = tipY;
});

// ---------- Camera start helper (user gesture friendly) ----------
async function startCameraAndMediapipe() {
  if (cameraStarted) return;
  cameraStarted = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    });

    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.playsInline = true;

    // Show debug video by toggling class — styling lives in CSS
    videoElement.classList.add("visible");

    await new Promise((resolve) => (videoElement.onloadedmetadata = resolve));
    await videoElement.play().catch(() => {
      /* ignore play reject after user gesture check */
    });

    // Start MediaPipe Camera wrapper
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await hands.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });

    await camera.start();
    console.log("MediaPipe camera STARTED");

    // Remove the enable button if present
    const btn = document.getElementById("enable_cam_btn");
    if (btn && btn.parentElement) btn.remove();
  } catch (err) {
    console.error("Camera/MediaPipe init failed:", err);
    cameraStarted = false; // allow retry
  }
}

// Minimal UI: create Enable Camera button (styling in CSS)
(function createEnableCameraButton() {
  // Avoid creating duplicate
  if (document.getElementById("enable_cam_btn")) return;
  const btn = document.createElement("button");
  btn.id = "enable_cam_btn";
  btn.type = "button";
  btn.classList.add("enable-cam-btn"); // use CSS class
  btn.innerText = "Enable Camera";
  btn.addEventListener("click", () => startCameraAndMediapipe());
  document.body.appendChild(btn);
})();

// ---------- Game Loop & Mechanics ----------
function play() {
  // Move pipes and detect collisions/score
  function move() {
    if (gameState !== "Play") return;

    birdRect = bird.getBoundingClientRect();
    backgroundRect = backgroundEl.getBoundingClientRect();

    const pipes = document.querySelectorAll(".pipe_sprite");
    pipes.forEach((pipe) => {
      const pipeRect = pipe.getBoundingClientRect();

      if (pipeRect.right <= 0) {
        pipe.remove();
        return;
      }

      // Collision detection
      const collided =
        birdRect.left < pipeRect.left + pipeRect.width &&
        birdRect.left + birdRect.width > pipeRect.left &&
        birdRect.top < pipeRect.top + pipeRect.height &&
        birdRect.top + birdRect.height > pipeRect.top;

      if (collided) {
        takeDamage();
        return;
      }

      // Scoring (use runtime speed var)
      if (
        pipeRect.right < birdRect.left &&
        pipeRect.right + MOVE_SPEED_VAR >= birdRect.left &&
        pipe.increase_score === "1"
      ) {
        const cur = parseInt(scoreValEl.innerHTML) || 0;
        scoreValEl.innerHTML = cur + 1;
        pipe.increase_score = "0";
        try {
          soundPoint.play();
        } catch (e) {}
      }

      // Move pipe (use runtime speed var)
      pipe.style.left = pipeRect.left - MOVE_SPEED_VAR + "px";
    });

    requestAnimationFrame(move);
  }

  // Gravity / vertical motion
  function applyGravity() {
    if (gameState !== "Play") return;

    birdDy += GRAVITY_VAR; // runtime gravity
    birdRect = bird.getBoundingClientRect();
    backgroundRect = backgroundEl.getBoundingClientRect();

    if (birdRect.top <= 0 || birdRect.bottom >= backgroundRect.bottom) {
      endGame();
      return;
    }

    bird.style.top = birdRect.top + birdDy + "px";
    birdRect = bird.getBoundingClientRect();
    requestAnimationFrame(applyGravity);
  }

  // Pipe creation (uses runtime gap & separation)
  let pipeSeparationCounter = 0;
  function createPipe() {
    if (gameState !== "Play") return;

    if (pipeSeparationCounter > PIPE_SEPARATION_THRESHOLD_VAR) {
      pipeSeparationCounter = 0;
      const pipeBase = Math.floor(Math.random() * 43) + 8;

      // top (inverted) pipe
      const topPipe = document.createElement("div");
      topPipe.className = "pipe_sprite";
      topPipe.style.top = pipeBase - 70 + "vh";
      topPipe.style.left = "100vw";
      document.body.appendChild(topPipe);

      // bottom pipe
      const bottomPipe = document.createElement("div");
      bottomPipe.className = "pipe_sprite";
      bottomPipe.style.top = pipeBase + PIPE_GAP_VH_VAR + "vh";
      bottomPipe.style.left = "100vw";
      bottomPipe.increase_score = "1";
      document.body.appendChild(bottomPipe);
    }

    pipeSeparationCounter++;
    requestAnimationFrame(createPipe);
  }

  requestAnimationFrame(move);
  requestAnimationFrame(applyGravity);
  requestAnimationFrame(createPipe);
  startBoosterSpawner();
}

function endGame() {
  gameState = "End";
  if (messageEl) {
    messageEl.style.left = "50%";
    messageEl.style.top = "50%";
    messageEl.style.transform = "translate(-50%, -50%)";
    messageEl.innerHTML =
      "Game Over".fontcolor("red") + "<br>Press Enter To Restart";
    messageEl.classList.add("messageStyle");
  }
  if (birdImg) birdImg.style.display = "none";
  try {
    soundDie.play();
  } catch (e) {}

  // Enable difficulty selector when game ends
  if (diffEl) diffEl.disabled = false;

  // NOTE: original code doesn't persist high score; if you want that added I can add it
}

// ---------- Optional: Animated Pipe Colors ----------
function getRandomColor() {
  const hex = "0123456789ABCDEF";
  let c = "#";
  for (let i = 0; i < 6; i++) c += hex[Math.floor(Math.random() * 16)];
  return c;
}

(function animatePipeColors() {
  const pipes = document.querySelectorAll(".pipe_sprite");
  pipes.forEach((pipe) => {
    pipe.style.background = getRandomColor();
    pipe.style.borderColor = getRandomColor();
  });
  // Reduce frequency from every frame to every 2 seconds
  setTimeout(() => requestAnimationFrame(animatePipeColors), 2000);
})();
