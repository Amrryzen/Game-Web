const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CONFIG = {
  maxTrails: 15,
  trailColor: "0, 150, 255",
  dangerMessageDuration: 800,
  skorPerGasoline: 10,
  gasolinePickupDuration: 650,
  respawnAnimationDuration: 500,
  startingTime: 0,
  obstacleSpawnInterval: 5000,
  maxPaku: 14,
  kecepatanRotasi: 0.012,
  slowDuration: 2000,
  slowFactor: 0.4,
  flashInterval: 150,
  gameOverFlashDuration: 900,
  winFlashDuration: 8000,
  gameOverFlashInterval: 120,
  highScoreKey: "catchTheGasoline_highScore",
  maxFuel: 100,
  fuelDrainPerSecond: 5,
  fuelDrainRamp: 0.04,
  fuelDrainMax: 12,
  fuelPerGasoline: 15,
  fuelPenaltyPaku: 8,
  comboWindow: 2000,
  maxCombo: 3,
  powerupSpawnInterval: 7000,
  powerupLifetime: 6000,
  powerupSize: 32,
  nitroDuration: 3000,
  nitroFactor: 2,
  jerigenFuel: 35,
  goldSpawnInterval: 12000,
  goldLifetime: 3500,
  goldSize: 30,
  skorEmas: 30,
  fuelPerEmas: 25,
  magnetDuration: 5000,
  magnetRadius: 160,
  magnetPull: 3.5,
  pakuWarningDuration: 1000,
  minSpawnDistance: 120,
  shakeDuration: 300,
  shakeIntensity: 8,
  lowFuelRatio: 0.25,
  lowFuelMusicRate: 1.3,
};

const POWERUP_TYPES = {
  nitro: { icon: "⚡", color: "#4cc9f0" },
  jerigen: { icon: "⛽", color: "#7CFC9A" },
  perisai: { icon: "🛡", color: "#c77dff" },
  magnet: { icon: "🧲", color: "#ff6b6b" },
};
const daftarPowerup = Object.keys(POWERUP_TYPES);

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
const powerups = [];
const pakuWarnings = [];

let emas = null;
let emasSpawnElapsed = 0;
let perisai = false;
let magnetRemaining = 0;
let shakeRemaining = 0;
let fuel = CONFIG.maxFuel;
let comboCount = 0;
let comboRemaining = 0;
let nitroRemaining = 0;
let powerupSpawnElapsed = 0;
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

    timeLeft++;
    UI.timeLeft.textContent = timeLeft;
  }, 1000);
}

function startObstacleSpawner() {
  clearInterval(obstacleSpawnTimer);
  obstacleSpawnTimer = setInterval(() => {
    if (gameState !== GAME_STATE.PLAYING) return;

    if (paku.length + pakuWarnings.length >= CONFIG.maxPaku) return;

    const peringatan = { x: 0, y: 0, w: 26, h: 26, age: 0 };
    respawnJauhDariMobil(peringatan);
    pakuWarnings.push(peringatan);
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

function endGame(isWin, alasan = "Bensin habis!") {
  gameState = GAME_STATE.GAME_OVER;
  clearInterval(obstacleSpawnTimer);
  bgm.pause();
  bgm.playbackRate = 1;
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
    : `${alasan} Skor: ${score} | Bertahan: ${timeLeft}s | High Score: ${highScore}`;
}

function restartGame() {
  score = 0;
  timeLeft = CONFIG.startingTime;
  gameState = GAME_STATE.PLAYING;
  resetMobil();
  gasolineEffects.length = 0;
  paku.length = initialPakuCount;
  powerups.length = 0;
  pakuWarnings.length = 0;
  emas = null;
  emasSpawnElapsed = 0;
  perisai = false;
  magnetRemaining = 0;
  shakeRemaining = 0;
  canvas.style.transform = "";
  fuel = CONFIG.maxFuel;
  comboCount = 0;
  comboRemaining = 0;
  nitroRemaining = 0;
  powerupSpawnElapsed = 0;

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

const respawnJauhDariMobil = (obj) => {
  for (let i = 0; i < 10; i++) {
    respawnObject(obj);
    if (Math.hypot(obj.x - mobil.x, obj.y - mobil.y) > CONFIG.minSpawnDistance) return;
  }
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

const showMessage = (text, kind = "danger", duration = CONFIG.dangerMessageDuration) => {
  UI.dangerMessage.textContent = text;
  UI.dangerMessage.classList.toggle("info", kind === "info");
  UI.dangerMessage.classList.add("show");
  clearTimeout(dangerTimeout);
  dangerTimeout = setTimeout(() => {
    UI.dangerMessage.classList.remove("show");
  }, duration);
};

const showDangerMessage = () => showMessage("Kena Paku! Melambat...", "danger", CONFIG.slowDuration);

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
  const multiplierNitro = nitroRemaining > 0 ? CONFIG.nitroFactor : 1;
  const speed = mobil.speed * multiplierSlow * multiplierNitro;

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
      comboCount++;
      comboRemaining = CONFIG.comboWindow;
      const poin = CONFIG.skorPerGasoline * Math.min(comboCount, CONFIG.maxCombo);
      score += poin;
      fuel = Math.min(CONFIG.maxFuel, fuel + CONFIG.fuelPerGasoline);
      createGasolineEffect(item, poin);
      respawnObject(item);
      putarAudio(sfxGasoline);
    }
  });
}

function createGasolineEffect(item, poin) {
  const particleCount = 10;
  const centerX = item.x + item.w / 2;
  const centerY = item.y + item.h / 2;

  gasolineEffects.push({
    x: centerX,
    y: centerY,
    color: item.color,
    poin,
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
      respawnJauhDariMobil(item);
      putarAudio(sfxPaku);

      if (perisai) {
        perisai = false;
        shakeRemaining = CONFIG.shakeDuration / 2;
        showMessage("Perisai pecah!", "info");
        return true;
      }

      showDangerMessage();
      slowElapsed = 0;
      comboCount = 0;
      comboRemaining = 0;
      fuel = Math.max(0, fuel - CONFIG.fuelPenaltyPaku);
      shakeRemaining = CONFIG.shakeDuration;
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

  if (gameState === GAME_STATE.PLAYING) {
    const drain = Math.min(
      CONFIG.fuelDrainMax,
      CONFIG.fuelDrainPerSecond + timeLeft * CONFIG.fuelDrainRamp,
    );
    fuel = Math.max(0, fuel - (drain * deltaTime) / 1000);
    comboRemaining = Math.max(0, comboRemaining - deltaTime);
    if (comboRemaining === 0) comboCount = 0;
    nitroRemaining = Math.max(0, nitroRemaining - deltaTime);
    magnetRemaining = Math.max(0, magnetRemaining - deltaTime);
    updatePowerups(deltaTime);
    updateEmas(deltaTime);
    updatePakuWarnings(deltaTime);
    applyMagnet(deltaTime);

    const targetRate = fuel / CONFIG.maxFuel <= CONFIG.lowFuelRatio ? CONFIG.lowFuelMusicRate : 1;
    if (bgm.playbackRate !== targetRate) bgm.playbackRate = targetRate;
  }
  shakeRemaining = Math.max(0, shakeRemaining - deltaTime);

  checkGasolineCollisions();
  checkEmasCollision();
  checkPakuCollisions();
  checkPowerupCollisions();
  updateGasolineEffects(deltaTime);

  if (gameState === GAME_STATE.PLAYING && fuel <= 0) {
    endGame(false, "Bensin habis!");
  }
}

function updatePowerups(deltaTime) {
  if (powerups.length === 0) {
    powerupSpawnElapsed += deltaTime;
    if (powerupSpawnElapsed >= CONFIG.powerupSpawnInterval) {
      powerupSpawnElapsed = 0;
      const item = {
        tipe: daftarPowerup[Math.floor(Math.random() * daftarPowerup.length)],
        x: 0,
        y: 0,
        w: CONFIG.powerupSize,
        h: CONFIG.powerupSize,
        age: 0,
      };
      respawnObject(item);
      powerups.push(item);
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    powerups[i].age += deltaTime;
    if (powerups[i].age >= CONFIG.powerupLifetime) powerups.splice(i, 1);
  }
}

function checkPowerupCollisions() {
  if (gameState !== GAME_STATE.PLAYING) return;

  for (let i = powerups.length - 1; i >= 0; i--) {
    const item = powerups[i];
    if (!checkCollision(mobil, item)) continue;

    powerups.splice(i, 1);
    putarAudio(sfxGasoline);

    if (item.tipe === "nitro") {
      nitroRemaining = CONFIG.nitroDuration;
      showMessage("NITRO! Speed 2x", "info");
    } else if (item.tipe === "perisai") {
      perisai = true;
      showMessage("Perisai aktif! Kebal 1 paku", "info");
    } else if (item.tipe === "magnet") {
      magnetRemaining = CONFIG.magnetDuration;
      showMessage("Magnet aktif!", "info");
    } else {
      fuel = Math.min(CONFIG.maxFuel, fuel + CONFIG.jerigenFuel);
      showMessage(`Bensin +${CONFIG.jerigenFuel}%!`, "info");
    }
  }
}

function updateEmas(deltaTime) {
  if (emas) {
    emas.age += deltaTime;
    if (emas.age >= CONFIG.goldLifetime) emas = null;
    return;
  }

  emasSpawnElapsed += deltaTime;
  if (emasSpawnElapsed < CONFIG.goldSpawnInterval) return;
  emasSpawnElapsed = 0;

  emas = { x: 0, y: 0, w: CONFIG.goldSize, h: CONFIG.goldSize, age: 0, color: "#ffd700" };
  if (paku.length > 0) {
    const target = paku[Math.floor(Math.random() * paku.length)];
    const sudut = Math.random() * Math.PI * 2;
    const jarak = 50 + Math.random() * 40;
    emas.x = Math.max(0, Math.min(canvas.width - emas.w, target.x + Math.cos(sudut) * jarak));
    emas.y = Math.max(0, Math.min(canvas.height - emas.h, target.y + Math.sin(sudut) * jarak));
  } else {
    respawnObject(emas);
  }
}

function checkEmasCollision() {
  if (gameState !== GAME_STATE.PLAYING || !emas || !checkCollision(mobil, emas)) return;

  comboCount++;
  comboRemaining = CONFIG.comboWindow;
  const poin = CONFIG.skorEmas * Math.min(comboCount, CONFIG.maxCombo);
  score += poin;
  fuel = Math.min(CONFIG.maxFuel, fuel + CONFIG.fuelPerEmas);
  createGasolineEffect(emas, poin);
  emas = null;
  putarAudio(sfxGasoline);
}

function updatePakuWarnings(deltaTime) {
  for (let i = pakuWarnings.length - 1; i >= 0; i--) {
    const peringatan = pakuWarnings[i];
    peringatan.age += deltaTime;
    if (peringatan.age >= CONFIG.pakuWarningDuration) {
      paku.push({ x: peringatan.x, y: peringatan.y, w: peringatan.w, h: peringatan.h, color: "#8d8d8d" });
      pakuWarnings.splice(i, 1);
    }
  }
}

function applyMagnet(deltaTime) {
  if (magnetRemaining <= 0) return;

  const cx = mobil.x + mobil.w / 2;
  const cy = mobil.y + mobil.h / 2;
  const targets = emas ? [...gasoline, emas] : gasoline;

  targets.forEach((item) => {
    const dx = cx - (item.x + item.w / 2);
    const dy = cy - (item.y + item.h / 2);
    const jarak = Math.hypot(dx, dy);
    if (jarak === 0 || jarak > CONFIG.magnetRadius) return;

    const langkah = Math.min(jarak, (CONFIG.magnetPull * deltaTime) / 16);
    item.x += (dx / jarak) * langkah;
    item.y += (dy / jarak) * langkah;
  });
}

function applyShake() {
  if (shakeRemaining > 0) {
    const kekuatan = CONFIG.shakeIntensity * (shakeRemaining / CONFIG.shakeDuration);
    const offsetX = (Math.random() - 0.5) * 2 * kekuatan;
    const offsetY = (Math.random() - 0.5) * 2 * kekuatan;
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  } else if (canvas.style.transform) {
    canvas.style.transform = "";
  }
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
  UI.speed.textContent = nitroRemaining > 0 ? mobil.speed * CONFIG.nitroFactor : mobil.speed;
}

function drawEmas() {
  if (!emas) return;

  const sisa = CONFIG.goldLifetime - emas.age;
  if (sisa < 1200 && Math.floor(sisa / 100) % 2 === 0) return;

  const cx = emas.x + emas.w / 2;
  const cy = emas.y + emas.h / 2;
  const pulse = 1 + 0.15 * Math.sin(emas.age / 100);

  ctx.save();
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 18;
  ctx.fillStyle = emas.color;
  ctx.strokeStyle = "#fff6a8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, (emas.w / 2) * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7a5200";
  ctx.fillText("★", cx, cy + 1);
  ctx.restore();
}

function drawPakuWarnings() {
  pakuWarnings.forEach((peringatan) => {
    const progress = peringatan.age / CONFIG.pakuWarningDuration;
    const cx = peringatan.x + peringatan.w / 2;
    const cy = peringatan.y + peringatan.h / 2;
    const terang = Math.floor(peringatan.age / 100) % 2 === 0;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 60, 60, ${terang ? 0.95 : 0.5})`;
    ctx.fillStyle = `rgba(255, 60, 60, ${0.15 + progress * 0.25})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 - progress * 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText("!", cx, cy + 1);
    ctx.restore();
  });
}

function drawPowerups() {
  powerups.forEach((item) => {
    const info = POWERUP_TYPES[item.tipe];
    const sisa = CONFIG.powerupLifetime - item.age;
    if (sisa < 2000 && Math.floor(sisa / 150) % 2 === 0) return;

    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const pulse = 1 + 0.1 * Math.sin(item.age / 150);

    ctx.save();
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(cx, cy, (item.w / 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111";
    ctx.fillText(info.icon, cx, cy + 1);
    ctx.restore();
  });
}

function drawHUD() {
  const barX = 14;
  const barY = 14;
  const barW = 160;
  const barH = 14;
  const ratio = fuel / CONFIG.maxFuel;
  const warna = ratio > 0.5 ? "#7CFC9A" : ratio > 0.25 ? "#ffd166" : "#ff4d4d";
  const berkedip = ratio <= 0.25 && Math.floor(performance.now() / 200) % 2 === 0;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
  if (!berkedip) {
    ctx.fillStyle = warna;
    ctx.fillRect(barX, barY, barW * ratio, barH);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`⛽ ${Math.ceil(fuel)}%`, barX + barW + 12, barY + barH / 2);

  if (comboCount >= 2) {
    const mult = Math.min(comboCount, CONFIG.maxCombo);
    ctx.fillStyle = "#ffb703";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`COMBO x${mult}`, barX, barY + 38);
    ctx.fillStyle = "rgba(255, 183, 3, 0.8)";
    ctx.fillRect(barX, barY + 54, 100 * (comboRemaining / CONFIG.comboWindow), 4);
  }

  const status = [];
  if (nitroRemaining > 0) {
    status.push({ teks: `⚡ NITRO ${(nitroRemaining / 1000).toFixed(1)}s`, warna: "#4cc9f0" });
  }
  if (magnetRemaining > 0) {
    status.push({ teks: `🧲 MAGNET ${(magnetRemaining / 1000).toFixed(1)}s`, warna: "#ff6b6b" });
  }
  if (perisai) {
    status.push({ teks: "🛡 PERISAI", warna: "#c77dff" });
  }
  ctx.textAlign = "right";
  ctx.font = "bold 18px Arial";
  status.forEach((item, i) => {
    ctx.fillStyle = item.warna;
    ctx.fillText(item.teks, canvas.width - 14, barY + barH / 2 + i * 24);
  });
  ctx.restore();
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

    ctx.fillStyle = nitroRemaining > 0
      ? `rgba(76, 201, 240, ${ratio * 0.6})`
      : `rgba(120, 120, 120, ${ratio * 0.35})`;
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
    ctx.fillText(`+${effect.poin}`, effect.x, effect.y - radius - 4);

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

  drawPakuWarnings();
  drawEmas();
  drawPowerups();

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

  if (magnetRemaining > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 107, 107, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, CONFIG.magnetRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (perisai) {
    ctx.save();
    ctx.strokeStyle = "rgba(199, 125, 255, 0.9)";
    ctx.fillStyle = "rgba(199, 125, 255, 0.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawHUD();

  if (
    gameState === GAME_STATE.GAME_OVER &&
    gameOverFlashElapsed < activeGameOverFlashDuration &&
    Math.floor(gameOverFlashElapsed / CONFIG.gameOverFlashInterval) % 2 === 0
  ) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  applyShake();
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