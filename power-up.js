const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverDisplay = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const resetBtn = document.getElementById('resetBtn');
const pauseBtn = document.getElementById('pauseBtn');
const scoreRedDisplay = document.getElementById('scoreRed');
const finalScoreRedDisplay = document.getElementById('finalScoreRed');

// Game variables
const gridSize = 20;
const maxFoodPerColor = 5;
const normalFoodSpawnCooldown = 1100; // ms between spawn attempts per color
const normalFoodSpawnChance = 0.25;  // chance per attempt when under cap
const maxTotalFood = 25;             // overall visible food cap
const sapphireSpawnChance = 0.01;    // chance to spawn sapphire when triggered
const bronzeSpawnChance = 0.50;      // chance to spawn bronze when triggered
let tileCountX = 0;
let tileCountY = 0;
let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let greenFoods = [];
let goldenFood = null; // optional golden food
let diamondFood = null; // rare food worth +10
let sapphireFood = null; // very rare food worth +25
let bronzeFood = null;  // common food worth +3
let lastGreenSpawn = 0;
let lastRedSpawn = 0;

// Red snake (WASD)
let snakeRed = [{ x: 30, y: 10 }];
let directionRed = { x: -1, y: 0 };
let nextDirectionRed = { x: -1, y: 0 };

let redFoods = [];
let pendingGrowthGreen = 0;
let pendingGrowthRed = 0;

// Power-ups variables
let powerUps = []; // Active power-ups on map
let activePowerUpGreen = null; // Green snake active power-up: {type, endTime}
let activePowerUpRed = null; // Red snake active power-up: {type, endTime}
const powerUpSpawnInterval = 8000; // Spawn every 8 seconds
let lastPowerUpSpawn = 0;
let score = localStorage.getItem('powerUpWinsGreen') ? parseInt(localStorage.getItem('powerUpWinsGreen')) : 0;
let scoreRed = localStorage.getItem('powerUpWinsRed') ? parseInt(localStorage.getItem('powerUpWinsRed')) : 0;
let highScore = Math.max(score, scoreRed);
let gameRunning = false;
let gameOver = false;
let gamePaused = false;
let gameSpeed = 150;

scoreDisplay.textContent = score;
scoreRedDisplay.textContent = scoreRed;
highScoreDisplay.textContent = highScore;

// Event listeners
startBtn.addEventListener('click', () => {
    resetGame();
    startGame();
});
restartBtn.addEventListener('click', () => {
    resetGame(false);
    startGame();
});
resetBtn.addEventListener('click', () => {
    resetGame(true);
});
pauseBtn.addEventListener('click', () => {
    togglePause();
});
document.addEventListener('keydown', handleKeyPress);
window.addEventListener('resize', () => {
    const wasRunning = gameRunning;
    resizeCanvas();
    if (!wasRunning) {
        draw();
    }
});

function resizeCanvas() {
    const chromePadding = 160; // header + buttons + info + padding
    const availableW = Math.max(gridSize * 15, window.innerWidth - 24);
    const availableH = Math.max(gridSize * 12, window.innerHeight - chromePadding);

    const targetW = Math.floor(availableW / gridSize) * gridSize;
    const targetH = Math.floor(availableH / gridSize) * gridSize;

    canvas.width = Math.max(gridSize * 15, targetW);
    canvas.height = Math.max(gridSize * 12, targetH);
    tileCountX = canvas.width / gridSize;
    tileCountY = canvas.height / gridSize;
    wrapEntitiesToBounds();
}

function wrapEntitiesToBounds() {
    const wrapPoint = ({ x, y }) => ({
        x: ((x % tileCountX) + tileCountX) % tileCountX,
        y: ((y % tileCountY) + tileCountY) % tileCountY
    });
    snake = snake.map(wrapPoint);
    snakeRed = snakeRed.map(wrapPoint);
    greenFoods = greenFoods.map(wrapPoint);
    redFoods = redFoods.map(wrapPoint);
    if (goldenFood) goldenFood = wrapPoint(goldenFood);
    if (diamondFood) diamondFood = wrapPoint(diamondFood);
    if (sapphireFood) sapphireFood = wrapPoint(sapphireFood);
    if (bronzeFood) bronzeFood = wrapPoint(bronzeFood);
}

function handleKeyPress(e) {
    // Start game on arrow key or WASD press if not running
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 's', 'S', 'a', 'A', 'd', 'D'];
    if (!gameRunning && gameKeys.includes(e.key)) {
        resetGame();
        startGame();
    }
    
    if (!gameRunning) return;

    // Green snake (arrows)
    switch (e.key) {
        case 'ArrowUp':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            e.preventDefault();
            break;
        case 'ArrowLeft':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            e.preventDefault();
            break;
    }

    // Red snake (WASD)
    switch (e.key.toLowerCase()) {
        case 'w':
            if (directionRed.y === 0) nextDirectionRed = { x: 0, y: -1 };
            e.preventDefault();
            break;
        case 's':
            if (directionRed.y === 0) nextDirectionRed = { x: 0, y: 1 };
            e.preventDefault();
            break;
        case 'a':
            if (directionRed.x === 0) nextDirectionRed = { x: -1, y: 0 };
            e.preventDefault();
            break;
        case 'd':
            if (directionRed.x === 0) nextDirectionRed = { x: 1, y: 0 };
            e.preventDefault();
            break;
    }
}

function startGame() {
    if (gameRunning) return;
    gameRunning = true;
    gamePaused = false;
    pauseBtn.textContent = 'Pause';
    gameOverDisplay.classList.add('hidden');
    gameLoop();
}

function togglePause() {
    if (!gameRunning || gameOver) return;
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? 'Resume' : 'Pause';
    if (!gamePaused) {
        gameLoop();
    }
}

function resetGame(clearScores = false) {
    const randomX = () => Math.floor(Math.random() * (tileCountX || 40));
    const randomY = () => Math.floor(Math.random() * (tileCountY || 30));
    
    snake = [{ x: randomX(), y: randomY() }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    gameRunning = false;
    gameOver = false;
    gamePaused = false;
    pauseBtn.textContent = 'Pause';
    
    // Always reset current scores for new game
    score = 0;
    scoreRed = 0;
    
    if (clearScores) {
        highScore = 0;
        localStorage.setItem('powerUpWinsGreen', '0');
        localStorage.setItem('powerUpWinsRed', '0');
        localStorage.setItem('powerUpHighScore', '0');
    }
    
    scoreDisplay.textContent = score;
    gameOverDisplay.classList.add('hidden');
    snakeRed = [{ x: randomX(), y: randomY() }];
    directionRed = { x: -1, y: 0 };
    nextDirectionRed = { x: -1, y: 0 };
    scoreRedDisplay.textContent = scoreRed;
    highScoreDisplay.textContent = highScore;
    gameSpeed = 150;
    goldenFood = null;
    diamondFood = null;
    sapphireFood = null;
    bronzeFood = null;
    pendingGrowthGreen = 0;
    pendingGrowthRed = 0;
    greenFoods = [];
    redFoods = [];
    lastGreenSpawn = 0;
    lastRedSpawn = 0;
    powerUps = [];
    activePowerUpGreen = null;
    activePowerUpRed = null;
    lastPowerUpSpawn = 0;
    draw();
}

function isOccupied(x, y) {
    const occupied = [...snake, ...snakeRed, ...greenFoods, ...redFoods];
    if (goldenFood) occupied.push(goldenFood);
    if (diamondFood) occupied.push(diamondFood);
    if (sapphireFood) occupied.push(sapphireFood);
    if (bronzeFood) occupied.push(bronzeFood);
    return occupied.some(item => item.x === x && item.y === y);
}

function getTotalFoodCount() {
    let count = greenFoods.length + redFoods.length;
    if (goldenFood) count += 1;
    if (diamondFood) count += 1;
    if (sapphireFood) count += 1;
    if (bronzeFood) count += 1;
    return count;
}

function spawnSingleFood(targetArray) {
    if (targetArray.length >= maxFoodPerColor) return;
    if (getTotalFoodCount() >= maxTotalFood) return;
    let newFood;
    let attempts = 0;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        attempts += 1;
        if (!isOccupied(newFood.x, newFood.y)) {
            targetArray.push(newFood);
            return;
        }
    } while (attempts < 20);
}

function maybeSpawnNormalFoods(now) {
    if (greenFoods.length < maxFoodPerColor && now - lastGreenSpawn >= normalFoodSpawnCooldown) {
        if (getTotalFoodCount() < maxTotalFood && Math.random() < normalFoodSpawnChance) {
            spawnSingleFood(greenFoods);
        }
        lastGreenSpawn = now;
    }
    if (redFoods.length < maxFoodPerColor && now - lastRedSpawn >= normalFoodSpawnCooldown) {
        if (getTotalFoodCount() < maxTotalFood && Math.random() < normalFoodSpawnChance) {
            spawnSingleFood(redFoods);
        }
        lastRedSpawn = now;
    }
}

function generateGreenFood() {
    spawnSingleFood(greenFoods);
}

function generateRedFood() {
    spawnSingleFood(redFoods);
}

function generateGoldenFood() {
    if (getTotalFoodCount() >= maxTotalFood) return;
    let newFood;
    let collision;
    do {
        collision = false;
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        const occupied = [...snake, ...snakeRed, ...greenFoods, ...redFoods];
        if (diamondFood) occupied.push(diamondFood);
        if (sapphireFood) occupied.push(sapphireFood);
        if (bronzeFood) occupied.push(bronzeFood);
        for (let segment of occupied) {
            if (segment && segment.x === newFood.x && segment.y === newFood.y) {
                collision = true;
                break;
            }
        }
    } while (collision);
    goldenFood = newFood;
}

function generateDiamondFood() {
    if (getTotalFoodCount() >= maxTotalFood) return;
    let newFood;
    let collision;
    do {
        collision = false;
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        if (isOccupied(newFood.x, newFood.y)) {
            collision = true;
        }
    } while (collision);
    diamondFood = newFood;
}

function generateSapphireFood() {
    if (getTotalFoodCount() >= maxTotalFood) return;
    let newFood;
    let collision;
    do {
        collision = false;
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        if (isOccupied(newFood.x, newFood.y)) {
            collision = true;
        }
    } while (collision);
    sapphireFood = newFood;
}

function generateBronzeFood() {
    if (getTotalFoodCount() >= maxTotalFood) return;
    let newFood;
    let collision;
    do {
        collision = false;
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        if (isOccupied(newFood.x, newFood.y)) {
            collision = true;
        }
    } while (collision);
    bronzeFood = newFood;
}

function maybeSpawnGoldenFood() {
    if (!goldenFood && getTotalFoodCount() < maxTotalFood && Math.random() < 0.25) {
        generateGoldenFood();
    }
}
function maybeSpawnDiamondFood() {
    if (!diamondFood && getTotalFoodCount() < maxTotalFood && Math.random() < 0.10) {
        generateDiamondFood();
    }
}
function maybeSpawnSapphireFood() {
    if (!sapphireFood && getTotalFoodCount() < maxTotalFood && Math.random() < sapphireSpawnChance) {
        generateSapphireFood();
    }
}
function maybeSpawnBronzeFood() {
    if (!bronzeFood && getTotalFoodCount() < maxTotalFood && Math.random() < bronzeSpawnChance) {
        generateBronzeFood();
    }
}
function update() {
    if (!gameRunning || gameOver || gamePaused) return;
    const now = Date.now();
    maybeSpawnNormalFoods(now);
    maybeSpawnPowerUps(now);
    updateActivePowerUps(now);

    // --- Green snake move ---
    direction = nextDirection;
    let headX = (snake[0].x + direction.x + tileCountX) % tileCountX;
    let headY = (snake[0].y + direction.y + tileCountY) % tileCountY;
    const head = { x: headX, y: headY };

    // Collision with red snake (red wins)
    for (let segment of snakeRed) {
        if (head.x === segment.x && head.y === segment.y) {
            endGame('Red');
            return;
        }
    }

    // Self collision green
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            endGame('Red');
            return;
        }
    }
    snake.unshift(head);

    // Green food (growth only)
    const greenIdx = greenFoods.findIndex(f => f.x === head.x && f.y === head.y);
    if (greenIdx !== -1) {
        pendingGrowthGreen += 1;
        greenFoods.splice(greenIdx, 1);
        maybeSpawnGoldenFood();
        maybeSpawnDiamondFood();
        maybeSpawnSapphireFood();
        maybeSpawnBronzeFood();
    }
    if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
        pendingGrowthGreen += 5;
        goldenFood = null;
    }
    if (diamondFood && head.x === diamondFood.x && head.y === diamondFood.y) {
        pendingGrowthGreen += 10;
        diamondFood = null;
    }
    if (sapphireFood && head.x === sapphireFood.x && head.y === sapphireFood.y) {
        pendingGrowthGreen += 25;
        sapphireFood = null;
    }
    if (bronzeFood && head.x === bronzeFood.x && head.y === bronzeFood.y) {
        pendingGrowthGreen += 3;
        bronzeFood = null;
    }
    if (pendingGrowthGreen > 0) {
        pendingGrowthGreen -= 1;
    } else {
        snake.pop();
    }

    // --- Red snake move ---
    directionRed = nextDirectionRed;
    let headRedX = (snakeRed[0].x + directionRed.x + tileCountX) % tileCountX;
    let headRedY = (snakeRed[0].y + directionRed.y + tileCountY) % tileCountY;
    const headRed = { x: headRedX, y: headRedY };

    // Collision with green snake (green wins)
    for (let segment of snake) {
        if (headRed.x === segment.x && headRed.y === segment.y) {
            endGame('Green');
            return;
        }
    }

    // Self collision red
    for (let segment of snakeRed) {
        if (headRed.x === segment.x && headRed.y === segment.y) {
            endGame('Green');
            return;
        }
    }
    snakeRed.unshift(headRed);

    // Red food (growth only)
    const redIdx = redFoods.findIndex(f => f.x === headRed.x && f.y === headRed.y);
    if (redIdx !== -1) {
        pendingGrowthRed += 1;
        redFoods.splice(redIdx, 1);
        maybeSpawnGoldenFood();
        maybeSpawnDiamondFood();
        maybeSpawnSapphireFood();
        maybeSpawnBronzeFood();
    }
    if (goldenFood && headRed.x === goldenFood.x && headRed.y === goldenFood.y) {
        pendingGrowthRed += 5;
        goldenFood = null;
    }
    if (diamondFood && headRed.x === diamondFood.x && headRed.y === diamondFood.y) {
        pendingGrowthRed += 10;
        diamondFood = null;
    }
    if (sapphireFood && headRed.x === sapphireFood.x && headRed.y === sapphireFood.y) {
        pendingGrowthRed += 25;
        sapphireFood = null;
    }
    if (bronzeFood && headRed.x === bronzeFood.x && headRed.y === bronzeFood.y) {
        pendingGrowthRed += 3;
        bronzeFood = null;
    }
    if (pendingGrowthRed > 0) {
        pendingGrowthRed -= 1;
    } else {
        snakeRed.pop();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Green snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#00ff00' : '#00cc00';
        ctx.shadowColor = index === 0 ? '#00ff00' : 'rgba(0, 255, 0, 0.5)';
        ctx.shadowBlur = index === 0 ? 10 : 5;
        ctx.fillRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2
        );
    });

    // Red snake
    snakeRed.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#ff3333' : '#cc0000';
        ctx.shadowColor = index === 0 ? '#ff3333' : 'rgba(255, 0, 0, 0.5)';
        ctx.shadowBlur = index === 0 ? 10 : 5;
        ctx.fillRect(
            segment.x * gridSize + 1,
            segment.y * gridSize + 1,
            gridSize - 2,
            gridSize - 2
        );
    });
    ctx.shadowColor = 'transparent';

    // Green food
    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
    greenFoods.forEach(food => {
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    // Red food
    ctx.fillStyle = '#ff3333';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 10;
    redFoods.forEach(food => {
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize / 2,
            food.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
    ctx.shadowColor = 'transparent';

    // Golden food (if present)
    if (goldenFood) {
        const cx = goldenFood.x * gridSize + gridSize / 2;
        const cy = goldenFood.y * gridSize + gridSize / 2;
        const r = gridSize / 2 - 2;
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 4) / 5 - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }

    // Diamond food (if present)
    if (diamondFood) {
        const cx = diamondFood.x * gridSize + gridSize / 2;
        const cy = diamondFood.y * gridSize + gridSize / 2;
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx, cy - gridSize / 2.3);
        ctx.lineTo(cx + gridSize / 2.3, cy);
        ctx.lineTo(cx, cy + gridSize / 2.3);
        ctx.lineTo(cx - gridSize / 2.3, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }

    // Sapphire food (if present)
    if (sapphireFood) {
        const cx = sapphireFood.x * gridSize + gridSize / 2;
        const cy = sapphireFood.y * gridSize + gridSize / 2;
        const r = gridSize / 2 - 2;
        ctx.fillStyle = '#a66bff';
        ctx.shadowColor = '#a66bff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.6, cy - r * 0.2);
        ctx.lineTo(cx + r * 0.6, cy + r * 0.4);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r * 0.6, cy + r * 0.4);
        ctx.lineTo(cx - r * 0.6, cy - r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }

    // Bronze food (if present)
    if (bronzeFood) {
        const cx = bronzeFood.x * gridSize + gridSize / 2;
        const cy = bronzeFood.y * gridSize + gridSize / 2;
        const r = gridSize / 2 - 2;
        ctx.fillStyle = '#cd7f32';
        ctx.shadowColor = '#cd7f32';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * i) / 3;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
    }

    // Power-ups
    powerUps.forEach(powerUp => {
        const cx = powerUp.x * gridSize + gridSize / 2;
        const cy = powerUp.y * gridSize + gridSize / 2;
        
        if (powerUp.type === 'invincibility') {
            // Orange shield (pentagon)
            ctx.fillStyle = '#ff8c00';
            ctx.shadowColor = '#ff8c00';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
                const x = cx + Math.cos(angle) * (gridSize / 2.3);
                const y = cy + Math.sin(angle) * (gridSize / 2.3);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (powerUp.type === 'magnet') {
            // Pink square
            ctx.fillStyle = '#ff1493';
            ctx.shadowColor = '#ff1493';
            ctx.shadowBlur = 15;
            ctx.fillRect(
                cx - gridSize / 2.5,
                cy - gridSize / 2.5,
                gridSize / 1.25,
                gridSize / 1.25
            );
        } else if (powerUp.type === 'ghost') {
            // Lime triangle
            ctx.fillStyle = '#7fff00';
            ctx.shadowColor = '#7fff00';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(cx, cy - gridSize / 2.3);
            ctx.lineTo(cx + gridSize / 2.3, cy + gridSize / 3);
            ctx.lineTo(cx - gridSize / 2.3, cy + gridSize / 3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowColor = 'transparent';
    });

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCountX; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= tileCountY; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
}

function endGame(winner = '') {
    gameRunning = false;
    gameOver = true;

    if (winner === 'Green') {
        score += 1;
        localStorage.setItem('powerUpWinsGreen', score);
    } else if (winner === 'Red') {
        scoreRed += 1;
        localStorage.setItem('powerUpWinsRed', scoreRed);
    }

    highScore = Math.max(score, scoreRed);
    localStorage.setItem('powerUpHighScore', highScore);
    scoreDisplay.textContent = score;
    scoreRedDisplay.textContent = scoreRed;
    highScoreDisplay.textContent = highScore;

    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    finalScoreRedDisplay.textContent = scoreRed;
    const winnerText = winner ? `${winner} wins. ` : '';
    gameOverDisplay.textContent = `Game Over! ${winnerText}Wins - Green: ${score} | Red: ${scoreRed}`;
}

function maybeSpawnPowerUps(now) {
    // Spawn power-ups every 8 seconds
    if (now - lastPowerUpSpawn >= powerUpSpawnInterval) {
        const types = ['invincibility', 'magnet', 'ghost'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const newPowerUp = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY),
            type: randomType
        };
        powerUps.push(newPowerUp);
        lastPowerUpSpawn = now;
    }
}

function updateActivePowerUps(now) {
    // Remove expired power-ups
    if (activePowerUpGreen && now > activePowerUpGreen.endTime) {
        activePowerUpGreen = null;
    }
    if (activePowerUpRed && now > activePowerUpRed.endTime) {
        activePowerUpRed = null;
    }
}

function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        setTimeout(gameLoop, gameSpeed);
    }
}

// Initial draw
resizeCanvas();
resetGame();
