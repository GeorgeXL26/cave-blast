import { rand, clamp } from './utils.js';
import { EnemyProjectile } from './enemyProjectiles.js';

// Base stats per enemy type. Wave manager scales hp/speed slightly as
// waves progress (see waves.js) so things stay winnable but tense.
// `ranged` types also carry attack/projectile tuning used by tryAttack().
export const ENEMY_TYPES = {
  bat: { hp: 1, speed: 135, radius: 13, score: 10, color: '#8a5cf6', contactDamage: 1 },
  spider: { hp: 3, speed: 95, radius: 18, score: 20, color: '#5a3d2b', contactDamage: 1 },
  slime: { hp: 2, speed: 65, radius: 16, score: 15, color: '#4ade80', contactDamage: 1 },
  rockMonster: { hp: 8, speed: 42, radius: 24, score: 40, color: '#8a8a8a', contactDamage: 1 },
  snake: { hp: 3, speed: 165, radius: 13, score: 25, color: '#a3d900', contactDamage: 1 },
  ghost: { hp: 2, speed: 105, radius: 17, score: 50, color: '#d7d9ff', contactDamage: 1 },
  arrowShooter: {
    hp: 3,
    speed: 72,
    radius: 16,
    score: 30,
    color: '#c98a4b',
    contactDamage: 1,
    ranged: true,
    attackRange: 420,
    attackIntervalMin: 1.4,
    attackIntervalMax: 2.1,
    projSpeed: 520,
    projDamage: 1,
    projRange: 650,
    projRadius: 6,
    projColor: '#e5c07b',
    projKind: 'arrow',
  },
  chainsawShooter: {
    hp: 5,
    speed: 55,
    radius: 19,
    score: 35,
    color: '#7a7f87',
    contactDamage: 1,
    ranged: true,
    attackRange: 380,
    attackIntervalMin: 2.0,
    attackIntervalMax: 2.8,
    projSpeed: 340,
    projDamage: 1,
    projRange: 600,
    projRadius: 11,
    projColor: '#9aa0a6',
    projKind: 'chainsaw',
  },
  miniBoss: {
    hp: 90,
    speed: 46,
    radius: 62,
    score: 500,
    color: '#e0563f',
    contactDamage: 2,
    ranged: true,
    attackRange: 950,
    attackIntervalMin: 1.8,
    attackIntervalMax: 2.4,
    projSpeed: 560,
    projDamage: 1,
    projRange: 1050,
    projRadius: 9,
    projColor: '#ffd27a',
    projKind: 'bossArrow',
  },
};

let idCounter = 1;

export class Enemy {
  constructor(type, x, y, mult = { hp: 1, speed: 1 }) {
    const def = ENEMY_TYPES[type];
    this.id = idCounter++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.maxHp = Math.round(def.hp * mult.hp);
    this.hp = this.maxHp;
    this.speed = def.speed * mult.speed;
    this.radius = def.radius;
    this.score = def.score;
    this.color = def.color;
    this.contactDamage = def.contactDamage;
    this.flashUntil = 0;
    this.dead = false;
    this.phase = rand(0, Math.PI * 2);
    this.dirJitter = 0;
    this.wanderAngle = rand(0, Math.PI * 2);
    this.spawnTime = performance.now() / 1000;
    this.entranceTime = type === 'miniBoss' ? 1.2 : 0;

    // Ranged attack state (arrow shooter, chainsaw shooter, mini-boss)
    this.ranged = !!def.ranged;
    this.attackRange = def.attackRange || 0;
    this.attackIntervalMin = def.attackIntervalMin || 1.5;
    this.attackIntervalMax = def.attackIntervalMax || 2.2;
    this.attackTimer = rand(0.6, 1.6);
    this.projSpeed = def.projSpeed;
    this.projDamage = def.projDamage;
    this.projRange = def.projRange;
    this.projRadius = def.projRadius;
    this.projColor = def.projColor;
    this.projKind = def.projKind;

    // Mini-boss "roll" charge attack state machine
    if (type === 'miniBoss') {
      this.chargeState = 'idle'; // idle | telegraph | charging | recover
      this.chargeTimer = 0;
      this.chargeCooldown = rand(4, 5.5);
      this.chargeDirX = 0;
      this.chargeDirY = 0;
    }
  }

  hit(damage) {
    this.hp -= damage;
    this.flashUntil = performance.now() / 1000 + 0.12;
    if (this.hp <= 0) this.dead = true;
    return this.dead;
  }

  // Called separately from update() by the game loop for any `ranged`
  // enemy; pushes a new EnemyProjectile into `projectiles` once its
  // cooldown elapses and the target is within range.
  tryAttack(dt, target, projectiles) {
    if (!this.ranged) return;
    if (performance.now() / 1000 - this.spawnTime < this.entranceTime) return;
    if (this.type === 'miniBoss' && this.chargeState !== 'idle') return;
    this.attackTimer -= dt;
    if (this.attackTimer > 0) return;

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.attackRange) {
      this.attackTimer = 0.3; // not in range yet, check again soon
      return;
    }
    const angle = Math.atan2(dy, dx);
    const ox = this.x + Math.cos(angle) * this.radius;
    const oy = this.y + Math.sin(angle) * this.radius;
    projectiles.push(
      new EnemyProjectile(ox, oy, angle, {
        speed: this.projSpeed,
        damage: this.projDamage,
        range: this.projRange,
        radius: this.projRadius,
        kind: this.projKind,
        color: this.projColor,
      })
    );
    this.attackTimer = rand(this.attackIntervalMin, this.attackIntervalMax);
  }

  update(dt, target) {
    const now = performance.now() / 1000;
    this.phase += dt * 6;
    if (now - this.spawnTime < this.entranceTime) return; // dramatic pause on entry

    if (this.type === 'miniBoss') {
      this.updateBoss(dt, target);
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let dirX = dx / dist;
    let dirY = dy / dist;

    switch (this.type) {
      case 'bat': {
        // fast, direct, slight wobble
        const wobble = Math.sin(this.phase * 1.5) * 0.25;
        const a = Math.atan2(dirY, dirX) + wobble;
        dirX = Math.cos(a);
        dirY = Math.sin(a);
        break;
      }
      case 'snake': {
        this.dirJitter -= dt;
        if (this.dirJitter <= 0) {
          this.wanderAngle = Math.atan2(dirY, dirX) + rand(-0.9, 0.9);
          this.dirJitter = rand(0.35, 0.8);
        }
        dirX = Math.cos(this.wanderAngle);
        dirY = Math.sin(this.wanderAngle);
        break;
      }
      case 'ghost': {
        this.dirJitter -= dt;
        if (this.dirJitter <= 0) {
          this.wanderAngle = Math.atan2(dirY, dirX) + rand(-1.3, 1.3);
          this.dirJitter = rand(0.4, 1.1);
        }
        dirX = Math.cos(this.wanderAngle) * 0.7 + dirX * 0.3;
        dirY = Math.sin(this.wanderAngle) * 0.7 + dirY * 0.3;
        break;
      }
      case 'slime': {
        // bouncy: speed pulses
        break;
      }
      case 'arrowShooter':
      case 'chainsawShooter': {
        // Keep its preferred distance: approach if too far, back off if
        // the piggy gets in its face, otherwise hold and shoot.
        const preferred = this.attackRange * 0.7;
        if (dist > preferred) {
          // keep chasing (dirX/dirY already point at target)
        } else if (dist < preferred * 0.55) {
          dirX = -dirX;
          dirY = -dirY;
        } else {
          dirX = 0;
          dirY = 0;
        }
        break;
      }
      default:
        break;
    }

    const speedMult = this.type === 'slime' ? 0.6 + Math.abs(Math.sin(this.phase)) * 0.6 : 1;
    this.x += dirX * this.speed * speedMult * dt;
    this.y += dirY * this.speed * speedMult * dt;
  }

  // Mini-boss movement: normal chase most of the time, but once it drops
  // below half health it periodically winds up (telegraph) and rolls
  // toward the piggy in a fast straight-line charge (charging) that the
  // player has to dodge, then is briefly stunned (recover).
  updateBoss(dt, target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    const enraged = this.hp <= this.maxHp * 0.5;

    switch (this.chargeState) {
      case 'telegraph': {
        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0) {
          this.chargeState = 'charging';
          this.chargeTimer = 0.8;
          this.chargeDirX = dirX;
          this.chargeDirY = dirY;
        }
        return;
      }
      case 'charging': {
        this.chargeTimer -= dt;
        const chargeSpeed = this.speed * 6.2;
        this.x += this.chargeDirX * chargeSpeed * dt;
        this.y += this.chargeDirY * chargeSpeed * dt;
        if (this.chargeTimer <= 0) {
          this.chargeState = 'recover';
          this.chargeTimer = 0.9;
        }
        return;
      }
      case 'recover': {
        this.chargeTimer -= dt;
        this.x += dirX * this.speed * 0.25 * dt;
        this.y += dirY * this.speed * 0.25 * dt;
        if (this.chargeTimer <= 0) {
          this.chargeState = 'idle';
          this.chargeCooldown = rand(4.5, 6.5);
        }
        return;
      }
      default: {
        this.chargeCooldown -= dt;
        if (enraged && this.chargeCooldown <= 0) {
          this.chargeState = 'telegraph';
          this.chargeTimer = 0.65;
          return;
        }
        this.x += dirX * this.speed * dt;
        this.y += dirY * this.speed * dt;
      }
    }
  }

  draw(ctx, cam) {
    const now = performance.now() / 1000;
    const entering = now - this.spawnTime < this.entranceTime;
    const x = this.x - cam.x;
    const y = this.y - cam.y;
    const flashing = now < this.flashUntil;

    ctx.save();
    ctx.translate(x, y);
    if (entering) {
      const t = clamp((now - this.spawnTime) / this.entranceTime, 0, 1);
      ctx.scale(t, t);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.7, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyColor = flashing ? '#ffffff' : this.color;
    ctx.fillStyle = bodyColor;

    switch (this.type) {
      case 'bat': {
        const flap = Math.sin(this.phase * 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.5, 0);
        ctx.quadraticCurveTo(-this.radius * 1.8, -8 * flap - 4, -this.radius * 1.3, 4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.5, 0);
        ctx.quadraticCurveTo(this.radius * 1.8, -8 * flap - 4, this.radius * 1.3, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-3, -2, 1.6, 0, Math.PI * 2);
        ctx.arc(3, -2, 1.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'spider': {
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI - Math.PI / 2 + Math.sin(this.phase + i) * 0.15;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * this.radius * 1.5, Math.sin(a) * this.radius * 1.2 - 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-Math.cos(a) * this.radius * 1.5, Math.sin(a) * this.radius * 1.2 - 4);
          ctx.stroke();
        }
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff5252';
        for (const ex of [-4, 4]) {
          ctx.beginPath();
          ctx.arc(ex, -3, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'slime': {
        const squish = 0.85 + Math.abs(Math.sin(this.phase)) * 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius / squish, this.radius * squish, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-4, -4, this.radius * 0.3, this.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1e3a24';
        ctx.beginPath();
        ctx.arc(-4, 0, 1.8, 0, Math.PI * 2);
        ctx.arc(4, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'rockMonster': {
        ctx.beginPath();
        ctx.moveTo(-this.radius, this.radius * 0.4);
        ctx.lineTo(-this.radius * 0.6, -this.radius);
        ctx.lineTo(0, -this.radius * 0.7);
        ctx.lineTo(this.radius * 0.6, -this.radius);
        ctx.lineTo(this.radius, this.radius * 0.4);
        ctx.lineTo(this.radius * 0.5, this.radius);
        ctx.lineTo(-this.radius * 0.5, this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffcf4d';
        ctx.beginPath();
        ctx.arc(-8, -6, 3, 0, Math.PI * 2);
        ctx.arc(8, -6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath();
        ctx.arc(-8, -6, 1.4, 0, Math.PI * 2);
        ctx.arc(8, -6, 1.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'snake': {
        ctx.lineWidth = this.radius * 0.9;
        ctx.strokeStyle = bodyColor;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-this.radius * 1.6, Math.sin(this.phase) * 6);
        ctx.quadraticCurveTo(0, -Math.sin(this.phase) * 6, this.radius * 1.6, Math.sin(this.phase) * 6);
        ctx.stroke();
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(this.radius * 1.6, Math.sin(this.phase) * 6, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'ghost': {
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, -2, this.radius, Math.PI, 0);
        const wob = Math.sin(this.phase) * 3;
        ctx.lineTo(this.radius, this.radius * 0.7);
        ctx.quadraticCurveTo(this.radius * 0.5, this.radius * 0.9 + wob, 0, this.radius * 0.7);
        ctx.quadraticCurveTo(-this.radius * 0.5, this.radius * 0.9 - wob, -this.radius, this.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2b2b40';
        ctx.beginPath();
        ctx.arc(-5, -4, 2, 0, Math.PI * 2);
        ctx.arc(5, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'arrowShooter': {
        // stout archer body
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius * 0.85, this.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c3a1e';
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.6, -this.radius * 0.7);
        ctx.lineTo(-this.radius * 0.2, -this.radius * 1.2);
        ctx.lineTo(0, -this.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.6, -this.radius * 0.7);
        ctx.lineTo(this.radius * 0.2, -this.radius * 1.2);
        ctx.lineTo(0, -this.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        // bow held in front, aimed roughly at the player via velocity-less static tilt
        ctx.strokeStyle = '#4a2f18';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.radius * 0.9, 0, this.radius * 0.9, -0.9, 0.9);
        ctx.stroke();
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.9 + Math.cos(-0.9) * this.radius * 0.9, Math.sin(-0.9) * this.radius * 0.9);
        ctx.lineTo(this.radius * 1.7, 0);
        ctx.lineTo(this.radius * 0.9 + Math.cos(0.9) * this.radius * 0.9, Math.sin(0.9) * this.radius * 0.9);
        ctx.stroke();
        ctx.fillStyle = '#2b2b2b';
        ctx.beginPath();
        ctx.arc(-4, -2, 2, 0, Math.PI * 2);
        ctx.arc(4, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'chainsawShooter': {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#55585d';
        ctx.beginPath();
        ctx.ellipse(0, this.radius * 0.35, this.radius * 0.75, this.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // stubby launcher tube up front with a spinning ready-blade
        ctx.fillStyle = '#3a3d40';
        ctx.fillRect(this.radius * 0.3, -6, this.radius * 0.9, 12);
        const spin = this.phase * 2;
        ctx.save();
        ctx.translate(this.radius * 1.3, 0);
        ctx.rotate(spin);
        ctx.fillStyle = '#c7cbcf';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
          ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
          ctx.lineTo(Math.cos(a + 0.25) * 6, Math.sin(a + 0.25) * 6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#ffcf4d';
        ctx.beginPath();
        ctx.arc(-5, -this.radius * 0.3, 2.4, 0, Math.PI * 2);
        ctx.arc(5, -this.radius * 0.3, 2.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'miniBoss': {
        if (this.chargeState === 'telegraph') {
          const pulse = 0.5 + 0.5 * Math.sin(now * 20);
          ctx.save();
          ctx.globalAlpha = 0.55 * pulse;
          ctx.strokeStyle = '#ff3b3b';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a2a1a';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * this.radius * 0.4 - 8, -this.radius * 0.7);
          ctx.lineTo(i * this.radius * 0.4, -this.radius * 1.3);
          ctx.lineTo(i * this.radius * 0.4 + 8, -this.radius * 0.7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = this.chargeState === 'recover' ? '#8fb0ff' : '#ffe066';
        ctx.beginPath();
        ctx.arc(-16, -6, 7, 0, Math.PI * 2);
        ctx.arc(16, -6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(-16, -6, 3, 0, Math.PI * 2);
        ctx.arc(16, -6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3a1006';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 12, 14, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}
