const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const worldWidth = 20000;
const ground = { x: 0, y: 650, width: worldWidth, height: 64 };

// === IMAGENS ===
const frente = new Image(); frente.src = "osvaldo_frente.png";
const direita = new Image(); direita.src = "osvaldo_direita.png";
const esquerda = new Image(); esquerda.src = "osvaldo_esquerda.png";

const bloco = new Image(); bloco.src = "bloco-super-mario.png";
const tubo = new Image(); tubo.src = "tubo.png";
const blocoLevelUp = new Image(); blocoLevelUp.src = "bloco level up.png";
const backgroundImg = new Image(); backgroundImg.src = "fundinho.png";
const moedaImg = new Image(); moedaImg.src = "skol.png";   

const gravity = 0.4;
const keys = {};

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// === SOM DA MOEDA ===
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playCoinSound() {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}

const player = {
    x: 100, y: 300, width: 60, height: 60,
    velX: 0, velY: 0, speed: 5.5, jump: -15,
    grounded: false, sprite: frente,
    big: false, enteringPipe: false, win: false
};

const flag = { x: 19500, y: 180, width: 80, height: 470 };

// Plataformas com alturas baseadas no offsetY
const platforms = [
    { x: 500,   offsetY: 150, width: 256, height: 64, y: 0 },
    { x: 1000,  offsetY: 250, width: 256, height: 64, y: 0 },
    { x: 1500,  offsetY: 350, width: 256, height: 64, y: 0 },
    { x: 2400,  offsetY: 150, width: 256, height: 64, y: 0 },
    { x: 3000,  offsetY: 250, width: 256, height: 64, y: 0 },
    { x: 3700,  offsetY: 350, width: 256, height: 64, y: 0 },
    { x: 4500,  offsetY: 150, width: 256, height: 64, y: 0 },
    { x: 5500,  offsetY: 250, width: 256, height: 64, y: 0 },
    { x: 6500,  offsetY: 350, width: 256, height: 64, y: 0 },
    { x: 7600,  offsetY: 150, width: 256, height: 64, y: 0 },
    { x: 8700,  offsetY: 250, width: 256, height: 64, y: 0 },
    { x: 9800,  offsetY: 350, width: 256, height: 64, y: 0 },
    { x: 11000, offsetY: 150, width: 256, height: 64, y: 0 },
    { x: 12300, offsetY: 250, width: 256, height: 64, y: 0 },
    { x: 13600, offsetY: 350, width: 256, height: 64, y: 0 },
    { x: 15000, offsetY: 150, width: 256, height: 64, y: 0 },
    { x: 16500, offsetY: 250, width: 256, height: 64, y: 0 },
    { x: 18000, offsetY: 350, width: 256, height: 64, y: 0 }
];

const powerBlocks = [{ x: 2200, offsetY: 400, width: 64, height: 64, y: 0, used: false }];

const pipes = [
    { x: 800,   y: 522, width: 100, height: 128, destinationX: 5000,  destinationY: 500 },
    { x: 5200,  y: 522, width: 100, height: 128, destinationX: 9500,  destinationY: 500 },
    { x: 9700,  y: 522, width: 100, height: 128, destinationX: 14000, destinationY: 500 },
    { x: 14500, y: 522, width: 100, height: 128, destinationX: 18500, destinationY: 500 }
];

// Moedas geradas dinamicamente
const coins = [];
for (let i = 0; i < 80; i++) {
    coins.push({ 
        x: 400 + i * 220, 
        baseY: 250 + Math.sin(i) * 120, 
        y: 0, 
        size: 40, 
        collected: false 
    });
}

// Inimigos
const enemies = [];
for (let i = 0; i < 30; i++) {
    enemies.push({ x: 1200 + i * 600, y: 610, width: 40, height: 40, dir: 1, start: 1200 + i * 600 });
}

// === SISTEMA DE REDIMENSIONAMENTO AUTOMÁTICO ===
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    ground.y = canvas.height - 118; 

    platforms.forEach(platform => {
        platform.y = ground.y - platform.offsetY;
    });

    powerBlocks.forEach(block => {
        block.y = ground.y - block.offsetY;
    });

    // Ajuste proporcional das moedas baseado na variação da altura da tela
    const scaleFactor = canvas.height / 768;
    coins.forEach(coin => {
        coin.y = coin.baseY * scaleFactor;
    });

    enemies.forEach(enemy => {
        enemy.y = ground.y - enemy.height;
    });

    pipes.forEach(pipe => {
        pipe.y = ground.y - pipe.height;
    });
    
    flag.y = ground.y - flag.height;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let score = 0;
let cameraX = 0;

function collision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
}

function pointCollision(player, coin) {
    return player.x < coin.x + coin.size && player.x + player.width > coin.x &&
           player.y < coin.y + coin.size && player.y + player.height > coin.y;
}

function platformCollision(obj) {
    if (collision(player, obj) && player.velY > 0) {
        player.y = obj.y - player.height;
        player.velY = 0;
        player.grounded = true;
    }
}

function update() {
    if (player.win || player.enteringPipe) {
        if (player.enteringPipe) player.y += 2;
        return;
    }

    player.velX = 0;
    if (keys["a"]) { player.velX = -player.speed; player.sprite = esquerda; }
    if (keys["d"]) { player.velX = player.speed; player.sprite = direita; }
    if (!keys["a"] && !keys["d"]) player.sprite = frente;

    if (keys["w"] && player.grounded) {
        player.velY = player.jump;
        player.grounded = false;
    }

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;
    player.grounded = false;

    platformCollision(ground);
    platforms.forEach(platformCollision);

    pipes.forEach(pipe => {
        if (collision(player, pipe)) {
            if (player.velY > 0) {
                player.y = pipe.y - player.height;
                player.velY = 0;
                player.grounded = true;
            }
            if (keys["s"]) {
                player.enteringPipe = true;
                setTimeout(() => {
                    player.x = pipe.destinationX;
                    player.y = pipe.destinationY;
                    player.enteringPipe = false;
                }, 700);
            }
        }
    });

    powerBlocks.forEach(block => {
        if (!block.used && player.velY < 0 && collision(player, block)) {
            block.used = true;
            player.big = true;
            player.width = 80;
            player.height = 80;
            score += 500;
        }
    });

    coins.forEach(coin => {
        if (!coin.collected && pointCollision(player, coin)) {
            coin.collected = true;
            score += 100;
            playCoinSound();        
        }
    });

    enemies.forEach(enemy => {
        enemy.x += enemy.dir;
        if (enemy.x > enemy.start + 100) enemy.dir = -1;
        if (enemy.x < enemy.start - 100) enemy.dir = 1;

        if (collision(player, enemy)) {
            if (player.velY > 0) {
                player.velY = -10;
                enemy.x = -999999;
                score += 300;
            } else {
                if (player.big) {
                    player.big = false;
                    player.width = 48;
                    player.height = 48;
                } else {
                    player.x = 100;
                    player.y = 300;
                    score = Math.max(0, score - 500);
                }
            }
        }
    });

    if (collision(player, flag)) player.win = true;
    if (player.y > 1200) { player.x = 100; player.y = 300; }

    cameraX += (player.x - canvas.width / 2 - cameraX) * 0.08;
    if (cameraX < 0) cameraX = 0;
}

function drawGround(obj) {
    for (let x = 0; x < obj.width; x += 64) {
        ctx.drawImage(bloco, obj.x + x, obj.y, 64, 64);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    drawGround(ground);
    platforms.forEach(drawGround);

    powerBlocks.forEach(block => {
        ctx.drawImage(blocoLevelUp, block.x, block.y, block.width, block.height);
    });

    pipes.forEach(pipe => ctx.drawImage(tubo, pipe.x, pipe.y, pipe.width, pipe.height));

    coins.forEach(coin => {
        if (!coin.collected) {
            ctx.drawImage(moedaImg, coin.x, coin.y, coin.size, coin.size);
        }
    });

    ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
    
    // Desenho dos inimigos adicionado de volta no ciclo de renderização
    ctx.fillStyle = "#FF00FF"; // Cor temporária caso a imagem do inimigo falhe
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });

    ctx.fillStyle = "#FF0000";
    ctx.fillRect(flag.x, flag.y, flag.width, flag.height);

    ctx.restore();

    ctx.fillStyle = "#FFF";
    ctx.font = "20px Arial";
    ctx.fillText("SCORE: " + score, 20, 40);

    if (player.win) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFF";
        ctx.font = "40px Arial";
        ctx.fillText("VOCÊ VENCEU!", canvas.width / 2 - 120, canvas.height / 2);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop();
