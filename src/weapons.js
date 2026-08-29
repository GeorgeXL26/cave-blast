import { audio } from './audio.js';

export const WEAPONS = {
  pistol: {
    key: 'pistol',
    name: 'PISTOL',
    icon: '🔫',
    cooldown: 0.32,
    damage: 1,
    speed: 780,
    range: 520,
    count: 1,
    spread: 0,
    color: '#ffe066',
  },
  doublePistols: {
    key: 'doublePistols',
    name: 'DOUBLE PISTOLS',
    icon: '🔫🔫',
    cooldown: 0.26,
    damage: 1,
    speed: 780,
    range: 520,
    count: 2,
    spread: 0.14,
    color: '#ffe066',
  },
  rifle: {
    key: 'rifle',
    name: 'RIFLE',
    icon: '🪖',
    cooldown: 0.13,
    damage: 1,
    speed: 1050,
    range: 900,
    count: 1,
    spread: 0.02,
    color: '#9be8ff',
  },
  poweredRifle: {
    key: 'poweredRifle',
    name: 'POWERED RIFLE',
    icon: '🔥',
    cooldown: 0.1,
    damage: 2,
    speed: 1150,
    range: 1000,
    count: 1,
    spread: 0.03,
    color: '#ff9b54',
  },
  ultimate: {
    key: 'ultimate',
    name: 'ULTIMATE WEAPON',
    icon: '💫',
    cooldown: 0.09,
    damage: 2,
    speed: 1250,
    range: 1150,
    count: 3,
    spread: 0.12,
    color: '#ff6bd6',
  },
};

export class Projectile {
  constructor(x, y, angle, weapon, damageBonus) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * weapon.speed;
    this.vy = Math.sin(angle) * weapon.speed;
    this.angle = angle;
    this.damage = weapon.damage + damageBonus;
    this.range = weapon.range;
    this.traveled = 0;
    this.radius = 5;
    this.color = weapon.color;
    this.dead = false;
  }

  update(dt) {
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.x += dx;
    this.y += dy;
    this.traveled += Math.hypot(dx, dy);
    if (this.traveled >= this.range) this.dead = true;
  }

  draw(ctx, cam) {
    const x = this.x - cam.x;
    const y = this.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(-6, 0, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Fires the given weapon from (x,y) toward angle, appending new projectiles
// to `projectiles`. Returns nothing; caller manages the fire-rate cooldown.
export function fireWeapon(x, y, angle, weaponKey, damageBonus, projectiles) {
  const weapon = WEAPONS[weaponKey] || WEAPONS.pistol;
  const n = weapon.count;
  for (let i = 0; i < n; i++) {
    let a = angle;
    if (n > 1) {
      const t = i / (n - 1) - 0.5; // -0.5..0.5
      a += t * weapon.spread * 2;
    } else if (weapon.spread > 0) {
      a += (Math.random() - 0.5) * weapon.spread;
    }
    projectiles.push(new Projectile(x, y, a, weapon, damageBonus));
  }
  audio.shoot(weaponKey);
}
