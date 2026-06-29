// ==================== SETUP ====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements
const hud = document.getElementById('hud');
const scoreValue = document.getElementById('score-value');
const highScoreValue = document.getElementById('high-score-value');
const hpBarFill = document.getElementById('hp-bar-fill');
const weaponName = document.getElementById('weapon-name');
const bossHud = document.getElementById('boss-hud');
const bossHpFill = document.getElementById('boss-hp-fill');
const waveValue = document.getElementById('wave-value');
const menuScreen = document.getElementById('menu-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');
const bossWarning = document.getElementById('boss-warning');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');
const menuHighScoreVal = document.getElementById('menu-high-score-val');
const finalScore = document.getElementById('final-score');
const finalWave = document.getElementById('final-wave');
const bossesDefeated = document.getElementById('bosses-defeated');
const enemiesDestroyed = document.getElementById('enemies-destroyed');
const newHighScoreEl = document.getElementById('new-high-score');
const goHighScore = document.getElementById('go-high-score');

// ==================== CONSTANTS ====================
const GAME_WIDTH = 480;
const GAME_HEIGHT = 720;

const PLAYER_SPEED = 5;
const PLAYER_MAX_HP = 5;
const PLAYER_W = 40;
const PLAYER_H = 48;

const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 3;

const POWERUP_TYPES = {
    SPREAD:    { color: '#4488ff', label: 'SPREAD', icon: 'S' },
    LASER:     { color: '#44ff88', label: 'LASER',  icon: 'L' },
    MISSILE:   { color: '#ff4444', label: 'MISSILE',icon: 'M' },
    SHIELD:    { color: '#ffdd44', label: 'SHIELD', icon: '◆' },
    HEALTH:    { color: '#ffffff', label: '+HP',    icon: '+' },
};

const WEAPON_NAMES = ['NORMAL', 'SPREAD', 'LASER', 'MISSILE', 'HYBRID'];

// ==================== GAME STATE ====================
let highScore = parseInt(localStorage.getItem('skyFighterHighScore') || '0', 10);
highScoreValue.textContent = highScore;
menuHighScoreVal.textContent = highScore;

let gameState = 'menu'; // menu | playing | paused | gameover
let score = 0;
let wave = 1;
let enemiesDestroyedTotal = 0;
let bossesDefeatedTotal = 0;
let frameCount = 0;
let difficulty = 1;

// Screen effects
let screenShake = 0;
let screenFlash = 0;
let bossWarningTimer = 0;

// Input
const keys = {};
let mouseX = GAME_WIDTH / 2;
let mouseY = GAME_HEIGHT - 100;
let mouseDown = false;
let useMouseControl = false;

// Collections
let player;
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let stars = [];
let explosions = [];
let floatingTexts = [];

// Wave management
let waveTimer = 0;
let waveEnemyCount = 0;
let waveEnemiesSpawned = 0;
let waveEnemiesKilled = 0;
let waveActive = false;
let bossActive = false;
let boss = null;
let waveTransitionTimer = 0;

// ==================== RESIZE ====================
function resizeCanvas() {
    const maxW = window.innerWidth - 20;
    const maxH = window.innerHeight - 20;
    const scale = Math.min(maxW / GAME_WIDTH, maxH / GAME_HEIGHT, 1);
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    canvas.style.width = `${GAME_WIDTH * scale}px`;
    canvas.style.height = `${GAME_HEIGHT * scale}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==================== STAR FIELD ====================
function initStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
        stars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * GAME_HEIGHT,
            speed: 0.3 + Math.random() * 2,
            size: 0.5 + Math.random() * 2,
            brightness: 0.3 + Math.random() * 0.7,
        });
    }
}

function updateStars() {
    for (const s of stars) {
        s.y += s.speed;
        if (s.y > GAME_HEIGHT) {
            s.y = -2;
            s.x = Math.random() * GAME_WIDTH;
        }
    }
}

function drawStars() {
    for (const s of stars) {
        ctx.globalAlpha = s.brightness;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ==================== PARTICLES ====================
function spawnParticles(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.7) * (speed || 3);
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: (life || 40) * (0.5 + Math.random() * 0.5),
            maxLife: life || 40,
            color: color || '#ff8844',
            size: (size || 3) * (0.5 + Math.random()),
        });
    }
}

function spawnExplosion(x, y, big) {
    const size = big ? 60 : 30;
    explosions.push({
        x, y,
        radius: 5,
        maxRadius: size,
        alpha: 1,
        ringAlpha: 1,
    });
    screenShake = big ? 12 : 5;
    screenFlash = big ? 0.5 : 0.2;
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        e.radius += (e.maxRadius - e.radius) * 0.15;
        e.alpha -= 0.04;
        e.ringAlpha -= 0.05;
        if (e.alpha <= 0) explosions.splice(i, 1);
    }
}

function drawExplosions() {
    for (const e of explosions) {
        // Outer glow
        const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        grad.addColorStop(0, `rgba(255, 255, 200, ${e.alpha})`);
        grad.addColorStop(0.4, `rgba(255, 150, 50, ${e.alpha * 0.7})`);
        grad.addColorStop(1, `rgba(255, 50, 0, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.strokeStyle = `rgba(255, 200, 100, ${e.ringAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60 });
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 1;
        ft.life--;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}

function drawFloatingTexts() {
    for (const ft of floatingTexts) {
        const alpha = ft.life / ft.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
}

// ==================== PLAYER ====================
function createPlayer() {
    return {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT - 80,
        w: PLAYER_W,
        h: PLAYER_H,
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        weapon: 'NORMAL',
        weaponLevel: 0,
        fireRate: 10,
        fireTimer: 0,
        shieldTimer: 0,
        invincibleTimer: 0,
        engineFlicker: 0,
    };
}

function drawPlayer() {
    const p = player;
    if (!p) return;

    // Invincibility blink
    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 3) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Engine flame
    p.engineFlicker += 0.3;
    const flameH = 12 + Math.sin(p.engineFlicker * 3) * 5;
    const flameGrad = ctx.createLinearGradient(0, p.h / 2, 0, p.h / 2 + flameH);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#ffaa00');
    flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-8, p.h / 2 - 2);
    ctx.lineTo(8, p.h / 2 - 2);
    ctx.lineTo(2, p.h / 2 + flameH);
    ctx.lineTo(-2, p.h / 2 + flameH);
    ctx.closePath();
    ctx.fill();

    // Shield effect
    if (p.shieldTimer > 0) {
        ctx.strokeStyle = `rgba(255, 221, 68, ${0.4 + Math.sin(frameCount * 0.1) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 221, 68, 0.08)`;
        ctx.fill();
    }

    // Body
    const bodyGrad = ctx.createLinearGradient(0, -p.h / 2, 0, p.h / 2);
    bodyGrad.addColorStop(0, '#66aaff');
    bodyGrad.addColorStop(0.5, '#3366cc');
    bodyGrad.addColorStop(1, '#224488');
    ctx.fillStyle = bodyGrad;

    // Main fuselage
    ctx.beginPath();
    ctx.moveTo(0, -p.h / 2);
    ctx.lineTo(-8, -p.h / 2 + 15);
    ctx.lineTo(-10, p.h / 2 - 5);
    ctx.lineTo(10, p.h / 2 - 5);
    ctx.lineTo(8, -p.h / 2 + 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wings
    ctx.fillStyle = '#4488dd';
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-p.w / 2, 8);
    ctx.lineTo(-p.w / 2 + 5, 16);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(p.w / 2, 8);
    ctx.lineTo(p.w / 2 - 5, 16);
    ctx.lineTo(10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wing tips
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(-p.w / 2 + 2, 14, 6, 4);
    ctx.fillRect(p.w / 2 - 8, 14, 6, 4);

    // Cockpit
    const cockpitGrad = ctx.createRadialGradient(0, -8, 1, 0, -8, 8);
    cockpitGrad.addColorStop(0, '#aaddff');
    cockpitGrad.addColorStop(1, '#3366aa');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.ellipse(0, -8, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function updatePlayer() {
    const p = player;
    if (!p) return;

    // Movement
    let dx = 0, dy = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) dx -= 1;
    if (keys['ArrowRight'] || keys['KeyD']) dx += 1;
    if (keys['ArrowUp'] || keys['KeyW']) dy -= 1;
    if (keys['ArrowDown'] || keys['KeyS']) dy += 1;

    if (dx !== 0 || dy !== 0) {
        useMouseControl = false;
        const len = Math.sqrt(dx * dx + dy * dy);
        p.x += (dx / len) * PLAYER_SPEED;
        p.y += (dy / len) * PLAYER_SPEED;
    } else if (useMouseControl) {
        // Smooth mouse/touch follow
        const mdx = mouseX - p.x;
        const mdy = mouseY - p.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (dist > 2) {
            p.x += (mdx / dist) * Math.min(dist * 0.15, PLAYER_SPEED);
            p.y += (mdy / dist) * Math.min(dist * 0.15, PLAYER_SPEED);
        }
    }

    // Clamp
    p.x = Math.max(p.w / 2, Math.min(GAME_WIDTH - p.w / 2, p.x));
    p.y = Math.max(p.h / 2, Math.min(GAME_HEIGHT - p.h / 2, p.y));

    // Timers
    if (p.shieldTimer > 0) p.shieldTimer--;
    if (p.invincibleTimer > 0) p.invincibleTimer--;

    // Auto-fire
    p.fireTimer--;
    if (p.fireTimer <= 0) {
        playerShoot();
        p.fireTimer = p.fireRate;
    }
}

function playerShoot() {
    const p = player;
    const wp = p.weapon;

    if (wp === 'NORMAL' || wp === 'SPREAD') {
        // Center bullet
        bullets.push(createBullet(p.x, p.y - p.h / 2, 0, -BULLET_SPEED, '#88ccff', 4, 8));
        if (wp === 'SPREAD') {
            bullets.push(createBullet(p.x - 12, p.y - p.h / 2 + 5, -1.2, -BULLET_SPEED * 0.95, '#66aaff', 3, 6));
            bullets.push(createBullet(p.x + 12, p.y - p.h / 2 + 5, 1.2, -BULLET_SPEED * 0.95, '#66aaff', 3, 6));
        }
    } else if (wp === 'LASER') {
        // Laser beam
        bullets.push({
            x: p.x,
            y: p.y - p.h / 2,
            vx: 0,
            vy: -BULLET_SPEED * 1.5,
            w: 6,
            h: 40,
            color: '#44ff88',
            damage: 12,
            isLaser: true,
        });
    } else if (wp === 'MISSILE') {
        // Find nearest enemy
        let nearest = null;
        let nearDist = Infinity;
        for (const e of enemies) {
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < nearDist) { nearest = e; nearDist = d; }
        }
        if (nearest && nearDist < 500) {
            const angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
            bullets.push({
                x: p.x - 15,
                y: p.y,
                vx: Math.cos(angle) * BULLET_SPEED * 0.8,
                vy: Math.sin(angle) * BULLET_SPEED * 0.8,
                w: 5,
                h: 5,
                color: '#ff6644',
                damage: 15,
                isMissile: true,
                target: nearest,
                turnSpeed: 0.06,
                trail: [],
            });
            bullets.push({
                x: p.x + 15,
                y: p.y,
                vx: Math.cos(angle) * BULLET_SPEED * 0.8,
                vy: Math.sin(angle) * BULLET_SPEED * 0.8,
                w: 5,
                h: 5,
                color: '#ff6644',
                damage: 15,
                isMissile: true,
                target: nearest,
                turnSpeed: 0.06,
                trail: [],
            });
        } else {
            bullets.push(createBullet(p.x - 10, p.y - 10, -0.5, -BULLET_SPEED, '#ff4444', 4, 10));
            bullets.push(createBullet(p.x + 10, p.y - 10, 0.5, -BULLET_SPEED, '#ff4444', 4, 10));
        }
    } else if (wp === 'HYBRID') {
        // Spread + laser mix
        bullets.push(createBullet(p.x, p.y - p.h / 2, 0, -BULLET_SPEED, '#88ffaa', 5, 10));
        bullets.push(createBullet(p.x - 15, p.y - p.h / 2 + 5, -1.0, -BULLET_SPEED * 0.9, '#44aaff', 3, 6));
        bullets.push(createBullet(p.x + 15, p.y - p.h / 2 + 5, 1.0, -BULLET_SPEED * 0.9, '#44aaff', 3, 6));
    }
}

function createBullet(x, y, vx, vy, color, size, damage) {
    return { x, y, vx, vy, w: size * 2, h: size * 2, color, damage, isLaser: false, isMissile: false };
}

function hitPlayer() {
    if (player.invincibleTimer > 0) return;
    if (player.shieldTimer > 0) {
        player.shieldTimer = 0;
        player.invincibleTimer = 30;
        spawnParticles(player.x, player.y, 15, '#ffdd44', 4, 25, 3);
        return;
    }
    player.hp--;
    player.invincibleTimer = 60;
    screenShake = 8;
    spawnParticles(player.x, player.y, 20, '#ff4444', 3, 30, 2);
    updateHUD();
    if (player.hp <= 0) {
        gameOver();
    }
}

// ==================== BULLETS ====================
function updateBullets() {
    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        // Missile homing
        if (b.isMissile && b.target && enemies.includes(b.target)) {
            const angle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
            const currentAngle = Math.atan2(b.vy, b.vx);
            let diff = angle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.sign(diff) * Math.min(Math.abs(diff), b.turnSpeed);
            const newAngle = currentAngle + turn;
            const spd = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(newAngle) * spd;
            b.vy = Math.sin(newAngle) * spd;

            // Trail
            b.trail = b.trail || [];
            b.trail.push({ x: b.x, y: b.y, life: 15 });
            if (b.trail.length > 10) b.trail.shift();
        }

        b.x += b.vx;
        b.y += b.vy;

        // Remove off-screen
        if (b.y < -50 || b.y > GAME_HEIGHT + 50 || b.x < -50 || b.x > GAME_WIDTH + 50) {
            bullets.splice(i, 1);
            continue;
        }

        // Check collision with enemies
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (circleRect(b.x, b.y, b.w / 2, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
                e.hp -= b.damage;
                spawnParticles(b.x, b.y, 3, b.color, 2, 15, 2);
                if (e.hp <= 0) {
                    destroyEnemy(j);
                }
                hit = true;
                break;
            }
        }

        // Check collision with boss
        if (!hit && boss && circleRect(b.x, b.y, b.w / 2, boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h)) {
            // Guardian shield absorbs damage first in updateBullets too
            if (boss.type === 'guardian' && boss.shield > 0) {
                boss.shield -= b.damage;
                boss.flashTimer = 4;
                spawnParticles(b.x, b.y, 3, '#4488ff', 2, 10, 2);
                if (!b.isLaser) {
                    bullets.splice(i, 1);
                }
                if (boss.shield <= 0) {
                    addFloatingText(boss.x, boss.y - 60, 'SHIELD DOWN!', '#4488ff');
                    spawnParticles(boss.x, boss.y, 25, '#4488ff', 4, 35, 3);
                }
            } else {
                boss.hp -= b.damage;
                spawnParticles(b.x, b.y, 3, b.color, 2, 15, 2);
                if (boss.hp <= 0) {
                    destroyBoss();
                }
                hit = true;
            }
        }

        if (hit && !b.isLaser) {
            bullets.splice(i, 1);
        }
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.y > GAME_HEIGHT + 20 || b.y < -20 || b.x < -20 || b.x > GAME_WIDTH + 20) {
            enemyBullets.splice(i, 1);
            continue;
        }

        // Hit player
        if (circleRect(b.x, b.y, b.r, player.x - player.w / 2, player.y - player.h / 2, player.w, player.h)) {
            hitPlayer();
            enemyBullets.splice(i, 1);
        }
    }
}

function drawBullets() {
    // Player bullets
    for (const b of bullets) {
        if (b.isMissile) {
            // Draw trail
            b.trail = b.trail || [];
            for (const t of b.trail) {
                t.life--;
                ctx.globalAlpha = t.life / 15 * 0.5;
                ctx.fillStyle = '#ff4422';
                ctx.beginPath();
                ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            b.trail = b.trail.filter(t => t.life > 0);

            // Draw missile
            ctx.save();
            ctx.translate(b.x, b.y);
            const angle = Math.atan2(b.vy, b.vx);
            ctx.rotate(angle);
            ctx.fillStyle = '#ff6644';
            ctx.fillRect(-6, -2, 12, 4);
            ctx.fillStyle = '#ffaa44';
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(-2, -3);
            ctx.lineTo(-2, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Glow
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            continue;
        }

        if (b.isLaser) {
            // Laser beam
            const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
            grad.addColorStop(0, 'rgba(68, 255, 136, 0.9)');
            grad.addColorStop(1, 'rgba(68, 255, 136, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
            // Core
            ctx.fillStyle = '#aaffcc';
            ctx.fillRect(b.x - 1, b.y - b.h / 2, 2, b.h);
            // Glow
            ctx.shadowColor = '#44ff88';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(b.x - 0.5, b.y - b.h / 2, 1, b.h);
            ctx.shadowBlur = 0;
            continue;
        }

        // Regular bullet
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.w / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Enemy bullets
    for (const b of enemyBullets) {
        ctx.shadowColor = b.color || '#ff4444';
        ctx.shadowBlur = 6;
        ctx.fillStyle = b.color || '#ff4444';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffaaaa';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ==================== ENEMIES ====================
const ENEMY_DEFS = {
    small:  { w: 28, h: 28, hp: 8,  speed: 2.5, score: 10, color: '#ff6644', fireRate: 0 },
    medium: { w: 40, h: 36, hp: 25, speed: 1.5, score: 25, color: '#aa44ff', fireRate: 90 },
    fast:   { w: 24, h: 24, hp: 12, speed: 4,   score: 15, color: '#44ffaa', fireRate: 0 },
    bomber: { w: 48, h: 44, hp: 40, speed: 1,   score: 40, color: '#ff4488', fireRate: 60 },
};

// ==================== BOSS DEFS ====================
const BOSS_DEFS = {
    assault: {
        name: 'ASSAULT',
        minWave: 2,
        baseHp: 200,   hpPerWave: 80,
        baseScore: 200, scorePerWave: 50,
        w: 100, h: 70,
        speed: 1,
        moveAmplitude: 120,
        patterns: ['aimed', 'spiral', 'spread'],
        patternInterval: 60,
        fightPhases: 1,
        bulletSpeed: 4,
        bulletDensity: 1,  // multiplier — spread count = 12 * density
        color: '#cc2222',
        darkColor: '#881111',
        accentColor: '#ff6644',
    },
    guardian: {
        name: 'GUARDIAN',
        minWave: 6,
        baseHp: 400,   hpPerWave: 120,
        baseScore: 500, scorePerWave: 100,
        w: 90, h: 90,
        speed: 1.2,
        moveAmplitude: 100,
        patterns: ['shield_spin', 'charge_burst'],
        patternInterval: 50,
        fightPhases: 1,
        bulletSpeed: 3.5,
        bulletDensity: 1,
        color: '#2244cc',
        darkColor: '#112288',
        accentColor: '#4488ff',
        shieldHp: 60,       // rotating shield blocks total HP
        shieldCount: 6,
    },
    destroyer: {
        name: 'DESTROYER',
        minWave: 10,
        baseHp: 800,   hpPerWave: 150,
        baseScore: 1000, scorePerWave: 150,
        w: 120, h: 90,
        speed: 0.8,
        moveAmplitude: 80,
        patterns: ['homing', 'laser_sweep', 'spread_wall'],
        patternInterval: 45,
        fightPhases: 2,     // phase 2 at HP < 50%
        bulletSpeed: 4,
        bulletDensity: 1,
        color: '#8822cc',
        darkColor: '#441166',
        accentColor: '#aa44ff',
    },
    mothership: {
        name: 'MOTHERSHIP',
        minWave: 14,
        baseHp: 1500,  hpPerWave: 200,
        baseScore: 2000, scorePerWave: 200,
        w: 140, h: 110,
        speed: 0.5,
        moveAmplitude: 50,
        patterns: ['spawn_minions', 'full_screen', 'aimed_barrage'],
        patternInterval: 40,
        fightPhases: 3,     // phase 2 at HP <66%, phase 3 at HP <33%
        bulletSpeed: 4.5,
        bulletDensity: 1,
        color: '#ccaa22',
        darkColor: '#886611',
        accentColor: '#ffdd44',
    },
};

function getBossType() {
    if (wave >= BOSS_DEFS.mothership.minWave) return 'mothership';
    if (wave >= BOSS_DEFS.destroyer.minWave)  return 'destroyer';
    if (wave >= BOSS_DEFS.guardian.minWave)   return 'guardian';
    return 'assault';
}

function getBossBulletSpeed(def) {
    return def.bulletSpeed + Math.floor(wave / 4) * 0.5;
}

function getBossDensity(def) {
    return def.bulletDensity + Math.floor(wave / 6);
}

function createEnemy(type, x, y) {
    const def = ENEMY_DEFS[type];
    return {
        ...def,
        type,
        x: x || Math.random() * (GAME_WIDTH - 80) + 40,
        y: y || -40,
        maxHp: def.hp,
        alive: true,
        timer: Math.random() * 100,
        startX: x || 0,
        flashTimer: 0,
    };
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.timer++;
        e.flashTimer = Math.max(0, e.flashTimer - 1);

        if (e.type === 'small') {
            e.y += e.speed * difficulty;
        } else if (e.type === 'fast') {
            e.y += e.speed * difficulty;
            e.x = e.startX + Math.sin(e.timer * 0.05) * 60;
        } else if (e.type === 'medium') {
            e.y += e.speed * difficulty;
            // Fire bullets
            if (e.fireRate > 0 && e.timer % e.fireRate === 0 && e.y > 0 && e.y < GAME_HEIGHT * 0.6) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                enemyBullets.push({
                    x: e.x, y: e.y + e.h / 2,
                    vx: Math.cos(angle) * ENEMY_BULLET_SPEED,
                    vy: Math.sin(angle) * ENEMY_BULLET_SPEED,
                    r: 4, color: '#ff88ff',
                });
            }
        } else if (e.type === 'bomber') {
            e.y += e.speed * difficulty;
            if (e.fireRate > 0 && e.timer % e.fireRate === 0 && e.y > 0 && e.y < GAME_HEIGHT * 0.5) {
                // Spread shot
                for (let a = -0.4; a <= 0.4; a += 0.2) {
                    const angle = Math.PI / 2 + a;
                    enemyBullets.push({
                        x: e.x, y: e.y + e.h / 2,
                        vx: Math.cos(angle) * ENEMY_BULLET_SPEED * 0.8,
                        vy: Math.sin(angle) * ENEMY_BULLET_SPEED * 0.8,
                        r: 3, color: '#ff8888',
                    });
                }
            }
        }

        // Remove if off screen
        if (e.y > GAME_HEIGHT + 60) {
            enemies.splice(i, 1);
            continue;
        }

        // Collision with player
        if (rectCollision(
            e.x - e.w / 2, e.y - e.h / 2, e.w, e.h,
            player.x - player.w / 2, player.y - player.h / 2, player.w, player.h
        )) {
            e.hp = 0;
            destroyEnemy(i);
            hitPlayer();
        }
    }
}

function drawEnemies() {
    for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);

        // Flash white when hit
        const col = e.flashTimer > 0 ? '#ffffff' : e.color;

        if (e.type === 'small') {
            // Small fighter - diamond shape
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(0, -e.h / 2);
            ctx.lineTo(e.w / 2, 0);
            ctx.lineTo(0, e.h / 2);
            ctx.lineTo(-e.w / 2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ff8866';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.type === 'fast') {
            // Fast interceptor - arrow shape
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(0, e.h / 2);
            ctx.lineTo(-e.w / 2, -e.h / 2);
            ctx.lineTo(0, -e.h / 2 + 8);
            ctx.lineTo(e.w / 2, -e.h / 2);
            ctx.closePath();
            ctx.fill();
        } else if (e.type === 'medium') {
            // Medium bomber - hexagonal
            ctx.fillStyle = col;
            ctx.beginPath();
            for (let a = 0; a < 6; a++) {
                const angle = (a / 6) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * e.w / 2;
                const py = Math.sin(angle) * e.h / 2;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#cc66ff';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
        } else if (e.type === 'bomber') {
            // Heavy bomber - bulky shape
            ctx.fillStyle = col;
            ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
            ctx.fillStyle = '#ff6699';
            ctx.fillRect(-e.w / 2 + 4, -e.h / 2 + 4, e.w - 8, e.h - 8);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // HP bar for tougher enemies
        if (e.maxHp > 15) {
            const barW = e.w + 4;
            const barH = 3;
            const barY = -e.h / 2 - 8;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-barW / 2, barY, barW, barH);
            ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#44ff44' : e.hp / e.maxHp > 0.25 ? '#ffaa00' : '#ff4444';
            ctx.fillRect(-barW / 2, barY, barW * (e.hp / e.maxHp), barH);
        }

        ctx.restore();
    }
}

function destroyEnemy(index) {
    const e = enemies[index];
    if (!e) return;
    enemies.splice(index, 1);
    score += e.score;
    enemiesDestroyedTotal++;
    waveEnemiesKilled++;

    spawnExplosion(e.x, e.y, e.type === 'bomber');
    spawnParticles(e.x, e.y, 15, e.color, 3, 30, 3);
    addFloatingText(e.x, e.y - 20, `+${e.score}`, '#ffff88');

    // Drop power-up
    if (Math.random() < 0.15 + (e.type === 'bomber' ? 0.3 : 0)) {
        spawnPowerup(e.x, e.y);
    }

    updateHUD();
}

// ==================== BOSS ====================
function createBoss() {
    const type = getBossType();
    const def = BOSS_DEFS[type];
    const hp = def.baseHp + wave * def.hpPerWave;
    return {
        ...def,
        type,
        x: GAME_WIDTH / 2,
        y: -80,
        hp: hp,
        maxHp: hp,
        score: def.baseScore + wave * def.scorePerWave,
        phase: 'enter',       // enter | fight | flee
        fightPhase: 1,        // sub-phase for multi-phase bosses
        timer: 0,
        pattern: 0,
        patternTimer: 0,
        flashTimer: 0,
        shield: def.shieldHp || 0,
        maxShield: def.shieldHp || 0,
        shieldAngle: 0,       // current angle of rotating shield
        chargeProgress: 0,    // charge-up progress for charge_burst
        laserAngle: 0,        // current angle for laser_sweep
        laserDir: 1,          // sweep direction
        burstCount: 0,        // used for aimed_barrage burst sequencing
    };
}

// ==================== BOSS MOVEMENT ====================
function updateBossMovement() {
    if (!boss) return;

    if (boss.type === 'assault') {
        boss.x = GAME_WIDTH / 2 + Math.sin(boss.timer * 0.02) * boss.moveAmplitude;
    } else if (boss.type === 'guardian') {
        // Side-to-side with occasional short dash
        boss.x = GAME_WIDTH / 2 + Math.sin(boss.timer * 0.025) * boss.moveAmplitude;
        // Slight vertical bob
        boss.y = 80 + Math.sin(boss.timer * 0.04) * 20;
        // Random dash: stop sine, lunge toward player
        if (boss.timer % 200 > 190) {
            const dx = player.x - boss.x;
            boss.x += Math.sign(dx) * 3;
        }
    } else if (boss.type === 'destroyer') {
        boss.x = GAME_WIDTH / 2 + Math.sin(boss.timer * 0.015) * boss.moveAmplitude;
        boss.y = 70 + Math.sin(boss.timer * 0.03) * 25;
    } else if (boss.type === 'mothership') {
        // Almost stationary, slight drift
        boss.x = GAME_WIDTH / 2 + Math.sin(boss.timer * 0.008) * boss.moveAmplitude;
        boss.y = 65 + Math.sin(boss.timer * 0.012) * 10;
    }
}

// ==================== BOSS ATTACKS: ASSAULT ====================
function updateBossAssault() {
    boss.patternTimer++;
    if (boss.patternTimer % boss.patternInterval === 0) {
        boss.pattern = (boss.pattern + 1) % boss.patterns.length;
    }
    const bSpeed = getBossBulletSpeed(boss);
    const density = getBossDensity(boss);

    if (boss.pattern === 0) {
        // Aimed shots
        if (boss.timer % Math.max(8, 20 - wave) === 0) {
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            enemyBullets.push({
                x: boss.x, y: boss.y + boss.h / 2,
                vx: Math.cos(angle) * bSpeed,
                vy: Math.sin(angle) * bSpeed,
                r: 5, color: '#ff4444',
            });
        }
    } else if (boss.pattern === 1) {
        // Spiral
        if (boss.timer % 8 === 0) {
            const a = boss.timer * 0.15;
            enemyBullets.push({
                x: boss.x, y: boss.y + boss.h / 2,
                vx: Math.cos(a) * (bSpeed * 0.75),
                vy: Math.sin(a) * (bSpeed * 0.75),
                r: 4, color: '#ff8844',
            });
        }
    } else {
        // Spread burst
        const interval = Math.max(20, 40 - wave * 2);
        if (boss.timer % interval === 0) {
            const count = Math.floor(12 * density);
            for (let a = 0; a < count; a++) {
                const angle = (a / count) * Math.PI * 2;
                enemyBullets.push({
                    x: boss.x, y: boss.y + boss.h / 2,
                    vx: Math.cos(angle) * (bSpeed * 0.625),
                    vy: Math.sin(angle) * (bSpeed * 0.625),
                    r: 3, color: '#ffaa44',
                });
            }
        }
    }
}

// ==================== BOSS ATTACKS: GUARDIAN ====================
function updateBossGuardian() {
    boss.patternTimer++;
    if (boss.patternTimer % boss.patternInterval === 0) {
        boss.pattern = (boss.pattern + 1) % boss.patterns.length;
    }
    // Rotate the shield
    boss.shieldAngle += 0.03;

    const bSpeed = getBossBulletSpeed(boss);
    const density = getBossDensity(boss);

    if (boss.pattern === 0) {
        // shield_spin: occasional aimed bullets from shield blocks
        if (boss.timer % Math.max(6, 15 - wave) === 0) {
            const count = boss.shieldCount || 6;
            for (let i = 0; i < count; i++) {
                const a = boss.shieldAngle + (i / count) * Math.PI * 2;
                const sx = boss.x + Math.cos(a) * 55;
                const sy = boss.y + Math.sin(a) * 55;
                const angle = Math.atan2(player.y - sy, player.x - sx);
                enemyBullets.push({
                    x: sx, y: sy,
                    vx: Math.cos(angle) * bSpeed,
                    vy: Math.sin(angle) * bSpeed,
                    r: 3, color: '#4488ff',
                });
            }
        }
    } else {
        // charge_burst
        boss.chargeProgress++;
        // Charging visual — boss slows/stops, glow builds
        if (boss.chargeProgress < 90) {
            // charging... emit warning particles every 30 frames
            if (boss.chargeProgress % 30 === 0) {
                spawnParticles(boss.x, boss.y + boss.h / 2, 8, '#44aaff', 2, 20, 2);
            }
        } else {
            // BURST! Fire all around
            const count = Math.floor(20 * density);
            for (let a = 0; a < count; a++) {
                const angle = (a / count) * Math.PI * 2;
                enemyBullets.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(angle) * (bSpeed * 1.2),
                    vy: Math.sin(angle) * (bSpeed * 1.2),
                    r: 4, color: '#aaddff',
                });
            }
            boss.chargeProgress = 0;
            // Force pattern switch after burst
            boss.pattern = (boss.pattern + 1) % boss.patterns.length;
            boss.patternTimer = 0;
        }
    }
}

// ==================== BOSS ATTACKS: DESTROYER ====================
function updateBossDestroyer() {
    boss.patternTimer++;
    const phaseMult = boss.fightPhase >= 2 ? 1.3 : 1;
    const interval = Math.max(30, boss.patternInterval - wave);
    if (boss.patternTimer % Math.floor(interval / phaseMult) === 0) {
        boss.pattern = (boss.pattern + 1) % boss.patterns.length;
    }

    const bSpeed = getBossBulletSpeed(boss) * phaseMult;
    const density = getBossDensity(boss);

    if (boss.pattern === 0) {
        // homing: slow bullets that curve toward player
        if (boss.timer % Math.max(15, 40 - wave * 2) === 0) {
            for (let i = -1; i <= 1; i++) {
                const a = Math.atan2(player.y - boss.y, player.x - boss.x) + i * 0.3;
                enemyBullets.push({
                    x: boss.x, y: boss.y + boss.h / 2,
                    vx: Math.cos(a) * bSpeed * 0.5,
                    vy: Math.sin(a) * bSpeed * 0.5,
                    r: 4, color: '#cc66ff',
                    homing: true,
                    turnRate: 0.03,
                });
            }
        }
    } else if (boss.pattern === 1) {
        // laser_sweep
        boss.laserAngle += 0.03 * boss.laserDir * phaseMult;
        if (boss.laserAngle > 1.2) boss.laserDir = -1;
        if (boss.laserAngle < -1.2) boss.laserDir = 1;

        if (boss.timer % 6 === 0) {
            const a = Math.PI / 2 + boss.laserAngle;
            enemyBullets.push({
                x: boss.x + Math.cos(boss.laserAngle) * 30,
                y: boss.y + boss.h / 2,
                vx: Math.cos(a) * bSpeed * 1.5,
                vy: Math.sin(a) * bSpeed * 1.5,
                r: 6, color: '#ff44ff',
            });
        }
    } else {
        // spread_wall: many bullets in an arc downward, creating a "wall"
        if (boss.timer % Math.max(10, 30 - wave) === 0) {
            const count = Math.floor(10 * density);
            const spreadAngle = Math.PI * 0.6 * phaseMult;
            for (let i = 0; i < count; i++) {
                const a = Math.PI / 2 - spreadAngle / 2 + (i / (count - 1)) * spreadAngle;
                enemyBullets.push({
                    x: boss.x, y: boss.y + boss.h / 2,
                    vx: Math.cos(a) * bSpeed * 0.9,
                    vy: Math.sin(a) * bSpeed * 0.9,
                    r: 3, color: '#dd88ff',
                });
            }
        }
    }
}

// ==================== BOSS ATTACKS: MOTHERSHIP ====================
function updateBossMothership() {
    boss.patternTimer++;
    const phaseMult = boss.fightPhase >= 2 ? 1.25 : 1;
    const interval = Math.max(25, boss.patternInterval - wave);
    if (boss.patternTimer % Math.floor(interval / phaseMult) === 0) {
        boss.pattern = (boss.pattern + 1) % boss.patterns.length;
    }

    const bSpeed = getBossBulletSpeed(boss) * phaseMult;
    const density = getBossDensity(boss);

    if (boss.pattern === 0) {
        // spawn_minions: summon small enemies
        if (boss.timer % Math.max(60, 150 - wave * 5) === 0) {
            const count = 2 + Math.floor(wave / 5);
            for (let i = 0; i < count; i++) {
                const spawnTypes = wave >= 10 ? ['small', 'small', 'fast', 'medium'] : ['small', 'small', 'fast'];
                const type = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
                const ex = boss.x + (Math.random() - 0.5) * 200;
                const ey = boss.y + Math.random() * 40;
                enemies.push(createEnemy(type, ex, ey));
            }
        }
    } else if (boss.pattern === 1) {
        // full_screen: multi-layer circular barrage
        if (boss.timer % Math.max(20, 50 - wave * 2) === 0) {
            const layers = boss.fightPhase >= 3 ? 3 : 2;
            for (let layer = 0; layer < layers; layer++) {
                const count = Math.floor((12 + layer * 4) * density);
                const speed = bSpeed * (0.5 + layer * 0.3);
                const offset = layer * 0.3;
                for (let i = 0; i < count; i++) {
                    const a = (i / count) * Math.PI * 2 + offset;
                    enemyBullets.push({
                        x: boss.x, y: boss.y,
                        vx: Math.cos(a) * speed,
                        vy: Math.sin(a) * speed,
                        r: 3, color: layer === 0 ? '#ffcc44' : layer === 1 ? '#ffaa22' : '#ff8800',
                    });
                }
            }
        }
    } else {
        // aimed_barrage: rapid-fire aimed burst
        if (boss.timer % Math.max(8, 18 - wave) === 0) {
            boss.burstCount = (boss.burstCount || 0) + 1;
            const count = Math.floor(8 * density);
            for (let i = 0; i < count; i++) {
                const spread = (i - (count - 1) / 2) * 0.08;
                const angle = Math.atan2(player.y - boss.y, player.x - boss.x) + spread;
                enemyBullets.push({
                    x: boss.x, y: boss.y + boss.h / 2,
                    vx: Math.cos(angle) * bSpeed * 1.4,
                    vy: Math.sin(angle) * bSpeed * 1.4,
                    r: 4, color: '#ffdd44',
                });
            }
            if (boss.burstCount >= 6 && boss.patterns.length > 1) {
                boss.burstCount = 0;
                boss.pattern = (boss.pattern + 1) % boss.patterns.length;
                boss.patternTimer = 0;
            }
        }
    }

    // Phase 3: simultaneous second pattern occasionally
    if (boss.fightPhase >= 3 && boss.timer % 20 === 0) {
        const extraPattern = (boss.pattern + 1) % boss.patterns.length;
        if (extraPattern === 0 && boss.timer % 40 === 0) {
            // Extra aimed shots from edges
            for (let side = -1; side <= 1; side += 2) {
                const angle = Math.atan2(player.y - boss.y, player.x - (boss.x + side * 50));
                enemyBullets.push({
                    x: boss.x + side * 50, y: boss.y,
                    vx: Math.cos(angle) * bSpeed,
                    vy: Math.sin(angle) * bSpeed,
                    r: 3, color: '#ffaa44',
                });
            }
        }
    }
}

// ==================== BOSS MAIN UPDATE ====================
function updateBoss() {
    if (!boss) return;
    boss.timer++;
    boss.flashTimer = Math.max(0, boss.flashTimer - 1);

    // Fight phase advancement for multi-phase bosses
    const fp = boss.fightPhases || 1;
    if (fp >= 3 && boss.hp <= boss.maxHp * 0.33) {
        boss.fightPhase = 3;
    } else if (fp >= 2 && boss.hp <= boss.maxHp * 0.5) {
        boss.fightPhase = 2;
    }

    if (boss.phase === 'enter') {
        boss.y += 2;
        if (boss.y >= 80) {
            boss.phase = 'fight';
            boss.timer = 0;
        }
    } else if (boss.phase === 'fight') {
        updateBossMovement();

        // Dispatch attacks by type
        if (boss.type === 'assault') {
            updateBossAssault();
        } else if (boss.type === 'guardian') {
            updateBossGuardian();
        } else if (boss.type === 'destroyer') {
            updateBossDestroyer();
        } else if (boss.type === 'mothership') {
            updateBossMothership();
        }

        // Check if fleeing
        if (boss.hp <= boss.maxHp * 0.25 && boss.timer > 60) {
            boss.phase = 'flee';
        }
    } else if (boss.phase === 'flee') {
        boss.y -= 3;
        if (boss.y < -120) {
            // Boss escapes - give player some points anyway
            score += Math.floor(boss.score * 0.3);
            addFloatingText(boss.x, 100, 'BOSS ESCAPED!', '#ff8888');
            boss = null;
            bossActive = false;
            bossHud.classList.add('hidden');
            // Reset wave state so the next wave starts correctly
            waveActive = false;
            waveTransitionTimer = 0;
            updateHUD();
            return; // boss is null — skip bullet collision and player collision below
        }
    }

    // Collision with player (bullet-boss collision handled in updateBullets)
    if (boss && boss.phase === 'fight' && rectCollision(
        boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h,
        player.x - player.w / 2, player.y - player.h / 2, player.w, player.h
    )) {
        hitPlayer();
    }

    // Update enemy bullets' homing behavior for destroyer bullets
    for (const eb of enemyBullets) {
        if (eb.homing) {
            const angle = Math.atan2(player.y - eb.y, player.x - eb.x);
            const currentAngle = Math.atan2(eb.vy, eb.vx);
            let diff = angle - currentAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const turn = Math.sign(diff) * Math.min(Math.abs(diff), eb.turnRate);
            const newAngle = currentAngle + turn;
            const spd = Math.hypot(eb.vx, eb.vy);
            eb.vx = Math.cos(newAngle) * spd;
            eb.vy = Math.sin(newAngle) * spd;
        }
    }
}

function drawBossBodyAssault() {
    const col = boss.flashTimer > 0 ? '#ffffff' : boss.color;
    const darkCol = boss.flashTimer > 0 ? '#ffaaaa' : boss.darkColor;

    // Main body - angular diamond/arrow shape
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -boss.h / 2);
    ctx.lineTo(boss.w / 2, -boss.h / 4);
    ctx.lineTo(boss.w / 2 + 15, boss.h / 4);
    ctx.lineTo(boss.w / 3, boss.h / 2);
    ctx.lineTo(-boss.w / 3, boss.h / 2);
    ctx.lineTo(-boss.w / 2 - 15, boss.h / 4);
    ctx.lineTo(-boss.w / 2, -boss.h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner details
    ctx.fillStyle = darkCol;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = boss.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Cannons
    ctx.fillStyle = col;
    ctx.fillRect(-boss.w / 2 - 10, boss.h / 4 - 5, 15, 10);
    ctx.fillRect(boss.w / 2 - 5, boss.h / 4 - 5, 15, 10);

    // Engine glow
    ctx.fillStyle = '#ff6644';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, boss.h / 2 + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBossBodyGuardian() {
    const col = boss.flashTimer > 0 ? '#ffffff' : boss.color;
    const darkCol = boss.flashTimer > 0 ? '#aaccff' : boss.darkColor;

    // Hexagonal body
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * boss.w / 2;
        const py = Math.sin(angle) * boss.h / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner core
    ctx.fillStyle = darkCol;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = boss.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Rotating shield ring
    if (boss.shield > 0) {
        for (let i = 0; i < (boss.shieldCount || 6); i++) {
            const a = boss.shieldAngle + (i / (boss.shieldCount || 6)) * Math.PI * 2;
            const sx = Math.cos(a) * 55;
            const sy = Math.sin(a) * 55;
            const shieldAlpha = 0.4 + (boss.shield / boss.maxShield) * 0.5;
            ctx.fillStyle = `rgba(68, 136, 255, ${shieldAlpha})`;
            ctx.strokeStyle = `rgba(136, 200, 255, ${shieldAlpha + 0.2})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    // Charge glow
    if (boss.chargeProgress > 0 && boss.chargeProgress < 90) {
        const chargeRatio = boss.chargeProgress / 90;
        ctx.fillStyle = `rgba(68, 170, 255, ${chargeRatio * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, 40 + chargeRatio * 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBossBodyDestroyer() {
    const col = boss.flashTimer > 0 ? '#ffffff' : boss.color;
    const darkCol = boss.flashTimer > 0 ? '#cc88ff' : boss.darkColor;
    const phaseGlow = boss.fightPhase >= 2 ? 'rgba(255, 100, 255, 0.3)' : 'rgba(170, 68, 255, 0.2)';

    // Large angular body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -boss.h / 2);
    ctx.lineTo(boss.w / 2, -boss.h / 4);
    ctx.lineTo(boss.w / 2 + 20, 0);
    ctx.lineTo(boss.w / 3 + 10, boss.h / 2);
    ctx.lineTo(-boss.w / 3 - 10, boss.h / 2);
    ctx.lineTo(-boss.w / 2 - 20, 0);
    ctx.lineTo(-boss.w / 2, -boss.h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#aa44ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Phase 2 aura
    if (boss.fightPhase >= 2) {
        ctx.strokeStyle = `rgba(255, 100, 255, ${0.3 + Math.sin(boss.timer * 0.1) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    // Inner core
    const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    coreGrad.addColorStop(0, boss.accentColor);
    coreGrad.addColorStop(1, darkCol);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    // Cannon pods
    ctx.fillStyle = darkCol;
    ctx.fillRect(-boss.w / 2 - 12, -boss.h / 4, 18, 14);
    ctx.fillRect(boss.w / 2 - 6, -boss.h / 4, 18, 14);
    // Front cannon
    ctx.fillStyle = col;
    ctx.fillRect(-5, boss.h / 2 - 10, 10, 18);

    // Engine glow
    ctx.fillStyle = boss.fightPhase >= 2 ? '#ff66ff' : '#aa44ff';
    ctx.shadowColor = boss.fightPhase >= 2 ? '#ff44ff' : '#8822cc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(-15, boss.h / 2 + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(15, boss.h / 2 + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBossBodyMothership() {
    const col = boss.flashTimer > 0 ? '#ffffff' : boss.color;
    const darkCol = boss.flashTimer > 0 ? '#ffddaa' : boss.darkColor;

    // Oval/ellipse body
    const bodyGrad = ctx.createRadialGradient(0, -10, 10, 0, 0, boss.w / 2);
    bodyGrad.addColorStop(0, boss.accentColor);
    bodyGrad.addColorStop(0.6, col);
    bodyGrad.addColorStop(1, darkCol);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.w / 2, boss.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = boss.accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Phase auras
    if (boss.fightPhase >= 2) {
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.2 + Math.sin(boss.timer * 0.08) * 0.15})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, boss.w / 2 + 12, boss.h / 2 + 8, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (boss.fightPhase >= 3) {
        ctx.strokeStyle = `rgba(255, 100, 30, ${0.25 + Math.sin(boss.timer * 0.12 + 1) * 0.2})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, boss.w / 2 + 22, boss.h / 2 + 16, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Turret mounts (4 around the body)
    const turretCount = 4;
    for (let i = 0; i < turretCount; i++) {
        const a = (i / turretCount) * Math.PI * 2 + boss.timer * 0.01;
        const tx = Math.cos(a) * boss.w / 2 * 0.8;
        const ty = Math.sin(a) * boss.h / 2 * 0.8;
        ctx.fillStyle = darkCol;
        ctx.strokeStyle = boss.accentColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tx, ty, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Turret barrel pointing outward
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(a) * 16, ty + Math.sin(a) * 16);
        ctx.stroke();
    }

    // Center eye/core
    const eyeGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 16);
    eyeGrad.addColorStop(0, '#ffffff');
    eyeGrad.addColorStop(0.3, '#ffdd44');
    eyeGrad.addColorStop(1, '#aa6600');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow at bottom
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(-20, boss.h / 2 + 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, boss.h / 2 + 6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, boss.h / 2 + 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawBossHPBar() {
    const barW = boss.w + 20;
    const barH = 8;
    const barY = -boss.h / 2 - 18;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-barW / 2, barY, barW, barH);
    const hpRatio = boss.hp / boss.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#ff4444' : hpRatio > 0.25 ? '#ff8800' : '#ff0000';
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
    ctx.strokeStyle = '#ff6666';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, barY, barW, barH);
}

function drawBoss() {
    if (!boss) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);

    if (boss.type === 'assault') {
        drawBossBodyAssault();
    } else if (boss.type === 'guardian') {
        drawBossBodyGuardian();
    } else if (boss.type === 'destroyer') {
        drawBossBodyDestroyer();
    } else if (boss.type === 'mothership') {
        drawBossBodyMothership();
    }

    // HP bar above boss
    drawBossHPBar();

    ctx.restore();
}

function destroyBoss() {
    score += boss.score;
    bossesDefeatedTotal++;
    spawnExplosion(boss.x, boss.y, true);
    spawnParticles(boss.x, boss.y, 50, '#ff4444', 5, 50, 4);
    spawnParticles(boss.x, boss.y, 30, '#ffaa44', 4, 40, 3);
    addFloatingText(boss.x, boss.y - 40, `BOSS DEFEATED! +${boss.score}`, '#ffdd44');
    screenShake = 20;
    screenFlash = 0.8;

    // Drop multiple power-ups (capture position before boss is nulled)
    const dropX = boss.x;
    const dropY = boss.y;
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            if (gameState === 'playing') {
                spawnPowerup(dropX + (Math.random() - 0.5) * 60, dropY + (Math.random() - 0.5) * 40);
            }
        }, i * 200);
    }

    boss = null;
    bossActive = false;
    bossHud.classList.add('hidden');
    // Reset wave state so the next wave starts correctly
    waveActive = false;
    waveTransitionTimer = 0;
    updateHUD();
}

// ==================== POWER-UPS ====================
function spawnPowerup(x, y) {
    const types = Object.keys(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    powerups.push({
        x, y,
        type,
        ...POWERUP_TYPES[type],
        vy: 1.5,
        timer: 0,
        size: 14,
    });
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        pu.y += pu.vy;
        pu.timer++;

        if (pu.y > GAME_HEIGHT + 20) {
            powerups.splice(i, 1);
            continue;
        }

        // Collect
        if (Math.hypot(pu.x - player.x, pu.y - player.y) < 30) {
            collectPowerup(pu);
            powerups.splice(i, 1);
        }
    }
}

function collectPowerup(pu) {
    if (pu.type === 'HEALTH') {
        player.hp = Math.min(player.maxHp, player.hp + 1);
        addFloatingText(pu.x, pu.y, '+1 HP', '#ffffff');
    } else if (pu.type === 'SHIELD') {
        player.shieldTimer = 600; // 10 seconds
        addFloatingText(pu.x, pu.y, 'SHIELD!', '#ffdd44');
    } else {
        // Weapon power-ups
        if (pu.type === 'SPREAD' && player.weapon !== 'SPREAD' && player.weapon !== 'HYBRID') {
            player.weapon = 'SPREAD';
            player.weaponLevel = 1;
        } else if (pu.type === 'LASER' && player.weapon !== 'LASER' && player.weapon !== 'HYBRID') {
            player.weapon = 'LASER';
            player.weaponLevel = 1;
        } else if (pu.type === 'MISSILE' && player.weapon !== 'MISSILE' && player.weapon !== 'HYBRID') {
            player.weapon = 'MISSILE';
            player.weaponLevel = 1;
        } else if (pu.type === 'SPREAD' && player.weapon === 'SPREAD') {
            player.weapon = 'HYBRID';
            player.weaponLevel = 2;
            player.fireRate = 8;
        } else if (pu.type === 'LASER' && player.weapon === 'LASER') {
            player.weapon = 'HYBRID';
            player.weaponLevel = 2;
            player.fireRate = 8;
        } else if (pu.type === 'MISSILE' && player.weapon === 'MISSILE') {
            player.weapon = 'HYBRID';
            player.weaponLevel = 2;
            player.fireRate = 8;
        } else {
            // Already have this or hybrid - just upgrade fire rate slightly
            player.fireRate = Math.max(4, player.fireRate - 1);
        }
        addFloatingText(pu.x, pu.y, pu.label + '!', pu.color);
    }
    spawnParticles(pu.x, pu.y, 10, pu.color, 2, 20, 2);
    updateHUD();
}

function drawPowerups() {
    for (const pu of powerups) {
        ctx.save();
        ctx.translate(pu.x, pu.y);

        // Glow
        ctx.shadowColor = pu.color;
        ctx.shadowBlur = 12;

        // Rotating diamond
        const rot = pu.timer * 0.03;
        ctx.rotate(rot);
        ctx.fillStyle = pu.color;
        ctx.beginPath();
        ctx.moveTo(0, -pu.size);
        ctx.lineTo(pu.size, 0);
        ctx.lineTo(0, pu.size);
        ctx.lineTo(-pu.size, 0);
        ctx.closePath();
        ctx.fill();

        ctx.rotate(-rot);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.icon, 0, 0);

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ==================== WAVES & SPAWNING ====================
function startWave() {
    waveActive = true;
    waveEnemyCount = 5 + wave * 3;
    waveEnemiesSpawned = 0;
    waveEnemiesKilled = 0;
    waveTimer = 0;
}

function updateWaves() {
    if (bossActive) {
        // Even during boss fight, spawn a few minions every ~3 seconds
        if (frameCount % 180 === 0 && enemies.length < 3) {
            spawnWaveEnemy();
        }
        return;
    }

    if (!waveActive) {
        waveTransitionTimer++;
        if (waveTransitionTimer > 90) {
            startWave();
            waveTransitionTimer = 0;
        }
        return;
    }

    waveTimer++;

    // Spawn enemies
    const spawnInterval = Math.max(20, 60 - wave * 3);
    if (waveTimer % spawnInterval === 0 && waveEnemiesSpawned < waveEnemyCount) {
        spawnWaveEnemy();
        waveEnemiesSpawned++;
    }

    // Check wave complete: all spawned enemies must be gone (killed or escaped)
    if (waveEnemiesSpawned >= waveEnemyCount && enemies.length === 0) {
        waveActive = false;
        wave++;
        difficulty = 1 + (wave - 1) * 0.15;
        waveTransitionTimer = 0;

        // Check for boss (every 2 waves)
        if (wave % 2 === 0) {
            startBossFight();
        }
    }
}

function spawnWaveEnemy() {
    const types = ['small'];
    if (wave >= 2) types.push('fast');
    if (wave >= 3) types.push('medium');
    if (wave >= 5) types.push('bomber');

    const type = types[Math.floor(Math.random() * types.length)];
    const e = createEnemy(type);

    // Formation patterns
    if (wave >= 2 && Math.random() < 0.3) {
        // V formation
        const startX = GAME_WIDTH / 2;
        const offset = (waveEnemiesSpawned % 5) - 2;
        e.x = startX + offset * 50;
        e.y = -40 - Math.abs(offset) * 20;
        e.startX = e.x;
    }

    enemies.push(e);
}

function startBossFight() {
    bossWarningTimer = 180; // 3 seconds warning
    bossActive = true;
    // Pre-determine boss type for warning text
    const bType = getBossType();
    const def = BOSS_DEFS[bType];
    const warningH1 = bossWarning.querySelector('h1');
    if (warningH1) warningH1.textContent = `${def.name} APPROACHING`;
}

function updateBossWarning() {
    if (bossWarningTimer > 0) {
        bossWarningTimer--;
        if (bossWarningTimer <= 0) {
            bossWarning.classList.add('hidden');
            boss = createBoss();
            bossHud.classList.remove('hidden');
            // Update boss HUD with name
            const bossLabel = document.getElementById('boss-label');
            if (bossLabel) bossLabel.textContent = boss.name || 'BOSS';
        } else {
            bossWarning.classList.remove('hidden');
        }
    }
}

// ==================== COLLISION HELPERS ====================
function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
}

function rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// ==================== HUD ====================
function updateHUD() {
    scoreValue.textContent = score;
    waveValue.textContent = wave;

    // HP bar
    const hpRatio = player ? player.hp / player.maxHp : 1;
    hpBarFill.style.width = `${hpRatio * 100}%`;
    if (hpRatio > 0.6) hpBarFill.style.background = 'linear-gradient(90deg, #44ff44, #88ff44)';
    else if (hpRatio > 0.3) hpBarFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffdd44)';
    else hpBarFill.style.background = 'linear-gradient(90deg, #ff2222, #ff6644)';

    // Weapon name
    weaponName.textContent = player ? WEAPON_NAMES[player.weapon === 'NORMAL' ? 0 : player.weapon === 'SPREAD' ? 1 : player.weapon === 'LASER' ? 2 : player.weapon === 'MISSILE' ? 3 : 4] : 'NORMAL';
    weaponName.style.color = player && player.weapon !== 'NORMAL' ? POWERUP_TYPES[player.weapon.toUpperCase()]?.color || '#88ccff' : '#88ccff';

    // Boss HP
    if (boss) {
        bossHpFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
        const bossLabel = document.getElementById('boss-label');
        if (bossLabel) {
            const fightPhaseText = boss.fightPhase > 1 ? ` P${boss.fightPhase}` : '';
            const shieldText = boss.shield > 0 ? ` [SHIELD ${Math.ceil(boss.shield)}]` : '';
            bossLabel.textContent = `${boss.name || 'BOSS'}${fightPhaseText}${shieldText}`;
        }
    }
}

// ==================== GAME OVER ====================
function gameOver() {
    gameState = 'gameover';
    spawnExplosion(player.x, player.y, true);
    spawnParticles(player.x, player.y, 40, '#66aaff', 5, 50, 3);

    // Save high score
    let isNewHigh = false;
    if (score > highScore) {
        highScore = score;
        isNewHigh = true;
        localStorage.setItem('skyFighterHighScore', highScore.toString());
    }

    // Update game over screen
    finalScore.textContent = score;
    finalWave.textContent = wave;
    bossesDefeated.textContent = bossesDefeatedTotal;
    enemiesDestroyed.textContent = enemiesDestroyedTotal;
    goHighScore.textContent = highScore;

    if (isNewHigh) {
        newHighScoreEl.classList.remove('hidden');
    } else {
        newHighScoreEl.classList.add('hidden');
    }

    menuScreen.classList.add('hidden');
    menuScreen.classList.remove('active');
    hud.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('active');
}

// ==================== INIT / RESET ====================
function initGame() {
    player = createPlayer();
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    explosions = [];
    floatingTexts = [];
    boss = null;
    bossActive = false;
    wave = 1;
    score = 0;
    enemiesDestroyedTotal = 0;
    bossesDefeatedTotal = 0;
    difficulty = 1;
    frameCount = 0;
    waveActive = false;
    waveTransitionTimer = 0;
    bossWarningTimer = 0;
    screenShake = 0;
    screenFlash = 0;

    initStars();
    updateHUD();
}

function startGame() {
    initGame();
    gameState = 'playing';
    menuScreen.classList.add('hidden');
    menuScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    pauseScreen.classList.add('hidden');
    pauseScreen.classList.remove('active');
    hud.classList.remove('hidden');
    bossWarning.classList.add('hidden');
    bossHud.classList.add('hidden');
    newHighScoreEl.classList.add('hidden');
}

// ==================== MAIN LOOP ====================
function update() {
    if (gameState !== 'playing') return;

    frameCount++;
    updateStars();
    updatePlayer();
    updateBullets();
    updateEnemies();
    updatePowerups();
    updateWaves();
    updateBossWarning();
    if (boss) updateBoss();
    updateParticles();
    updateExplosions();
    updateFloatingTexts();

    // Screen effects
    if (screenShake > 0) screenShake *= 0.9;
    if (screenFlash > 0) screenFlash -= 0.03;

    // Update HUD periodically
    if (frameCount % 10 === 0) updateHUD();
}

function draw() {
    ctx.save();

    // Screen shake
    if (screenShake > 0.5) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake,
            (Math.random() - 0.5) * screenShake
        );
    }

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, '#0a0a2e');
    bgGrad.addColorStop(0.5, '#111144');
    bgGrad.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-10, -10, GAME_WIDTH + 20, GAME_HEIGHT + 20);

    drawStars();

    if (gameState === 'playing' || gameState === 'paused') {
        // Draw game objects
        drawPowerups();
        drawEnemies();
        if (boss) drawBoss();
        drawBullets();
        drawParticles();
        drawExplosions();
        if (player) drawPlayer();
        drawFloatingTexts();

        // Screen flash
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${screenFlash})`;
            ctx.fillRect(-10, -10, GAME_WIDTH + 20, GAME_HEIGHT + 20);
        }

        // Wave transition text
        if (!waveActive && !bossActive && waveTransitionTimer > 30) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`WAVE ${wave + 1}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50);
        }
    }

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// ==================== INPUT ====================
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyP' && gameState === 'playing') {
        gameState = 'paused';
        pauseScreen.classList.remove('hidden');
        pauseScreen.classList.add('active');
    } else if (e.code === 'KeyP' && gameState === 'paused') {
        resumeGame();
    }
});

window.addEventListener('keyup', e => {
    keys[e.code] = false;
});

// Mouse/touch control
canvas.addEventListener('mousemove', e => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
    useMouseControl = true;
});

canvas.addEventListener('mousedown', e => {
    mouseDown = true;
    if (gameState === 'playing' && player) {
        // Extra shot on click
        player.fireTimer = Math.max(0, player.fireTimer - 5);
    }
});

canvas.addEventListener('mouseup', () => { mouseDown = false; });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * scaleX;
    mouseY = (touch.clientY - rect.top) * scaleY;
    useMouseControl = true;
}, { passive: false });

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const touch = e.touches[0];
    mouseX = (touch.clientX - rect.left) * scaleX;
    mouseY = (touch.clientY - rect.top) * scaleY;
    useMouseControl = true;
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    mouseDown = false;
});

// ==================== BUTTONS ====================
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    gameOverScreen.classList.remove('active');
    hud.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    menuScreen.classList.add('active');
    gameState = 'menu';
    menuHighScoreVal.textContent = highScore;
});
resumeBtn.addEventListener('click', resumeGame);
pauseMenuBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    pauseScreen.classList.remove('active');
    hud.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    menuScreen.classList.add('active');
    gameState = 'menu';
    menuHighScoreVal.textContent = highScore;
});

function resumeGame() {
    gameState = 'playing';
    pauseScreen.classList.add('hidden');
    pauseScreen.classList.remove('active');
}

// ==================== START ====================
initStars();
loop();
