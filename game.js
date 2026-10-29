const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CONFIG = {
  finishDistance: 1800,
  roadLeft: 148,
  roadWidth: 504,
  laneCount: 3,
  playerY: 396,
  carWidth: 54,
  carHeight: 104,
  maxSpeed: 225,
  acceleration: 62,
  braking: 115,
  coastDrag: 20,
  maxDamage: 3,
  nitroCapacity: 100,
  nitroDrain: 38,
  nitroRecharge: 11,
  nitroSpeedBoost: 70,
  distanceScale: 0.62,
  upgradeCost: 500,
  maxUpgradeLevel: 5,
  speedPerLevel: 15,
  accelerationPerLevel: 8,
  nitroCapacityPerLevel: 20,
  nitroBoostPerLevel: 12,
};

const HIGH_SCORE_KEY = "tolMalam_highScore";
const RESET_ON_NEW_RUN_KEYS = [
  "tolMalam_money",
  "tolMalam_speedUpgrade",
  "tolMalam_nitroUpgrade",
  "tolMalam_muted",
];
RESET_ON_NEW_RUN_KEYS.forEach((key) => localStorage.removeItem(key));

function readHighScore() {
  const storedHighScore = Number(localStorage.getItem(HIGH_SCORE_KEY));
  return Number.isFinite(storedHighScore) ? Math.max(0, Math.floor(storedHighScore)) : 0;
}

const UI = {
  startScreen: document.getElementById("startScreen"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  startButton: document.getElementById("startButton"),
  garageButton: document.getElementById("garageButton"),
  restartButton: document.getElementById("restartButton"),
  garage: document.getElementById("garage"),
  gameOverTitle: document.getElementById("gameOverTitle"),
  gameOverText: document.getElementById("gameOverText"),
  resultEyebrow: document.getElementById("resultEyebrow"),
  muteButton: document.getElementById("muteButton"),
  racePosition: document.getElementById("racePosition"),
  playerSpeed: document.getElementById("playerSpeed"),
  speedFill: document.getElementById("speedFill"),
  highScoreValue: document.getElementById("highScoreValue"),
  distanceLabel: document.getElementById("distanceLabel"),
  distanceFill: document.getElementById("distanceFill"),
  nitroLabel: document.getElementById("nitroLabel"),
  nitroFill: document.getElementById("nitroFill"),
  overtakeCount: document.getElementById("overtakeCount"),
  damageCount: document.getElementById("damageCount"),
  raceNotice: document.getElementById("raceNotice"),
  countdown: document.getElementById("countdown"),
  walletBalance: document.getElementById("walletBalance"),
  speedUpgradeDescription: document.getElementById("speedUpgradeDescription"),
  nitroUpgradeDescription: document.getElementById("nitroUpgradeDescription"),
  speedUpgradeButton: document.getElementById("speedUpgradeButton"),
  nitroUpgradeButton: document.getElementById("nitroUpgradeButton"),
  garageMessage: document.getElementById("garageMessage"),
};

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

const art = {
  playerCar: loadImage("assets/mobil.png"),
  road: loadImage("assets/jalanan.png"),
  spikes: loadImage("assets/paku.png"),
};

const sounds = {
  music: new Audio("assets/bgm.mp3"),
  boost: new Audio("assets/sfx-gasoline.mp3"),
  crash: new Audio("assets/sfx-paku.mp3"),
  finish: new Audio("assets/sfx-menang.mp3"),
  lose: new Audio("assets/sfx-kalah.mp3"),
};
sounds.music.loop = true;
sounds.music.volume = 0.32;
sounds.boost.volume = 0.55;
sounds.crash.volume = 0.5;

const keys = new Set();
const touchControls = new Set();
const laneWidth = CONFIG.roadWidth / CONFIG.laneCount;
const laneCenters = Array.from({ length: CONFIG.laneCount }, (_, index) =>
  CONFIG.roadLeft + laneWidth * (index + 0.5),
);
const opponentTints = ["hue-rotate(135deg) saturate(1.3)", "hue-rotate(65deg) saturate(1.4)", "hue-rotate(225deg)"];

let muted = false;
let money = 5000;
let speedUpgradeLevel = 0;
let nitroUpgradeLevel = 0;
let highScore = readHighScore();
let state = "ready";
let playerX = laneCenters[1];
let targetLane = 1;
let speed = 0;
let distance = 0;
let nitro = CONFIG.nitroCapacity;
let damage = 0;
let elapsed = 0;
let roadOffset = 0;
let noticeTimeout;
let lastFrame = 0;
let opponents = [];
let hazards = [];
let countdownTimer;
let boostWasActive = false;
let crashCooldown = 0;
let flashRemaining = 0;

sounds.music.muted = muted;
applyUpgrades();
updateMuteButton();
updateGarageUI();

function createOpponents() {
  opponents = opponentTints.map((tint, index) => ({
    tint,
    lanePosition: index === 0 || index === 2 ? 0 : 2,
    laneStart: index === 0 || index === 2 ? 0 : 2,
    targetLane: index === 0 || index === 2 ? 0 : 2,
    laneChangeElapsed: 0,
    laneChangeDuration: 0,
    distance: 140 + index * 135,
    speed: 158 + Math.random() * 31,
    changeLaneAt: 6 + Math.random() * 7,
    collisionCooldown: 0,
  }));
}

function createHazards() {
  hazards = [
    { lane: 2, distance: 250, hit: false },
    { lane: 0, distance: 470, hit: false },
    { lane: 1, distance: 720, hit: false },
    { lane: 2, distance: 960, hit: false },
    { lane: 0, distance: 1200, hit: false },
    { lane: 1, distance: 1470, hit: false },
    { lane: 2, distance: 1650, hit: false },
  ];
}

function startGame() {
  clearInterval(countdownTimer);
  keys.clear();
  touchControls.clear();
  playerX = laneCenters[1];
  targetLane = 1;
  speed = 0;
  distance = 0;
  nitro = CONFIG.nitroCapacity;
  damage = 0;
  elapsed = 0;
  roadOffset = 0;
  crashCooldown = 0;
  flashRemaining = 0;
  boostWasActive = false;
  createOpponents();
  createHazards();
  state = "countdown";
  UI.startScreen.classList.remove("show");
  UI.gameOverOverlay.classList.remove("show");
  UI.countdown.textContent = "3";

  let count = 3;
  countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      UI.countdown.textContent = String(count);
      return;
    }

    clearInterval(countdownTimer);
    UI.countdown.textContent = "GAS!";
    state = "racing";
    playSound(sounds.music, true);
    setTimeout(() => { UI.countdown.textContent = ""; }, 650);
  }, 650);
  updateGarageUI();
  updateDashboard();
}

function applyUpgrades() {
  CONFIG.maxSpeed = 225 + speedUpgradeLevel * CONFIG.speedPerLevel;
  CONFIG.acceleration = 62 + speedUpgradeLevel * CONFIG.accelerationPerLevel;
  CONFIG.nitroCapacity = 100 + nitroUpgradeLevel * CONFIG.nitroCapacityPerLevel;
  CONFIG.nitroSpeedBoost = 70 + nitroUpgradeLevel * CONFIG.nitroBoostPerLevel;
}

function updateGarageUI(message = "") {
  const canUpgrade = state !== "racing" && state !== "countdown";
  UI.walletBalance.textContent = money.toLocaleString("id-ID");
  UI.speedUpgradeDescription.textContent =
    `Level ${speedUpgradeLevel}/${CONFIG.maxUpgradeLevel} · +${CONFIG.speedPerLevel} km/j, +${CONFIG.accelerationPerLevel} akselerasi`;
  UI.nitroUpgradeDescription.textContent =
    `Level ${nitroUpgradeLevel}/${CONFIG.maxUpgradeLevel} · +${CONFIG.nitroCapacityPerLevel} NOS, +${CONFIG.nitroBoostPerLevel} boost`;
  UI.speedUpgradeButton.disabled =
    !canUpgrade || money < CONFIG.upgradeCost || speedUpgradeLevel >= CONFIG.maxUpgradeLevel;
  UI.nitroUpgradeButton.disabled =
    !canUpgrade || money < CONFIG.upgradeCost || nitroUpgradeLevel >= CONFIG.maxUpgradeLevel;
  UI.garageMessage.textContent = message || (
    canUpgrade
      ? "Saldo dan upgrade direset tiap run."
      : "Upgrade tersedia sebelum atau sesudah balapan."
  );
}

function purchaseUpgrade(type) {
  if (state === "racing" || state === "countdown") {
    updateGarageUI("Upgrade hanya bisa dibeli di luar balapan.");
    return;
  }

  const isSpeedUpgrade = type === "speed";
  const currentLevel = isSpeedUpgrade ? speedUpgradeLevel : nitroUpgradeLevel;
  if (currentLevel >= CONFIG.maxUpgradeLevel) {
    updateGarageUI("Upgrade sudah mencapai level maksimal.");
    return;
  }
  if (money < CONFIG.upgradeCost) {
    updateGarageUI("Uang belum cukup untuk membeli upgrade.");
    return;
  }

  money -= CONFIG.upgradeCost;
  if (isSpeedUpgrade) {
    speedUpgradeLevel += 1;
  } else {
    nitroUpgradeLevel += 1;
  }
  applyUpgrades();
  nitro = CONFIG.nitroCapacity;
  updateDashboard();
  updateGarageUI(`${isSpeedUpgrade ? "Kecepatan" : "Nitro"} berhasil di-upgrade.`);
}

UI.speedUpgradeButton.addEventListener("click", () => purchaseUpgrade("speed"));
UI.nitroUpgradeButton.addEventListener("click", () => purchaseUpgrade("nitro"));

function playSound(audio, restart = false) {
  if (muted) return;
  if (restart) audio.currentTime = 0;
  audio.play().catch(() => {});
}

function updateMuteButton() {
  UI.muteButton.textContent = muted ? "🔇" : "🔊";
  UI.muteButton.setAttribute("aria-label", muted ? "Nyalakan suara" : "Matikan suara");
  sounds.music.muted = muted;
}

UI.muteButton.addEventListener("click", () => {
  muted = !muted;
  updateMuteButton();
  if (!muted && state === "racing") playSound(sounds.music, true);
});

function finishRace(wrecked = false) {
  if (state !== "racing") return;
  state = "finished";
  sounds.music.pause();
  const position = 1 + opponents.filter((opponent) => opponent.distance > distance).length;
  const winner = !wrecked && position === 1;
  UI.resultEyebrow.textContent = wrecked ? "KENDARAAN MENYERAH" : "SAMPAI DI TUJUAN";
  UI.gameOverTitle.textContent = wrecked ? "MOGOK." : winner ? "RAJA JALAN." : "SAMPAI.";
  UI.gameOverText.textContent = wrecked
    ? `Kerusakan ${damage}/3. Jangan biarkan paku menang.`
    : `Posisi ${position} · ${formatTime(elapsed)} · ${Math.round(distance).toLocaleString("id-ID")} meter`;
  UI.gameOverOverlay.classList.add("show");
  playSound(wrecked ? sounds.lose : sounds.finish);
  highScore = Math.max(highScore, Math.floor(distance));
  localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  resetRunState();
  updateDashboard();
  updateGarageUI("Balapan selesai. Saldo dan upgrade direset.");
}

function resetRunState() {
  money = 5000;
  speedUpgradeLevel = 0;
  nitroUpgradeLevel = 0;
  applyUpgrades();
  playerX = laneCenters[1];
  targetLane = 1;
  speed = 0;
  distance = 0;
  nitro = CONFIG.nitroCapacity;
  damage = 0;
  elapsed = 0;
  roadOffset = 0;
  muted = false;
  boostWasActive = false;
  crashCooldown = 0;
  flashRemaining = 0;
  updateMuteButton();
  createOpponents();
  createHazards();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${remaining}`;
}

function showNotice(message, danger = false) {
  UI.raceNotice.textContent = message;
  UI.raceNotice.classList.toggle("danger", danger);
  UI.raceNotice.classList.add("show");
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => UI.raceNotice.classList.remove("show"), 950);
}

function pressed(...names) {
  return names.some((name) => keys.has(name) || touchControls.has(name));
}

function moveLane(direction) {
  if (state !== "racing") return;
  targetLane = Math.max(0, Math.min(CONFIG.laneCount - 1, targetLane + direction));
}

function changeOpponentLane(opponent, targetLane) {
  opponent.laneStart = opponent.lanePosition;
  opponent.targetLane = targetLane;
  opponent.laneChangeElapsed = 0;
  opponent.laneChangeDuration = 1.4 + Math.random() * 0.5;
}

function getLanePosition(x) {
  return Math.max(0, Math.min(
    CONFIG.laneCount - 1,
    (x - CONFIG.roadLeft) / laneWidth - 0.5,
  ));
}

function hitObstacle(message) {
  if (crashCooldown > 0) return;
  crashCooldown = 0.9;
  damage += 1;
  speed = Math.max(45, speed * 0.43);
  flashRemaining = 0.18;
  showNotice(message, true);
  playSound(sounds.crash, true);
  if (damage >= CONFIG.maxDamage) finishRace(true);
}

function update(delta) {
  if (state !== "racing") return;
  const seconds = delta / 1000;
  elapsed += seconds;
  crashCooldown = Math.max(0, crashCooldown - seconds);
  flashRemaining = Math.max(0, flashRemaining - seconds);

  const nitroRequested = pressed("shift", "nitro");
  const boosting = nitroRequested && nitro > 0;
  const boostDuration = boosting
    ? Math.min(seconds, nitro / CONFIG.nitroDrain)
    : 0;
  if (pressed("w", "arrowup", "gas")) {
    speed += CONFIG.acceleration * seconds;
  } else {
    speed -= CONFIG.coastDrag * seconds;
  }
  if (pressed("s", "arrowdown", "brake")) {
    speed -= CONFIG.braking * seconds;
  }
  speed = Math.max(0, Math.min(CONFIG.maxSpeed, speed));

  if (boosting) {
    nitro = Math.max(0, nitro - CONFIG.nitroDrain * seconds);
  } else if (!nitroRequested) {
    nitro = Math.min(CONFIG.nitroCapacity, nitro + CONFIG.nitroRecharge * seconds);
  }
  if (boosting && !boostWasActive) playSound(sounds.boost, true);
  boostWasActive = boosting;

  const targetX = laneCenters[targetLane];
  playerX += (targetX - playerX) * Math.min(1, seconds * 10);

  const travelSpeed = (
    speed * seconds + CONFIG.nitroSpeedBoost * boostDuration
  );
  distance += travelSpeed / 3.6;
  roadOffset = (roadOffset + travelSpeed * 1.65) % 80;
  const playerLanePosition = getLanePosition(playerX);

  for (const opponent of opponents) {
    opponent.distance += opponent.speed * seconds / 3.6;
    opponent.collisionCooldown = Math.max(0, opponent.collisionCooldown - seconds);
    if (opponent.laneChangeDuration > 0) {
      opponent.laneChangeElapsed += seconds;
      const progress = Math.min(1, opponent.laneChangeElapsed / opponent.laneChangeDuration);
      const easedProgress = progress * progress * (3 - 2 * progress);
      opponent.lanePosition = opponent.laneStart +
        (opponent.targetLane - opponent.laneStart) * easedProgress;
      if (progress === 1) {
        opponent.lanePosition = opponent.targetLane;
        opponent.laneChangeDuration = 0;
      }
    } else {
      opponent.changeLaneAt -= seconds;
      if (opponent.changeLaneAt <= 0) {
        const direction = Math.random() < 0.5 ? -1 : 1;
        const nextLane = Math.max(0, Math.min(
          CONFIG.laneCount - 1,
          opponent.targetLane + direction,
        ));
        if (nextLane !== opponent.targetLane) changeOpponentLane(opponent, nextLane);
        opponent.changeLaneAt = 6 + Math.random() * 8;
      }
    }

    if (opponent.collisionCooldown === 0 &&
        Math.abs(opponent.distance - distance) < 17 &&
        Math.abs(opponent.lanePosition - playerLanePosition) < 0.48) {
      const sourceLane = Math.round(opponent.lanePosition);
      const escapeLane = [sourceLane - 1, sourceLane + 1]
        .filter((lane) => lane >= 0 && lane < CONFIG.laneCount)
        .sort((left, right) =>
          Math.abs(right - playerLanePosition) - Math.abs(left - playerLanePosition),
        )[0];
      changeOpponentLane(opponent, escapeLane);
      opponent.collisionCooldown = 1.1;
      if (crashCooldown === 0) hitObstacle("TABRAKAN! HATI-HATI");
      if (state !== "racing") return;
    }
  }

  const currentLane = Math.round(playerLanePosition);
  for (const hazard of hazards) {
    if (!hazard.hit && Math.abs(hazard.distance - distance) < 12 && hazard.lane === currentLane) {
      hazard.hit = true;
      hitObstacle("KENA PAKU! MOBIL MELAMBAT");
      if (state !== "racing") return;
    }
  }

  if (distance >= CONFIG.finishDistance) {
    distance = CONFIG.finishDistance;
    finishRace();
  }
}

function drawBackground() {
  ctx.fillStyle = "#1c251d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = -100 + roadOffset * 1.3; y < canvas.height + 80; y += 122) {
    const markerY = ((y % (canvas.height + 122)) + canvas.height + 122) % (canvas.height + 122) - 70;
    ctx.fillStyle = "#40573c";
    ctx.beginPath();
    ctx.arc(47 + Math.sin(markerY * .035) * 13, markerY, 20, 0, Math.PI * 2);
    ctx.arc(750 + Math.cos(markerY * .03) * 14, markerY + 36, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(231, 220, 184, .5)";
    ctx.fillRect(90, markerY + 17, 26, 3);
    ctx.fillRect(690, markerY + 68, 22, 3);
  }

  ctx.fillStyle = "#292a26";
  ctx.fillRect(CONFIG.roadLeft - 7, 0, CONFIG.roadWidth + 14, canvas.height);

  if (art.road.complete && art.road.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(CONFIG.roadLeft, 0, CONFIG.roadWidth, canvas.height);
    ctx.clip();
    ctx.globalAlpha = 0.74;
    const sourceTop = 118;
    const sourceHeight = 135;
    ctx.drawImage(
      art.road,
      0, sourceTop, art.road.naturalWidth, sourceHeight,
      CONFIG.roadLeft, 0, CONFIG.roadWidth, canvas.height,
    );
    ctx.restore();
  }

  ctx.fillStyle = "rgba(28, 29, 26, .56)";
  ctx.fillRect(CONFIG.roadLeft, 0, CONFIG.roadWidth, canvas.height);

  for (let y = -70 + roadOffset; y < canvas.height + 70; y += 140) {
    const segmentY = ((y % (canvas.height + 140)) + canvas.height + 140) % (canvas.height + 140) - 70;
    ctx.fillStyle = Math.floor((y + roadOffset) / 140) % 2 === 0 ? "#d7d0bc" : "#df6447";
    ctx.fillRect(CONFIG.roadLeft - 7, segmentY, 7, 70);
    ctx.fillRect(CONFIG.roadLeft + CONFIG.roadWidth, segmentY, 7, 70);
  }

  for (let lane = 1; lane < CONFIG.laneCount; lane++) {
    const x = CONFIG.roadLeft + laneWidth * lane;
    ctx.fillStyle = "rgba(229, 224, 206, .64)";
    for (let y = -76 + roadOffset; y < canvas.height; y += 76) {
      ctx.fillRect(x - 1.5, y, 3, 38);
    }
  }

  const shade = ctx.createLinearGradient(0, 0, canvas.width, 0);
  shade.addColorStop(0, "rgba(0,0,0,.24)");
  shade.addColorStop(.18, "rgba(0,0,0,0)");
  shade.addColorStop(.82, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.24)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCar(x, y, tint = "none", isPlayer = false) {
  const width = isPlayer ? CONFIG.carWidth : CONFIG.carWidth - 3;
  const height = isPlayer ? CONFIG.carHeight : CONFIG.carHeight - 4;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(0, 0, 0, .4)";
  ctx.beginPath();
  ctx.ellipse(2, 9, width * .58, height * .47, 0, 0, Math.PI * 2);
  ctx.fill();

  if (art.playerCar.complete && art.playerCar.naturalWidth) {
    ctx.filter = tint;
    ctx.shadowColor = isPlayer ? "#70d5ff" : "transparent";
    ctx.shadowBlur = isPlayer ? 12 : 0;
    ctx.drawImage(art.playerCar, -width / 2, -height / 2, width, height);
  } else {
    ctx.fillStyle = isPlayer ? "#1688e8" : "#e54738";
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }
  ctx.restore();
}

function drawHazard(hazard) {
  const remaining = hazard.distance - distance;
  const y = CONFIG.playerY - remaining * CONFIG.distanceScale;
  if (y < -90 || y > canvas.height + 90) return;
  const x = laneCenters[hazard.lane];

  ctx.save();
  ctx.globalAlpha = 0.9;
  if (art.spikes.complete && art.spikes.naturalWidth) {
    ctx.drawImage(art.spikes, x - 45, y - 28, 90, 56);
  } else {
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(x - 40, y - 8, 80, 16);
  }
  ctx.restore();
}

function drawFinishLine() {
  const remaining = CONFIG.finishDistance - distance;
  if (remaining > 900) return;
  const y = CONFIG.playerY - remaining * CONFIG.distanceScale;
  if (y < -35 || y > canvas.height + 15) return;
  const square = 16;
  for (let x = CONFIG.roadLeft; x < CONFIG.roadLeft + CONFIG.roadWidth; x += square) {
    const column = Math.floor((x - CONFIG.roadLeft) / square);
    ctx.fillStyle = column % 2 === 0 ? "#eee8d8" : "#1a1b18";
    ctx.fillRect(x, y, square, 15);
    ctx.fillStyle = column % 2 === 0 ? "#1a1b18" : "#eee8d8";
    ctx.fillRect(x, y + 15, square, 15);
  }
}

function draw() {
  drawBackground();
  drawFinishLine();

  for (const hazard of hazards) {
    if (!hazard.hit) drawHazard(hazard);
  }

  for (const opponent of opponents) {
    const gap = opponent.distance - distance;
    const y = CONFIG.playerY - gap * CONFIG.distanceScale;
    if (y < -130 || y > canvas.height + 130) continue;
    drawCar(laneCenters[0] + laneWidth * opponent.lanePosition, y, opponent.tint);
  }

  const boosting = pressed("shift", "nitro") && nitro > 0 && state === "racing";
  if (boosting) {
    const flameLength = 28 + Math.random() * 24;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "#ffb249";
    ctx.beginPath();
    ctx.moveTo(playerX - 11, CONFIG.playerY + 40);
    ctx.lineTo(playerX, CONFIG.playerY + 50 + flameLength);
    ctx.lineTo(playerX + 11, CONFIG.playerY + 40);
    ctx.fill();
    ctx.fillStyle = "#efff88";
    ctx.beginPath();
    ctx.moveTo(playerX - 5, CONFIG.playerY + 42);
    ctx.lineTo(playerX, CONFIG.playerY + 47 + flameLength * .65);
    ctx.lineTo(playerX + 5, CONFIG.playerY + 42);
    ctx.fill();
    ctx.restore();
  }

  if (flashRemaining > 0 && Math.floor(flashRemaining * 35) % 2 === 0) {
    ctx.fillStyle = "rgba(255, 88, 52, .23)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawCar(playerX, CONFIG.playerY, "none", true);
  updateDashboard();
}

function updateDashboard() {
  const traveled = Math.min(CONFIG.finishDistance, Math.floor(distance));
  const progress = traveled / CONFIG.finishDistance;
  const position = state === "finished"
    ? 1
    : 1 + opponents.filter((opponent) => opponent.distance > distance).length;
  UI.racePosition.textContent = String(position);
  UI.playerSpeed.textContent = String(Math.round(speed + (
    pressed("shift", "nitro") && nitro > 0 ? CONFIG.nitroSpeedBoost : 0
  )));
  UI.speedFill.style.width = `${Math.min(100, speed / CONFIG.maxSpeed * 100)}%`;
  UI.highScoreValue.textContent = `${highScore.toLocaleString("id-ID")} M`;
  UI.distanceLabel.textContent = `${traveled.toLocaleString("id-ID")} / 1.800 M`;
  UI.distanceFill.style.width = `${progress * 100}%`;
  const nitroPercent = nitro > 0
    ? Math.max(1, Math.ceil(nitro / CONFIG.nitroCapacity * 100))
    : 0;
  UI.nitroLabel.textContent = `${nitroPercent}%`;
  UI.nitroFill.style.width = `${nitroPercent}%`;
  UI.overtakeCount.textContent = String(opponents.filter((opponent) => opponent.distance < distance).length);
  UI.damageCount.textContent = `${damage} / ${CONFIG.maxDamage}`;
}

function gameLoop(timestamp) {
  const delta = Math.min(timestamp - (lastFrame || timestamp), 40);
  lastFrame = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

UI.startButton.addEventListener("click", startGame);
UI.restartButton.addEventListener("click", startGame);
UI.garageButton.addEventListener("click", () => {
  UI.gameOverOverlay.classList.remove("show");
  UI.startScreen.querySelector("h2").textContent = "Siapkan mobilmu";
  UI.startScreen.querySelector(".overlay-card > p:not(.overlay-label)").textContent =
    "Upgrade mobil di garasi, lalu mulai balapan berikutnya.";
  UI.startScreen.classList.add("show");
  UI.garage.scrollIntoView({ behavior: "smooth", block: "center" });
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }
  if (!keys.has(key) && (key === "a" || key === "arrowleft")) moveLane(-1);
  if (!keys.has(key) && (key === "d" || key === "arrowright")) moveLane(1);
  keys.add(key);
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touchControls.clear();
  document.querySelectorAll(".touch-control.active").forEach((button) => button.classList.remove("active"));
});

document.querySelectorAll(".touch-control").forEach((button) => {
  const control = button.dataset.control;
  const release = (event) => {
    event.preventDefault();
    touchControls.delete(control);
    button.classList.remove("active");
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchControls.add(control);
    button.classList.add("active");
    if (control === "left") moveLane(-1);
    if (control === "right") moveLane(1);
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

requestAnimationFrame(gameLoop);
