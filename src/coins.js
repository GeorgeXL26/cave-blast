import { dist } from './utils.js';

const COIN_LIFESPAN = 10;
const COIN_PICKUP_RADIUS = 30;
const COIN_MAGNET_RADIUS = 260;

export class Coin {
  constructor(x, y, value = 1) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.spawnTime = performance.now() / 1000;
    this.collected = false;
  }

  get age() {
    return performance.now() / 1000 - this.spawnTime;
  }

  get expired() {
    return this.age > COIN_LIFESPAN;
  }

  update(dt, player) {
    if (player.magnetActive) {
      const d = dist(this.x, this.y, player.x, player.y);
      if (d < COIN_MAGNET_RADIUS && d > 4) {
        const pull = 460 * dt;
        this.x += ((player.x - this.x) / d) * pull;
        this.y += ((player.y - this.y) / d) * pull;
      }
    }
  }

  draw(ctx, cam) {
    const x = this.x - cam.x;
    const y = this.y - cam.y;
    const bob = Math.sin(performance.now() / 220 + x * 0.02) * 3;
    const fadeStart = COIN_LIFESPAN - 2;
    const alpha = this.age > fadeStart ? Math.max(0, 1 - (this.age - fadeStart) / 2) : 1;
    const squash = Math.abs(Math.sin(performance.now() / 260 + x * 0.01));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y + bob);
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 * Math.max(0.3, squash), 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c98a12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (squash > 0.5) {
      ctx.fillStyle = '#fff3c4';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    }
    ctx.restore();
  }
}

export function checkCoinPickup(player, coins) {
  for (const c of coins) {
    if (c.collected) continue;
    if (dist(player.x, player.y, c.x, c.y) < COIN_PICKUP_RADIUS + player.radius * 0.4) {
      c.collected = true;
    }
  }
}
