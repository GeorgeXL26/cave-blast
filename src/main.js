import { Input } from './input.js';
import { audio } from './audio.js';
import { Player } from './player.js';
import { makeCaveShape, generateDecorations, drawCave } from './cave.js';
import { WaveManager } from './waves.js';
import { Bonus, rollBonusType, applyBonus, checkBonusPickup, BONUS_DEFS } from './bonuses.js';
import { ParticleSystem } from './particles.js';
import { COMBO_WINDOW, COMBO_CAP } from './constants.js';
import { dist, fmtScore, clamp } from './utils.js';

// ---------- Canvas setup ----------
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const input = new Input(canvas);

// ---------- DOM refs ----------
const screens = {
  menu: document.getElementById('screen-menu'),
  howto: document.getElementById('screen-howto'),
  settings: document.getElementById('screen-settings'),
  gameover: document.getElementById('screen-gameover'),
};
const hud = document.getElementById('hud');
const elHealth = document.getElementById('hud-health');
const elWave = document.getElementById('hud-wave');
const elScore = document.getElementById('hud-score');
const elWeaponIcon = document.getElementById('weapon-icon');
const elWeaponName = document.getElementById('weapon-name');
const elKills = document.getElementById('hud-kills');
const elBossWrap = document.getElementById('hud-boss-wrap');
const elBossBar = document.getElementById('hud-boss-bar');
const bannerWaveCleared = document.getElementById('banner-wave-cleared');
const bannerWeapon = document.getElementById('banner-weapon');
const bannerBoss = document.getElementById('banner-boss');
const bannerCombo = document.getElementById('banner-combo');
const elFinalScore = document.getElementById('final-score');
const elFinalWave = document.getElementById('final-wave');
const chkSound = document.getElementById('chk-sound');

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  if (name && screens[name]) screens[name].classList.remove('hidden');
}

function flashBanner(el, text, duration = 1500) {
  if (text != null) el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  // force reflow to restart animation
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ---------- Game state ----------
let state = 'menu'; // menu | howto | settings | playing | gameover
let game = null;
let lastTime = performance.now();
let shakeTime = 0;
let shakeMag = 0;

function newGame() {
  const cave = makeCaveShape();
  const decor = generateDecorations(cave);
  const player = new Player();
  const particles = new ParticleSystem();
  const projectiles = [];
  const bonuses = [];

  const waveManager = new WaveManager(cave, {
    onWaveStart: (w) => {
      elWave.textContent = `WAVE ${w}`;
    },
    onWaveCleared: () => {
      flashBanner(bannerWaveCleared, 'WAVE CLEARED!', 1500);
      audio.waveCleared();
    },
    onBossIncoming: () => {
      flashBanner(bannerBoss, '⚠️ GIANT CAVE BEAST INCOMING! ⚠️', 2000);
      audio.bossWarning();
      shakeTime = 1.6;
      shakeMag = 10;
    },
  });
  waveManager.start();

  return {
    cave,
    decor,
    player,
    particles,
    projectiles,
    bonuses,
    waveManager,
    score: 0,
    kills: 0,
    comboCount: 0,
    comboExpire: 0,
    camera: { x: 0, y: 0 },
  };
}

function startGame() {
  audio.resume();
  audio.startMusic();
  game = newGame();
  state = 'playing';
  hud.classList.remove('hidden');
  showScreen(null);
  elScore.textContent = 'SCORE: 0';
  elKills.textContent = 'KILLS: 0';
  elWave.textContent = 'WAVE 1';
  elBossWrap.classList.add('hidden');
  updateHealthHud();
  updateWeaponHud();
}

function endGame() {
  state = 'gameover';
  audio.stopMusic();
  hud.classList.add('hidden');
  elFinalScore.textContent = `SCORE: ${fmtScore(game.score)}`;
  elFinalWave.textContent = `Survived to Wave ${game.waveManager.wave}  •  ${game.kills} kills`;
  showScreen('gameover');
}

// ---------- HUD helpers ----------
function updateHealthHud() {
  const p = game.player;
  let s = '';
  for (let i = 0; i < p.maxHealth; i++) s += i < p.health ? '❤️' : '🖤';
  elHealth.textContent = s;
}

function updateWeaponHud() {
  const p = game.player;
  const key = p.weapon;
  const icons = {
    pistol: '🔫',
    doublePistols: '🔫🔫',
    quadPistols: '🔫🔫🔫🔫',
    rifle: '🪖',
    dualRifles: '🪖🪖',
    bazooka: '🚀',
    poweredRifle: '🔥',
    ultimate: '💫',
  };
  const names = {
    pistol: 'PISTOL',
    doublePistols: 'DOUBLE PISTOLS',
    quadPistols: 'QUADRUPLE PISTOLS',
    rifle: 'RIFLE',
    dualRifles: 'DUAL RIFLES',
    bazooka: 'BAZOOKA',
    poweredRifle: 'POWERED RIFLE',
    ultimate: 'ULTIMATE WEAPON',
  };
  elWeaponIcon.textContent = icons[key] || '🔫';
  elWeaponName.textContent = names[key] || 'PISTOL';
}

function registerKill(enemy) {
  const now = performance.now() / 1000;
  if (now < game.comboExpire) {
    game.comboCount = Math.min(COMBO_CAP, game.comboCount + 1);
  } else {
    game.comboCount = 1;
  }
  game.comboExpire = now + COMBO_WINDOW;

  const mult = game.comboCount >= 2 ? game.comboCount : 1;
  game.score += Math.round(enemy.score * mult);
  game.kills += 1;
  elScore.textContent = `SCORE: ${fmtScore(game.score)}`;
  elKills.textContent = `KILLS: ${game.kills}`;
  if (game.comboCount >= 2) {
    flashBanner(bannerCombo, `COMBO x${game.comboCount}!`, 700);
  }

  audio.enemyDeath();
  game.particles.burst(enemy.x, enemy.y, '#fff', 12, { speed: 220, life: 0.5 });
  game.particles.burst(enemy.x, enemy.y, enemy.color, 8, { speed: 140, life: 0.6 });

  // bonus drop chance: tougher enemies drop a bit more often
  const dropChance = enemy.type === 'miniBoss' ? 1 : 0.28 + enemy.score / 400;
  if (Math.random() < dropChance) {
    const type = enemy.type === 'miniBoss' ? weightedBossDrop() : rollBonusType(game.waveManager.wave);
    game.bonuses.push(new Bonus(enemy.x, enemy.y, type));
  }
}

function weightedBossDrop() {
  // Mini-boss always drops something exciting
  const table = ['ultimate', 'poweredRifle', 'bazooka', 'rifle', 'doublePistols', 'power', 'magnet'];
  return table[Math.floor(Math.random() * table.length)];
}

// Explosive splash damage for weapons like the bazooka. Hits every live
// enemy within `radius` of (x,y) except the one already hit directly.
function explode(x, y, radius, damage, primaryEnemy) {
  audio.explosion();
  game.particles.burst(x, y, '#ff8a3d', 20, { speed: 260, life: 0.5 });
  game.particles.burst(x, y, '#ffe066', 14, { speed: 180, life: 0.4 });
  shakeTime = Math.max(shakeTime, 0.2);
  shakeMag = Math.max(shakeMag, 5);
  for (const e of game.waveManager.enemies) {
    if (e.dead || e === primaryEnemy) continue;
    if (dist(x, y, e.x, e.y) < radius + e.radius) {
      const killed = e.hit(damage);
      if (killed) registerKill(e);
    }
  }
}

// ---------- Main update ----------
function update(dt) {
  const p = game.player;
  const mouseWorld = {
    x: game.camera.x + input.mouseX,
    y: game.camera.y + input.mouseY,
  };

  p.update(dt, input, game.cave, mouseWorld);
  p.tryFire(input, game.projectiles);

  // projectiles
  for (const proj of game.projectiles) proj.update(dt);
  game.projectiles = game.projectiles.filter((pr) => !pr.dead);

  // wave manager + enemies
  game.waveManager.update(dt);
  for (const e of game.waveManager.enemies) e.update(dt, p);

  // projectile vs enemy collisions
  for (const proj of game.projectiles) {
    if (proj.dead) continue;
    for (const e of game.waveManager.enemies) {
      if (e.dead) continue;
      if (dist(proj.x, proj.y, e.x, e.y) < e.radius + proj.radius) {
        proj.dead = true;
        game.particles.spark(proj.x, proj.y, proj.vx, proj.vy, e.color);
        const killed = e.hit(proj.damage);
        if (killed) registerKill(e);
        if (proj.splashRadius > 0) explode(proj.x, proj.y, proj.splashRadius, proj.splashDamage, e);
        break;
      }
    }
  }
  game.projectiles = game.projectiles.filter((pr) => !pr.dead);
  game.waveManager.removeDead();

  // enemy vs player contact
  for (const e of game.waveManager.enemies) {
    if (dist(e.x, e.y, p.x, p.y) < e.radius + p.radius * 0.7) {
      const hit = p.takeDamage(e.contactDamage);
      if (hit) {
        audio.playerHit();
        shakeTime = Math.max(shakeTime, 0.25);
        shakeMag = Math.max(shakeMag, 6);
        updateHealthHud();
        if (p.health <= 0) {
          endGame();
          return;
        }
      }
    }
  }

  // bonuses
  for (const b of game.bonuses) b.update(dt, p);
  checkBonusPickup(p, game.bonuses);
  for (const b of game.bonuses) {
    if (b.collected) {
      const result = applyBonus(b.type, p, game);
      audio.bonusCollect();
      game.particles.sparkle(b.x, b.y, BONUS_DEFS[b.type].color);
      if (result?.isWeapon) {
        audio.weaponUpgrade();
        flashBanner(bannerWeapon, result.label, 1600);
        updateWeaponHud();
      } else if (result) {
        flashBanner(bannerCombo, result.label, 1100);
      }
      updateHealthHud();
    }
  }
  game.bonuses = game.bonuses.filter((b) => !b.collected && !b.expired);

  game.particles.update(dt);

  // boss hud
  const boss = game.waveManager.enemies.find((e) => e.type === 'miniBoss');
  if (boss) {
    elBossWrap.classList.remove('hidden');
    elBossBar.style.width = `${clamp((boss.hp / boss.maxHp) * 100, 0, 100)}%`;
  } else {
    elBossWrap.classList.add('hidden');
  }

  // camera follows player, centered
  const viewW = canvas.width / dpr;
  const viewH = canvas.height / dpr;
  let camX = p.x - viewW / 2;
  let camY = p.y - viewH / 2;
  if (shakeTime > 0) {
    shakeTime -= dt;
    const m = shakeMag * (shakeTime > 0 ? 1 : 0);
    camX += (Math.random() - 0.5) * m;
    camY += (Math.random() - 0.5) * m;
  }
  game.camera.x = camX;
  game.camera.y = camY;
}

function render() {
  const viewW = canvas.width / dpr;
  const viewH = canvas.height / dpr;
  ctx.clearRect(0, 0, viewW, viewH);

  if (!game) return;
  const cam = game.camera;

  drawCave(ctx, game.cave, game.decor, cam, viewW, viewH);

  for (const b of game.bonuses) b.draw(ctx, cam);
  game.particles.draw(ctx, cam);

  const drawables = [...game.waveManager.enemies, game.player].sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw(ctx, cam);

  for (const proj of game.projectiles) proj.draw(ctx, cam);

  // mouse crosshair
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(input.mouseX, input.mouseY, 10, 0, Math.PI * 2);
  ctx.moveTo(input.mouseX - 14, input.mouseY);
  ctx.lineTo(input.mouseX - 5, input.mouseY);
  ctx.moveTo(input.mouseX + 5, input.mouseY);
  ctx.lineTo(input.mouseX + 14, input.mouseY);
  ctx.moveTo(input.mouseX, input.mouseY - 14);
  ctx.lineTo(input.mouseX, input.mouseY - 5);
  ctx.moveTo(input.mouseX, input.mouseY + 5);
  ctx.lineTo(input.mouseX, input.mouseY + 14);
  ctx.stroke();
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (state === 'playing' && game) {
    update(dt);
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- UI wiring ----------
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-howto').addEventListener('click', () => {
  state = 'howto';
  showScreen('howto');
});
document.getElementById('btn-settings').addEventListener('click', () => {
  state = 'settings';
  showScreen('settings');
});
document.getElementById('btn-again').addEventListener('click', startGame);
document.getElementById('btn-mainmenu').addEventListener('click', () => {
  state = 'menu';
  showScreen('menu');
});
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state = 'menu';
    showScreen('menu');
  });
});
chkSound.addEventListener('change', () => {
  audio.setMuted(!chkSound.checked);
});

showScreen('menu');
