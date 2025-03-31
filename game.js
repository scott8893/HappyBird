// 遊戲常量
const GRAVITY = 0.25;
const FLAP_STRENGTH = -5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_INTERVAL = 1500; // 毫秒
const PIPE_GAP = 150;
const PIPE_WIDTH = 60;

// 鼓勵語列表
const ENCOURAGEMENTS = [
    "加油！你太棒了！",
    "繼續飛！你是最強的小鳥！",
    "哇！厲害了我的鳥！",
    "你就是傳說中的鳥王！",
    "飛得比誰都高！",
    "小鳥飛飛，超越自我！",
    "這個操作，滿分！",
    "你是我見過最棒的小鳥！",
    "太強了！給你打call！",
    "飛得好帥！繼續保持！",
    "你的飛行技巧真是太厲害了！",
    "這波操作，我給滿分！",
    "你是小鳥界的扛把子！",
    "飛得比誰都穩！",
    "這個分數，我酸了！"
];

// 獲取Canvas和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 設置Canvas尺寸
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

// 初始化時調整Canvas尺寸
resizeCanvas();

// 監聽窗口大小變化
window.addEventListener('resize', resizeCanvas);

// 遊戲狀態
let gameState = {
    isRunning: false,
    score: 0,
    bird: {
        x: canvas.width / 4,
        y: canvas.height / 2,
        width: 30,
        height: 30,
        velocity: 0,
        rotation: 0
    },
    pipes: [],
    lastPipeSpawn: 0,
    particles: []
};

// 音效
let flapSound, scoreSound, hitSound, bgMusic;

// 加載音效
function loadSounds() {
    // 創建音頻上下文
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    
    // 背景音樂 - 使用 MIDI 合成
    bgMusic = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.1; // 音量控制
    bgMusic.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 簡單的音效
    flapSound = {
        play: function() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 600;
            gainNode.gain.value = 0.1;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    };
    
    scoreSound = {
        play: function() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    };
    
    hitSound = {
        play: function() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 200;
            gainNode.gain.value = 0.2;
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.5);
        }
    };
    
    // 播放背景音樂
    playBackgroundMusic(audioContext, gainNode);
}

// 播放背景音樂 - 簡單的旋律
function playBackgroundMusic(audioContext, gainNode) {
    const notes = [262, 294, 330, 349, 392, 440, 494, 523]; // C大調音階
    let currentNote = 0;
    
    function playNextNote() {
        if (!gameState.isRunning) return;
        
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = notes[currentNote];
        
        const noteGain = audioContext.createGain();
        noteGain.gain.value = 0.1;
        oscillator.connect(noteGain);
        noteGain.connect(audioContext.destination);
        
        oscillator.start();
        noteGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        currentNote = (currentNote + 1) % notes.length;
        setTimeout(playNextNote, 500);
    }
    
    playNextNote();
}

// 初始化遊戲
function initGame() {
    gameState = {
        isRunning: false,
        score: 0,
        bird: {
            x: canvas.width / 4,
            y: canvas.height / 2,
            width: 30,
            height: 30,
            velocity: 0,
            rotation: 0
        },
        pipes: [],
        lastPipeSpawn: 0,
        particles: []
    };
    
    document.getElementById('score').textContent = '0';
    document.getElementById('finalScore').textContent = '0';
    
    // 隱藏遊戲結束畫面
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    // 顯示開始畫面
    document.getElementById('startScreen').classList.remove('hidden');
    
    // 繪製初始畫面
    drawGame();
}

// 開始遊戲
function startGame() {
    gameState.isRunning = true;
    
    // 隱藏開始畫面
    document.getElementById('startScreen').classList.add('hidden');
    
    // 加載音效
    loadSounds();
    
    // 開始遊戲循環
    requestAnimationFrame(gameLoop);
}

// 遊戲結束
function gameOver() {
    gameState.isRunning = false;
    
    // 播放碰撞音效
    hitSound.play();
    
    // 顯示遊戲結束畫面
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// 小鳥拍打翅膀
function flapBird() {
    if (!gameState.isRunning) return;
    
    gameState.bird.velocity = FLAP_STRENGTH;
    gameState.bird.rotation = -30; // 向上旋轉
    
    // 播放拍打翅膀音效
    flapSound.play();
    
    // 添加向下的粒子效果
    addParticles(gameState.bird.x, gameState.bird.y + gameState.bird.height / 2, 5, '#ffffff');
}

// 更新小鳥狀態
function updateBird() {
    // 應用重力
    gameState.bird.velocity += GRAVITY;
    gameState.bird.y += gameState.bird.velocity;
    
    // 逐漸恢復小鳥旋轉
    if (gameState.bird.rotation < 90) {
        gameState.bird.rotation += 2;
    }
    
    // 檢查是否碰到地面或天花板
    if (gameState.bird.y <= 0) {
        gameState.bird.y = 0;
        gameState.bird.velocity = 0;
    } else if (gameState.bird.y + gameState.bird.height >= canvas.height) {
        gameOver();
    }
}

// 生成新的管道
function spawnPipe() {
    const now = Date.now();
    if (now - gameState.lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
        const gapPosition = Math.random() * (canvas.height - PIPE_GAP - 100) + 50;
        
        gameState.pipes.push({
            x: canvas.width,
            gapTop: gapPosition,
            gapBottom: gapPosition + PIPE_GAP,
            width: PIPE_WIDTH,
            passed: false
        });
        
        gameState.lastPipeSpawn = now;
    }
}

// 更新管道狀態
function updatePipes() {
    for (let i = gameState.pipes.length - 1; i >= 0; i--) {
        const pipe = gameState.pipes[i];
        
        // 移動管道
        pipe.x -= PIPE_SPEED;
        
        // 檢查是否通過管道
        if (!pipe.passed && gameState.bird.x > pipe.x + pipe.width) {
            pipe.passed = true;
            gameState.score++;
            document.getElementById('score').textContent = gameState.score;
            
            // 播放得分音效
            scoreSound.play();
            
            // 顯示鼓勵語
            showEncouragement();
            
            // 添加粒子效果
            addParticles(gameState.bird.x + gameState.bird.width, gameState.bird.y, 20, getRandomColor());
        }
        
        // 檢查碰撞
        if (checkCollision(gameState.bird, pipe)) {
            gameOver();
            return;
        }
        
        // 移除超出畫面的管道
        if (pipe.x + pipe.width < 0) {
            gameState.pipes.splice(i, 1);
        }
    }
}

// 檢查碰撞
function checkCollision(bird, pipe) {
    // 簡化的碰撞檢測
    if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipe.width) {
        if (bird.y < pipe.gapTop || bird.y + bird.height > pipe.gapBottom) {
            return true;
        }
    }
    return false;
}

// 顯示鼓勵語
function showEncouragement() {
    const encouragementElement = document.getElementById('encouragement');
    const randomIndex = Math.floor(Math.random() * ENCOURAGEMENTS.length);
    encouragementElement.textContent = ENCOURAGEMENTS[randomIndex];
    encouragementElement.classList.remove('hidden');
    
    // 重置動畫
    encouragementElement.style.animation = 'none';
    encouragementElement.offsetHeight; // 觸發重排
    encouragementElement.style.animation = 'fadeInOut 2s ease-in-out';
    
    // 2秒後隱藏
    setTimeout(() => {
        encouragementElement.classList.add('hidden');
    }, 2000);
}

// 添加粒子效果
function addParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        gameState.particles.push({
            x: x,
            y: y,
            size: Math.random() * 5 + 2,
            speedX: (Math.random() - 0.5) * 5,
            speedY: (Math.random() - 0.5) * 5,
            color: color || getRandomColor(),
            life: 30
        });
    }
}

// 更新粒子
function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particle = gameState.particles[i];
        
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
        
        if (particle.life <= 0) {
            gameState.particles.splice(i, 1);
        }
    }
}

// 獲取隨機顏色
function getRandomColor() {
    const colors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe', '#fd79a8'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 繪製遊戲
function drawGame() {
    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製背景
    drawBackground();
    
    // 繪製管道
    drawPipes();
    
    // 繪製小鳥
    drawBird();
    
    // 繪製粒子
    drawParticles();
}

// 繪製背景
function drawBackground() {
    // 天空漸變
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#74b9ff');
    gradient.addColorStop(1, '#a29bfe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 繪製雲朵
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 5; i++) {
        const x = (canvas.width * i / 4 + Date.now() / 2000 * canvas.width) % canvas.width;
        const y = canvas.height * 0.2 + Math.sin(Date.now() / 1000 + i) * 20;
        drawCloud(x, y, 60 + i * 10);
    }
}

// 繪製雲朵
function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size / 3, 0, Math.PI * 2);
    ctx.arc(x + size / 3, y - size / 6, size / 3, 0, Math.PI * 2);
    ctx.arc(x + size / 1.5, y, size / 3, 0, Math.PI * 2);
    ctx.arc(x + size / 3, y + size / 6, size / 3, 0, Math.PI * 2);
    ctx.fill();
}

// 繪製小鳥
function drawBird() {
    ctx.save();
    
    // 移動到小鳥中心點
    ctx.translate(gameState.bird.x + gameState.bird.width / 2, gameState.bird.y + gameState.bird.height / 2);
    
    // 旋轉小鳥
    ctx.rotate(gameState.bird.rotation * Math.PI / 180);
    
    // 繪製小鳥身體
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.ellipse(0, 0, gameState.bird.width / 2, gameState.bird.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 繪製小鳥眼睛
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(gameState.bird.width / 4, -gameState.bird.height / 6, gameState.bird.width / 10, 0, Math.PI * 2);
    ctx.fill();
    
    // 繪製小鳥嘴巴
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(gameState.bird.width / 2, 0);
    ctx.lineTo(gameState.bird.width / 2 + 10, -5);
    ctx.lineTo(gameState.bird.width / 2 + 10, 5);
    ctx.closePath();
    ctx.fill();
    
    // 繪製小鳥翅膀
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(-gameState.bird.width / 4, 0, gameState.bird.width / 3, gameState.bird.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// 繪製管道
function drawPipes() {
    ctx.fillStyle = '#2ecc71';
    
    for (const pipe of gameState.pipes) {
        // 上方管道
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapTop);
        
        // 下方管道
        ctx.fillRect(pipe.x, pipe.gapBottom, pipe.width, canvas.height - pipe.gapBottom);
        
        // 管道邊緣
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(pipe.x - 5, pipe.gapTop - 20, pipe.width + 10, 20);
        ctx.fillRect(pipe.x - 5, pipe.gapBottom, pipe.width + 10, 20);
        ctx.fillStyle = '#2ecc71';
    }
}

// 繪製粒子
function drawParticles() {
    for (const particle of gameState.particles) {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// 遊戲循環
function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    // 生成管道
    spawnPipe();
    
    // 更新遊戲狀態
    updateBird();
    updatePipes();
    updateParticles();
    
    // 繪製遊戲
    drawGame();
    
    // 繼續遊戲循環
    requestAnimationFrame(gameLoop);
}

// 事件監聽
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (!gameState.isRunning && document.getElementById('startScreen').classList.contains('hidden')) {
            initGame();
            startGame();
        } else {
            flapBird();
        }
    }
});

canvas.addEventListener('click', () => {
    if (!gameState.isRunning && document.getElementById('startScreen').classList.contains('hidden')) {
        initGame();
        startGame();
    } else {
        flapBird();
    }
});

document.getElementById('startButton').addEventListener('click', () => {
    startGame();
});

document.getElementById('restartButton').addEventListener('click', () => {
    initGame();
    startGame();
});

// 觸摸事件支持（針對移動設備）
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.isRunning && document.getElementById('startScreen').classList.contains('hidden')) {
        initGame();
        startGame();
    } else {
        flapBird();
    }
});

// 初始化遊戲
initGame();