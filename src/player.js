import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_MAX_HEALTH,
  PLAYER_INVULN_TIME,
  RAPID_FIRE_MULT,
  POWER_BONUS_DAMAGE,
  MAGNET_RADIUS,
} from './constants.js';
import { clampToCave } from './cave.js';
import { WEAPONS, fireWeapon } from './weapons.js';
import { clamp } from './utils.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = PLAYER_RADIUS;
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.aimAngle = 0;
    this.weapon = 'pistol';
    this.fireCooldown = 0;
    this.invulnUntil = 0;
    this.hitFlashUntil = 0;
    this.walkPhase = 0;

    this.rapidFireUntil = 0;
    this.powerUntil = 0;
    this.magnetUntil = 0;
  }

  get isInvulnerable() {
    return performance.now() / 1000 < this.invulnUntil;
  }

  get magnetActive() {
    return performance.now() / 1000 < this.magnetUntil;
  }

  damageBonus() {
    return performance.now() / 1000 < this.powerUntil ? POWER_BONUS_DAMAGE : 0;
  }

  takeDamage(amount = 1) {
    const now = performance.now() / 1000;
    if (now < this.invulnUntil) return false;
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    this.invulnUntil = now + PLAYER_INVULN_TIME;
    this.hitFlashUntil = now + 0.25;
    return true;
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, this.maxHealth);
  }

  setWeapon(key) {
    this.weapon = key;
  }

  update(dt, input, cave, mouseWorld) {
    const move = input.moveVector();
    let nx = this.x + move.x * PLAYER_SPEED * dt;
    let ny = this.y + move.y * PLAYER_SPEED * dt;
    const clamped = clampToCave(nx, ny, cave, this.radius);
    this.x = clamped.x;
    this.y = clamped.y;

    if (move.x !== 0 || move.y !== 0) this.walkPhase += dt * 10;

    this.aimAngle = Math.atan2(mouseWorld.y - this.y, mouseWorld.x - this.x);

    this.fireCooldown -= dt;
  }

  tryFire(input, projectiles) {
    if (!input.firing) return;
    if (this.fireCooldown > 0) return;
    const weapon = WEAPONS[this.weapon];
    const now = performance.now() / 1000;
    const rapid = now < this.rapidFireUntil ? RAPID_FIRE_MULT : 1;
    this.fireCooldown = weapon.cooldown / rapid;
    const muzzle = 26;
    const mx = this.x + Math.cos(this.aimAngle) * muzzle;
    const my = this.y + Math.sin(this.aimAngle) * muzzle;
    fireWeapon(mx, my, this.aimAngle, this.weapon, this.damageBonus(), projectiles);
  }

  draw(ctx, cam) {
    const x = this.x - cam.x;
    const y = this.y - cam.y;
    const flashing = performance.now() / 1000 < this.hitFlashUntil;
    const invuln = this.isInvulnerable;
    const bob = Math.sin(this.walkPhase) * 2;

    ctx.save();
    ctx.translate(x, y);
    if (invuln && !flashing) ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 60) * 0.2;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.8, this.radius * 0.9, this.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // weapon (drawn behind or in front depending on aim direction)
    const facingRight = Math.cos(this.aimAngle) >= 0;
    if (!facingRight) this.drawWeapon(ctx);

    // tail
    ctx.strokeStyle = '#f2a6c6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const tailX = -this.radius * 0.75;
    ctx.moveTo(tailX, bob);
    ctx.quadraticCurveTo(tailX - 10, bob - 12, tailX - 2, bob - 16);
    ctx.stroke();

    // legs
    ctx.fillStyle = '#e88fb5';
    for (const lx of [-8, 8]) {
      ctx.beginPath();
      ctx.ellipse(lx, this.radius * 0.75 + bob, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // body
    const bodyColor = flashing ? '#ffffff' : '#ffb3d1';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, bob, this.radius, this.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e88fb5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ears
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-this.radius * 0.55, -this.radius * 0.75 + bob, 8, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.radius * 0.55, -this.radius * 0.75 + bob, 8, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd6e6';
    ctx.beginPath();
    ctx.ellipse(-this.radius * 0.55, -this.radius * 0.72 + bob, 4, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.radius * 0.55, -this.radius * 0.72 + bob, 4, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // snout
    ctx.fillStyle = '#ff8fbf';
    const snoutDir = facingRight ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(snoutDir * this.radius * 0.55, bob + 4, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c76089';
    ctx.beginPath();
    ctx.ellipse(snoutDir * this.radius * 0.55 - snoutDir * 2, bob + 4, 1.6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(snoutDir * this.radius * 0.55 + snoutDir * 3, bob + 4, 1.6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = '#2b1720';
    ctx.beginPath();
    ctx.arc(-4, bob - 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, bob - 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-3, bob - 5, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, bob - 5, 0.9, 0, Math.PI * 2);
    ctx.fill();

    if (facingRight) this.drawWeapon(ctx);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawWeapon(ctx) {
    ctx.save();
    ctx.rotate(this.aimAngle);
    const weapon = this.weapon;
    ctx.fillStyle = '#4a4a52';
    if (weapon === 'pistol') {
      ctx.fillRect(10, -3, 22, 6);
      ctx.fillRect(24, -3, 6, 10);
    } else if (weapon === 'doublePistols') {
      ctx.fillRect(10, -8, 20, 5);
      ctx.fillRect(10, 3, 20, 5);
      ctx.fillRect(22, -8, 5, 8);
      ctx.fillRect(22, 3, 5, 8);
    } else if (weapon === 'quadPistols') {
      ctx.fillRect(10, -14, 18, 4.5);
      ctx.fillRect(10, -6, 18, 4.5);
      ctx.fillRect(10, 2, 18, 4.5);
      ctx.fillRect(10, 10, 18, 4.5);
      ctx.fillRect(21, -14, 5, 7);
      ctx.fillRect(21, -6, 5, 7);
      ctx.fillRect(21, 2, 5, 7);
      ctx.fillRect(21, 10, 5, 7);
    } else if (weapon === 'rifle') {
      ctx.fillStyle = '#6a7a8f';
      ctx.fillRect(8, -3, 40, 6);
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(4, -6, 12, 12);
    } else if (weapon === 'dualRifles') {
      ctx.fillStyle = '#6a7a8f';
      ctx.fillRect(8, -10, 38, 5.5);
      ctx.fillRect(8, 4.5, 38, 5.5);
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(4, -12, 11, 11);
      ctx.fillRect(4, 1, 11, 11);
    } else if (weapon === 'bazooka') {
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(4, -9, 48, 18);
      ctx.fillStyle = '#ff8a3d';
      ctx.fillRect(4, -9, 9, 18);
      ctx.fillStyle = '#1f1f24';
      ctx.beginPath();
      ctx.arc(54, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a6a72';
      ctx.fillRect(14, 9, 8, 12);
    } else if (weapon === 'poweredRifle') {
      ctx.fillStyle = '#ff9b54';
      ctx.fillRect(8, -4, 42, 8);
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(4, -7, 12, 14);
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(50, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (weapon === 'ultimate') {
      const glow = ctx.createRadialGradient(30, 0, 2, 30, 0, 22);
      glow.addColorStop(0, 'rgba(255,107,214,0.7)');
      glow.addColorStop(1, 'rgba(255,107,214,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(30, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6bd6';
      ctx.fillRect(8, -5, 46, 10);
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(4, -8, 12, 16);
      ctx.fillStyle = '#fff0fa';
      ctx.beginPath();
      ctx.arc(54, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
