const GAME_CONFIG = {
  canvas: { width: 1200, height: 400 },
  ground: { height: 50 },
  gravity: 0.8,
  jumpPower: -9,
  doubleJumpPower: -11,
  slideHeight: 30,
  baseSpeed: 5,
  speedIncrease: 0.001,
  speedBoostInterval: 15000,
  speedBoostAmount: 0.3,
  obstacleMinDistance: 200,
  obstacleMaxDistance: 400,
};

const PLAYER_COLORS = ["#FF6347", "#4CAF50", "#2196F3", "#FF9800"];
let PLAYER_KEYS = [
  { jump: "Space", slide: "ArrowDown" },
  { jump: "KeyW", slide: "KeyS" },
  { jump: "KeyI", slide: "KeyK" },
  { jump: "Numpad8", slide: "Numpad2" },
];

let isChangingKey = null;
let gameState = {
  screen: "menu",
  players: 1,
  mode: "score",
  speedMultiplier: 1,
  score: 0,
  distance: 0,
  gameSpeed: GAME_CONFIG.baseSpeed,
  isPaused: false,
  gameStartTime: 0,
  lastSpeedBoost: 0,
  speedBoostCount: 0,
};

let canvas, ctx;
let players = [];
let gameLoop;

function updateCanvasSize() {
  const heightPerPlayer = 350;
  const newHeight = heightPerPlayer * gameState.players;
  GAME_CONFIG.canvas.height = newHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = GAME_CONFIG.canvas.width * ratio;
  canvas.height = newHeight * ratio;
  canvas.style.width = GAME_CONFIG.canvas.width + "px";
  canvas.style.height = newHeight + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(ratio, ratio);
}

class Player {
  constructor(index) {
    this.index = index;
    this.gameAreaHeight = GAME_CONFIG.canvas.height / gameState.players;
    this.gameAreaY = index * this.gameAreaHeight;
    this.x = 80;
    this.groundY =
      this.gameAreaY + this.gameAreaHeight - GAME_CONFIG.ground.height - 50;
    this.y = this.groundY;
    this.width = 40;
    this.height = 50;
    this.velocityY = 0;
    this.isJumping = false;
    this.canDoubleJump = false;
    this.isSliding = false;
    this.isAlive = true;
    this.color = PLAYER_COLORS[index];
    this.distance = 0;
    this.keys = PLAYER_KEYS[index];
    this.obstacles = [];
  }

  update() {
    if (this.isJumping) {
      this.velocityY += GAME_CONFIG.gravity;
      this.y += this.velocityY;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.velocityY = 0;
        this.isJumping = false;
        this.canDoubleJump = false;
      }
    } else {
      if (this.isSliding) {
        this.height = GAME_CONFIG.slideHeight;
        this.y = this.groundY + (50 - GAME_CONFIG.slideHeight);
      } else {
        this.height = 50;
        this.y = this.groundY;
      }
    }

    const topBound = this.gameAreaY;
    const bottomBound = this.gameAreaY + this.gameAreaHeight - this.height;
    this.y = Math.min(Math.max(this.y, topBound), bottomBound);

    if (this.isAlive) {
      this.distance += gameState.gameSpeed * gameState.speedMultiplier;
    }
  }

  jump() {
    if (!this.isAlive) return;
    if (!this.isJumping) {
      this.isJumping = true;
      this.velocityY = GAME_CONFIG.jumpPower;
      this.canDoubleJump = true;
      this.isSliding = false;
    } else if (this.canDoubleJump) {
      this.velocityY = GAME_CONFIG.doubleJumpPower;
      this.canDoubleJump = false;
    }
  }

  startSlide() {
    if (this.isAlive) this.isSliding = true;
  }

  stopSlide() {
    this.isSliding = false;
  }

  getHitbox() {
    return {
      x: this.x + 5,
      y: this.y + 5,
      width: this.width - 10,
      height: this.height - 10,
    };
  }
}
class Obstacle {
  constructor(x, type = "cactus", playerIndex = 0) {
    this.x = x;
    this.type = type;
    this.playerIndex = playerIndex;

    const gameAreaHeight = GAME_CONFIG.canvas.height / gameState.players;
    const gameAreaY = playerIndex * gameAreaHeight;
    const groundY = gameAreaY + gameAreaHeight - GAME_CONFIG.ground.height;

    if (type === "bird") {
      this.width = 40;
      this.height = 20;
      this.y = groundY - 60;
      this.color = "#8B4513";
    } else if (type === "lowCactus") {
      this.width = 30;
      this.height = 20;
      this.y = groundY - this.height;
      this.color = "#32CD32";
    } else {
      this.width = 20;
      this.height = 80;
      this.y = groundY - this.height;
      this.color = "#228B22";
    }
  }

  update() {
    this.x -= gameState.gameSpeed * gameState.speedMultiplier;
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function checkCollisions() {
  for (let player of players) {
    if (!player.isAlive) continue;
    const playerBox = player.getHitbox();

    for (let obstacle of player.obstacles) {
      const obsBox = obstacle.getHitbox();
      const isCollision =
        playerBox.x < obsBox.x + obsBox.width &&
        playerBox.x + playerBox.width > obsBox.x &&
        playerBox.y < obsBox.y + obsBox.height &&
        playerBox.y + playerBox.height > obsBox.y;

      if (!isCollision) continue;

      const type = obstacle.type;
      const canAvoid =
        (type === "cactus" && !player.canDoubleJump) ||
        (type === "lowCactus" && (player.isJumping || player.canDoubleJump)) ||
        (type === "bird" &&
          (player.canDoubleJump === false || player.isSliding));

      if (!canAvoid) {
        player.isAlive = false;
        if (gameState.mode === "score") {
          endGame();
          return;
        }
      }
    }
  }

  if (gameState.mode === "battle") {
    const alive = players.filter((p) => p.isAlive);
    if (alive.length === 0) endGame();
  }
}

function spawnObstacles() {
  for (let player of players) {
    if (!player.isAlive) continue;

    const last = player.obstacles[player.obstacles.length - 1];
    const spawnX = GAME_CONFIG.canvas.width;

    if (
      !last ||
      spawnX - last.x >
        GAME_CONFIG.obstacleMinDistance +
          Math.random() *
            (GAME_CONFIG.obstacleMaxDistance - GAME_CONFIG.obstacleMinDistance)
    ) {
      const rand = Math.random();
      const type = rand < 0.33 ? "cactus" : rand < 0.66 ? "lowCactus" : "bird";
      player.obstacles.push(new Obstacle(spawnX, type, player.index));
    }
  }
}

function updateGame() {
  if (gameState.isPaused) return;

  const now = Date.now();
  const elapsed = now - gameState.gameStartTime;
  const expectedBoosts = Math.floor(elapsed / GAME_CONFIG.speedBoostInterval);

  if (expectedBoosts > gameState.speedBoostCount) {
    gameState.speedMultiplier += GAME_CONFIG.speedBoostAmount;
    gameState.speedBoostCount = expectedBoosts;
  }

  gameState.gameSpeed += GAME_CONFIG.speedIncrease;

  for (let player of players) {
    player.update();
    if (player.isAlive) {
      for (let obstacle of player.obstacles) obstacle.update();
      player.obstacles = player.obstacles.filter((obs) => obs.x > -obs.width);
    }
  }

  spawnObstacles();
  checkCollisions();

  const alive = players.filter((p) => p.isAlive);
  if (alive.length > 0) {
    const total = alive.reduce((sum, p) => sum + p.distance, 0);
    gameState.distance = total / alive.length;
    gameState.score = Math.floor(gameState.distance / 10);
  }

  // renderGame(); ← 호출 필요
}

function startGame() {
  gameState.screen = "game";
  gameState.score = 0;
  gameState.distance = 0;
  gameState.gameSpeed = GAME_CONFIG.baseSpeed;
  gameState.isPaused = false;
  gameState.gameStartTime = Date.now();
  gameState.speedBoostCount = 0;
  players = [];

  for (let i = 0; i < gameState.players; i++) {
    players.push(new Player(i));
  }

  updateCanvasSize();

  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(() => {
    updateGame();
    renderGame(); // 직접 정의된 렌더 함수 필요
  }, 1000 / 60);
}

function endGame() {
  gameState.screen = "gameOver";
  clearInterval(gameLoop);
  // 결과 표시 및 기록 저장
}
