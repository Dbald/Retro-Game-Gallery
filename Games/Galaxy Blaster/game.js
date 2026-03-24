// game.js - Galaxy Blaster main engine
(() => {
'use strict';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 640, H = 480;

// ---- Screens ----
const screens = {
    menu: document.getElementById('menu-screen'),
    howto: document.getElementById('howto-screen'),
    scores: document.getElementById('scores-screen'),
    hud: document.getElementById('hud'),
    pause: document.getElementById('pause-screen'),
    gameover: document.getElementById('gameover-screen'),
};
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    if (name && screens[name]) screens[name].classList.remove('hidden');
}

// ---- State ----
let state = 'menu'; // menu, playing, paused, gameover
let keys = {};
let score, lives, wave, waveTimer, enemies, bullets, enemyBullets, particles, powerUps, stars;
let player, invTimer, fireTimer, fireCd, shakeTimer, shakeAmt;
let powerUpActive, powerUpTimer, powerUpType;
let waveEnemiesLeft, waveActive, waveDelay, waveNum;
let highScore = parseInt(localStorage.getItem('gb_highscore')) || 0;
let screenBlastReady;

// ---- Constants ----
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const FIRE_RATE = 8; // frames between shots
const RAPID_FIRE_RATE = 4;
const INV_DUR = 90; // invincibility frames after hit
const POWERUP_DUR = 480; // 8 seconds at 60fps
const ENEMY_TYPES = {
    scout:   { w: 24, h: 20, hp: 1, speed: 1.5, score: 50,  color: '#4f8',  shoots: false },
    attacker:{ w: 28, h: 22, hp: 1, speed: 2,   score: 100, color: '#f84',  shoots: true, fireRate: 120 },
    zigzag:  { w: 22, h: 20, hp: 1, speed: 2.5, score: 150, color: '#f4f',  shoots: false },
    heavy:   { w: 32, h: 28, hp: 3, speed: 1,   score: 250, color: '#fa0',  shoots: true, fireRate: 80 },
};
const POWERUP_TYPES = ['rapid', 'double', 'shield', 'blast'];

// ---- Init ----
function initGame() {
    score = 0; lives = 3; wave = 0;
    enemies = []; bullets = []; enemyBullets = []; particles = []; powerUps = [];
    invTimer = 0; fireTimer = 0; fireCd = FIRE_RATE;
    shakeTimer = 0; shakeAmt = 0;
    powerUpActive = null; powerUpTimer = 0; powerUpType = '';
    waveActive = false; waveDelay = 60; waveNum = 0;
    screenBlastReady = false;
    player = { x: W / 2 - 16, y: H - 60, w: 32, h: 32, hasShield: false };
    initStars();
    nextWave();
}

function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            speed: 0.3 + Math.random() * 1.5,
            size: Math.random() < 0.3 ? 2 : 1,
            bright: 0.3 + Math.random() * 0.7
        });
    }
}

// ---- Wave System ----
function nextWave() {
    waveNum++;
    wave = waveNum;
    waveDelay = 90;
    waveActive = false;
}

function spawnWave() {
    waveActive = true;
    const w = waveNum;
    const formations = [];

    if (w <= 2) {
        // Easy: scouts only
        const count = 4 + w * 2;
        for (let i = 0; i < count; i++) {
            formations.push(makeEnemy('scout', 40 + i * 70, -30 - Math.floor(i / 6) * 40));
        }
    } else if (w <= 5) {
        // Mix scouts and attackers
        const scouts = 3 + w;
        const attackers = Math.floor(w / 2);
        for (let i = 0; i < scouts; i++) {
            formations.push(makeEnemy('scout', 30 + i * 65, -30 - Math.floor(i / 7) * 40));
        }
        for (let i = 0; i < attackers; i++) {
            formations.push(makeEnemy('attacker', 80 + i * 120, -80));
        }
    } else if (w <= 8) {
        // Add zigzag and more attackers
        const scouts = 3 + Math.floor(w / 2);
        const attackers = 2 + Math.floor(w / 3);
        const zigzags = Math.floor(w / 3);
        for (let i = 0; i < scouts; i++) formations.push(makeEnemy('scout', 20 + i * 60, -30 - (i % 2) * 30));
        for (let i = 0; i < attackers; i++) formations.push(makeEnemy('attacker', 60 + i * 110, -80));
        for (let i = 0; i < zigzags; i++) formations.push(makeEnemy('zigzag', 100 + i * 140, -60));
    } else {
        // Wave 9+: everything, including heavies
        const scouts = 4 + Math.floor(w / 3);
        const attackers = 2 + Math.floor(w / 3);
        const zigzags = 1 + Math.floor(w / 4);
        const heavies = Math.max(1, Math.floor((w - 7) / 2));
        for (let i = 0; i < scouts; i++) formations.push(makeEnemy('scout', 20 + (i % 8) * 72, -30 - Math.floor(i / 8) * 40));
        for (let i = 0; i < attackers; i++) formations.push(makeEnemy('attacker', 50 + i * 100, -90));
        for (let i = 0; i < zigzags; i++) formations.push(makeEnemy('zigzag', 80 + i * 120, -60));
        for (let i = 0; i < heavies; i++) formations.push(makeEnemy('heavy', 150 + i * 180, -130));
    }

    // Difficulty scaling
    const speedMult = 1 + (w - 1) * 0.06;
    for (const e of formations) {
        e.speed *= speedMult;
        if (e.fireRate) e.fireRate = Math.max(30, e.fireRate - w * 3);
        enemies.push(e);
    }
}

function makeEnemy(type, x, y) {
    const t = ENEMY_TYPES[type];
    return {
        type, x, y, w: t.w, h: t.h,
        hp: t.hp, maxHp: t.hp,
        speed: t.speed, baseSpeed: t.speed,
        score: t.score, color: t.color,
        shoots: t.shoots,
        fireRate: t.fireRate || 999,
        fireTimer: Math.floor(Math.random() * 60),
        movePhase: Math.random() * Math.PI * 2,
        entered: false,
        targetY: 40 + Math.random() * 160,
        flashTimer: 0,
        alive: true
    };
}

// ---- Collision ----
function boxOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- Particles ----
function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 20,
            maxLife: 40,
            size: 1 + Math.random() * 3,
            color
        });
    }
}

function spawnScorePop(x, y, text) {
    particles.push({
        x, y, vx: 0, vy: -1.5,
        life: 40, maxLife: 40,
        size: 0, color: '#0ff',
        text
    });
}

// ---- Power-ups ----
function spawnPowerUp(x, y) {
    if (Math.random() > 0.18) return; // ~18% drop rate
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    powerUps.push({ x, y, w: 20, h: 20, type, vy: 1.5, timer: 0 });
}

function activatePowerUp(type) {
    if (type === 'blast') {
        // Clear all enemies on screen
        for (const e of enemies) {
            if (e.alive && e.y > 0) {
                score += e.score;
                spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 8);
                e.alive = false;
            }
        }
        enemyBullets = [];
        shakeTimer = 12; shakeAmt = 6;
        Audio.explosion();
        return;
    }
    if (type === 'shield') {
        player.hasShield = true;
        Audio.shield();
        return;
    }
    // Timed power-ups
    powerUpActive = type;
    powerUpTimer = POWERUP_DUR;
    powerUpType = type;
    if (type === 'rapid') fireCd = RAPID_FIRE_RATE;
}

// ---- Player firing ----
function firePlayerBullet() {
    const cx = player.x + player.w / 2;
    const by = player.y - 4;
    if (powerUpActive === 'double') {
        bullets.push({ x: cx - 10, y: by, w: 4, h: 10, vy: -BULLET_SPEED });
        bullets.push({ x: cx + 6, y: by, w: 4, h: 10, vy: -BULLET_SPEED });
    } else {
        bullets.push({ x: cx - 2, y: by, w: 4, h: 10, vy: -BULLET_SPEED });
    }
    Audio.laser();
}

// ---- Enemy AI ----
function updateEnemy(e) {
    if (!e.alive) return;
    if (e.flashTimer > 0) e.flashTimer--;
    e.movePhase += 0.03;

    // Enter from top
    if (!e.entered) {
        e.y += e.speed * 1.5;
        if (e.y >= e.targetY) {
            e.entered = true;
            e.y = e.targetY;
        }
        return;
    }

    // Movement patterns by type
    if (e.type === 'scout') {
        e.x += Math.sin(e.movePhase) * e.speed * 0.8;
        e.y += Math.sin(e.movePhase * 0.5) * 0.3;
    } else if (e.type === 'attacker') {
        e.x += Math.sin(e.movePhase * 0.8) * e.speed * 1.2;
        e.y += Math.cos(e.movePhase * 0.4) * 0.4;
    } else if (e.type === 'zigzag') {
        e.x += Math.sin(e.movePhase * 2) * e.speed * 1.5;
        e.y += Math.sin(e.movePhase * 0.3) * 0.5;
    } else if (e.type === 'heavy') {
        e.x += Math.sin(e.movePhase * 0.4) * e.speed * 0.6;
    }

    // Keep on screen
    if (e.x < 4) e.x = 4;
    if (e.x + e.w > W - 4) e.x = W - 4 - e.w;
    if (e.y < 10) e.y = 10;
    if (e.y > H * 0.55) e.y = H * 0.55;

    // Shooting
    if (e.shoots) {
        e.fireTimer++;
        if (e.fireTimer >= e.fireRate) {
            e.fireTimer = 0;
            const bx = e.x + e.w / 2 - 2;
            const by = e.y + e.h;
            if (e.type === 'heavy') {
                // Heavy fires 3 spread shots
                enemyBullets.push({ x: bx, y: by, w: 4, h: 8, vx: -0.8, vy: 3 });
                enemyBullets.push({ x: bx, y: by, w: 4, h: 8, vx: 0, vy: 3.5 });
                enemyBullets.push({ x: bx, y: by, w: 4, h: 8, vx: 0.8, vy: 3 });
            } else {
                enemyBullets.push({ x: bx, y: by, w: 4, h: 8, vx: 0, vy: 3.5 });
            }
            Audio.enemyShoot();
        }
    }
}

// ---- Update ----
function update() {
    // Stars parallax
    for (const s of stars) {
        s.y += s.speed;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }

    if (state !== 'playing') return;

    // Wave management
    if (!waveActive) {
        waveDelay--;
        if (waveDelay <= 0) spawnWave();
    } else {
        const aliveCount = enemies.filter(e => e.alive).length;
        if (aliveCount === 0) {
            score += waveNum * 100; // wave clear bonus
            Audio.waveClear();
            spawnScorePop(W / 2 - 40, H / 2, 'WAVE CLEAR +' + (waveNum * 100));
            nextWave();
        }
    }

    // Player movement
    let dx = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
    if (keys['ArrowRight'] || keys['KeyD']) dx = 1;
    player.x += dx * PLAYER_SPEED;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    // Player fire
    if (fireTimer > 0) fireTimer--;
    if (keys['Space'] && fireTimer <= 0) {
        firePlayerBullet();
        fireTimer = fireCd;
    }

    // Invincibility
    if (invTimer > 0) invTimer--;

    // Power-up timer
    if (powerUpTimer > 0) {
        powerUpTimer--;
        if (powerUpTimer <= 0) {
            powerUpActive = null;
            fireCd = FIRE_RATE;
        }
    }

    // Shake
    if (shakeTimer > 0) shakeTimer--;

    // Update bullets
    for (const b of bullets) { b.y += b.vy; }
    bullets = bullets.filter(b => b.y > -20);

    // Update enemy bullets
    for (const b of enemyBullets) { b.x += (b.vx || 0); b.y += b.vy; }
    enemyBullets = enemyBullets.filter(b => b.y < H + 10 && b.x > -10 && b.x < W + 10);

    // Update enemies
    for (const e of enemies) updateEnemy(e);
    enemies = enemies.filter(e => e.alive);

    // Update power-ups
    for (const p of powerUps) { p.y += p.vy; p.timer += 0.05; }
    powerUps = powerUps.filter(p => p.y < H + 20);

    // Update particles
    for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.life--;
    }
    particles = particles.filter(p => p.life > 0);

    // ---- Collisions ----
    // Player bullets vs enemies
    for (const b of bullets) {
        for (const e of enemies) {
            if (!e.alive) continue;
            if (boxOverlap(b, e)) {
                b.y = -100; // remove bullet
                e.hp--;
                e.flashTimer = 4;
                if (e.hp <= 0) {
                    e.alive = false;
                    score += e.score;
                    spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 12);
                    spawnScorePop(e.x, e.y - 10, '+' + e.score);
                    spawnPowerUp(e.x + e.w / 2, e.y + e.h / 2);
                    shakeTimer = 4; shakeAmt = 3;
                    Audio.explosion();
                } else {
                    Audio.smallExplosion();
                    spawnExplosion(b.x, b.y, '#ff8', 4);
                }
                break;
            }
        }
    }
    bullets = bullets.filter(b => b.y > -20);

    // Enemy bullets vs player
    if (invTimer <= 0) {
        for (const b of enemyBullets) {
            if (boxOverlap(b, player)) {
                b.y = H + 100;
                hitPlayer();
                break;
            }
        }
    }

    // Enemies vs player (collision damage)
    if (invTimer <= 0) {
        for (const e of enemies) {
            if (e.alive && e.entered && boxOverlap(e, player)) {
                hitPlayer();
                break;
            }
        }
    }

    // Power-ups vs player
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (boxOverlap(powerUps[i], player)) {
            activatePowerUp(powerUps[i].type);
            if (powerUps[i].type !== 'shield' && powerUps[i].type !== 'blast') {
                Audio.powerUp();
            }
            spawnScorePop(powerUps[i].x, powerUps[i].y, powerUps[i].type.toUpperCase());
            powerUps.splice(i, 1);
        }
    }

    // Update HUD
    document.getElementById('hud-score').textContent = 'SCORE: ' + score;
    document.getElementById('hud-wave').textContent = 'WAVE ' + wave;
    document.getElementById('hud-lives').textContent = 'LIVES: ' + '\u2764 '.repeat(lives).trim();
    const puEl = document.getElementById('hud-powerup');
    if (powerUpActive) {
        const secs = Math.ceil(powerUpTimer / 60);
        puEl.textContent = powerUpType.toUpperCase() + ' ' + secs + 's';
    } else if (player.hasShield) {
        puEl.textContent = 'SHIELD';
    } else {
        puEl.textContent = '';
    }
}

function hitPlayer() {
    if (player.hasShield) {
        player.hasShield = false;
        spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, '#0ff', 10);
        invTimer = 30;
        Audio.shield();
        return;
    }
    lives--;
    invTimer = INV_DUR;
    shakeTimer = 10; shakeAmt = 5;
    spawnExplosion(player.x + player.w / 2, player.y + player.h / 2, '#f44', 15);
    Audio.playerHit();
    if (lives <= 0) {
        gameOver();
    }
}

function gameOver() {
    state = 'gameover';
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('gb_highscore', highScore);
    }
    document.getElementById('go-score').textContent = score;
    document.getElementById('go-wave').textContent = wave;
    document.getElementById('go-best').textContent = highScore;
    showScreen('gameover');
    Audio.gameOver();
}

// ---- Drawing ----
function draw() {
    ctx.save();
    // Screen shake
    if (shakeTimer > 0) {
        const sx = (Math.random() - 0.5) * shakeAmt * 2;
        const sy = (Math.random() - 0.5) * shakeAmt * 2;
        ctx.translate(sx, sy);
    }

    // Background
    ctx.fillStyle = '#060612';
    ctx.fillRect(-10, -10, W + 20, H + 20);

    // Stars
    for (const s of stars) {
        ctx.globalAlpha = s.bright;
        ctx.fillStyle = '#aac';
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    if (state === 'menu' || state === 'gameover') {
        ctx.restore();
        return;
    }

    // Player bullets
    ctx.fillStyle = '#0ff';
    for (const b of bullets) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // Glow
        ctx.globalAlpha = 0.3;
        ctx.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
        ctx.globalAlpha = 1;
    }

    // Enemy bullets
    ctx.fillStyle = '#f44';
    for (const b of enemyBullets) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(b.x - 2, b.y - 1, b.w + 4, b.h + 2);
        ctx.globalAlpha = 1;
    }

    // Enemies
    for (const e of enemies) drawEnemy(e);

    // Power-ups
    for (const p of powerUps) drawPowerUp(p);

    // Player
    drawPlayer();

    // Particles
    for (const p of particles) {
        if (p.text) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.font = '12px Courier New';
            ctx.fillText(p.text, p.x, p.y);
            ctx.globalAlpha = 1;
        } else {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1;
        }
    }

    // Wave announcement
    if (!waveActive && waveDelay > 30) {
        ctx.globalAlpha = Math.min(1, (waveDelay - 30) / 30);
        ctx.fillStyle = '#0ff';
        ctx.font = '28px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('WAVE ' + waveNum, W / 2, H / 2 - 10);
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#88f';
        ctx.fillText('GET READY', W / 2, H / 2 + 18);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

function drawPlayer() {
    if (invTimer > 0 && Math.floor(invTimer / 3) % 2) return;
    const x = Math.round(player.x), y = Math.round(player.y);

    // Engine glow
    ctx.fillStyle = '#08f';
    ctx.globalAlpha = 0.5 + Math.random() * 0.3;
    ctx.fillRect(x + 10, y + 30, 5, 6 + Math.random() * 4);
    ctx.fillRect(x + 17, y + 30, 5, 6 + Math.random() * 4);
    ctx.globalAlpha = 1;

    // Ship body
    ctx.fillStyle = '#1af';
    ctx.beginPath();
    ctx.moveTo(x + 16, y);
    ctx.lineTo(x + 28, y + 24);
    ctx.lineTo(x + 22, y + 30);
    ctx.lineTo(x + 10, y + 30);
    ctx.lineTo(x + 4, y + 24);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#0ff';
    ctx.fillRect(x + 13, y + 6, 6, 10);
    ctx.fillStyle = '#8ff';
    ctx.fillRect(x + 14, y + 8, 4, 6);

    // Wings
    ctx.fillStyle = '#08a';
    ctx.fillRect(x, y + 18, 8, 10);
    ctx.fillRect(x + 24, y + 18, 8, 10);

    // Wing tips
    ctx.fillStyle = '#0cf';
    ctx.fillRect(x, y + 16, 3, 6);
    ctx.fillRect(x + 29, y + 16, 3, 6);

    // Shield
    if (player.hasShield) {
        ctx.strokeStyle = '#0ff';
        ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.01) * 0.2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function drawEnemy(e) {
    if (!e.alive) return;
    const x = Math.round(e.x), y = Math.round(e.y);

    if (e.flashTimer > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, e.w, e.h);
        return;
    }

    if (e.type === 'scout') {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(x + e.w / 2, y + e.h);
        ctx.lineTo(x + e.w, y);
        ctx.lineTo(x, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2a4';
        ctx.fillRect(x + 8, y + 4, 8, 6);
        // Eye
        ctx.fillStyle = '#ff0';
        ctx.fillRect(x + 10, y + 6, 4, 3);
    } else if (e.type === 'attacker') {
        ctx.fillStyle = e.color;
        ctx.fillRect(x + 4, y, e.w - 8, e.h);
        ctx.fillRect(x, y + 6, e.w, e.h - 12);
        // Cannon
        ctx.fillStyle = '#c60';
        ctx.fillRect(x + 11, y + e.h - 4, 6, 6);
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.fillRect(x + 7, y + 6, 4, 4);
        ctx.fillRect(x + 17, y + 6, 4, 4);
    } else if (e.type === 'zigzag') {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(x + e.w / 2, y);
        ctx.lineTo(x + e.w, y + e.h / 2);
        ctx.lineTo(x + e.w / 2, y + e.h);
        ctx.lineTo(x, y + e.h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a0a';
        ctx.fillRect(x + 7, y + 7, 8, 6);
        ctx.fillStyle = '#f0f';
        ctx.fillRect(x + 9, y + 9, 4, 3);
    } else if (e.type === 'heavy') {
        ctx.fillStyle = e.color;
        ctx.fillRect(x + 2, y + 4, e.w - 4, e.h - 8);
        ctx.fillRect(x, y + 8, e.w, e.h - 16);
        // Armor plates
        ctx.fillStyle = '#c80';
        ctx.fillRect(x + 4, y + 6, e.w - 8, 4);
        ctx.fillRect(x + 4, y + e.h - 10, e.w - 8, 4);
        // Cannons
        ctx.fillStyle = '#a60';
        ctx.fillRect(x + 2, y + e.h - 6, 6, 8);
        ctx.fillRect(x + e.w - 8, y + e.h - 6, 6, 8);
        ctx.fillRect(x + e.w / 2 - 3, y + e.h - 4, 6, 6);
        // Eyes
        ctx.fillStyle = '#ff0';
        ctx.fillRect(x + 8, y + 12, 5, 4);
        ctx.fillRect(x + 19, y + 12, 5, 4);
        // HP bar
        if (e.hp < e.maxHp) {
            ctx.fillStyle = '#400';
            ctx.fillRect(x, y - 5, e.w, 3);
            ctx.fillStyle = '#f00';
            ctx.fillRect(x, y - 5, e.w * (e.hp / e.maxHp), 3);
        }
    }
}

function drawPowerUp(p) {
    const x = Math.round(p.x) - 10, y = Math.round(p.y) - 10;
    const glow = 0.4 + Math.sin(p.timer * 3) * 0.3;

    // Glow
    ctx.globalAlpha = glow * 0.3;
    ctx.fillStyle = getPowerUpColor(p.type);
    ctx.beginPath();
    ctx.arc(x + 10, y + 10, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Box
    ctx.fillStyle = '#112';
    ctx.fillRect(x + 2, y + 2, 16, 16);
    ctx.strokeStyle = getPowerUpColor(p.type);
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, 16, 16);

    // Icon
    ctx.fillStyle = getPowerUpColor(p.type);
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    const labels = { rapid: 'R', double: 'D', shield: 'S', blast: 'B' };
    ctx.fillText(labels[p.type] || '?', x + 10, y + 14);
    ctx.textAlign = 'left';
}

function getPowerUpColor(type) {
    const colors = { rapid: '#ff0', double: '#0f0', shield: '#0ff', blast: '#f0f' };
    return colors[type] || '#fff';
}

// ---- Game Loop ----
let lastTime = 0;
let accumulator = 0;
const FRAME_TIME = 1000 / 60;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += delta;

    // Cap to prevent spiral of death
    if (accumulator > 200) accumulator = 200;

    while (accumulator >= FRAME_TIME) {
        update();
        accumulator -= FRAME_TIME;
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// ---- Input ----
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if ((e.code === 'Escape' || e.code === 'KeyP') && state === 'playing') {
        state = 'paused';
        showScreen('pause');
    } else if ((e.code === 'Escape' || e.code === 'KeyP') && state === 'paused') {
        resumeGame();
    }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ---- Menu Buttons ----
document.getElementById('btn-start').addEventListener('click', () => {
    Audio.start();
    startGame();
});
document.getElementById('btn-howto').addEventListener('click', () => {
    Audio.select();
    showScreen('howto');
});
document.getElementById('btn-howto-back').addEventListener('click', () => {
    Audio.select();
    showScreen('menu');
});
document.getElementById('btn-scores').addEventListener('click', () => {
    Audio.select();
    document.getElementById('high-score-display').textContent = highScore;
    showScreen('scores');
});
document.getElementById('btn-scores-back').addEventListener('click', () => {
    Audio.select();
    showScreen('menu');
});
document.getElementById('btn-resume').addEventListener('click', () => {
    Audio.select();
    resumeGame();
});
document.getElementById('btn-quit').addEventListener('click', () => {
    Audio.select();
    state = 'menu';
    showScreen('menu');
});
document.getElementById('btn-restart').addEventListener('click', () => {
    Audio.start();
    startGame();
});
document.getElementById('btn-menu').addEventListener('click', () => {
    Audio.select();
    state = 'menu';
    showScreen('menu');
});

function startGame() {
    initGame();
    state = 'playing';
    showScreen('hud');
}

function resumeGame() {
    state = 'playing';
    showScreen('hud');
}

// ---- Boot ----
initStars();
showScreen('menu');
requestAnimationFrame(gameLoop);

})();
