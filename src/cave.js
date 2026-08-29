import { CAVE_BASE_RADIUS, CAVE_SAFE_ZONE, COLORS } from './constants.js';
import { rand, randInt } from './utils.js';

// Builds an irregular "star shaped" cave boundary around the origin using
// a handful of randomised sine harmonics. radiusAt(theta) gives the wall
// distance for any angle, which makes containment / clamping trivial.
export function makeCaveShape(baseRadius = CAVE_BASE_RADIUS) {
  const harmonics = [];
  const count = randInt(4, 6);
  for (let i = 0; i < count; i++) {
    harmonics.push({
      freq: randInt(2, 7),
      amp: rand(0.05, 0.16) * baseRadius,
      phase: rand(0, Math.PI * 2),
    });
  }
  function radiusAt(theta) {
    let r = baseRadius;
    for (const h of harmonics) r += Math.sin(theta * h.freq + h.phase) * h.amp;
    return Math.max(r, baseRadius * 0.55);
  }
  return { radiusAt, baseRadius };
}

const DECOR_TYPES = ['rock', 'stone', 'crystal', 'dirt', 'glow'];
const DECOR_WEIGHTS = [0.4, 0.25, 0.15, 0.15, 0.05];

function pickDecorType() {
  let r = Math.random();
  for (let i = 0; i < DECOR_TYPES.length; i++) {
    if (r < DECOR_WEIGHTS[i]) return DECOR_TYPES[i];
    r -= DECOR_WEIGHTS[i];
  }
  return 'rock';
}

export function generateDecorations(cave, count = 160) {
  const decor = [];
  let attempts = 0;
  while (decor.length < count && attempts < count * 8) {
    attempts++;
    const theta = rand(0, Math.PI * 2);
    const rMax = cave.radiusAt(theta) * 0.92;
    const r = rand(CAVE_SAFE_ZONE, rMax);
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    const type = pickDecorType();
    decor.push({
      x,
      y,
      type,
      size: rand(10, type === 'rock' ? 34 : 22),
      rot: rand(0, Math.PI * 2),
      seed: Math.random(),
    });
  }
  return decor;
}

export function clampToCave(x, y, cave, margin = 0) {
  const theta = Math.atan2(y, x);
  const r = Math.hypot(x, y);
  const rMax = cave.radiusAt(theta) - margin;
  if (r <= rMax || r === 0) return { x, y };
  const scale = rMax / r;
  return { x: x * scale, y: y * scale };
}

export function randomEdgePoint(cave, insetMin = 20, insetMax = 120) {
  const theta = rand(0, Math.PI * 2);
  const r = cave.radiusAt(theta) - rand(insetMin, insetMax);
  return { x: Math.cos(theta) * r, y: Math.sin(theta) * r, theta };
}

function drawDecor(ctx, d, cam) {
  const x = d.x - cam.x;
  const y = d.y - cam.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(d.rot);
  switch (d.type) {
    case 'rock': {
      ctx.fillStyle = COLORS.rockDark;
      ctx.beginPath();
      ctx.ellipse(2, 4, d.size * 0.55, d.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.rock;
      ctx.beginPath();
      ctx.moveTo(-d.size * 0.5, d.size * 0.2);
      ctx.lineTo(-d.size * 0.2, -d.size * 0.5);
      ctx.lineTo(d.size * 0.3, -d.size * 0.4);
      ctx.lineTo(d.size * 0.55, d.size * 0.1);
      ctx.lineTo(d.size * 0.15, d.size * 0.45);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'stone': {
      ctx.fillStyle = COLORS.rockDark;
      ctx.beginPath();
      ctx.ellipse(1, 2, d.size * 0.5, d.size * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.rock;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.size * 0.45, d.size * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'crystal': {
      const c = d.seed > 0.5 ? COLORS.crystal : COLORS.crystalPink;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(0, -d.size);
      ctx.lineTo(d.size * 0.35, -d.size * 0.1);
      ctx.lineTo(d.size * 0.18, d.size * 0.5);
      ctx.lineTo(-d.size * 0.18, d.size * 0.5);
      ctx.lineTo(-d.size * 0.35, -d.size * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'dirt': {
      ctx.fillStyle = COLORS.dirt;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, d.size * 0.9, d.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'glow': {
      const pulse = 0.6 + Math.sin(performance.now() / 400 + d.seed * 10) * 0.4;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size * 2.2);
      grad.addColorStop(0, `rgba(255,215,106,${0.55 * pulse})`);
      grad.addColorStop(1, 'rgba(255,215,106,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, d.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.glow;
      ctx.beginPath();
      ctx.arc(0, 0, d.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function drawCave(ctx, cave, decor, cam, viewW, viewH) {
  // Backdrop (solid rock, in case the boundary is visible)
  ctx.fillStyle = COLORS.caveWallOuter;
  ctx.fillRect(0, 0, viewW, viewH);

  // Cave floor polygon
  const steps = 160;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = cave.radiusAt(theta);
    const x = Math.cos(theta) * r - cam.x;
    const y = Math.sin(theta) * r - cam.y;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(
    -cam.x,
    -cam.y,
    cave.baseRadius * 0.1,
    -cam.x,
    -cam.y,
    cave.baseRadius * 1.1
  );
  grad.addColorStop(0, COLORS.caveFloorA);
  grad.addColorStop(1, COLORS.caveFloorB);
  ctx.fillStyle = grad;
  ctx.fill();

  // Jagged wall outline
  ctx.lineWidth = 26;
  ctx.strokeStyle = COLORS.rockDark;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#231c17';
  ctx.stroke();

  for (const d of decor) {
    // simple culling
    const sx = d.x - cam.x;
    const sy = d.y - cam.y;
    if (sx < -60 || sy < -60 || sx > viewW + 60 || sy > viewH + 60) continue;
    drawDecor(ctx, d, cam);
  }
}
