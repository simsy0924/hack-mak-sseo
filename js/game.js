const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hpText = document.getElementById("hp");
const detectionText = document.getElementById("detection");
const barFill = document.getElementById("bar-fill");
const logText = document.getElementById("log");

let width = 0;
let height = 0;

const player = {
  x: 180,
  y: 360,
  size: 34,
  speed: 5,
  hp: 5,
  invincibleUntil: 0,
};

let targetX = player.x;
let targetY = player.y;

let detection = 0;
let timeStopped = false;
let overflowReady = false;

let lastShotTime = 0;
const shootCooldown = 350;

const enemies = [];
const enemyBullets = [];
const playerBullets = [];

let wave = 1;
let nextWaveLoading = false;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  player.x = width / 2;
  player.y = height / 2;
  targetX = player.x;
  targetY = player.y;
}

window.addEventListener("resize", resize);
resize();

function startGame() {
  player.hp = 5;
  detection = 0;
  wave = 1;
  nextWaveLoading = false;

  enemyBullets.length = 0;
  playerBullets.length = 0;
  enemies.length = 0;

  spawnWave();
  spawnEnemyBullets();

  log("핵 막 써 - 시작");
  updateHud();
}

function spawnWave() {
  enemies.length = 0;

  const enemyCount = 3 + wave;

  for (let i = 0; i < enemyCount; i++) {
    enemies.push({
      x: 40 + Math.random() * (width - 80),
      y: 120 + Math.random() * (height - 220),
      r: 20,
      hp: 3 + Math.floor(wave / 2),
      speed: 0.5 + wave * 0.08,
    });
  }

  log(`Wave ${wave} 시작!`);
}

function spawnEnemyBullets() {
  enemyBullets.length = 0;

  const bulletCount = 3 + wave;

  for (let i = 0; i < bulletCount; i++) {
    enemyBullets.push({
      x: Math.random() * width,
      y: 120 + Math.random() * (height - 180),
      vx: randomSpeed(),
      vy: randomSpeed(),
      r: 6,
    });
  }
}

function randomSpeed() {
  const speed = 0.8 + Math.random() * 1.6;
  return Math.random() < 0.5 ? -speed : speed;
}

canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });

function handleTouch(e) {
  e.preventDefault();

  const touch = e.touches[0];
  targetX = touch.clientX;
  targetY = touch.clientY;
}

document.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    useHack(button.dataset.hack);
  });
});

function useHack(hack) {
  if (hack === "bulletDelete") {
    enemyBullets.length = 0;
    addDetection(15);
    log("BULLET_DELETE 사용: 적 탄환 삭제");
  }

  if (hack === "timeStop") {
    timeStopped = true;
    addDetection(25);
    log("TIME_STOP 사용: 적 정지");

    setTimeout(() => {
      timeStopped = false;
      log("시간 정지 종료");
    }, 2000);
  }

  if (hack === "overflow") {
    overflowReady = true;
    addDetection(30);
    log("DAMAGE_OVERFLOW 준비: 다음 공격 10배");
  }
}

function addDetection(amount) {
  detection = Math.min(100, detection + amount);
  updateHud();

  if (detection >= 100) {
    log("ANTI-CHEAT DETECTED!");
    document.body.style.background = "#450a0a";
  }
}

function updateHud() {
  hpText.textContent = player.hp;
  detectionText.textContent = detection;
  barFill.style.width = detection + "%";

  if (detection >= 100) {
    barFill.style.background = "#ef4444";
  } else if (detection >= 60) {
    barFill.style.background = "#f97316";
  } else {
    barFill.style.background = "#22c55e";
  }
}

function log(message) {
  logText.textContent = message;
}

function damagePlayer(amount) {
  const now = performance.now();

  if (now < player.invincibleUntil) return;

  player.hp -= amount;
  player.invincibleUntil = now + 700;

  updateHud();

  if (player.hp <= 0) {
    log("사망! 재시작!");
    startGame();
  }
}

function findNearestEnemy() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const enemy of enemies) {
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    if (distance < nearestDistance) {
      nearest = enemy;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function autoShoot() {
  const now = performance.now();

  if (now - lastShotTime < shootCooldown) return;
  if (enemies.length === 0) return;

  const target = findNearestEnemy();
  if (!target) return;

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) return;

  const damage = overflowReady ? 10 : 1;

  playerBullets.push({
    x: player.x,
    y: player.y,
    vx: (dx / distance) * 7,
    vy: (dy / distance) * 7,
    r: overflowReady ? 9 : 5,
    damage,
  });

  if (overflowReady) {
    overflowReady = false;
    log("DAMAGE_OVERFLOW 발사!");
  }

  lastShotTime = now;
}

function updatePlayerMovement() {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 4) {
    player.x += (dx / distance) * player.speed;
    player.y += (dy / distance) * player.speed;
  }

  player.x = Math.max(player.size / 2, Math.min(width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(height - player.size / 2, player.y));
}

function updateEnemies() {
  if (timeStopped) return;

  for (const enemy of enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    }

    if (distance < player.size / 2 + enemy.r) {
      damagePlayer(1);

      enemy.x = Math.random() * width;
      enemy.y = 120 + Math.random() * (height - 180);
    }
  }
}

function updateEnemyBullets() {
  if (timeStopped) return;

  for (const bullet of enemyBullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (bullet.x < 0 || bullet.x > width) bullet.vx *= -1;
    if (bullet.y < 0 || bullet.y > height) bullet.vy *= -1;

    const hitDistance = Math.hypot(player.x - bullet.x, player.y - bullet.y);

    if (hitDistance < player.size / 2 + bullet.r) {
      damagePlayer(1);

      bullet.x = Math.random() * width;
      bullet.y = 120 + Math.random() * (height - 180);
    }
  }
}

function updatePlayerBullets() {
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const bullet = playerBullets[i];

    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (
      bullet.x < -20 ||
      bullet.x > width + 20 ||
      bullet.y < -20 ||
      bullet.y > height + 20
    ) {
      playerBullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const distance = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);

      if (distance < bullet.r + enemy.r) {
        enemy.hp -= bullet.damage;
        playerBullets.splice(i, 1);

        if (enemy.hp <= 0) {
          enemies.splice(j, 1);
          log("적 제거!");
        }

        break;
      }
    }
  }

  if (enemies.length === 0 && !nextWaveLoading) {
    nextWaveLoading = true;
    log("방 클리어! 다음 Wave 준비...");

    setTimeout(() => {
      wave += 1;
      spawnWave();
      spawnEnemyBullets();
      nextWaveLoading = false;
    }, 1200);
  }
}

function update() {
  updatePlayerMovement();
  autoShoot();
  updatePlayerBullets();
  updateEnemies();
  updateEnemyBullets();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  drawGrid();
  drawEnemies();
  drawEnemyBullets();
  drawPlayerBullets();
  drawPlayer();
  drawDetectionEffect();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
    ctx.fillStyle = timeStopped ? "#94a3b8" : "#ef4444";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(enemy.hp, enemy.x, enemy.y + 4);
  }
}

function drawEnemyBullets() {
  for (const bullet of enemyBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
  }
}

function drawPlayerBullets() {
  for (const bullet of playerBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fillStyle = bullet.damage >= 10 ? "#f0abfc" : "#22d3ee";
    ctx.fill();
  }
}

function drawPlayer() {
  const now = performance.now();
  const isInvincible = now < player.invincibleUntil;

  if (isInvincible && Math.floor(now / 80) % 2 === 0) {
    return;
  }

  ctx.fillStyle = overflowReady ? "#f0abfc" : "#22d3ee";
  ctx.fillRect(
    player.x - player.size / 2,
    player.y - player.size / 2,
    player.size,
    player.size
  );
}

function drawDetectionEffect() {
  if (detection < 60) return;

  ctx.fillStyle =
    detection >= 100
      ? "rgba(239, 68, 68, 0.16)"
      : "rgba(249, 115, 22, 0.08)";

  ctx.fillRect(0, 0, width, height);

  if (detection >= 100) {
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ANTI-CHEAT", width / 2, height / 2 - 60);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

startGame();
loop();