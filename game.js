const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 100,
  y: 100,
  w: 20,
  h: 80,
  speed: 5,
  color: "white"
};

const startX = player.x;
const startY = player.y;

const coins = [
  { x: 400, y: 250, w: 24, h: 24, color: "gold" },
  { x: 150, y: 350, w: 16, h: 16, color: "orange" },
  { x: 650, y: 100, w: 30, h: 30, color: "#ffe066" }
];

const hazards = [
  { x: 300, y: 100, w: 26, h: 26, color: "red" },
  { x: 550, y: 380, w: 26, h: 26, color: "red" }
];

const keys = {};
const trails = [];
const coinEffects = [];

let score = 0;
let timeLeft = 30;
let gameOver = false;
let timer;
let dangerTimeout;

let respawnTime = 500;
let respawnElapsed = respawnTime;

const maxTrail = 15;
const coinScore = 5;
const winScore = 100;

const posX = document.getElementById("posX");
const posY = document.getElementById("posY");
const playerColor = document.getElementById("playerColor");
const playerSize = document.getElementById("playerSize");
const playerSpeed = document.getElementById("playerSpeed");
const scoreText = document.getElementById("score");
const timeText = document.getElementById("timeLeft");

const dangerMessage = document.getElementById("dangerMessage");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverText = document.getElementById("gameOverText");
const restartButton = document.getElementById("restartButton");

function initUI() {
  playerColor.textContent = player.color;
  playerSize.textContent = player.w + "x" + player.h;
  playerSpeed.textContent = player.speed;
  scoreText.textContent = score;
  timeText.textContent = timeLeft;
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(function () {
    if (gameOver) return;
    timeLeft--;
    timeText.textContent = timeLeft;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame(score >= winScore);
    }
  }, 1000);
}

function endGame(win) {
  gameOver = true;
  gameOverOverlay.classList.add("show");
  if (win) {
    gameOverOverlay.classList.add("win");
    gameOverOverlay.classList.remove("lose");
    gameOverTitle.textContent = "Menang!";
    gameOverText.textContent = "Skor akhir: " + score;
  } else {
    gameOverOverlay.classList.add("lose");
    gameOverOverlay.classList.remove("win");
    gameOverTitle.textContent = "Game Over";
    gameOverText.textContent = "Waktu habis! Skor akhir: " + score;
  }
}

function restartGame() {
  score = 0;
  timeLeft = 30;
  gameOver = false;
  resetPlayer();
  coinEffects.length = 0;
  gameOverOverlay.classList.remove("show", "win", "lose");
  scoreText.textContent = score;
  timeText.textContent = timeLeft;
  startTimer();
}

restartButton.addEventListener("click", restartGame);

window.addEventListener("keydown", function (e) {
  if (e.key.startsWith("Arrow")) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", function (e) {
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener("blur", function () {
  for (let key in keys) keys[key] = false;
});

function collision(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function resetPlayer() {
  player.x = startX;
  player.y = startY;
  trails.length = 0;
  respawnElapsed = 0;
}

function randomPosition(obj) {
  obj.x = Math.random() * (canvas.width - obj.w);
  obj.y = Math.random() * (canvas.height - obj.h);
}

function showDanger() {
  dangerMessage.classList.add("show");
  clearTimeout(dangerTimeout);
  dangerTimeout = setTimeout(function () {
    dangerMessage.classList.remove("show");
  }, 800);
}

function movePlayer() {
  if (gameOver) return false;
  let moving = false;

  if (keys["d"] || keys["arrowright"]) {
    player.x += player.speed;
    moving = true;
  }

  if (keys["a"] || keys["arrowleft"]) {
    player.x -= player.speed;
    moving = true;
  }

  if (keys["w"] || keys["arrowup"]) {
    player.y -= player.speed;
    moving = true;
  }

  if (keys["s"] || keys["arrowdown"]) {
    player.y += player.speed;
    moving = true;
  }

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  return moving;
}

function checkCoins() {
  if (gameOver) return;
  coins.forEach(function (coin) {
    if (collision(player, coin)) {
      score += coinScore;
      makeCoinEffect(coin);
      randomPosition(coin);
      if (score >= winScore) {
        endGame(true);
      }
    }
  });
}

function makeCoinEffect(coin) {
  let centerX = coin.x + coin.w / 2;
  let centerY = coin.y + coin.h / 2;
  let particles = [];
  for (let i = 0; i < 10; i++) {
    let angle = Math.PI * 2 * i / 10;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * (1.2 + Math.random() * 1.2),
      vy: Math.sin(angle) * (1.2 + Math.random() * 1.2)
    });
  }

  coinEffects.push({
    x: centerX,
    y: centerY,
    age: 0,
    particles: particles
  });
}

function checkHazards() {
  if (gameOver) return;
  hazards.forEach(function (hazard) {
    if (collision(player, hazard)) {
      showDanger();
      resetPlayer();
    }
  });
}

function updateCoinEffects(deltaTime) {
  for (let i = coinEffects.length - 1; i >= 0; i--) {
    let effect = coinEffects[i];
    effect.age += deltaTime;
    effect.particles.forEach(function (particle) {
      particle.x += particle.vx * deltaTime / 16;
      particle.y += particle.vy * deltaTime / 16;
    });
    if (effect.age >= 450) {
      coinEffects.splice(i, 1);
    }
  }
}

function update(deltaTime) {
  respawnElapsed = Math.min(respawnTime, respawnElapsed + deltaTime);
  let moving = movePlayer();
  if (moving) {
    trails.push({
      x: player.x,
      y: player.y
    });
    if (trails.length > maxTrail) trails.shift();
  } else if (trails.length > 0) {
    trails.shift();
  }
  checkCoins();
  checkHazards();
  updateCoinEffects(deltaTime);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < trails.length; i++) {
    let ratio = (i + 1) / trails.length;
    let width = player.w * ratio;
    let height = player.h * ratio;
    let x = trails[i].x + (player.w - width) / 2;
    let y = trails[i].y + (player.h - height) / 2;

    ctx.fillStyle = `rgba(0, 150, 255, ${ratio * 0.4})`;
    ctx.fillRect(x, y, width, height);
  }

  coins.forEach(function (coin) {
    ctx.fillStyle = coin.color;
    ctx.beginPath();
    ctx.arc(
      coin.x + coin.w / 2,
      coin.y + coin.h / 2,
      coin.w / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });

  coinEffects.forEach(function (effect) {
    let progress = effect.age / 450;
    let alpha = 1 - progress;
    let radius = 10 + progress * 26;

    ctx.strokeStyle = `rgba(255, 224, 102, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    effect.particles.forEach(function (particle) {
      ctx.fillStyle = `rgba(255, 224, 102, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3 * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  hazards.forEach(function (hazard) {
    ctx.fillStyle = hazard.color;
    ctx.beginPath();
    ctx.moveTo(hazard.x + hazard.w / 2, hazard.y);
    ctx.lineTo(hazard.x + hazard.w, hazard.y + hazard.h);
    ctx.lineTo(hazard.x, hazard.y + hazard.h);
    ctx.closePath();
    ctx.fill();
  });

  let progress = respawnElapsed / respawnTime;
  let scale = 1 - 0.7 * Math.sin(progress * Math.PI);
  let width = player.w * scale;
  let height = player.h * scale;
  let x = player.x + (player.w - width) / 2;
  let y = player.y + (player.h - height) / 2;

  ctx.fillStyle = player.color;
  ctx.fillRect(x, y, width, height);

  posX.textContent = Math.round(player.x);
  posY.textContent = Math.round(player.y);
  scoreText.textContent = score;
}

function gameLoop(timestamp) {
  let deltaTime = timestamp - (gameLoop.lastTime || timestamp);
  if (deltaTime > 50) deltaTime = 50;
  gameLoop.lastTime = timestamp;
  update(deltaTime);
  draw();
  requestAnimationFrame(gameLoop);
}

initUI();
startTimer();
requestAnimationFrame(gameLoop);