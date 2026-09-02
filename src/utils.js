// Small math / random helpers shared across the game

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedChoice(items) {
  // items: [{ weight, ...payload }]
  const total = items.reduce((s, it) => s + it.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Swept collision check for two fast-moving small objects (e.g. two
// projectiles, or a projectile and a small enemy). A plain end-of-frame
// distance check can miss objects that tunnel past each other within a
// single frame; this samples several points along each object's motion
// this frame (prev -> current) and checks distance at each sample.
export function sweptHit(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1, rangeSum, steps = 4) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ax = ax0 + (ax1 - ax0) * t;
    const ay = ay0 + (ay1 - ay0) * t;
    const bx = bx0 + (bx1 - bx0) * t;
    const by = by0 + (by1 - by0) * t;
    if (Math.hypot(ax - bx, ay - by) < rangeSum) return true;
  }
  return false;
}

export function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function fmtScore(n) {
  return Math.floor(n).toLocaleString('en-US');
}
