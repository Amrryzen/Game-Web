const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CONFIG = {
  maxTrails: 15,
  trailColor: "0, 150, 255",
  dangerMessageDuration: 800,
  scorePerCoin: 10,
  coinPickupDuration: 450,
  respawnAnimationDuration: 500,
};

const UI = {
  posX: document.getElementById("posX"),
  posY: document.getElementById("posY"),
  color: document.getElementById("playerColor"),
  size: document.getElementById("playerSize"),
  speed: document.getElementById("playerSpeed"),
  score: document.getElementById("score"),
  dangerMessage: document.getElementById("dangerMessage"),
};

const player = { x: 100, y: 100, w: 20, h: 80, speed: 5, color: "white" };
const startX = player.x;
const startY = player.y;

const coins = [
  { x: 400, y: 250, w: 24, h: 24, color: "gold" },
  { x: 150, y: 350, w: 16, h: 16, color: "orange" },
  { x: 650, y: 100, w: 30, h: 30, color: "#ffe066" },
];

const hazards = [
  { x: 300, y: 100, w: 26, h: 26, color: "red" },
  { x: 550, y: 380, w: 26, h: 26, color: "red" },
];

const trails = [];
const keys = {};
const coinEffects = [];

let dangerTimeout = null;
let lastState = { x: -1, y: -1 };
let score = 0;
let playerRespawnElapsed = CONFIG.respawnAnimationDuration;

function initUI() {
  UI.color.textContent = player.color;
  UI.size.textContent = `${player.w}x${player.h}`;
  UI.speed.textContent = player.speed;
  UI.score.textContent = score;
}

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

const resetPlayer = () => {
  player.x = startX;
  player.y = startY;
  trails.length = 0;
  playerRespawnElapsed = 0;
};

const showDangerMessage = () => {
  UI.dangerMessage.classList.add("show");
  clearTimeout(dangerTimeout);
  dangerTimeout = setTimeout(() => {
    UI.dangerMessage.classList.remove("show");
  }, CONFIG.dangerMessageDuration);
};

function handleMovement() {
  let isMoving = false;

  if (keys["d"] || keys["arrowright"]) { player.x += player.speed; isMoving = true; }
  if (keys["a"] || keys["arrowleft"]) { player.x -= player.speed; isMoving = true; }
  if (keys["w"] || keys["arrowup"]) { player.y -= player.speed; isMoving = true; }
  if (keys["s"] || keys["arrowdown"]) { player.y += player.speed; isMoving = true; }

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

  return isMoving;
}

function checkCoinCollisions() {
  coins.forEach((coin) => {
    if (checkCollision(player, coin)) {
      score += CONFIG.scorePerCoin;
      createCoinEffect(coin);
      respawnObject(coin);
    }
  });
}

function createCoinEffect(coin) {
  const particleCount = 10;
  const centerX = coin.x + coin.w / 2;
  const centerY = coin.y + coin.h / 2;

  coinEffects.push({
    x: centerX,
    y: centerY,
    color: coin.color,
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

function checkHazardCollisions() {
  hazards.some((hazard) => {
    if (checkCollision(player, hazard)) {
      showDangerMessage();
      resetPlayer();
      return true;
    }
    return false;
  });
}

function update(deltaTime) {
  playerRespawnElapsed = Math.min(
    CONFIG.respawnAnimationDuration,
    playerRespawnElapsed + deltaTime,
  );

  const isMoving = handleMovement();

  if (isMoving) {
    trails.push({ x: player.x, y: player.y });
    if (trails.length > CONFIG.maxTrails) trails.shift();
  } else if (trails.length > 0) {
    trails.shift();
  }

  checkCoinCollisions();
  checkHazardCollisions();
  updateCoinEffects(deltaTime);
}

function updateCoinEffects(deltaTime) {
  for (let i = coinEffects.length - 1; i >= 0; i--) {
    const effect = coinEffects[i];
    effect.age += deltaTime;
    effect.particles.forEach((particle) => {
      particle.x += particle.vx * deltaTime / 16;
      particle.y += particle.vy * deltaTime / 16;
    });

    if (effect.age >= CONFIG.coinPickupDuration) {
      coinEffects.splice(i, 1);
    }
  }
}

function updateDOM() {
  const currentX = Math.round(player.x);
  const currentY = Math.round(player.y);

  if (lastState.x !== currentX) { UI.posX.textContent = currentX; lastState.x = currentX; }
  if (lastState.y !== currentY) { UI.posY.textContent = currentY; lastState.y = currentY; }
  UI.score.textContent = score;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const tLen = trails.length;
  for (let i = 0; i < tLen; i++) {
    const ratio = (i + 1) / tLen;
    const tWidth = player.w * ratio;
    const tHeight = player.h * ratio;
    const tX = trails[i].x + (player.w - tWidth) / 2;
    const tY = trails[i].y + (player.h - tHeight) / 2;

    ctx.fillStyle = `rgba(${CONFIG.trailColor}, ${ratio * 0.4})`;
    ctx.fillRect(tX, tY, tWidth, tHeight);
  }

  coins.forEach((coin) => {
    ctx.fillStyle = coin.color;
    ctx.beginPath();
    ctx.arc(coin.x + coin.w / 2, coin.y + coin.h / 2, coin.w / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  coinEffects.forEach((effect) => {
    const progress = effect.age / CONFIG.coinPickupDuration;
    const alpha = 1 - progress;
    const radius = 10 + progress * 26;

    ctx.strokeStyle = `rgba(255, 224, 102, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    effect.particles.forEach((particle) => {
      ctx.fillStyle = `rgba(255, 224, 102, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3 * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  hazards.forEach((hazard) => {
    ctx.fillStyle = hazard.color;
    ctx.beginPath();
    ctx.moveTo(hazard.x + hazard.w / 2, hazard.y);
    ctx.lineTo(hazard.x + hazard.w, hazard.y + hazard.h);
    ctx.lineTo(hazard.x, hazard.y + hazard.h);
    ctx.closePath();
    ctx.fill();
  });

  const respawnProgress = playerRespawnElapsed / CONFIG.respawnAnimationDuration;
  const playerScale = 1 - 0.7 * Math.sin(respawnProgress * Math.PI);
  const scaledWidth = player.w * playerScale;
  const scaledHeight = player.h * playerScale;
  const scaledX = player.x + (player.w - scaledWidth) / 2;
  const scaledY = player.y + (player.h - scaledHeight) / 2;

  ctx.fillStyle = player.color;
  ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);

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