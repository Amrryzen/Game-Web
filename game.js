const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 45, y: 430, w: 10, h: 40, color: "green"
};

const enemy = {
  x: 420, y: 400, w: 30, h: 70, color: "red"
};

ctx.fillStyle = player.color;
ctx.fillRect(player.x, player.y, player.w, player.h);

ctx.fillStyle = enemy.color;
ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);