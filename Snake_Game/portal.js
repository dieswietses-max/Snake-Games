const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverDisplay = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');

// Game constants
const gridSize = 20;
const maxTotalFood = 30;
const normalFoodSpawnCooldown = 600;
const normalFoodSpawnChance = 0.5;
const goldenSpawnChance = 0.2;
const diamondSpawnChance = 0.08;
const sapphireSpawnChance = 0.01;
const bronzeSpawnChance = 0.4;

// Game variables
let tileCountX = 0;
let tileCountY = 0;
let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let foods = [];
let goldenFood = null;
let diamondFood = null;
let sapphireFood = null;
let bronzeFood = null;
let lastFoodSpawn = 0;
let pendingGrowth = 0;
let score = localStorage.getItem('portalScore') ? parseInt(localStorage.getItem('portalScore')) : 0;
let highScore = localStorage.getItem('portalHigh') ? parseInt(localStorage.getItem('portalHigh')) : 0;
let gameRunning = false;
let gameOver = false;
let gamePaused = false;
let gameSpeed = 150;
let portal1 = null;
let portal2 = null;
let lastPortalSpawn = 0;
const portalInterval = 10000; // 10 seconds

scoreDisplay.textContent = score;
highScoreDisplay.textContent = highScore;

// Event listeners
startBtn.addEventListener('click', () => {
    resetGame(false);
    startGame();
});
restartBtn.addEventListener('click', () => {
    resetGame(false);
    startGame();
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
    const chromePadding = 160;
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
    foods = foods.map(wrapPoint);
    if (goldenFood) goldenFood = wrapPoint(goldenFood);
    if (diamondFood) diamondFood = wrapPoint(diamondFood);
    if (sapphireFood) sapphireFood = wrapPoint(sapphireFood);
    if (bronzeFood) bronzeFood = wrapPoint(bronzeFood);
}

function handleKeyPress(e) {
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!gameRunning && gameKeys.includes(e.key)) {
        resetGame(false);
        startGame();
    }
    
    if (!gameRunning) return;

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
    snake = [{ x: Math.floor(Math.random() * (tileCountX || 40)), y: Math.floor(Math.random() * (tileCountY || 30)) }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    gameRunning = false;
    gameOver = false;
    gamePaused = false;
    pauseBtn.textContent = 'Pause';
    
    // Always reset current score for new game
    score = 0;
    
    if (clearScores) {
        highScore = 0;
        localStorage.setItem('portalScore', '0');
        localStorage.setItem('portalHigh', '0');
    }
    
    scoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
    gameOverDisplay.classList.add('hidden');
    gameSpeed = 150;
    goldenFood = null;
    diamondFood = null;
    sapphireFood = null;
    bronzeFood = null;
    pendingGrowth = 0;
    foods = [];
    lastFoodSpawn = 0;
    portal1 = null;
    portal2 = null;
    lastPortalSpawn = 0;
    draw();
}

function isOccupied(x, y) {
    const occupied = [...snake, ...foods];
    if (goldenFood) occupied.push(goldenFood);
    if (diamondFood) occupied.push(diamondFood);
    if (sapphireFood) occupied.push(sapphireFood);
    if (bronzeFood) occupied.push(bronzeFood);
    if (portal1) occupied.push(portal1);
    if (portal2) occupied.push(portal2);
    return occupied.some(item => item.x === x && item.y === y);
}

function getTotalFoodCount() {
    let count = foods.length;
    if (goldenFood) count += 1;
    if (diamondFood) count += 1;
    if (sapphireFood) count += 1;
    if (bronzeFood) count += 1;
    return count;
}

function generateFood() {
    if (foods.length >= maxTotalFood) return;
    let newFood;
    let attempts = 0;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        attempts += 1;
        if (!isOccupied(newFood.x, newFood.y)) {
            foods.push(newFood);
            return;
        }
    } while (attempts < 20);
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
        if (isOccupied(newFood.x, newFood.y)) {
            collision = true;
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

function generatePortals() {
    let newPortal1, newPortal2;
    let attempts = 0;
    do {
        newPortal1 = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        attempts += 1;
    } while (isOccupied(newPortal1.x, newPortal1.y) && attempts < 20);
    
    attempts = 0;
    do {
        newPortal2 = {
            x: Math.floor(Math.random() * tileCountX),
            y: Math.floor(Math.random() * tileCountY)
        };
        attempts += 1;
    } while (isOccupied(newPortal2.x, newPortal2.y) && attempts < 20);
    
    portal1 = newPortal1;
    portal2 = newPortal2;
}

function maybeSpawnFoods(now) {
    if (foods.length < maxTotalFood && now - lastFoodSpawn >= normalFoodSpawnCooldown) {
        if (getTotalFoodCount() < maxTotalFood && Math.random() < normalFoodSpawnChance) {
            generateFood();
        }
        lastFoodSpawn = now;
    }
    if (!goldenFood && getTotalFoodCount() < maxTotalFood && Math.random() < goldenSpawnChance) {
        generateGoldenFood();
    }
    if (!diamondFood && getTotalFoodCount() < maxTotalFood && Math.random() < diamondSpawnChance) {
        generateDiamondFood();
    }
    if (!sapphireFood && getTotalFoodCount() < maxTotalFood && Math.random() < sapphireSpawnChance) {
        generateSapphireFood();
    }
    if (!bronzeFood && getTotalFoodCount() < maxTotalFood && Math.random() < bronzeSpawnChance) {
        generateBronzeFood();
    }
}

function update() {
    if (!gameRunning || gameOver || gamePaused) return;
    
    const now = Date.now();
    maybeSpawnFoods(now);
    
    // Spawn portals every 10 seconds
    if (now - lastPortalSpawn >= portalInterval) {
        generatePortals();
        lastPortalSpawn = now;
    }
    
    // Initialize portals if not yet spawned
    if (!portal1 && !portal2 && now > 0) {
        generatePortals();
        lastPortalSpawn = now;
    }

    direction = nextDirection;
    let headX = (snake[0].x + direction.x + tileCountX) % tileCountX;
    let headY = (snake[0].y + direction.y + tileCountY) % tileCountY;
    let head = { x: headX, y: headY };
    
    // Check portal teleportation
    if (portal1 && head.x === portal1.x && head.y === portal1.y && portal2) {
        head = { x: portal2.x, y: portal2.y };
    } else if (portal2 && head.x === portal2.x && head.y === portal2.y && portal1) {
        head = { x: portal1.x, y: portal1.y };
    }

    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            endGame();
            return;
        }
    }

    snake.unshift(head);

    const foodIdx = foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (foodIdx !== -1) {
        score += 10;
        foods.splice(foodIdx, 1);
        pendingGrowth += 1;
        scoreDisplay.textContent = score;
    }

    if (goldenFood && head.x === goldenFood.x && head.y === goldenFood.y) {
        score += 50;
        goldenFood = null;
        pendingGrowth += 5;
        scoreDisplay.textContent = score;
    }

    if (diamondFood && head.x === diamondFood.x && head.y === diamondFood.y) {
        score += 100;
        diamondFood = null;
        pendingGrowth += 10;
        scoreDisplay.textContent = score;
    }

    if (sapphireFood && head.x === sapphireFood.x && head.y === sapphireFood.y) {
        score += 250;
        sapphireFood = null;
        pendingGrowth += 25;
        scoreDisplay.textContent = score;
    }

    if (bronzeFood && head.x === bronzeFood.x && head.y === bronzeFood.y) {
        score += 30;
        bronzeFood = null;
        pendingGrowth += 3;
        scoreDisplay.textContent = score;
    }

    if (pendingGrowth > 0) {
        pendingGrowth -= 1;
    } else {
        snake.pop();
    }
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    ctx.fillStyle = '#00ff00';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
    foods.forEach(food => {
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

    if (goldenFood) {
        const cx = goldenFood.x * gridSize + gridSize / 2;
        const cy = goldenFood.y * gridSize + gridSize / 2;
        const outer = gridSize / 2 - 2;
        const inner = outer * 0.45;
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = -Math.PI / 2 + (Math.PI * i) / 5;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }

    if (diamondFood) {
        const cx = diamondFood.x * gridSize + gridSize / 2;
        const cy = diamondFood.y * gridSize + gridSize / 2;
        const r = gridSize / 2 - 2;
        ctx.fillStyle = '#7df2ff';
        ctx.shadowColor = '#7df2ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill();
    }

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
    }

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
    }

    // Draw portals
    if (portal1) {
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(
            portal1.x * gridSize + gridSize / 2,
            portal1.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    if (portal2) {
        ctx.fillStyle = '#cc00ff';
        ctx.shadowColor = '#cc00ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(
            portal2.x * gridSize + gridSize / 2,
            portal2.y * gridSize + gridSize / 2,
            gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.shadowColor = 'transparent';

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

function endGame() {
    gameRunning = false;
    gameOver = true;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('portalHigh', highScore);
        highScoreDisplay.textContent = highScore;
    }
    localStorage.setItem('portalScore', score);

    gameOverDisplay.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    gameOverDisplay.textContent = `Game Over! Score: ${score}`;
}

function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        setTimeout(gameLoop, gameSpeed);
    }
}

resizeCanvas();
resetGame(false);
