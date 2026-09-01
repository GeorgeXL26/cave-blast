// Global tunable constants for Piggy Cave Blast

// The cave is a (lightly jagged) rectangle centered on the origin.
// Half-height << half-width keeps it short enough that the top wall is
// reachable/visible during normal play, not just a wide horizon.
export const CAVE_HALF_WIDTH = 1450;
export const CAVE_HALF_HEIGHT = 600;
export const CAVE_SAFE_ZONE = 200; // radius around spawn kept clear of decorations
export const PLAYER_RADIUS = 20;
export const PLAYER_SPEED = 280; // px/s
export const PLAYER_MAX_HEALTH = 5;
export const PLAYER_INVULN_TIME = 0.9; // seconds of invulnerability after being hit

export const COMBO_WINDOW = 1.7; // seconds between kills to keep combo alive
export const COMBO_CAP = 8;

export const BONUS_LIFESPAN = 11; // seconds before an uncollected bonus fades
export const BONUS_PICKUP_RADIUS = 34;
export const MAGNET_RADIUS = 260;
export const MAGNET_DURATION = 8;
export const RAPID_FIRE_DURATION = 8;
export const RAPID_FIRE_MULT = 2.1;
export const POWER_DURATION = 10;
export const POWER_BONUS_DAMAGE = 1;

export const WORLD_CENTER = { x: 0, y: 0 };

export const COLORS = {
  bg: '#0b0a10',
  caveWallOuter: '#120e14',
  caveFloorA: '#3a3226',
  caveFloorB: '#332a20',
  rock: '#5c5049',
  rockDark: '#3f3630',
  crystal: '#7fd8ff',
  crystalPink: '#ff8fd6',
  glow: '#ffd76a',
  dirt: '#463a2a',
};
