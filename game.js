const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CONFIG = {
  maxTrails: 15,
  trailColor: "0, 150, 255",
  dangerMessageDuration: 800,
  skorPerGasoline: 10,
  gasolinePickupDuration: 650,
  respawnAnimationDuration: 500,
  startingTime: 30,
  winScore: 100,
  obstacleSpawnInterval: 5000,
  kecepatanRotasi: 0.012,
  slowDuration: 2000,
  slowFactor: 0.4,
  flashInterval: 150,
  gameOverFlashDuration: 900,
  winFlashDuration: 8000,
  gameOverFlashInterval: 120,
  highScoreKey: "catchTheGasoline_highScore",
};

const ASET = {
  mobil: "assets/mobil.png",
  gasoline: "assets/gasoline.png",
  paku: "assets/paku.png",
};

const AUDIO = {
  sfxGasoline: "assets/sfx-gasoline.mp3",
  sfxPaku: "assets/sfx-paku.mp3",
  sfxMenang: "assets/sfx-menang.mp3",
  sfxKalah: "assets/sfx-kalah.mp3",
  bgm: "assets/bgm.mp3",
};

function muatGambar(src) {
  const img = new Image();
  img.loaded = false;
  img.src = src;
  img.onload = () => { img.loaded = true; };
  img.onerror = () => { img.loaded = false; };
  return img;
}

function muatAudio(src, { loop = false } = {}) {
  const audio = new Audio();
  audio.src = src;
  audio.loop = loop;
  audio.preload = "auto";
  audio.onerror = () => { audio.gagalMuat = true; };
  return audio;
}

function putarAudio(audio) {
  if (!audio || audio.gagalMuat || isMuted) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

const gambarMobil = muatGambar(ASET.mobil);
const gambarGasoline = muatGambar(ASET.gasoline);
const gambarPaku = muatGambar(ASET.paku);

const sfxGasoline = muatAudio(AUDIO.sfxGasoline);
const sfxPaku = muatAudio(AUDIO.sfxPaku);
const sfxMenang = muatAudio(AUDIO.sfxMenang);
const sfxKalah = muatAudio(AUDIO.sfxKalah);
const bgm = muatAudio(AUDIO.bgm, { loop: true });
bgm.volume = 0.5;

const UI = {
  posX: document.getElementById("posX"),
  posY: document.getElementById("posY"),
  color: document.getElementById("playerColor"),
  size: document.getElementById("playerSize"),
  speed: document.getElementById("playerSpeed"),
  score: document.getElementById("score"),
  timeLeft: document.getElementById("timeLeft"),
  highScore: document.getElementById("highScore"),
  dangerMessage: document.getElementById("dangerMessage"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  gameOverTitle: document.getElementById("gameOverTitle"),
  gameOverText: document.getElementById("gameOverText"),
  restartButton: document.getElementById("restartButton"),
  startScreen: document.getElementById("startScreen"),
  startButton: document.getElementById("startButton"),
  muteButton: document.getElementById("muteButton"),
  canvasWrap: document.querySelector(".canvas-wrap"),
};

const GAME_STATE = {
  START: "START",
  PLAYING: "PLAYING",
  GAME_OVER: "GAME_OVER",
};

const mobil = {
  x: 100,
  y: 100,
  w: 40,
  h: 70,
  speed: 2,
  color: "white",
  sudut: 0,
};
const startX = mobil.x;
const startY = mobil.y;
const lastValidMobilPosition = { x: startX, y: startY };

const gasoline = [
  { x: 400, y: 250, w: 28, h: 28, color: "#ffb703" },
  { x: 150, y: 350, w: 24, h: 24, color: "#fb8500" },
  { x: 650, y: 100, w: 32, h: 32, color: "#ffd166" },
];

const paku = [
  { x: 300, y: 100, w: 26, h: 26, color: "#8d8d8d" },
  { x: 550, y: 380, w: 26, h: 26, color: "#8d8d8d" },
];
const initialPakuCount = paku.length;

const trails = [];
const keys = {};
const gasolineEffects = [];

let dangerTimeout = null;
let lastState = { x: -1, y: -1 };
let score = 0;
let timeLeft = CONFIG.startingTime;
let gameState = GAME_STATE.START;
let timerInterval = null;
let obstacleSpawnTimer = null;
let mobilRespawnElapsed = CONFIG.respawnAnimationDuration;
let slowElapsed = CONFIG.slowDuration;
let gameOverFlashElapsed = CONFIG.gameOverFlashDuration;
let activeGameOverFlashDuration = CONFIG.gameOverFlashDuration;
let isMuted = localStorage.getItem("catchTheGasoline_muted") === "1";
let highScore = Number(localStorage.getItem(CONFIG.highScoreKey)) || 0;

function initUI() {
  UI.color.textContent = mobil.color;
  UI.size.textContent = `${mobil.w}x${mobil.h}`;
  UI.speed.textContent = mobil.speed;
  UI.score.textContent = score;
  UI.timeLeft.textContent = timeLeft;
  UI.highScore.textContent = highScore;
  updateMuteButton();
}

function updateMuteButton() {
  UI.muteButton.textContent = isMuted ? "🔇 Unmute" : "🔊 Mute";
  bgm.muted = isMuted;
}

UI.muteButton.addEventListener("click", () => {
  isMuted = !isMuted;
  localStorage.setItem("catchTheGasoline_muted", isMuted ? "1" : "0");
  updateMuteButton();
});

function simpanHighScoreJikaLebihTinggi() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(CONFIG.highScoreKey, String(highScore));
  }
  UI.highScore.textContent = highScore;
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState !== GAME_STATE.PLAYING) return;

    timeLeft--;
    UI.timeLeft.textContent = timeLeft;

    if (timeLeft <= 0) {
      timeLeft = 0;
      UI.timeLeft.textContent = timeLeft;
      endGame(score >= CONFIG.winScore);
    }
  }, 1000);
}

function startObstacleSpawner() {
  clearInterval(obstacleSpawnTimer);
  obstacleSpawnTimer = setInterval(() => {
    if (gameState !== GAME_STATE.PLAYING) return;

    const obstacle = { x: 0, y: 0, w: 26, h: 26, color: "#8d8d8d" };
    respawnObject(obstacle);
    paku.push(obstacle);
  }, CONFIG.obstacleSpawnInterval);
}

function startGame() {
  gameState = GAME_STATE.PLAYING;
  UI.startScreen.classList.remove("show");
  putarAudio(bgm);
  if (!isMuted) bgm.play().catch(() => {});
  startTimer();
  startObstacleSpawner();
}

UI.startButton.addEventListener("click", startGame);

function endGame(isWin) {
  gameState = GAME_STATE.GAME_OVER;
  clearInterval(obstacleSpawnTimer);
  bgm.pause();
  activeGameOverFlashDuration = isWin
    ? CONFIG.winFlashDuration
    : CONFIG.gameOverFlashDuration;
  gameOverFlashElapsed = 0;
  simpanHighScoreJikaLebihTinggi();

  putarAudio(isWin ? sfxMenang : sfxKalah);

  UI.gameOverOverlay.classList.add("show", isWin ? "win" : "lose");
  UI.gameOverOverlay.classList.remove(isWin ? "lose" : "win");
  UI.gameOverTitle.textContent = isWin ? "Menang!" : "Game Over";
  UI.gameOverText.textContent = isWin
    ? `Skor akhir: ${score} | High Score: ${highScore}`
    : `Kehabisan waktu! Skor akhir: ${score} | High Score: ${highScore}`;
}

function restartGame() {
  score = 0;
  timeLeft = CONFIG.startingTime;
  gameState = GAME_STATE.PLAYING;
  resetMobil();
  gasolineEffects.length = 0;
  paku.length = initialPakuCount;

  UI.gameOverOverlay.classList.remove("show", "win", "lose");
  UI.score.textContent = score;
  UI.timeLeft.textContent = timeLeft;

  putarAudio(bgm);
  if (!isMuted) bgm.play().catch(() => {});

  startTimer();
  startObstacleSpawner();
}

UI.restartButton.addEventListener("click", restartGame);

window.addEventListener("keydown", (e) => {
  if (e.key.startsWith("Arrow")) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
  for (let key in keys) keys[key] = false;
});

const checkCollision = (a, b) => (
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y
);

const respawnObject = (obj) => {
  obj.x = Math.random() * (canvas.width - obj.w);
  obj.y = Math.random() * (canvas.height - obj.h);
};

const resetMobil = () => {
  mobil.x = startX;
  mobil.y = startY;
  lastValidMobilPosition.x = startX;
  lastValidMobilPosition.y = startY;
  mobil.sudut = 0;
  trails.length = 0;
  mobilRespawnElapsed = 0;
  slowElapsed = CONFIG.slowDuration;
};

const showDangerMessage = () => {
  UI.dangerMessage.textContent = "Kena Paku! Melambat...";
  UI.dangerMessage.classList.add("show");
  clearTimeout(dangerTimeout);
  dangerTimeout = setTimeout(() => {
    UI.dangerMessage.classList.remove("show");
  }, CONFIG.slowDuration);
};

function sudutTerpendek(dari, ke) {
  let selisih = (ke - dari) % (Math.PI * 2);
  if (selisih > Math.PI) selisih -= Math.PI * 2;
  if (selisih < -Math.PI) selisih += Math.PI * 2;
  return selisih;
}

function handleMovement() {
  if (gameState !== GAME_STATE.PLAYING) return false;

  if (!Number.isFinite(mobil.x) || !Number.isFinite(mobil.y)) {
    mobil.x = lastValidMobilPosition.x;
    mobil.y = lastValidMobilPosition.y;
  }

  const sedangSlow = slowElapsed < CONFIG.slowDuration;
  const multiplierSlow = sedangSlow ? CONFIG.slowFactor : 1;
  const speed = mobil.speed * multiplierSlow;

  let dx = 0;
  let dy = 0;

  if (keys["d"] || keys["arrowright"]) dx += 1;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;

  const isMoving = dx !== 0 || dy !== 0;
  if (isMoving) {
    const panjang = Math.hypot(dx, dy);
    const nextX = mobil.x + (dx / panjang) * speed;
    const nextY = mobil.y + (dy / panjang) * speed;
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return false;

    mobil.x = nextX;
    mobil.y = nextY;

    const sudutTarget = Math.atan2(dx, -dy);
    mobil.sudut += sudutTerpendek(mobil.sudut, sudutTarget) * CONFIG.kecepatanRotasi * 16;
  }

  mobil.x = Math.max(0, Math.min(canvas.width - mobil.w, mobil.x));
  mobil.y = Math.max(0, Math.min(canvas.height - mobil.h, mobil.y));
  lastValidMobilPosition.x = mobil.x;
  lastValidMobilPosition.y = mobil.y;

  return isMoving;
}

function checkGasolineCollisions() {
  if (gameState !== GAME_STATE.PLAYING) return;

  gasoline.forEach((item) => {
    if (checkCollision(mobil, item)) {
      score += CONFIG.skorPerGasoline;
      createGasolineEffect(item);
      respawnObject(item);
      putarAudio(sfxGasoline);

      if (score >= CONFIG.winScore) {
        endGame(true);
      }
    }
  });
}

function createGasolineEffect(item) {
  const particleCount = 10;
  const centerX = item.x + item.w / 2;
  const centerY = item.y + item.h / 2;

  gasolineEffects.push({
    x: centerX,
    y: centerY,
    color: item.color,
    age: 0,
    particles: Array.from({ length: particleCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / particleCount;
      return {
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * (1.2 + Math.random() * 1.2),
        vy: Math.sin(angle) * (1.2 + Math.random() * 1.2),
      };
    }),
  });
}

function checkPakuCollisions() {
  if (gameState !== GAME_STATE.PLAYING) return;

  paku.some((item) => {
    if (checkCollision(mobil, item)) {
      showDangerMessage();
      slowElapsed = 0;
      respawnObject(item);
      putarAudio(sfxPaku);
      return true;
    }
    return false;
  });
}

function update(deltaTime) {
  mobilRespawnElapsed = Math.min(
    CONFIG.respawnAnimationDuration,
    mobilRespawnElapsed + deltaTime,
  );
  slowElapsed = Math.min(CONFIG.slowDuration, slowElapsed + deltaTime);
  gameOverFlashElapsed = Math.min(
    activeGameOverFlashDuration,
    gameOverFlashElapsed + deltaTime,
  );

  const isMoving = handleMovement();

  if (isMoving) {
    const centerX = mobil.x + mobil.w / 2;
    const centerY = mobil.y + mobil.h / 2;
    const knalpotX = centerX - Math.sin(mobil.sudut) * (mobil.h / 2);
    const knalpotY = centerY + Math.cos(mobil.sudut) * (mobil.h / 2);

    trails.push({ x: knalpotX, y: knalpotY });
    if (trails.length > CONFIG.maxTrails) trails.shift();
  } else if (trails.length > 0) {
    trails.shift();
  }

  checkGasolineCollisions();
  checkPakuCollisions();
  updateGasolineEffects(deltaTime);
}

function updateGasolineEffects(deltaTime) {
  for (let i = gasolineEffects.length - 1; i >= 0; i--) {
    const effect = gasolineEffects[i];
    effect.age += deltaTime;
    effect.particles.forEach((particle) => {
      particle.x += particle.vx * deltaTime / 16;
      particle.y += particle.vy * deltaTime / 16;
    });

    if (effect.age >= CONFIG.gasolinePickupDuration) {
      gasolineEffects.splice(i, 1);
    }
  }
}

function updateDOM() {
  const currentX = Math.round(mobil.x);
  const currentY = Math.round(mobil.y);

  if (lastState.x !== currentX) { UI.posX.textContent = currentX; lastState.x = currentX; }
  if (lastState.y !== currentY) { UI.posY.textContent = currentY; lastState.y = currentY; }
  UI.score.textContent = score;
}

function gambarAtauBentuk(gambar, x, y, w, h, gambarBentukFallback) {
  if (gambar.loaded) {
    ctx.drawImage(gambar, x, y, w, h);
  } else {
    gambarBentukFallback();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const tLen = trails.length;
  for (let i = 0; i < tLen; i++) {
    const ratio = (i + 1) / tLen;
    const radius = (mobil.w / 3) * ratio;

    ctx.fillStyle = `rgba(120, 120, 120, ${ratio * 0.35})`;
    ctx.beginPath();
    ctx.arc(trails[i].x, trails[i].y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  gasoline.forEach((item) => {
    gambarAtauBentuk(gambarGasoline, item.x, item.y, item.w, item.h, () => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  gasolineEffects.forEach((effect) => {
    const progress = effect.age / CONFIG.gasolinePickupDuration;
    const alpha = 1 - progress;
    const radius = 14 + progress * 40;

    ctx.strokeStyle = `rgba(255, 183, 3, ${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 183, 3, ${alpha * 0.6})`;
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`+${CONFIG.skorPerGasoline}`, effect.x, effect.y - radius - 4);

    effect.particles.forEach((particle) => {
      ctx.fillStyle = `rgba(255, 183, 3, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4 * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  paku.forEach((item) => {
    gambarAtauBentuk(gambarPaku, item.x, item.y, item.w, item.h, () => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.moveTo(item.x + item.w / 2, item.y);
      ctx.lineTo(item.x + item.w, item.y + item.h);
      ctx.lineTo(item.x, item.y + item.h);
      ctx.closePath();
      ctx.fill();
    });
  });

  const respawnProgress = mobilRespawnElapsed / CONFIG.respawnAnimationDuration;
  const mobilScale = 1 - 0.7 * Math.sin(respawnProgress * Math.PI);
  const scaledWidth = mobil.w * mobilScale;
  const scaledHeight = mobil.h * mobilScale;
  const centerX = mobil.x + mobil.w / 2;
  const centerY = mobil.y + mobil.h / 2;

  const sedangFlash = slowElapsed < CONFIG.slowDuration;
  const nyalaFlash = sedangFlash && Math.floor(slowElapsed / CONFIG.flashInterval) % 2 === 0;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(mobil.sudut);
  if (nyalaFlash) ctx.globalAlpha = 0.35;
  gambarAtauBentuk(
    gambarMobil,
    -scaledWidth / 2,
    -scaledHeight / 2,
    scaledWidth,
    scaledHeight,
    () => {
      ctx.fillStyle = mobil.color;
      ctx.fillRect(-scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
    }
  );
  ctx.restore();

  if (
    gameState === GAME_STATE.GAME_OVER &&
    gameOverFlashElapsed < activeGameOverFlashDuration &&
    Math.floor(gameOverFlashElapsed / CONFIG.gameOverFlashInterval) % 2 === 0
  ) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  updateDOM();
}

function gameLoop(timestamp) {
  const deltaTime = Math.min(timestamp - (gameLoop.lastTimestamp || timestamp), 50);
  gameLoop.lastTimestamp = timestamp;
  update(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

initUI();
requestAnimationFrame(gameLoop);