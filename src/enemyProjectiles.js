// Projectiles fired AT the piggy: arrows (from arrow shooters and the
// mini-boss) and spinning chainsaws (from chainsaw shooters). Kept as a
// separate class from the player's Projectile since these never deal
// splash damage and have their own cartoon art.

export class EnemyProjectile {
  constructor(x, y, angle, opts = {}) {
    const {
      speed = 420,
      damage = 1,
      range = 700,
      radius = 6,
      kind = 'arrow', // 'arrow' | 'chainsaw' | 'bossArrow'
      color = '#e5c07b',
    } = opts;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.range = range;
    this.traveled = 0;
    this.radius = radius;
    this.kind = kind;
    this.color = color;
    this.spin = 0;
    this.dead = false;
  }

  update(dt) {
    const dx = this.vx * dt;
    const dy = this.vy * dt;
    this.x += dx;
    this.y += dy;
    this.traveled += Math.hypot(dx, dy);
    if (this.kind === 'chainsaw') this.spin += dt * 24;
    if (this.traveled >= this.range) this.dead = true;
  }

  draw(ctx, cam) {
    const x = this.x - cam.x;
    const y = this.y - cam.y;
    ctx.save();
    ctx.translate(x, y);

    if (this.kind === 'chainsaw') {
      ctx.rotate(this.spin);
      ctx.fillStyle = '#4b4f54';
      const teeth = 8;
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * this.radius, Math.sin(a) * this.radius);
        ctx.lineTo(Math.cos(a) * (this.radius + 4.5), Math.sin(a) * (this.radius + 4.5));
        ctx.lineTo(Math.cos(a + 0.3) * this.radius, Math.sin(a + 0.3) * this.radius);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8dadd';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(this.angle);
      const s = this.kind === 'bossArrow' ? 1.6 : 1;
      ctx.strokeStyle = '#7a5230';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-2 * s, 0);
      ctx.lineTo(-13 * s, 0);
      ctx.stroke();
      ctx.fillStyle = '#e8e8e8';
      ctx.beginPath();
      ctx.moveTo(-10 * s, 0);
      ctx.lineTo(-14 * s, -3.5 * s);
      ctx.lineTo(-12 * s, 0);
      ctx.lineTo(-14 * s, 3.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(10 * s, 0);
      ctx.lineTo(-2 * s, -3.5 * s);
      ctx.lineTo(-2 * s, 3.5 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
