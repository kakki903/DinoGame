
// 게임 설정
const GAME_CONFIG = {
    canvas: {
        width: 1200,
        height: 400
    },
    ground: {
        height: 50
    },
    gravity: 0.8,
    jumpPower: -15,
    slideHeight: 30,
    baseSpeed: 5,
    speedIncrease: 0.001,
    obstacleMinDistance: 200,
    obstacleMaxDistance: 400
};

// 플레이어 색상
const PLAYER_COLORS = ['#FF6347', '#4CAF50', '#2196F3', '#FF9800'];

// 조작 키 설정
const PLAYER_KEYS = [
    { jump: ' ', slide: 'ArrowDown' },    // 플레이어 1
    { jump: 'w', slide: 's' },           // 플레이어 2
    { jump: 'i', slide: 'k' },           // 플레이어 3
    { jump: 'numpad8', slide: 'numpad2' } // 플레이어 4
];

// 게임 상태
let gameState = {
    screen: 'menu', // 'menu', 'game', 'gameOver', 'paused'
    players: 1,
    mode: 'score', // 'score', 'battle'
    speedMultiplier: 1,
    score: 0,
    distance: 0,
    gameSpeed: GAME_CONFIG.baseSpeed,
    isPaused: false,
    gameStartTime: 0
};

// 게임 객체들
let canvas, ctx;
let players = [];
let obstacles = [];
let gameLoop;
let pressedKeys = {};

// DOM 요소들
let mainMenu, gameScreen, gameOverScreen, pauseScreen;
let playerButtons, modeButtons, speedButtons;
let keySettings, bestScores, scoreDisplay, speedDisplay, playerStatus, finalResults;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    initializeCanvas();
    initializeEventListeners();
    loadBestScores();
    updateKeySettings();
});

function initializeDOM() {
    // 화면 요소들
    mainMenu = document.getElementById('main-menu');
    gameScreen = document.getElementById('game-screen');
    gameOverScreen = document.getElementById('game-over');
    pauseScreen = document.getElementById('pause-screen');
    
    // 메뉴 버튼들
    playerButtons = document.querySelectorAll('.player-btn');
    modeButtons = document.querySelectorAll('.mode-btn');
    speedButtons = document.querySelectorAll('.speed-btn');
    
    // 기타 요소들
    keySettings = document.getElementById('key-settings');
    bestScores = document.getElementById('best-scores');
    scoreDisplay = document.getElementById('score-display');
    speedDisplay = document.getElementById('speed-display');
    playerStatus = document.getElementById('player-status');
    finalResults = document.getElementById('final-results');
}

function initializeCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // 고해상도 지원
    const ratio = window.devicePixelRatio || 1;
    canvas.width = GAME_CONFIG.canvas.width * ratio;
    canvas.height = GAME_CONFIG.canvas.height * ratio;
    canvas.style.width = GAME_CONFIG.canvas.width + 'px';
    canvas.style.height = GAME_CONFIG.canvas.height + 'px';
    ctx.scale(ratio, ratio);
}

function initializeEventListeners() {
    // 메뉴 버튼 이벤트
    playerButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            playerButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.players = parseInt(btn.dataset.players);
            updateKeySettings();
        });
    });
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.mode = btn.dataset.mode;
        });
    });
    
    speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            speedButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.speedMultiplier = parseFloat(btn.dataset.speed);
        });
    });
    
    // 게임 제어 버튼들
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('menu-btn').addEventListener('click', showMainMenu);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('pause-menu-btn').addEventListener('click', showMainMenu);
    
    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
        pressedKeys[e.code] = true;
        pressedKeys[e.key] = true;
        
        if (gameState.screen === 'game' && !gameState.isPaused) {
            handlePlayerInput(e.key, e.code);
        }
        
        // ESC 키로 일시정지
        if (e.key === 'Escape' && gameState.screen === 'game') {
            togglePause();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        pressedKeys[e.code] = false;
        pressedKeys[e.key] = false;
    });
}

function updateKeySettings() {
    keySettings.innerHTML = '';
    
    const keyNames = {
        ' ': '스페이스바',
        'ArrowDown': '아래화살표',
        'w': 'W',
        's': 'S', 
        'i': 'I',
        'k': 'K',
        'numpad8': '넘패드8',
        'numpad2': '넘패드2'
    };
    
    for (let i = 0; i < gameState.players; i++) {
        const playerKeys = PLAYER_KEYS[i];
        const div = document.createElement('div');
        div.className = 'player-keys';
        div.dataset.player = i + 1;
        div.innerHTML = `
            <span style="color: ${PLAYER_COLORS[i]}; font-weight: bold;">플레이어 ${i + 1}:</span>
            <span class="key-display">${keyNames[playerKeys.jump]} (점프) / ${keyNames[playerKeys.slide]} (슬라이드)</span>
        `;
        keySettings.appendChild(div);
    }
}

function loadBestScores() {
    const scores = JSON.parse(localStorage.getItem('dinoRunBestScores') || '{}');
    let html = '';
    
    for (let playerCount = 1; playerCount <= 4; playerCount++) {
        const scoreKey = `${playerCount}p_score`;
        const battleKey = `${playerCount}p_battle`;
        
        if (scores[scoreKey] || scores[battleKey]) {
            html += `<div><strong>${playerCount}인:</strong>`;
            if (scores[scoreKey]) html += ` 점수모드 ${scores[scoreKey]}점`;
            if (scores[battleKey]) html += ` 대결모드 ${scores[battleKey]}점`;
            html += '</div>';
        }
    }
    
    bestScores.innerHTML = html || '아직 기록이 없습니다.';
}

function saveBestScore() {
    const scores = JSON.parse(localStorage.getItem('dinoRunBestScores') || '{}');
    const key = `${gameState.players}p_${gameState.mode}`;
    
    if (!scores[key] || gameState.score > scores[key]) {
        scores[key] = gameState.score;
        localStorage.setItem('dinoRunBestScores', JSON.stringify(scores));
        return true; // 신기록
    }
    return false;
}

// 플레이어 클래스
class Player {
    constructor(index) {
        this.index = index;
        this.x = 100 + index * 60;
        this.y = GAME_CONFIG.canvas.height - GAME_CONFIG.ground.height - 50;
        this.width = 40;
        this.height = 50;
        this.velocityY = 0;
        this.isJumping = false;
        this.isSliding = false;
        this.isAlive = true;
        this.color = PLAYER_COLORS[index];
        this.distance = 0;
        this.keys = PLAYER_KEYS[index];
        this.groundY = this.y;
    }
    
    update() {
        if (!this.isAlive) return;
        
        // 중력 적용
        if (this.isJumping) {
            this.velocityY += GAME_CONFIG.gravity;
            this.y += this.velocityY;
            
            // 착지 체크
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.velocityY = 0;
                this.isJumping = false;
            }
        }
        
        // 슬라이딩 높이 조정
        if (this.isSliding) {
            this.height = GAME_CONFIG.slideHeight;
            this.y = this.groundY + (50 - GAME_CONFIG.slideHeight);
        } else {
            this.height = 50;
            this.y = this.groundY;
        }
        
        // 거리 증가
        this.distance += gameState.gameSpeed * gameState.speedMultiplier;
    }
    
    jump() {
        if (!this.isJumping && !this.isSliding && this.isAlive) {
            this.isJumping = true;
            this.velocityY = GAME_CONFIG.jumpPower;
        }
    }
    
    startSlide() {
        if (this.isAlive) {
            this.isSliding = true;
        }
    }
    
    stopSlide() {
        this.isSliding = false;
    }
    
    draw() {
        if (!this.isAlive) {
            ctx.globalAlpha = 0.3;
        }
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 플레이어 번호 표시
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.index + 1, this.x + this.width/2, this.y + this.height/2 + 5);
        
        ctx.globalAlpha = 1;
    }
    
    getHitbox() {
        return {
            x: this.x + 5,
            y: this.y + 5,
            width: this.width - 10,
            height: this.height - 10
        };
    }
}

// 장애물 클래스
class Obstacle {
    constructor(x, type = 'cactus') {
        this.x = x;
        this.type = type;
        this.width = type === 'cactus' ? 30 : 50;
        this.height = type === 'cactus' ? 60 : 30;
        this.y = type === 'cactus' ? 
            GAME_CONFIG.canvas.height - GAME_CONFIG.ground.height - this.height :
            GAME_CONFIG.canvas.height - GAME_CONFIG.ground.height - 100;
        this.color = type === 'cactus' ? '#228B22' : '#8B4513';
    }
    
    update() {
        this.x -= gameState.gameSpeed * gameState.speedMultiplier;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        if (this.type === 'cactus') {
            // 선인장 그리기
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillRect(this.x + 10, this.y - 10, 10, 20);
        } else {
            // 새 그리기
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    
    getHitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

function handlePlayerInput(key, code) {
    for (let player of players) {
        if (!player.isAlive) continue;
        
        if (key === player.keys.jump || code === player.keys.jump) {
            player.jump();
        }
        
        if (key === player.keys.slide || code === player.keys.slide) {
            player.startSlide();
        }
    }
}

function checkCollisions() {
    for (let player of players) {
        if (!player.isAlive) continue;
        
        const playerHitbox = player.getHitbox();
        
        for (let obstacle of obstacles) {
            const obstacleHitbox = obstacle.getHitbox();
            
            if (playerHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
                playerHitbox.x + playerHitbox.width > obstacleHitbox.x &&
                playerHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
                playerHitbox.y + playerHitbox.height > obstacleHitbox.y) {
                
                player.isAlive = false;
                
                // 점수모드에서 한 명이라도 죽으면 게임 종료
                if (gameState.mode === 'score') {
                    endGame();
                    return;
                }
            }
        }
    }
    
    // 대결모드에서 모든 플레이어가 죽었는지 체크
    if (gameState.mode === 'battle') {
        const alivePlayers = players.filter(p => p.isAlive);
        if (alivePlayers.length === 0) {
            endGame();
        }
    }
}

function spawnObstacle() {
    const lastObstacle = obstacles[obstacles.length - 1];
    const minDistance = GAME_CONFIG.obstacleMinDistance;
    const maxDistance = GAME_CONFIG.obstacleMaxDistance;
    
    if (!lastObstacle || 
        GAME_CONFIG.canvas.width - lastObstacle.x > minDistance + Math.random() * (maxDistance - minDistance)) {
        
        const type = Math.random() > 0.7 ? 'bird' : 'cactus';
        obstacles.push(new Obstacle(GAME_CONFIG.canvas.width, type));
    }
}

function updateGame() {
    if (gameState.isPaused) return;
    
    // 게임 속도 증가
    gameState.gameSpeed += GAME_CONFIG.speedIncrease;
    
    // 플레이어 업데이트
    for (let player of players) {
        player.update();
    }
    
    // 슬라이드 키 해제 체크
    for (let player of players) {
        const slideKey = player.keys.slide;
        if (!pressedKeys[slideKey]) {
            player.stopSlide();
        }
    }
    
    // 장애물 업데이트
    for (let obstacle of obstacles) {
        obstacle.update();
    }
    
    // 화면 밖 장애물 제거
    obstacles = obstacles.filter(obstacle => obstacle.x > -obstacle.width);
    
    // 새 장애물 생성
    spawnObstacle();
    
    // 충돌 체크
    checkCollisions();
    
    // 점수 업데이트
    gameState.distance += gameState.gameSpeed * gameState.speedMultiplier;
    gameState.score = Math.floor(gameState.distance / 10);
    
    // UI 업데이트
    updateGameUI();
}

function renderGame() {
    // 캔버스 클리어
    ctx.clearRect(0, 0, GAME_CONFIG.canvas.width, GAME_CONFIG.canvas.height);
    
    // 배경 그리기
    drawBackground();
    
    // 땅 그리기
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, GAME_CONFIG.canvas.height - GAME_CONFIG.ground.height, 
                GAME_CONFIG.canvas.width, GAME_CONFIG.ground.height);
    
    // 장애물 그리기
    for (let obstacle of obstacles) {
        obstacle.draw();
    }
    
    // 플레이어 그리기
    for (let player of players) {
        player.draw();
    }
}

function drawBackground() {
    // 구름 그리기 (간단한 원형)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const cloudOffset = (gameState.distance * 0.1) % 400;
    for (let i = 0; i < 4; i++) {
        const x = i * 300 - cloudOffset;
        ctx.beginPath();
        ctx.arc(x, 80, 20, 0, Math.PI * 2);
        ctx.arc(x + 20, 80, 25, 0, Math.PI * 2);
        ctx.arc(x + 40, 80, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateGameUI() {
    scoreDisplay.textContent = `점수: ${gameState.score}`;
    speedDisplay.textContent = `속도: ${(gameState.gameSpeed / GAME_CONFIG.baseSpeed * gameState.speedMultiplier).toFixed(1)}x`;
    
    // 플레이어 상태 업데이트
    playerStatus.innerHTML = '';
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        const div = document.createElement('div');
        div.className = `player-info ${player.isAlive ? 'alive' : 'dead'}`;
        div.style.borderColor = player.color;
        div.style.color = player.color;
        div.textContent = `플레이어 ${i + 1}: ${player.isAlive ? '생존' : '사망'} | ${Math.floor(player.distance / 10)}점`;
        playerStatus.appendChild(div);
    }
}

function startGame() {
    // 게임 상태 초기화
    gameState.screen = 'game';
    gameState.score = 0;
    gameState.distance = 0;
    gameState.gameSpeed = GAME_CONFIG.baseSpeed;
    gameState.isPaused = false;
    gameState.gameStartTime = Date.now();
    
    // 플레이어 생성
    players = [];
    for (let i = 0; i < gameState.players; i++) {
        players.push(new Player(i));
    }
    
    // 장애물 초기화
    obstacles = [];
    
    // 화면 전환
    showScreen('game');
    
    // 게임 루프 시작
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(() => {
        updateGame();
        renderGame();
    }, 1000 / 60); // 60 FPS
}

function endGame() {
    gameState.screen = 'gameOver';
    clearInterval(gameLoop);
    
    // 최고 기록 저장
    const isNewRecord = saveBestScore();
    
    // 결과 표시
    showGameResults(isNewRecord);
    showScreen('gameOver');
    loadBestScores(); // 최고 기록 새로고침
}

function showGameResults(isNewRecord) {
    let html = '';
    
    if (gameState.mode === 'score') {
        html += `<div class="result-item">`;
        html += `<strong>최종 점수: ${gameState.score}점</strong>`;
        if (isNewRecord) html += ` 🎉 신기록!`;
        html += `</div>`;
        
        html += `<h4>개별 점수:</h4>`;
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            html += `<div class="result-item" style="border-color: ${player.color}">`;
            html += `플레이어 ${i + 1}: ${Math.floor(player.distance / 10)}점`;
            html += `</div>`;
        }
    } else {
        // 대결모드 순위
        const sortedPlayers = [...players].sort((a, b) => {
            if (a.isAlive && !b.isAlive) return -1;
            if (!a.isAlive && b.isAlive) return 1;
            return b.distance - a.distance;
        });
        
        html += `<h4>최종 순위:</h4>`;
        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            
            html += `<div class="result-item" style="border-color: ${player.color}">`;
            html += `${rank}위 ${medal} 플레이어 ${player.index + 1}: ${Math.floor(player.distance / 10)}점`;
            html += `</div>`;
        }
        
        if (isNewRecord) {
            html += `<div style="color: #FF6347; font-weight: bold; margin-top: 10px;">🎉 신기록!</div>`;
        }
    }
    
    finalResults.innerHTML = html;
}

function togglePause() {
    if (gameState.screen !== 'game' && gameState.screen !== 'paused') return;
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        gameState.screen = 'paused';
        showScreen('paused');
        clearInterval(gameLoop);
    } else {
        gameState.screen = 'game';
        showScreen('game');
        gameLoop = setInterval(() => {
            updateGame();
            renderGame();
        }, 1000 / 60);
    }
}

function showMainMenu() {
    gameState.screen = 'menu';
    clearInterval(gameLoop);
    showScreen('menu');
}

function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    const screens = {
        'menu': mainMenu,
        'game': gameScreen,
        'gameOver': gameOverScreen,
        'paused': pauseScreen
    };
    
    if (screens[screenName]) {
        screens[screenName].classList.remove('hidden');
    }
}

// 페이지 언로드 시 게임 루프 정리
window.addEventListener('beforeunload', () => {
    if (gameLoop) clearInterval(gameLoop);
});
