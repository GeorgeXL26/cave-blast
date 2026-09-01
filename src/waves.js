import { Enemy } from './enemies.js';
import { randomEdgePoint } from './cave.js';
import { rand, clamp } from './utils.js';

const MINIBOSS_INTERVAL = 5;

// Builds the spawn list (array of enemy type strings) for a given wave.
function buildComposition(wave) {
  const list = [];
  const baseCount = 4 + Math.floor(wave * 1.7);

  // Bats are slow loners individually, so they never spawn from the loose
  // pool below - they always arrive as a dedicated swarm (see spawn logic
  // in WaveManager, which clusters consecutive bats from one wall point).
  const pool = ['slime'];
  if (wave >= 2) pool.push('spider');
  if (wave >= 3) pool.push('snake');
  if (wave >= 4) pool.push('arrowShooter');
  if (wave >= 4) pool.push('caterpillar');
  if (wave >= 5) pool.push('chainsawShooter');
  if (wave >= 6) pool.push('rockMonster');
  if (wave >= 6) pool.push('ghost');

  for (let i = 0; i < baseCount; i++) {
    list.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  const swarmCount = wave >= 4 ? 2 : 1;
  for (let s = 0; s < swarmCount; s++) {
    const swarmSize = 3 + Math.floor(Math.random() * 3); // 3-5 bats per swarm
    for (let i = 0; i < swarmSize; i++) list.push('bat');
  }

  // Guarantee spider groups from wave 2+
  if (wave >= 2) {
    const groupSize = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < groupSize; i++) list.push('spider');
  }
  return list;
}

export class WaveManager {
  constructor(cave, callbacks) {
    this.cave = cave;
    this.callbacks = callbacks; // { onWaveStart, onWaveCleared, onBossIncoming }
    this.wave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.state = 'idle'; // idle | spawning | fighting | cleared | bossWarning
    this.clearedTimer = 0;
    this.bossWarningTimer = 0;
    this.enemies = [];
    this.batAnchor = null; // shared wall origin point for the current bat column
    this.batColumnIndex = 0; // position of the next bat within that column
  }

  start() {
    this.nextWave();
  }

  statMultiplier(wave) {
    return {
      hp: clamp(1 + (wave - 1) * 0.12, 1, 3.2),
      speed: clamp(1 + (wave - 1) * 0.035, 1, 1.6),
    };
  }

  nextWave() {
    this.wave += 1;
    this.batAnchor = null;
    this.batColumnIndex = 0;
    const isBossWave = this.wave % MINIBOSS_INTERVAL === 0;
    if (isBossWave) {
      this.state = 'bossWarning';
      this.bossWarningTimer = 2.0;
      this.pendingComposition = buildComposition(Math.max(1, this.wave - 2));
      this.callbacks.onBossIncoming?.(this.wave);
      return;
    }
    this.spawnQueue = buildComposition(this.wave);
    this.spawnTimer = 0;
    this.state = 'spawning';
    this.callbacks.onWaveStart?.(this.wave);
  }

  spawnOne(type, pos) {
    const mult = this.statMultiplier(this.wave);
    let x, y;
    if (pos) {
      x = pos.x;
      y = pos.y;
    } else {
      const edge = randomEdgePoint(this.cave);
      x = edge.x;
      y = edge.y;
    }
    const enemy = new Enemy(type, x, y, mult);
    this.enemies.push(enemy);
  }

  update(dt) {
    if (this.state === 'bossWarning') {
      this.bossWarningTimer -= dt;
      if (this.bossWarningTimer <= 0) {
        // spawn a couple of easier enemies plus the boss for drama
        this.spawnQueue = this.pendingComposition.slice(0, 4);
        this.spawnTimer = 0;
        this.state = 'spawning';
        this.callbacks.onWaveStart?.(this.wave);
        const edge = randomEdgePoint(this.cave, 10, 40);
        const mult = this.statMultiplier(this.wave);
        mult.hp *= 1 + Math.floor(this.wave / MINIBOSS_INTERVAL - 1) * 0.35;
        const boss = new Enemy('miniBoss', edge.x, edge.y, mult);
        this.enemies.push(boss);
        this.boss = boss;
      }
      return;
    }

    if (this.state === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnQueue.length) {
        const type = this.spawnQueue.shift();
        if (type === 'bat') {
          // Consecutive bats line up in a single-file column (not a
          // scattered pack): same wall point, evenly spaced along one
          // straight line, spawned in quick succession.
          if (!this.batAnchor) {
            this.batAnchor = randomEdgePoint(this.cave, 20, 90);
            this.batColumnIndex = 0;
          }
          const spacing = 40;
          const pos = {
            x: this.batAnchor.x,
            y: this.batAnchor.y + (this.batColumnIndex - 2) * spacing,
          };
          this.spawnOne(type, pos);
          this.batColumnIndex += 1;
          this.spawnTimer = rand(0.09, 0.18);
        } else {
          this.batAnchor = null;
          this.spawnOne(type);
          this.spawnTimer = rand(0.35, 0.85);
        }
      }
      if (!this.spawnQueue.length) this.state = 'fighting';
    }

    if (this.state === 'fighting') {
      if (this.enemies.length === 0) {
        this.state = 'cleared';
        this.clearedTimer = 1.8;
        this.boss = null;
        this.callbacks.onWaveCleared?.(this.wave);
      }
    }

    if (this.state === 'cleared') {
      this.clearedTimer -= dt;
      if (this.clearedTimer <= 0) this.nextWave();
    }
  }

  removeDead() {
    this.enemies = this.enemies.filter((e) => !e.dead);
  }
}
