import { rand } from './utils.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, color, count = 10, opts = {}) {
    const { speed = 180, life = 0.6, size = 4 } = opts;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.3, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(life * 0.6, life),
        maxLife: life,
        size: rand(size * 0.6, size),
        color,
        gravity: 0,
      });
    }
  }

  sparkle(x, y, color = '#fff59a') {
    this.burst(x, y, color, 8, { speed: 90, life: 0.5, size: 3 });
  }

  spark(x, y, vx, vy, color = '#ffe082') {
    this.particles.push({
      x,
      y,
      vx: vx * 0.2 + rand(-40, 40),
      vy: vy * 0.2 + rand(-40, 40),
      life: 0.25,
      maxLife: 0.25,
      size: 2.5,
      color,
      gravity: 0,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
  }

  draw(ctx, cam) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
