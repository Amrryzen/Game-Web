const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 100, y: 100, w: 20, h: 60, speed: 1, color: "white"
};

const trails = [];
const maxTrails = 15;
const keysPressed = {};

document.addEventListener("keydown", function (event) {
  keysPressed[event.key] = true;
});

document.addEventListener("keyup", function (event) {
  keysPressed[event.key] = false;
});

window.addEventListener("blur", function () {
  Object.keys(keysPressed).forEach(function (key) {
    keysPressed[key] = false;
  });
});

function update() {
  let isMoving = false;

  if (keysPressed["d"] || keysPressed["D"]) { player.x += player.speed; isMoving = true; }
  if (keysPressed["a"] || keysPressed["A"]) { player.x -= player.speed; isMoving = true; }
  if (keysPressed["w"] || keysPressed["W"]) { player.y -= player.speed; isMoving = true; }
  if (keysPressed["s"] || keysPressed["S"]) { player.y += player.speed; isMoving = true; }

  if (player.x < 0) player.x = 0;
  if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
  if (player.y < 0) player.y = 0;
  if (player.y + player.h > canvas.height) player.y = canvas.height - player.h;

  if (isMoving) {
    trails.push({ x: player.x, y: player.y });
  } else if (trails.length > 0) {
    trails.shift();
  }
  if (trails.length > maxTrails) {
    trails.shift();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < trails.length; i++) {
  let ratio = (i + 1) / trails.length;

    let opacity = ratio * 0.4;
    let sizeDecrease = ratio;

    let trailWidth = player.w * sizeDecrease;
    let trailHeight = player.h * sizeDecrease;

    let trailX = trails[i].x + (player.w - trailWidth) / 2;
    let trailY = trails[i].y + (player.h - trailHeight) / 2;

    ctx.fillStyle = `rgba(0, 150, 255, ${opacity})`;
    ctx.fillRect(trailX, trailY, trailWidth, trailHeight);
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  document.getElementById("posX").textContent = Math.round(player.x);
  document.getElementById("posY").textContent = Math.round(player.y);
  document.getElementById("playerColor").textContent = player.color;
  document.getElementById("playerSize").textContent = player.w + "x" + player.h;
  document.getElementById("playerSpeed").textContent = player.speed;
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();