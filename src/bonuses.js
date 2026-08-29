import {
  BONUS_LIFESPAN,
  BONUS_PICKUP_RADIUS,
  MAGNET_RADIUS,
  MAGNET_DURATION,
  RAPID_FIRE_DURATION,
  POWER_DURATION,
} from './constants.js';
import { dist } from './utils.js';

export const BONUS_DEFS = {
  doublePistols: { icon: '🔫', label: '🔫 DOUBLE PISTOLS!', color: '#ffe066', kind: 'weapon' },
  rifle: { icon: '🪖', label: '🔥 RIFLE UNLOCKED!', color: '#9be8ff', kind: 'weapon' },
  bazooka: { icon: '🚀', label: '🚀 BAZOOKA UNLOCKED!', color: '#ff8a3d', kind: 'weapon' },
  poweredRifle: { icon: '🔥', label: '🔥 POWERED RIFLE!', color: '#ff9b54', kind: 'weapon' },
  ultimate: { icon: '💫', label: '💫 ULTIMATE WEAPON!', color: '#ff6bd6', kind: 'weapon' },
  rapidFire: { icon: '💥', label: '💥 RAPID FIRE!', color: '#ff4d4d', kind: 'buff' },
  health: { icon: '❤️', label: '❤️ HEALTH RESTORED!', color: '#ff6b81', kind: 'instant' },
  power: { icon: '⭐', label: '⭐ POWER BONUS!', color: '#ffd700', kind: 'buff' },
  magnet: { icon: '🧲', label: '🧲 MAGNET!', color: '#7fd8ff', kind: 'buff' },
};

// Weighted drop table, adjusted a little by current wave so the stronger
// weapon upgrades become more likely later without ever being guaranteed.
function dropTable(wave) {
  return [
    { type: 'doublePistols', weight: 14 },
    { type: 'rifle', weight: 14 },
    { type: 'bazooka', weight: wave >= 3 ? 12 : 3 },
    { type: 'poweredRifle', weight: wave >= 5 ? 10 : 2 },
    { type: 'ultimate', weight: wave >= 8 ? 8 : 1 },
    { type: 'rapidFire', weight: 16 },
    { type: 'health', weight: 18 },
    { type: 'power', weight: 14 },
    { type: 'magnet', weight: 10 },
  ];
}

export function rollBonusType(wave) {
  const table = dropTable(wave);
  const total = table.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of table) {
    r -= t.weight;
    if (r <= 0) return t.type;
  }
  return 'health';
}

export class Bonus {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.spawnTime = performance.now() / 1000;
    this.collected = false;
  }

  get age() {
    return performance.now() / 1000 - this.spawnTime;
  }

  get expired() {
    return this.age > BONUS_LIFESPAN;
  }

  update(dt, player) {
    if (player.magnetActive) {
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < MAGNET_RADIUS && d > 4) {
        const pull = 420 * dt;
        this.x += ((player.x - this.x) / d) * pull;
        this.y += ((player.y - this.y) / d) * pull;
      }
    }
  }

  draw(ctx, cam) {
    const x = this.x - cam.x;
    const y = this.y - cam.y;
    const def = BONUS_DEFS[this.type];
    const fadeStart = BONUS_LIFESPAN - 2.5;
    const alpha = this.age > fadeStart ? Math.max(0, 1 - (this.age - fadeStart) / 2.5) : 1;
    const bob = Math.sin(performance.now() / 260 + x * 0.01) * 4;

    ctx.save();
    ctx.globalAlpha = alpha * (0.6 + Math.sin(performance.now() / 150) * 0.15 + 0.25);
    const grad = ctx.createRadialGradient(x, y + bob, 0, x, y + bob, 26);
    grad.addColorStop(0, def.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y + bob, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.font = '22px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x, y + bob);
    ctx.restore();
  }
}

// Applies a bonus's effect to the player/game. Returns the label text to
// show in the big on-screen notification (or null for no notification).
export function applyBonus(type, player, game) {
  const def = BONUS_DEFS[type];
  const now = performance.now() / 1000;
  switch (type) {
    case 'doublePistols': {
      // Combo upgrades: a second double-pistols bonus fuses with whatever
      // weapon is currently equipped instead of just re-granting the same gun.
      if (player.weapon === 'dualRifles') {
        player.setWeapon('bazooka');
        return { label: '🚀 BAZOOKA!', isWeapon: true };
      }
      if (player.weapon === 'rifle') {
        player.setWeapon('dualRifles');
        return { label: '🪖🪖 DUAL RIFLES!', isWeapon: true };
      }
      if (player.weapon === 'doublePistols') {
        player.setWeapon('quadPistols');
        return { label: '🔫 QUADRUPLE PISTOLS!', isWeapon: true };
      }
      if (player.weapon === 'quadPistols') {
        return null; // already maxed out on pistols, no downgrade
      }
      player.setWeapon('doublePistols');
      return { label: def.label, isWeapon: true };
    }
    case 'rifle':
    case 'bazooka':
    case 'poweredRifle':
    case 'ultimate':
      player.setWeapon(type);
      return { label: def.label, isWeapon: true };
    case 'rapidFire':
      player.rapidFireUntil = now + RAPID_FIRE_DURATION;
      return { label: def.label, isWeapon: false };
    case 'health':
      player.heal(1);
      return { label: def.label, isWeapon: false };
    case 'power':
      player.powerUntil = now + POWER_DURATION;
      return { label: def.label, isWeapon: false };
    case 'magnet':
      player.magnetUntil = now + MAGNET_DURATION;
      return { label: def.label, isWeapon: false };
    default:
      return null;
  }
}

export function checkBonusPickup(player, bonuses) {
  for (const b of bonuses) {
    if (b.collected) continue;
    if (dist(player.x, player.y, b.x, b.y) < BONUS_PICKUP_RADIUS + player.radius * 0.4) {
      b.collected = true;
    }
  }
}
