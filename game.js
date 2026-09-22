// ---------------------------------------------------------------------------
// DARK KNIGHT RUN — a tiny pixel-art platformer
// ---------------------------------------------------------------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const W = canvas.width;   // 384 internal px
const H = canvas.height;  // 216 internal px

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------
const GRAVITY = 620;          // px/s^2
const GLIDE_GRAVITY = 95;     // px/s^2 while gliding
const GLIDE_MAX_FALL = 70;    // px/s cap while gliding
const MAX_FALL = 420;         // px/s cap normally
const JUMP_VELOCITY = -230;   // px/s
const DOUBLE_JUMP_VELOCITY = -205; // px/s (slightly weaker second jump)
const MAX_JUMPS = 2;          // ground jump + one air jump
const MOVE_SPEED = 120;       // px/s
const GLIDE_MOVE_SPEED = 135; // px/s (a little extra air speed while gliding)
const COYOTE_TIME = 0.1;      // s grace period after leaving a ledge
const JUMP_BUFFER = 0.12;     // s grace period for early jump press
const FLIP_DURATION = 0.4;    // s acrobatic flip shown on double jump
const LAND_SQUASH_TIME = 0.08; // s squash pose on landing

const WALL_SLIDE_GRAVITY = 260; // px/s^2 while sliding down a wall
const WALL_SLIDE_MAX = 55;      // px/s cap while wall-sliding
const WALL_JUMP_VX = 170;       // px/s kick-away speed
const WALL_JUMP_VY = -235;      // px/s
const WALL_JUMP_LOCK = 0.3;     // s of locked-in kick momentum after a wall jump
const WALL_PROBE = 2;           // px, how far beyond the body we check for a wall

const THROW_COOLDOWN = 0.35;  // s between batarang throws
const THROW_ANIM_TIME = 0.15; // s throw pose duration
const BATARANG_SPEED = 300;   // px/s

const PUNCH_COOLDOWN = 0.32;  // s between punches
const PUNCH_ACTIVE = 0.12;    // s the punch hitbox stays live
const PUNCH_W = 11;
const PUNCH_H = 12;

const ATTACK_RANGE = 170;      // henchmen won't shoot from farther than this
const ATTACK_MIN_RANGE = 16;   // ...or from point-blank
const ATTACK_HEIGHT_TOL = 40;  // must be roughly the same height as the player
const ATTACK_COOLDOWN_BASE = 1.7;
const ATTACK_TELEGRAPH = 0.35; // brief weapon-raise warning before firing
const BULLET_SPEED = 190;
const COIN_SPEED = 170;

const PLAYER_W = 14;
const PLAYER_H = 20;

const GORDON_SPEED = 70;          // px/s, walking into the ending shot
const END_SEQUENCE_DURATION = 5;  // s from beacon touch to the win screen appearing

const MAX_HEALTH = 100;
const CONTACT_DAMAGE = 25;   // touching a henchman
const BULLET_DAMAGE = 15;    // Joker gunshot
const COIN_DAMAGE = 20;      // Two-Face's thrown coin
const INVULN_TIME = 1.0;     // s of immunity after taking a hit
const HIT_STUN_TIME = 0.2;   // s of locked-in knockback
const KNOCKBACK_VX = 180;
const KNOCKBACK_VY = -150;

const PUNCH_DAMAGE = 1;
const BATARANG_DAMAGE = 1;

const ENEMY_KNOCKBACK_SPEED = 150; // px/s, initial speed on taking a hit
const ENEMY_KNOCKBACK_DECAY = 0.86; // per-frame velocity retention (friction)
const ENEMY_KNOCKBACK_TIME = 0.2;   // s

const GRAPPLE_RANGE = 190;       // px, max distance to auto-target an anchor
const GRAPPLE_PULL_SPEED = 280;  // px/s while reeling in
const GRAPPLE_RELEASE_DIST = 10; // px, auto-detach once this close to the anchor
const GRAPPLE_BOOST_VY = -130;   // px/s upward hop granted on release
const GRAPPLE_BOOST_VX = 70;     // px/s forward carry granted on release
const GRAPPLE_COOLDOWN = 0.15;   // s before another grapple can be fired
const GRAPPLE_BUFFER = 0.15;     // s an early grapple press is remembered while on cooldown

const WIND_LIFT_ACCEL = 260; // px/s^2 upward push while gliding through a gust
const WIND_MAX_RISE = 80;    // px/s cap on how fast a gust can carry you upward

// ---------------------------------------------------------------------------
// Level data
// ---------------------------------------------------------------------------
const platforms = [
  { x: -50, y: 190, w: 310, h: 60 },   // P1 — start rooftop
  { x: 330, y: 190, w: 220, h: 60 },   // P2
  { x: 620, y: 190, w: 200, h: 60 },   // P3
  { x: 850, y: 120, w: 150, h: 14 },   // ledge above the wall-jump shaft
  { x: 1010, y: 190, w: 160, h: 60 },  // P4
  { x: 1300, y: 70, w: 200, h: 14 },   // P4b — grapple tower rooftop
  { x: 1570, y: 190, w: 200, h: 60 },  // P5
  { x: 1950, y: 205, w: 320, h: 60 },  // P6
  { x: 2340, y: 170, w: 50, h: 12 },   // hop gauntlet: F1
  { x: 2450, y: 140, w: 50, h: 12 },   // F2
  { x: 2560, y: 170, w: 50, h: 12 },   // F3
  { x: 2670, y: 195, w: 50, h: 12 },   // F4
  { x: 2790, y: 190, w: 220, h: 60 },  // P6b — landing zone after the gauntlet
  { x: 3010, y: 190, w: 480, h: 60, icy: true }, // IC1 — Mr. Freeze's ice cave
  { x: 3560, y: 190, w: 260, h: 60 },  // P7 — the Joker's arena
  { x: 3890, y: 190, w: 300, h: 60 },  // P8 — Bane's arena, beacon at the far end
];

// two facing walls: jump into the gap, slide, and wall-jump between them to climb up
const walls = [
  { x: 850, y: 120, w: 14, h: 70 },
  { x: 894, y: 120, w: 14, h: 70 },
];

// small floating decorative platforms
const floaters = [
  { x: 400, y: 128, w: 60, h: 12 },
  { x: 1630, y: 120, w: 60, h: 12 },
];

// grapple anchor: no ground below P4 up to P4b, too tall to jump/glide/wall-jump alone —
// hook up here first (it also refreshes your double jump), then glide the rest of the way
const grapplePoints = [
  { x: 1220, y: 60 },
];

// an updraft over the big glide gap — only lifts a character that's actively
// gliding through it, so it rewards using the ability rather than just falling
const windZones = [
  { x: 1770, y: 40, w: 180, h: 180 },
];

const allSolids = platforms.concat(floaters).concat(walls);

const levelWidth = 4190 + 60;

// ---------------------------------------------------------------------------
// Mr. Freeze's ice cave — a slippery ground section that thaws for good once
// the valve is opened
// ---------------------------------------------------------------------------
const ICE_ACCEL = 220; // px/s^2 — slow to build up speed on ice
const ICE_DECEL = 90;  // px/s^2 — slow to stop, so releasing input slides you
const valve = { x: 3300, y: 174, w: 12, h: 16 };
const VALVE_INTERACT_RADIUS = 26;
let iceThawed = false;
let valveTurnTimer = 0;

// the frozen henchman Mr. Freeze left behind, thawing out alongside the ground
const freezeStatue = { x: 3420, y: 148, w: 30, h: 42 };

// a gate at the cave's entrance that tallies which way you cross it
const ecoCounter = { x: 3010, y: 130, w: 4, h: 60 };
let ecoIn = 0;
let ecoOut = 0;

const enemies = [
  {
    type: "joker", x: 400, y: 170, w: 15, h: 20, startX: 400,
    minX: 350, maxX: 520, dir: 1, startDir: 1, facing: 1, alive: true,
    attackTimer: 1.2, telegraphTimer: 0, pendingAttack: false,
    hp: 2, maxHp: 2, knockbackVx: 0, knockbackTimer: 0,
  },
  {
    type: "joker", x: 1060, y: 170, w: 15, h: 20, startX: 1060,
    minX: 1030, maxX: 1150, dir: -1, startDir: -1, facing: -1, alive: true,
    attackTimer: 1.8, telegraphTimer: 0, pendingAttack: false,
    hp: 2, maxHp: 2, knockbackVx: 0, knockbackTimer: 0,
  },
  {
    type: "twoface", x: 2020, y: 181, w: 18, h: 24, startX: 2020,
    minX: 1980, maxX: 2230, dir: 1, startDir: 1, facing: 1, alive: true,
    attackTimer: 2.2, telegraphTimer: 0, pendingAttack: false,
    hp: 3, maxHp: 3, knockbackVx: 0, knockbackTimer: 0,
  },
  {
    type: "joker", x: 2860, y: 170, w: 15, h: 20, startX: 2860,
    minX: 2810, maxX: 2970, dir: 1, startDir: 1, facing: 1, alive: true,
    attackTimer: 1.6, telegraphTimer: 0, pendingAttack: false,
    hp: 2, maxHp: 2, knockbackVx: 0, knockbackTimer: 0,
  },
];
const ENEMY_SPEED = 40;

const beacon = { x: 4140, y: 130, w: 20, h: 60 };
let beaconActive = false;

// ---------------------------------------------------------------------------
// The Joker — a mid-level boss guarding his own arena
// ---------------------------------------------------------------------------
const JOKER_BOSS_MAX_HP = 7;
const JOKER_BOSS_SPEED = 45;
const JOKER_BOSS_CONTACT_DAMAGE = 22;
const JOKER_BOSS_SLAM_DAMAGE = 28;
const JOKER_BOSS_SLAM_RADIUS = 16;
const JOKER_BOSS_CARD_DAMAGE = 10;
const JOKER_BOSS_CARD_SPEED = 220;
const JOKER_BOSS_ATTACK_RANGE = 200;
const JOKER_BOSS_MELEE_RANGE = 40;
const JOKER_BOSS_ATTACK_COOLDOWN_BASE = 1.8;
const JOKER_BOSS_TELEGRAPH = 0.4;
const JOKER_BOSS_CARD_BURST_COUNT = 3;
const JOKER_BOSS_CARD_BURST_GAP = 0.09;
const JOKER_BOSS_SLAM_ACTIVE = 0.15;
const JOKER_BOSS_ENGAGE_RANGE = 240;
const JOKER_BOSS_GAS_DAMAGE = 8;
const JOKER_BOSS_GAS_SPEED = 160;
const STUN_DURATION = 1.8; // s a laughing-gas hit locks out all input

const jokerBoss = {
  x: 3680, y: 164, w: 20, h: 26, startX: 3680,
  minX: 3580, maxX: 3800, dir: 1, startDir: 1, facing: 1,
  alive: true, hp: JOKER_BOSS_MAX_HP, maxHp: JOKER_BOSS_MAX_HP,
  mode: "patrol", // patrol, telegraph, volley, slam, recover
  pendingAction: null,
  telegraphTimer: 0, attackTimer: 1.3,
  volleyShotsLeft: 0, volleyTimer: 0,
  slamTimer: 0, recoverTimer: 0,
  knockbackVx: 0, knockbackTimer: 0,
};
let jokerBossEngaged = false;

// ---------------------------------------------------------------------------
// Bane — the final boss, guarding the arena in front of the beacon
// ---------------------------------------------------------------------------
const BANE_MAX_HP = 10;
const BANE_SPEED = 30;
const BANE_CHARGE_SPEED = 240;
const BANE_CONTACT_DAMAGE = 25;
const BANE_CHARGE_DAMAGE = 35;
const BANE_DEBRIS_DAMAGE = 20;
const BANE_DEBRIS_SPEED = 150;
const BANE_ATTACK_RANGE = 220;
const BANE_ATTACK_COOLDOWN_BASE = 2.2;
const BANE_TELEGRAPH = 0.55;
const BANE_CHARGE_MAX_TIME = 0.9;
const BANE_RECOVER_TIME = 0.7;
const BANE_ENGAGE_RANGE = 260;

const SHOCKWAVE_SPEED = 260;    // px/s, travels outward along the ground both ways
const SHOCKWAVE_MAX_DIST = 300; // px before it dissipates
const SHOCKWAVE_HEIGHT = 22;    // hitbox height — jump clears it since it only hits grounded characters
const SHOCKWAVE_DAMAGE = 18;

const bane = {
  x: 3980, y: 152, w: 28, h: 38, startX: 3980,
  minX: 3910, maxX: 4100, dir: 1, startDir: 1, facing: 1,
  alive: true, hp: BANE_MAX_HP, maxHp: BANE_MAX_HP,
  mode: "patrol", // patrol, telegraph, charging, recover
  pendingAction: null,
  telegraphTimer: 0, chargeTimer: 0, recoverTimer: 0, attackTimer: 1.5,
  dustTimer: 0,
  knockbackVx: 0, knockbackTimer: 0,
};
let bossEngaged = false;

// camera settles here for the ending shot, framing the beacon
const beaconCameraX = Math.max(0, Math.min(beacon.x - W / 2 + beacon.w / 2, levelWidth - W));

// Commissioner Gordon, who walks into view once the signal is lit
const gordon = {
  x: beaconCameraX - 15,
  y: beacon.y + beacon.h - 20,
  w: 14, h: 20,
  targetX: beacon.x - 30,
  animTimer: 0,
  state: "stand",
};
let gordonVisible = false;
let ending = false;
let endTimer = 0;

// ---------------------------------------------------------------------------
// The Batmobile — screeches in, clips a goon on the way, and the heroes
// flip out of it once parked
// ---------------------------------------------------------------------------
const BATMOBILE_SPEED = 200;         // px/s
const INTRO_POST_PARK_DURATION = 1.0; // s after parking before handing over control
const GOON_HIT_VX = 220;
const GOON_HIT_VY = -180;
const GOON_ROT_SPEED = 16;

const batmobile = { x: -160, targetX: 100 };

// a henchman standing in the Batmobile's path — drawHenchman() renders him
// (hp/maxHp: 0 so no health pips are drawn over a background gag character)
const introGoon = {
  type: "joker", x: 60, y: 170, w: 15, h: 20, startX: 60, startY: 170,
  facing: -1, telegraphTimer: 0, hp: 0, maxHp: 0,
  hit: false, vx: 0, vy: 0, rot: 0,
};

let intro = false;
let introTimer = 0;
let introParkedTimer = -1;
let introBatmanRevealed = false;
let introRobinRevealed = false;

// ---------------------------------------------------------------------------
// Characters — Batman (always present) and Robin (drops in when a second
// device joins over the network)
// ---------------------------------------------------------------------------
function makeCharacter(x, y) {
  return {
    x, y, w: PLAYER_W, h: PLAYER_H,
    vx: 0, vy: 0,
    onGround: false,
    wasOnGround: false,
    onWallLeft: false,
    onWallRight: false,
    wallJumpLockTimer: 0,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    invulnTimer: 0,
    hitStunTimer: 0,
    punchHits: null,
    facing: 1,
    state: "idle", // idle, run, jump, fall, glide, wallslide
    animTimer: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    jumpsUsed: 0,
    flipTimer: 0,
    landTimer: 0,
    throwTimer: 0,
    throwCooldown: 0,
    punchTimer: 0,
    punchCooldown: 0,
    runDustTimer: 0,
    grappling: false,
    grappleTarget: null,
    grappleCooldown: 0,
    grappleBufferTimer: 0,
    stunTimer: 0,
    onIce: false,
    checkpoint: { x, y },
  };
}

const batman = makeCharacter(20, 150);
const robin = makeCharacter(5, 150);
robin.active = false; // becomes true the moment a second device joins

const BATMAN_PALETTE = {
  K: "#5b6784", KD: "#40495f", CAPE: "#2f3654", CAPE_EDGE: "#8891b8",
  Y: "#ffd23f", SK: "#e3b98c", WH: "#fbfbff", hasEars: true,
};
const ROBIN_PALETTE = {
  K: "#c0392b", KD: "#8a2620", CAPE: "#2a6b3a", CAPE_EDGE: "#6fcf7a",
  Y: "#f2c94c", SK: "#e3b98c", WH: "#fbfbff", hasEars: false,
};

function activeCharacters() {
  return robin.active ? [batman, robin] : [batman];
}

function nearestCharacter(x) {
  const cs = activeCharacters();
  let best = cs[0];
  let bestDist = Math.abs((cs[0].x + cs[0].w / 2) - x);
  for (let i = 1; i < cs.length; i++) {
    const d = Math.abs((cs[i].x + cs[i].w / 2) - x);
    if (d < bestDist) { best = cs[i]; bestDist = d; }
  }
  return best;
}

const particles = [];
const projectiles = [];      // batarangs (player)
const enemyProjectiles = []; // bullets / coins / gas (henchmen)
const shockwaves = [];       // Bane's ground-slam shockwaves

let villainsDefeated = 0;
let lives = 3;
let cameraX = 0;
let gameWon = false;
let gameRunning = false;
let elapsed = 0;
let damageFlashTimer = 0;

function updateHealthUIFor(ch) {
  const pct = Math.max(ch.health, 0) / ch.maxHealth * 100;
  const id = ch === robin ? "robinHealthBarFill" : "healthBarFill";
  const el = document.getElementById(id);
  if (el) el.style.width = pct + "%";
}

document.getElementById("villainTotal").textContent = enemies.length + 2;

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
// Arrow keys run, Space jumps; A/S/D are the left-hand action keys
// (attack / batarang / grapple) so both hands stay on the keyboard.
const keys = {};
window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyS", "KeyD", "KeyW"].includes(e.code)) {
    e.preventDefault();
  }
  keys[e.code] = true;
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

function isLeft() { return keys["ArrowLeft"]; }
function isRight() { return keys["ArrowRight"]; }
function isJumpHeld() { return keys["Space"] || keys["ArrowUp"]; }

let jumpPressedEdge = false;
let throwPressedEdge = false;
let punchPressedEdge = false;
let grapplePressedEdge = false;
let interactPressedEdge = false;
window.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "ArrowUp") && !e.repeat) {
    jumpPressedEdge = true;
  }
  if (e.code === "KeyS" && !e.repeat) {
    throwPressedEdge = true;
  }
  if (e.code === "KeyA" && !e.repeat) {
    punchPressedEdge = true;
  }
  if (e.code === "KeyD" && !e.repeat) {
    grapplePressedEdge = true;
  }
  if (e.code === "KeyW" && !e.repeat) {
    interactPressedEdge = true;
  }
});

// this device's own keypresses always control "its" character locally
// (Batman if we're the host/offline, Robin if we're the guest); when we're
// the guest they're also forwarded to the host instead of driving physics
function sendInputToHost() {
  const payload = {
    left: isLeft(), right: isRight(), jumpHeld: isJumpHeld(),
    jumpEdge: false, throwEdge: false, punchEdge: false, grappleEdge: false, interactEdge: false,
  };
  if (jumpPressedEdge) { payload.jumpEdge = true; jumpPressedEdge = false; }
  if (throwPressedEdge) { payload.throwEdge = true; throwPressedEdge = false; }
  if (punchPressedEdge) { payload.punchEdge = true; punchPressedEdge = false; }
  if (grapplePressedEdge) { payload.grappleEdge = true; grapplePressedEdge = false; }
  if (interactPressedEdge) { payload.interactEdge = true; interactPressedEdge = false; }
  NET.sendInput(payload);
}
window.addEventListener("keydown", () => { if (NET.role === "guest") sendInputToHost(); });
window.addEventListener("keyup", () => { if (NET.role === "guest") sendInputToHost(); });

const localInput = {
  isLeft: () => keys["ArrowLeft"],
  isRight: () => keys["ArrowRight"],
  isJumpHeld: () => keys["Space"] || keys["ArrowUp"],
  consumeJumpEdge: () => { if (jumpPressedEdge) { jumpPressedEdge = false; return true; } return false; },
  consumeThrowEdge: () => { if (throwPressedEdge) { throwPressedEdge = false; return true; } return false; },
  consumePunchEdge: () => { if (punchPressedEdge) { punchPressedEdge = false; return true; } return false; },
  consumeGrappleEdge: () => { if (grapplePressedEdge) { grapplePressedEdge = false; return true; } return false; },
  consumeInteractEdge: () => { if (interactPressedEdge) { interactPressedEdge = false; return true; } return false; },
};

// fed by network "input" messages from the guest; only ever read on the host
const remoteRobinInput = {
  left: false, right: false, jumpHeld: false,
  jumpEdgeQueued: false, throwEdgeQueued: false, punchEdgeQueued: false, grappleEdgeQueued: false, interactEdgeQueued: false,
  isLeft() { return this.left; },
  isRight() { return this.right; },
  isJumpHeld() { return this.jumpHeld; },
  consumeJumpEdge() { if (this.jumpEdgeQueued) { this.jumpEdgeQueued = false; return true; } return false; },
  consumeThrowEdge() { if (this.throwEdgeQueued) { this.throwEdgeQueued = false; return true; } return false; },
  consumePunchEdge() { if (this.punchEdgeQueued) { this.punchEdgeQueued = false; return true; } return false; },
  consumeGrappleEdge() { if (this.grappleEdgeQueued) { this.grappleEdgeQueued = false; return true; } return false; },
  consumeInteractEdge() { if (this.interactEdgeQueued) { this.interactEdgeQueued = false; return true; } return false; },
};

// ---------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveCollisions(ch, dt) {
  // horizontal
  ch.x += ch.vx * dt;
  for (const s of allSolids) {
    if (!overlap(ch, s)) continue;
    if (ch.vx > 0) ch.x = s.x - ch.w;
    else if (ch.vx < 0) ch.x = s.x + s.w;
    ch.vx = 0;
  }
  if (ch.x < 0) ch.x = 0;

  // vertical
  ch.y += ch.vy * dt;
  ch.onGround = false;
  ch.onIce = false;
  for (const s of allSolids) {
    if (!overlap(ch, s)) continue;
    if (ch.vy > 0) {
      ch.y = s.y - ch.h;
      ch.vy = 0;
      ch.onGround = true;
      ch.onIce = !!s.icy && !iceThawed;
      ch.checkpoint = { x: Math.max(20, s.x + 10), y: s.y - ch.h };
    } else if (ch.vy < 0) {
      ch.y = s.y + s.h;
      ch.vy = 0;
    }
  }
}

function updateWallContacts(ch) {
  if (ch.onGround) {
    ch.onWallLeft = false;
    ch.onWallRight = false;
    return;
  }
  const leftProbe = { x: ch.x - WALL_PROBE, y: ch.y + 2, w: WALL_PROBE, h: ch.h - 4 };
  const rightProbe = { x: ch.x + ch.w, y: ch.y + 2, w: WALL_PROBE, h: ch.h - 4 };
  ch.onWallLeft = walls.some((w) => overlap(leftProbe, w));
  ch.onWallRight = walls.some((w) => overlap(rightProbe, w));
}

function respawnCharacter(ch) {
  ch.x = ch.checkpoint.x;
  ch.y = ch.checkpoint.y;
  ch.vx = 0;
  ch.vy = 0;
  ch.wallJumpLockTimer = 0;
  ch.hitStunTimer = 0;
  ch.grappling = false;
  ch.grappleTarget = null;
  ch.stunTimer = 0;
  ch.health = ch.maxHealth;
  ch.invulnTimer = INVULN_TIME;
  updateHealthUIFor(ch);
  lives--;
  document.getElementById("livesCount").textContent = Math.max(lives, 0);
  if (lives <= 0) {
    lives = 3;
    document.getElementById("livesCount").textContent = 3;
    batman.checkpoint = { x: 20, y: 150 };
    batman.x = 20; batman.y = 150; batman.health = batman.maxHealth;
    updateHealthUIFor(batman);
    if (robin.active) {
      robin.checkpoint = { x: 5, y: 150 };
      robin.x = 5; robin.y = 150; robin.health = robin.maxHealth;
      updateHealthUIFor(robin);
    }
  }
}

// returns true if the hit actually landed (false if the character was still invulnerable)
function takeDamage(ch, amount, knockbackDir) {
  if (ch.invulnTimer > 0) return false;

  ch.health -= amount;
  ch.invulnTimer = INVULN_TIME;
  damageFlashTimer = 0.15;
  updateHealthUIFor(ch);
  spawnDust(ch.x + ch.w / 2, ch.y + ch.h / 2, 5, 80);

  if (knockbackDir) {
    ch.vx = knockbackDir * KNOCKBACK_VX;
    ch.vy = KNOCKBACK_VY;
    ch.hitStunTimer = HIT_STUN_TIME;
  }

  if (ch.health <= 0) {
    ch.health = 0;
    updateHealthUIFor(ch);
    respawnCharacter(ch);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Particles, batarangs & enemy attacks
// ---------------------------------------------------------------------------
function spawnDust(x, y, count, spread) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: -Math.random() * 60 - 20,
      life: 0.35,
      maxLife: 0.35,
      size: 1 + Math.round(Math.random()),
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 260 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const x = Math.round(p.x - cameraX);
    const y = Math.round(p.y);
    ctx.globalAlpha = Math.max(p.life / p.maxLife, 0);
    ctx.fillStyle = "#c9cbd8";
    ctx.fillRect(x, y, p.size, p.size);
    ctx.globalAlpha = 1;
  }
}

function defeatEnemy(en) {
  en.alive = false;
  villainsDefeated++;
  document.getElementById("villainCount").textContent = villainsDefeated;
  spawnDust(en.x + en.w / 2, en.y + en.h / 2, 7, 100);
}

function damageEnemy(en, amount, knockbackDir) {
  en.hp -= amount;
  spawnDust(en.x + en.w / 2, en.y + en.h / 2, 4, 70);
  if (knockbackDir) {
    en.knockbackVx = knockbackDir * ENEMY_KNOCKBACK_SPEED;
    en.knockbackTimer = ENEMY_KNOCKBACK_TIME;
  }
  if (en.hp <= 0) defeatEnemy(en);
}

function throwBatarang(ch) {
  const dir = ch.facing;
  projectiles.push({
    x: dir > 0 ? ch.x + ch.w : ch.x - 6,
    y: ch.y + 8,
    vx: dir * BATARANG_SPEED,
    rot: 0,
    owner: ch === robin ? "robin" : "batman",
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const b = projectiles[i];
    b.x += b.vx * dt;
    b.rot += dt * 26;
    const box = { x: b.x - 4, y: b.y - 4, w: 8, h: 8 };

    let hit = false;
    if (jokerBoss.alive && overlap(box, jokerBoss)) {
      jokerBossEngaged = true;
      damageEnemy(jokerBoss, BATARANG_DAMAGE, Math.sign(b.vx));
      if (!jokerBoss.alive) onJokerBossDefeated();
      hit = true;
    }
    if (!hit && bane.alive && overlap(box, bane)) {
      bossEngaged = true;
      damageEnemy(bane, BATARANG_DAMAGE, Math.sign(b.vx));
      if (!bane.alive) onBaneDefeated();
      hit = true;
    }
    for (const en of enemies) {
      if (hit) break;
      if (!en.alive) continue;
      if (overlap(box, en)) {
        damageEnemy(en, BATARANG_DAMAGE, Math.sign(b.vx));
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const s of allSolids) {
        if (overlap(box, s)) { hit = true; break; }
      }
    }

    if (hit || b.x < cameraX - 20 || b.x > cameraX + W + 20) {
      projectiles.splice(i, 1);
    }
  }
}

function drawProjectiles() {
  for (const b of projectiles) {
    const x = b.x - cameraX;
    ctx.save();
    ctx.translate(x, b.y);
    ctx.rotate(b.rot);

    if (b.owner === "robin") {
      // a bright red-and-gold throwing star, outlined for visibility
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#2a1010";
      ctx.fillStyle = "#e0413d";
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(2, 2);
      ctx.lineTo(0, 6);
      ctx.lineTo(-2, 2);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-2, -2);
      ctx.lineTo(0, -6);
      ctx.lineTo(2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(-1.5, -1.5, 3, 3);
    } else {
      // a bright silver batarang, bat-winged and notched, outlined for visibility
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#14151a";
      ctx.fillStyle = "#eef0f5";
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(-7, -5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(7, 5);
      ctx.lineTo(4, 0);
      ctx.lineTo(7, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#8891b8";
      ctx.fillRect(-1.5, -1.5, 3, 3);
    }

    ctx.restore();
  }
}

function fireEnemyAttack(en) {
  const speed = en.type === "joker" ? BULLET_SPEED : COIN_SPEED;
  enemyProjectiles.push({
    x: en.facing > 0 ? en.x + en.w + 2 : en.x - 2,
    y: en.y + 8,
    vx: en.facing * speed,
    rot: 0,
    type: en.type,
  });
}

function updateEnemyProjectiles(dt) {
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const b = enemyProjectiles[i];
    b.x += b.vx * dt;
    b.rot += dt * 20;
    const box = { x: b.x - 3, y: b.y - 3, w: 6, h: 6 };

    let hit = false;
    for (const ch of activeCharacters()) {
      if (overlap(box, ch)) {
        const dmg = b.type === "joker" ? BULLET_DAMAGE
          : b.type === "twoface" ? COIN_DAMAGE
          : b.type === "card" ? JOKER_BOSS_CARD_DAMAGE
          : b.type === "gas" ? JOKER_BOSS_GAS_DAMAGE
          : BANE_DEBRIS_DAMAGE;
        const landed = takeDamage(ch, dmg, Math.sign(b.vx) || 1);
        if (landed && b.type === "gas") ch.stunTimer = STUN_DURATION;
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (const s of allSolids) {
        if (overlap(box, s)) { hit = true; break; }
      }
    }
    if (hit || b.x < cameraX - 20 || b.x > cameraX + W + 20) {
      enemyProjectiles.splice(i, 1);
    }
  }
}

function drawEnemyProjectiles() {
  for (const b of enemyProjectiles) {
    const x = b.x - cameraX;
    if (b.type === "joker") {
      ctx.fillStyle = "#fff3b0";
      ctx.fillRect(x - 3, b.y - 1, 6, 2);
      ctx.fillStyle = "#ffcf4a";
      ctx.fillRect(x - 1, b.y - 1, 2, 2);
    } else if (b.type === "twoface") {
      ctx.save();
      ctx.translate(x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = "#e8c34a";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a2a2a";
      ctx.fillRect(-3, -1, 6, 2);
      ctx.restore();
    } else if (b.type === "card") {
      // the Joker's razor playing card
      ctx.save();
      ctx.translate(x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = "#e6e6e6";
      ctx.fillRect(-4, -3, 8, 6);
      ctx.fillStyle = "#5a3a7a";
      ctx.fillRect(-4, -3, 8, 2);
      ctx.fillStyle = "#3c8f4a";
      ctx.fillRect(-4, 1, 8, 2);
      ctx.restore();
    } else if (b.type === "gas") {
      // the Joker's laughing-gas canister, trailing a little green cloud
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#5fbf4a";
      ctx.beginPath();
      ctx.arc(x - Math.sign(b.vx) * 4, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = "#3c8f4a";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c9c9c9";
      ctx.fillRect(-1, -4, 2, 2);
      ctx.restore();
    } else {
      // Bane's thrown debris — a chunky spinning rock
      ctx.save();
      ctx.translate(x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = "#6b6055";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = "#4a4038";
      ctx.fillRect(-5, 2, 10, 3);
      ctx.fillRect(2, -5, 3, 10);
      ctx.restore();
    }
  }
}

function fireBaneDebris() {
  enemyProjectiles.push({
    x: bane.facing > 0 ? bane.x + bane.w + 2 : bane.x - 2,
    y: bane.y + 14,
    vx: bane.facing * BANE_DEBRIS_SPEED,
    rot: 0,
    type: "debris",
  });
}

function fireBaneSlam() {
  const cx = bane.x + bane.w / 2, groundY = bane.y + bane.h;
  spawnDust(cx, groundY, 12, 160);
  shockwaves.push({ x: cx, y: groundY, dir: -1, dist: 0 });
  shockwaves.push({ x: cx, y: groundY, dir: 1, dist: 0 });
}

function updateShockwaves(dt) {
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    const step = SHOCKWAVE_SPEED * dt;
    sw.x += sw.dir * step;
    sw.dist += step;
    if (sw.dist > SHOCKWAVE_MAX_DIST) {
      shockwaves.splice(i, 1);
      continue;
    }
    const box = { x: sw.x - 4, y: sw.y - SHOCKWAVE_HEIGHT, w: 8, h: SHOCKWAVE_HEIGHT };
    for (const ch of activeCharacters()) {
      if (ch.onGround && overlap(ch, box)) {
        takeDamage(ch, SHOCKWAVE_DAMAGE, sw.dir);
      }
    }
  }
}

function drawShockwaves() {
  for (const sw of shockwaves) {
    const x = sw.x - cameraX;
    if (x < -20 || x > W + 20) continue;
    const fade = Math.max(0, 1 - sw.dist / SHOCKWAVE_MAX_DIST);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = "#ff8a3d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 7, sw.y);
    ctx.lineTo(x - 2, sw.y - 7);
    ctx.lineTo(x + 2, sw.y - 2);
    ctx.lineTo(x + 7, sw.y - 9);
    ctx.stroke();
    ctx.restore();
  }
}

// generic boss-bar UI, shared by whichever boss is currently engaged.
// Bane takes precedence over the Joker if somehow both are "engaged" at once
// (e.g. the player skipped the Joker without defeating him) since Bane is
// always the more advanced encounter.
function refreshBossBar() {
  let boss = null, name = "";
  if (bossEngaged && bane.alive) { boss = bane; name = "BANE"; }
  else if (jokerBossEngaged && jokerBoss.alive) { boss = jokerBoss; name = "JOKER"; }

  const bar = document.getElementById("bossBar");
  if (!boss) { bar.classList.add("hidden"); return; }

  document.getElementById("bossName").textContent = name;
  document.getElementById("bossBarFill").style.width = (Math.max(boss.hp, 0) / boss.maxHp) * 100 + "%";
  bar.classList.remove("hidden");
}

function hideBossBarSoon() {
  setTimeout(() => {
    const el = document.getElementById("bossBar");
    if (el) el.classList.add("hidden");
  }, 1200);
}

function onBaneDefeated() {
  refreshBossBar();
  hideBossBarSoon();
}

function onJokerBossDefeated() {
  refreshBossBar();
  hideBossBarSoon();
}

function fireJokerCard(en) {
  const spreadIndex = JOKER_BOSS_CARD_BURST_COUNT - en.volleyShotsLeft;
  const yOffset = (spreadIndex - 1) * 6;
  enemyProjectiles.push({
    x: en.facing > 0 ? en.x + en.w + 2 : en.x - 2,
    y: en.y + 10 + yOffset,
    vx: en.facing * JOKER_BOSS_CARD_SPEED,
    rot: 0,
    type: "card",
  });
}

function fireJokerGas(en) {
  enemyProjectiles.push({
    x: en.facing > 0 ? en.x + en.w + 2 : en.x - 2,
    y: en.y + 10,
    vx: en.facing * JOKER_BOSS_GAS_SPEED,
    rot: 0,
    type: "gas",
  });
}

function updateJokerBoss(dt) {
  if (!jokerBoss.alive) return;

  if (jokerBoss.knockbackTimer > 0) {
    jokerBoss.knockbackTimer -= dt;
    jokerBoss.x += jokerBoss.knockbackVx * dt;
    jokerBoss.knockbackVx *= ENEMY_KNOCKBACK_DECAY;
  }

  if (jokerBoss.mode === "patrol") {
    jokerBoss.x += jokerBoss.dir * JOKER_BOSS_SPEED * dt;
    if (jokerBoss.x < jokerBoss.minX) { jokerBoss.x = jokerBoss.minX; jokerBoss.dir = 1; }
    if (jokerBoss.x > jokerBoss.maxX - jokerBoss.w) { jokerBoss.x = jokerBoss.maxX - jokerBoss.w; jokerBoss.dir = -1; }
    jokerBoss.facing = jokerBoss.dir;

    jokerBoss.attackTimer -= dt;
    const target = nearestCharacter(jokerBoss.x + jokerBoss.w / 2);
    const dx = Math.abs((target.x + target.w / 2) - (jokerBoss.x + jokerBoss.w / 2));
    if (jokerBoss.attackTimer <= 0 && dx < JOKER_BOSS_ATTACK_RANGE) {
      jokerBoss.mode = "telegraph";
      jokerBoss.telegraphTimer = JOKER_BOSS_TELEGRAPH;
      jokerBoss.pendingAction = dx < JOKER_BOSS_MELEE_RANGE
        ? (Math.random() < 0.5 ? "slam" : "gas")
        : (Math.random() < 0.5 ? "volley" : "gas");
      jokerBoss.facing = target.x < jokerBoss.x ? -1 : 1;
    }
  } else if (jokerBoss.mode === "telegraph") {
    jokerBoss.telegraphTimer -= dt;
    jokerBoss.facing = nearestCharacter(jokerBoss.x + jokerBoss.w / 2).x < jokerBoss.x ? -1 : 1;
    if (jokerBoss.telegraphTimer <= 0) {
      if (jokerBoss.pendingAction === "volley") {
        jokerBoss.mode = "volley";
        jokerBoss.volleyShotsLeft = JOKER_BOSS_CARD_BURST_COUNT;
        jokerBoss.volleyTimer = 0;
      } else if (jokerBoss.pendingAction === "gas") {
        fireJokerGas(jokerBoss);
        jokerBoss.mode = "recover";
        jokerBoss.recoverTimer = 0.4;
      } else {
        jokerBoss.mode = "slam";
        jokerBoss.slamTimer = JOKER_BOSS_SLAM_ACTIVE;
      }
    }
  } else if (jokerBoss.mode === "volley") {
    jokerBoss.volleyTimer -= dt;
    if (jokerBoss.volleyTimer <= 0 && jokerBoss.volleyShotsLeft > 0) {
      fireJokerCard(jokerBoss);
      jokerBoss.volleyShotsLeft--;
      jokerBoss.volleyTimer = JOKER_BOSS_CARD_BURST_GAP;
    }
    if (jokerBoss.volleyShotsLeft <= 0 && jokerBoss.volleyTimer <= 0) {
      jokerBoss.mode = "recover";
      jokerBoss.recoverTimer = 0.4;
    }
  } else if (jokerBoss.mode === "slam") {
    jokerBoss.slamTimer -= dt;
    const reach = {
      x: jokerBoss.x - JOKER_BOSS_SLAM_RADIUS, y: jokerBoss.y - 4,
      w: jokerBoss.w + JOKER_BOSS_SLAM_RADIUS * 2, h: jokerBoss.h + 8,
    };
    for (const ch of activeCharacters()) {
      if (overlap(ch, reach)) {
        const dir = (ch.x + ch.w / 2) < (jokerBoss.x + jokerBoss.w / 2) ? -1 : 1;
        takeDamage(ch, JOKER_BOSS_SLAM_DAMAGE, dir);
      }
    }
    if (jokerBoss.slamTimer <= 0) {
      jokerBoss.mode = "recover";
      jokerBoss.recoverTimer = 0.5;
    }
  } else if (jokerBoss.mode === "recover") {
    jokerBoss.recoverTimer -= dt;
    if (jokerBoss.recoverTimer <= 0) {
      jokerBoss.mode = "patrol";
      jokerBoss.attackTimer = JOKER_BOSS_ATTACK_COOLDOWN_BASE + Math.random() * 0.7;
    }
  }

  // regular contact damage outside of the slam window (slam has its own bigger hit above)
  if (jokerBoss.mode !== "slam") {
    for (const ch of activeCharacters()) {
      if (overlap(ch, jokerBoss)) {
        const dir = (ch.x + ch.w / 2) < (jokerBoss.x + jokerBoss.w / 2) ? -1 : 1;
        takeDamage(ch, JOKER_BOSS_CONTACT_DAMAGE, dir);
      }
    }
  }

  if (!jokerBossEngaged && Math.abs(nearestCharacter(jokerBoss.x).x - jokerBoss.x) < JOKER_BOSS_ENGAGE_RANGE) {
    jokerBossEngaged = true;
  }
}

function updateBane(dt) {
  if (!bane.alive) return;

  if (bane.knockbackTimer > 0) {
    bane.knockbackTimer -= dt;
    bane.x += bane.knockbackVx * dt;
    bane.knockbackVx *= ENEMY_KNOCKBACK_DECAY;
  }

  if (bane.mode === "patrol") {
    bane.x += bane.dir * BANE_SPEED * dt;
    if (bane.x < bane.minX) { bane.x = bane.minX; bane.dir = 1; }
    if (bane.x > bane.maxX - bane.w) { bane.x = bane.maxX - bane.w; bane.dir = -1; }
    bane.facing = bane.dir;

    bane.attackTimer -= dt;
    const target = nearestCharacter(bane.x + bane.w / 2);
    const dx = Math.abs((target.x + target.w / 2) - (bane.x + bane.w / 2));
    if (bane.attackTimer <= 0 && dx < BANE_ATTACK_RANGE) {
      bane.mode = "telegraph";
      bane.telegraphTimer = BANE_TELEGRAPH;
      const roll = Math.random();
      bane.pendingAction = roll < 0.34 ? "charge" : roll < 0.67 ? "slam" : "throw";
      bane.facing = target.x < bane.x ? -1 : 1;
    }
  } else if (bane.mode === "telegraph") {
    bane.telegraphTimer -= dt;
    bane.facing = nearestCharacter(bane.x + bane.w / 2).x < bane.x ? -1 : 1;
    if (bane.telegraphTimer <= 0) {
      if (bane.pendingAction === "charge") {
        bane.mode = "charging";
        bane.chargeTimer = BANE_CHARGE_MAX_TIME;
        bane.dir = bane.facing;
      } else if (bane.pendingAction === "slam") {
        fireBaneSlam();
        bane.mode = "recover";
        bane.recoverTimer = 0.5;
      } else {
        fireBaneDebris();
        bane.mode = "patrol";
        bane.attackTimer = BANE_ATTACK_COOLDOWN_BASE + Math.random() * 0.8;
      }
    }
  } else if (bane.mode === "charging") {
    bane.x += bane.dir * BANE_CHARGE_SPEED * dt;
    bane.chargeTimer -= dt;
    let stopped = false;
    if (bane.x < bane.minX) { bane.x = bane.minX; stopped = true; }
    if (bane.x > bane.maxX - bane.w) { bane.x = bane.maxX - bane.w; stopped = true; }

    bane.dustTimer -= dt;
    if (bane.dustTimer <= 0) {
      bane.dustTimer = 0.05;
      spawnDust(bane.x + (bane.dir > 0 ? 0 : bane.w), bane.y + bane.h - 4, 1, 40);
    }

    for (const ch of activeCharacters()) {
      if (overlap(ch, bane)) {
        const dir = (ch.x + ch.w / 2) < (bane.x + bane.w / 2) ? -1 : 1;
        if (takeDamage(ch, BANE_CHARGE_DAMAGE, dir)) stopped = true;
      }
    }
    if (bane.chargeTimer <= 0 || stopped) {
      bane.mode = "recover";
      bane.recoverTimer = BANE_RECOVER_TIME;
    }
  } else if (bane.mode === "recover") {
    bane.recoverTimer -= dt;
    if (bane.recoverTimer <= 0) {
      bane.mode = "patrol";
      bane.attackTimer = BANE_ATTACK_COOLDOWN_BASE + Math.random() * 0.8;
    }
  }

  // regular contact damage outside of a charge (which has its own stronger hit above)
  if (bane.mode !== "charging") {
    for (const ch of activeCharacters()) {
      if (overlap(ch, bane)) {
        const dir = (ch.x + ch.w / 2) < (bane.x + bane.w / 2) ? -1 : 1;
        takeDamage(ch, BANE_CONTACT_DAMAGE, dir);
      }
    }
  }

  if (!bossEngaged && Math.abs(nearestCharacter(bane.x).x - bane.x) < BANE_ENGAGE_RANGE) {
    bossEngaged = true;
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function updateCharacter(ch, input, dt) {
  // --- laughing-gas stun: no input at all until it wears off ---
  if (ch.stunTimer > 0) {
    ch.stunTimer -= dt;
    // drain any presses so they don't fire the instant the stun ends
    input.consumeJumpEdge();
    input.consumeThrowEdge();
    input.consumePunchEdge();
    input.consumeGrappleEdge();
    input.consumeInteractEdge();

    ch.vx *= 0.9;
    ch.vy += GRAVITY * dt;
    if (ch.vy > MAX_FALL) ch.vy = MAX_FALL;
    resolveCollisions(ch, dt);
    updateWallContacts(ch);
    ch.state = "laughing";
    ch.animTimer += dt;
    if (ch.y > H + 40) respawnCharacter(ch);
    return;
  }

  const prevX = ch.x; // for the eco counter's directional crossing check

  // --- grappling hook ---
  if (ch.grappleCooldown > 0) ch.grappleCooldown -= dt;

  if (input.consumeGrappleEdge()) {
    ch.grappleBufferTimer = GRAPPLE_BUFFER;
  } else {
    ch.grappleBufferTimer -= dt;
  }

  if (ch.grappling) {
    const cx = ch.x + ch.w / 2, cy = ch.y + ch.h / 2;
    const gx = ch.grappleTarget.x - cx, gy = ch.grappleTarget.y - cy;
    const dist = Math.hypot(gx, gy);
    if (dist < GRAPPLE_RELEASE_DIST) {
      ch.grappling = false;
      ch.vy = GRAPPLE_BOOST_VY;
      ch.vx = ch.facing * GRAPPLE_BOOST_VX;
      ch.grappleCooldown = GRAPPLE_COOLDOWN;
      ch.wallJumpLockTimer = 0.15; // reuse the same "let this velocity carry" window as a wall-jump kick
      ch.onGround = false;
      ch.jumpsUsed = 1; // a hook release leaves exactly one extra jump, not a full refill
    } else {
      ch.vx = (gx / dist) * GRAPPLE_PULL_SPEED;
      ch.vy = (gy / dist) * GRAPPLE_PULL_SPEED;
      ch.facing = gx >= 0 ? 1 : -1;
    }
  } else if (ch.grappleBufferTimer > 0 && ch.grappleCooldown <= 0) {
    const cx = ch.x + ch.w / 2, cy = ch.y + ch.h / 2;
    let best = null, bestDist = GRAPPLE_RANGE;
    for (const gp of grapplePoints) {
      const d = Math.hypot(gp.x - cx, gp.y - cy);
      if (d < bestDist) { best = gp; bestDist = d; }
    }
    if (best) {
      ch.grappling = true;
      ch.grappleTarget = best;
      ch.onGround = false;
      ch.jumpsUsed = 1; // grabbing on still only leaves one extra jump available
      ch.grappleBufferTimer = 0;
    }
  }

  // --- horizontal input (locked briefly after a wall jump or a hit so the kick/knockback carries) ---
  const moveSpeed = ch.state === "glide" ? GLIDE_MOVE_SPEED : MOVE_SPEED;
  if (ch.wallJumpLockTimer > 0) ch.wallJumpLockTimer -= dt;
  if (ch.hitStunTimer > 0) ch.hitStunTimer -= dt;
  if (ch.invulnTimer > 0) ch.invulnTimer -= dt;

  if (ch.grappling || ch.wallJumpLockTimer > 0 || ch.hitStunTimer > 0) {
    // let the grapple pull / kick-off / knockback velocity carry uninterrupted
  } else if (ch.onIce) {
    // slow to speed up, slow to stop — momentum carries past where input let go
    if (input.isLeft() && !input.isRight()) {
      ch.vx = Math.max(ch.vx - ICE_ACCEL * dt, -moveSpeed);
      ch.facing = -1;
    } else if (input.isRight() && !input.isLeft()) {
      ch.vx = Math.min(ch.vx + ICE_ACCEL * dt, moveSpeed);
      ch.facing = 1;
    } else if (ch.vx > 0) {
      ch.vx = Math.max(ch.vx - ICE_DECEL * dt, 0);
    } else if (ch.vx < 0) {
      ch.vx = Math.min(ch.vx + ICE_DECEL * dt, 0);
    }
  } else if (input.isLeft() && !input.isRight()) {
    ch.vx = -moveSpeed;
    ch.facing = -1;
  } else if (input.isRight() && !input.isLeft()) {
    ch.vx = moveSpeed;
    ch.facing = 1;
  } else {
    ch.vx = 0;
  }

  // --- coyote & jump buffer ---
  if (ch.onGround) {
    ch.coyoteTimer = COYOTE_TIME;
    ch.jumpsUsed = 0;
  } else {
    ch.coyoteTimer -= dt;
    if (ch.onWallLeft || ch.onWallRight) {
      ch.jumpsUsed = 0;
    } else if (ch.coyoteTimer <= 0 && ch.jumpsUsed === 0) {
      // missed the coyote window without ever jumping (just walked off an
      // edge) — that "ground jump" is gone, only the one air jump remains
      ch.jumpsUsed = 1;
    }
  }

  if (input.consumeJumpEdge()) {
    ch.jumpBufferTimer = JUMP_BUFFER;
  } else {
    ch.jumpBufferTimer -= dt;
  }

  if (ch.jumpBufferTimer > 0 && !ch.grappling) {
    if (!ch.onGround && (ch.onWallLeft || ch.onWallRight)) {
      // wall jump — kick off away from whichever wall we're touching
      const pushDir = ch.onWallLeft ? 1 : -1;
      ch.vx = pushDir * WALL_JUMP_VX;
      ch.vy = WALL_JUMP_VY;
      ch.facing = pushDir;
      ch.wallJumpLockTimer = WALL_JUMP_LOCK;
      ch.jumpsUsed = 1;
      ch.jumpBufferTimer = 0;
      ch.coyoteTimer = 0;
      ch.onWallLeft = false;
      ch.onWallRight = false;
      spawnDust(ch.x + (pushDir > 0 ? 0 : ch.w), ch.y + ch.h / 2, 5, 90);
    } else if (ch.coyoteTimer > 0) {
      // first jump — grounded or within the coyote grace window
      ch.vy = JUMP_VELOCITY;
      ch.onGround = false;
      ch.coyoteTimer = 0;
      ch.jumpBufferTimer = 0;
      ch.jumpsUsed = 1;
      spawnDust(ch.x + ch.w / 2, ch.y + ch.h, 4, 60);
    } else if (ch.jumpsUsed < MAX_JUMPS) {
      // double jump — a mid-air acrobatic flip
      ch.vy = DOUBLE_JUMP_VELOCITY;
      ch.jumpsUsed++;
      ch.jumpBufferTimer = 0;
      ch.flipTimer = FLIP_DURATION;
      spawnDust(ch.x + ch.w / 2, ch.y + ch.h / 2, 6, 90);
    }
  }

  // --- throw batarang ---
  if (ch.throwCooldown > 0) ch.throwCooldown -= dt;
  if (ch.throwTimer > 0) ch.throwTimer -= dt;
  if (input.consumeThrowEdge()) {
    if (ch.throwCooldown <= 0 && !ch.grappling) {
      throwBatarang(ch);
      ch.throwCooldown = THROW_COOLDOWN;
      ch.throwTimer = THROW_ANIM_TIME;
    }
  }

  // --- punch ---
  if (ch.punchCooldown > 0) ch.punchCooldown -= dt;
  if (ch.punchTimer > 0) {
    ch.punchTimer -= dt;
    const hitbox = {
      x: ch.facing > 0 ? ch.x + ch.w : ch.x - PUNCH_W,
      y: ch.y + 4,
      w: PUNCH_W,
      h: PUNCH_H,
    };
    for (const en of enemies) {
      if (en.alive && !ch.punchHits.has(en) && overlap(hitbox, en)) {
        damageEnemy(en, PUNCH_DAMAGE, ch.facing);
        ch.punchHits.add(en);
      }
    }
    if (jokerBoss.alive && !ch.punchHits.has(jokerBoss) && overlap(hitbox, jokerBoss)) {
      jokerBossEngaged = true;
      damageEnemy(jokerBoss, PUNCH_DAMAGE, ch.facing);
      ch.punchHits.add(jokerBoss);
      if (!jokerBoss.alive) onJokerBossDefeated();
    }
    if (bane.alive && !ch.punchHits.has(bane) && overlap(hitbox, bane)) {
      bossEngaged = true;
      damageEnemy(bane, PUNCH_DAMAGE, ch.facing);
      ch.punchHits.add(bane);
      if (!bane.alive) onBaneDefeated();
    }
  }
  if (input.consumePunchEdge()) {
    if (ch.punchCooldown <= 0 && !ch.grappling) {
      ch.punchTimer = PUNCH_ACTIVE;
      ch.punchCooldown = PUNCH_COOLDOWN;
      ch.punchHits = new Set();
      spawnDust(ch.x + ch.w / 2 + ch.facing * 8, ch.y + 8, 3, 50);
    }
  }

  // --- interact (the ice cave's valve) ---
  if (input.consumeInteractEdge() && !iceThawed) {
    const cx = ch.x + ch.w / 2, cy = ch.y + ch.h / 2;
    const vx = valve.x + valve.w / 2, vy = valve.y + valve.h / 2;
    if (Math.hypot(vx - cx, vy - cy) < VALVE_INTERACT_RADIUS) {
      thawIce();
    }
  }

  // --- gravity / glide / wall-slide (grapple pull already set vx/vy above) ---
  const airborne = !ch.onGround;
  let gliding = false, wallSliding = false;
  if (!ch.grappling) {
    gliding = airborne && input.isJumpHeld() && ch.vy > -50;
    wallSliding = airborne && !gliding && ch.vy > 0 &&
      ((ch.onWallLeft && input.isLeft()) || (ch.onWallRight && input.isRight()));

    if (gliding) {
      ch.vy += GLIDE_GRAVITY * dt;
      if (ch.vy > GLIDE_MAX_FALL) ch.vy = GLIDE_MAX_FALL;
      // updrafts only carry a character that's actively gliding through them
      for (const wz of windZones) {
        if (overlap(ch, wz)) {
          ch.vy -= WIND_LIFT_ACCEL * dt;
          if (ch.vy < -WIND_MAX_RISE) ch.vy = -WIND_MAX_RISE;
          break;
        }
      }
    } else if (wallSliding) {
      ch.vy += WALL_SLIDE_GRAVITY * dt;
      if (ch.vy > WALL_SLIDE_MAX) ch.vy = WALL_SLIDE_MAX;
    } else {
      ch.vy += GRAVITY * dt;
      if (ch.vy > MAX_FALL) ch.vy = MAX_FALL;
    }
  }

  // --- collide & move ---
  const preLandVy = ch.vy;
  resolveCollisions(ch, dt);

  // --- landing squash + dust ---
  if (ch.onGround && !ch.wasOnGround) {
    ch.landTimer = LAND_SQUASH_TIME;
    if (preLandVy > 150) {
      spawnDust(ch.x + ch.w / 2, ch.y + ch.h, 5, 70);
    }
  }
  ch.wasOnGround = ch.onGround;
  if (ch.landTimer > 0) ch.landTimer -= dt;
  if (ch.flipTimer > 0) ch.flipTimer -= dt;

  updateWallContacts(ch);

  // --- state for animation ---
  ch.animTimer += dt;
  if (ch.grappling) {
    ch.state = "grapple";
  } else if (!ch.onGround) {
    ch.state = gliding ? "glide" : wallSliding ? "wallslide" : (ch.vy < 0 ? "jump" : "fall");
  } else {
    ch.state = ch.vx !== 0 ? "run" : "idle";
  }

  // running dust trail
  if (ch.state === "run") {
    ch.runDustTimer -= dt;
    if (ch.runDustTimer <= 0) {
      ch.runDustTimer = 0.11;
      spawnDust(ch.x + (ch.facing > 0 ? 2 : ch.w - 2), ch.y + ch.h, 1, 30);
    }
  }

  // --- fell in a pit ---
  if (ch.y > H + 40) {
    respawnCharacter(ch);
  }

  // --- eco counter: crossing the ice cave's gate ---
  if (prevX >= ecoCounter.x && ch.x < ecoCounter.x) ecoIn++;
  else if (prevX <= ecoCounter.x && ch.x > ecoCounter.x) ecoOut++;
}

function thawIce() {
  iceThawed = true;
  valveTurnTimer = 0.01; // kick off the valve's turning animation
  spawnDust(valve.x + valve.w / 2, valve.y + valve.h, 14, 120);
}

function update(dt) {
  elapsed += dt;

  updateCharacter(batman, localInput, dt);
  if (robin.active) updateCharacter(robin, remoteRobinInput, dt);

  updateParticles(dt);
  updateProjectiles(dt);
  updateEnemyProjectiles(dt);
  updateShockwaves(dt);
  if (valveTurnTimer > 0 && valveTurnTimer < 1) valveTurnTimer += dt;

  if (damageFlashTimer > 0) damageFlashTimer -= dt;

  // --- enemies: patrol, ranged attacks, contact damage ---
  for (const en of enemies) {
    if (!en.alive) continue;

    if (en.knockbackTimer > 0) {
      en.knockbackTimer -= dt;
      en.x += en.knockbackVx * dt;
      en.knockbackVx *= ENEMY_KNOCKBACK_DECAY;
    }

    if (en.telegraphTimer <= 0) {
      en.x += en.dir * ENEMY_SPEED * dt;
      if (en.x < en.minX) { en.x = en.minX; en.dir = 1; }
      if (en.x > en.maxX - en.w) { en.x = en.maxX - en.w; en.dir = -1; }
      en.facing = en.dir;
    }

    en.attackTimer -= dt;
    if (en.telegraphTimer > 0) {
      en.telegraphTimer -= dt;
      en.facing = nearestCharacter(en.x + en.w / 2).x < en.x ? -1 : 1;
      if (en.telegraphTimer <= 0 && en.pendingAttack) {
        fireEnemyAttack(en);
        en.pendingAttack = false;
      }
    } else {
      const target = nearestCharacter(en.x + en.w / 2);
      const dx = Math.abs((target.x + target.w / 2) - (en.x + en.w / 2));
      const dy = Math.abs(target.y - en.y);
      if (en.attackTimer <= 0 && dx < ATTACK_RANGE && dx > ATTACK_MIN_RANGE && dy < ATTACK_HEIGHT_TOL) {
        en.telegraphTimer = ATTACK_TELEGRAPH;
        en.pendingAttack = true;
        en.attackTimer = ATTACK_COOLDOWN_BASE + Math.random() * 0.6;
      }
    }

    for (const ch of activeCharacters()) {
      if (overlap(ch, en)) {
        const dir = (ch.x + ch.w / 2) < (en.x + en.w / 2) ? -1 : 1;
        takeDamage(ch, CONTACT_DAMAGE, dir);
      }
    }
  }

  updateJokerBoss(dt);
  updateBane(dt);
  refreshBossBar();

  // --- bat-signal beacon / win (locked until Bane is defeated) ---
  const touchingBeacon = overlap(batman, beacon) || (robin.active && overlap(robin, beacon));
  if (touchingBeacon && bane.alive) {
    document.getElementById("bossHint").classList.remove("hidden");
  } else {
    document.getElementById("bossHint").classList.add("hidden");
  }
  if (!gameWon && touchingBeacon && !bane.alive) {
    gameWon = true;
    beaconActive = true;
    ending = true;
    endTimer = 0;
    gordon.x = beaconCameraX - 15;
    gordon.state = "walk";
    gordonVisible = true;
  }

  // --- camera: centered on Batman alone, or the midpoint of both heroes ---
  if (robin.active) {
    const midX = (batman.x + robin.x) / 2 + PLAYER_W / 2;
    cameraX = midX - W / 2;
  } else {
    cameraX = batman.x - W / 2 + batman.w / 2;
  }
  cameraX = Math.max(0, Math.min(cameraX, levelWidth - W));
}

// ---------------------------------------------------------------------------
// Ending sequence — camera settles on the beacon, Gordon walks in
// ---------------------------------------------------------------------------
function updateEnding(dt) {
  endTimer += dt;

  cameraX += (beaconCameraX - cameraX) * Math.min(dt * 3, 1);

  if (gordon.x < gordon.targetX) {
    gordon.x = Math.min(gordon.x + GORDON_SPEED * dt, gordon.targetX);
    gordon.animTimer += dt;
    gordon.state = "walk";
  } else {
    gordon.state = "stand";
  }

  if (ending && endTimer > END_SEQUENCE_DURATION) {
    ending = false;
    winGame();
  }
}

// ---------------------------------------------------------------------------
// Intro sequence — the Batmobile drives in, heroes hop out, then control
// ---------------------------------------------------------------------------
function updateIntro(dt) {
  introTimer += dt;

  if (batmobile.x < batmobile.targetX) {
    batmobile.x = Math.min(batmobile.x + BATMOBILE_SPEED * dt, batmobile.targetX);
  }

  // the car clips a goon on the way in and sends him flying
  if (!introGoon.hit && batmobile.x + 56 >= introGoon.x) {
    introGoon.hit = true;
    introGoon.vx = GOON_HIT_VX;
    introGoon.vy = GOON_HIT_VY;
    spawnDust(introGoon.x + introGoon.w / 2, introGoon.y + introGoon.h / 2, 8, 120);
  }
  if (introGoon.hit) {
    introGoon.vy += GRAVITY * dt;
    introGoon.x += introGoon.vx * dt;
    introGoon.y += introGoon.vy * dt;
    introGoon.rot += dt * GOON_ROT_SPEED;
  }

  const parked = batmobile.x >= batmobile.targetX;
  if (parked && introParkedTimer < 0) introParkedTimer = 0;
  else if (parked) introParkedTimer += dt;

  // the heroes flip out of the car once it's actually stopped
  if (introParkedTimer >= 0 && !introBatmanRevealed) {
    introBatmanRevealed = true;
    batman.flipTimer = FLIP_DURATION;
    spawnDust(batman.x + batman.w / 2, batman.y + batman.h, 5, 70);
  }
  if (introParkedTimer >= 0.25 && robin.active && !introRobinRevealed) {
    introRobinRevealed = true;
    robin.flipTimer = FLIP_DURATION;
    spawnDust(robin.x + robin.w / 2, robin.y + robin.h, 5, 70);
  }

  // updateCharacter() (which normally ticks this down) never runs during the
  // intro, so drive the flip animation directly or it'll just freeze mid-pose
  if (batman.flipTimer > 0) batman.flipTimer -= dt;
  if (robin.active && robin.flipTimer > 0) robin.flipTimer -= dt;

  if (intro && introParkedTimer >= INTRO_POST_PARK_DURATION) {
    intro = false;
    gameRunning = true;
  }
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1c2550");
  grad.addColorStop(1, "#4a4270");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // moon
  const moonX = 300 - cameraX * 0.05;
  ctx.fillStyle = "#e9e3c9";
  ctx.beginPath();
  ctx.arc(((moonX % (W + 100)) + W + 100) % (W + 100) - 50, 40, 18, 0, Math.PI * 2);
  ctx.fill();

  // stars
  ctx.fillStyle = "#cfd2e0";
  for (let i = 0; i < 40; i++) {
    const sx = (i * 97 - cameraX * 0.1) % (W + 40);
    const sy = (i * 53) % 90;
    ctx.fillRect(((sx % (W + 40)) + (W + 40)) % (W + 40), sy, 1, 1);
  }

  // far buildings (parallax 0.3)
  ctx.fillStyle = "#171233";
  drawSkyline(0.3, 90, 60, 5417);
  // near buildings (parallax 0.55)
  ctx.fillStyle = "#100c24";
  drawSkyline(0.55, 130, 45, 9931);
}

function drawSkyline(parallax, baseY, variance, seed) {
  const offset = cameraX * parallax;
  const buildingW = 34;
  const start = Math.floor(offset / buildingW) - 1;
  const count = Math.ceil(W / buildingW) + 2;
  for (let i = start; i < start + count; i++) {
    const h = variance + ((Math.abs(Math.sin(i * 12.9898 + seed)) * 10000) % variance);
    const bx = i * buildingW - offset;
    ctx.fillRect(bx, H - baseY - h + 60, buildingW - 4, h + 60);
  }
}

function drawGround() {
  for (const p of platforms.concat(floaters)) {
    const x = p.x - cameraX;
    if (x + p.w < 0 || x > W) continue;
    if (p.icy && !iceThawed) {
      // Mr. Freeze's ice cave — pale, glassy, and dusted with frost
      ctx.fillStyle = "#274a5e";
      ctx.fillRect(x, p.y, p.w, p.h);
      ctx.fillStyle = "#bfe9f2";
      ctx.fillRect(x, p.y, p.w, 5);
      ctx.fillStyle = "#8fd0e0";
      for (let gx = 6; gx < p.w - 6; gx += 22) {
        ctx.fillRect(x + gx, p.y - 3, 3, 3);
        ctx.fillRect(x + gx + 8, p.y - 5, 3, 5);
      }
      continue;
    }
    if (p.icy && iceThawed) {
      // thawed — dark, wet stone with a puddle sheen along the top edge
      ctx.fillStyle = "#26313a";
      ctx.fillRect(x, p.y, p.w, p.h);
      ctx.fillStyle = "#3d5866";
      ctx.fillRect(x, p.y, p.w, 3);
      continue;
    }
    ctx.fillStyle = "#2c2244";
    ctx.fillRect(x, p.y, p.w, p.h);
    ctx.fillStyle = "#3a2c5a";
    ctx.fillRect(x, p.y, p.w, 4);
    // gargoyle-ish crenellations on rooftops
    ctx.fillStyle = "#1c1530";
    for (let gx = 4; gx < p.w - 4; gx += 16) {
      ctx.fillRect(x + gx, p.y - 4, 6, 4);
    }
  }

  // wall-jump shaft walls
  for (const w of walls) {
    const x = w.x - cameraX;
    if (x + w.w < 0 || x > W) continue;
    ctx.fillStyle = "#332a4d";
    ctx.fillRect(x, w.y, w.w, w.h);
    ctx.fillStyle = "#463a68";
    ctx.fillRect(x, w.y, 2, w.h);
    ctx.fillStyle = "#221a38";
    for (let gy = w.y + 6; gy < w.y + w.h - 4; gy += 10) {
      ctx.fillRect(x + 2, gy, w.w - 4, 3);
    }
  }
}

function drawValve() {
  const x = valve.x - cameraX;
  if (x < -20 || x > W + 20) return;
  // pipe stub
  ctx.fillStyle = "#5a5f66";
  ctx.fillRect(x + 3, valve.y + 6, 6, valve.h - 6);
  // wheel — spins briefly once turned
  const spin = valveTurnTimer > 0 ? valveTurnTimer * 14 : 0;
  ctx.save();
  ctx.translate(x + valve.w / 2, valve.y + 4);
  ctx.rotate(spin);
  ctx.strokeStyle = iceThawed ? "#e05a3a" : "#8a2620";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillRect(-1, -5, 2, 10);
  ctx.fillRect(-5, -1, 10, 2);
  ctx.restore();
}

function drawFreezeStatue() {
  const x = freezeStatue.x - cameraX;
  if (x < -50 || x > W + 50) return;
  if (iceThawed) return; // frees himself once the cave thaws — just an empty melt puddle
  // block of ice
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#bfe9f2";
  ctx.fillRect(x, freezeStatue.y, freezeStatue.w, freezeStatue.h);
  ctx.globalAlpha = 1;
  // the man inside — pale blue suit, dome goggles
  ctx.fillStyle = "#6f8fa3";
  ctx.fillRect(x + 9, freezeStatue.y + 14, 12, 22);
  ctx.fillStyle = "#d7e6ea";
  ctx.fillRect(x + 10, freezeStatue.y + 6, 10, 9);
  ctx.fillStyle = "#2a3a44";
  ctx.fillRect(x + 10, freezeStatue.y + 9, 10, 4);
  // puddle forming at the base as it thaws
  ctx.fillStyle = "#3d5866";
  ctx.fillRect(x - 2, freezeStatue.y + freezeStatue.h - 2, freezeStatue.w + 4, 2);
}

function drawEcoCounter() {
  const x = ecoCounter.x - cameraX;
  if (x < -40 || x > W + 40) return;
  // gate posts
  ctx.fillStyle = "#4a4f57";
  ctx.fillRect(x - 2, ecoCounter.y, 4, ecoCounter.h);
  // sign board
  ctx.fillStyle = "#1c1f24";
  ctx.fillRect(x - 22, ecoCounter.y - 16, 44, 14);
  ctx.fillStyle = "#5df08a";
  ctx.font = "6px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`IN ${ecoIn}`, x, ecoCounter.y - 9);
  ctx.fillText(`OUT ${ecoOut}`, x, ecoCounter.y - 3);
  ctx.textAlign = "left";
}

function drawIntroGoon() {
  const x = introGoon.x - cameraX;
  if (x < -40 || x > W + 40) return;
  if (!introGoon.hit) {
    drawHenchman(introGoon);
    return;
  }
  const cx = x + introGoon.w / 2, cy = introGoon.y + introGoon.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(introGoon.rot);
  ctx.translate(-cx, -cy);
  drawHenchman(introGoon);
  ctx.restore();
}

function drawBatmobile() {
  const x = batmobile.x - cameraX;
  if (x < -80 || x > W + 80) return;

  // wheels (kept dark — the rubber reads fine against a brighter body)
  ctx.fillStyle = "#111318";
  ctx.beginPath(); ctx.arc(x + 8, 184, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 46, 184, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a4a2a";
  ctx.beginPath(); ctx.arc(x + 8, 184, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 46, 184, 2, 0, Math.PI * 2); ctx.fill();

  // low sleek body — brightened slate-blue so it reads clearly against the dark rooftop
  ctx.fillStyle = "#4a5578";
  ctx.beginPath();
  ctx.moveTo(x, 190);
  ctx.lineTo(x + 4, 178);
  ctx.lineTo(x + 16, 172);
  ctx.lineTo(x + 34, 172);
  ctx.lineTo(x + 44, 178);
  ctx.lineTo(x + 56, 182);
  ctx.lineTo(x + 56, 190);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#8891b8";
  ctx.stroke();

  // canopy
  ctx.fillStyle = "#5a7ab0";
  ctx.beginPath();
  ctx.moveTo(x + 16, 178);
  ctx.lineTo(x + 22, 173);
  ctx.lineTo(x + 32, 173);
  ctx.lineTo(x + 36, 178);
  ctx.closePath();
  ctx.fill();

  // bat-fin tail
  ctx.fillStyle = "#4a5578";
  ctx.beginPath();
  ctx.moveTo(x + 44, 178);
  ctx.lineTo(x + 55, 167);
  ctx.lineTo(x + 50, 180);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // headlight
  ctx.fillStyle = "#fff3b0";
  ctx.fillRect(x - 1, 184, 2, 2);
}

function drawGrapplePoints() {
  for (const gp of grapplePoints) {
    const x = gp.x - cameraX;
    if (x < -10 || x > W + 10) continue;
    const glint = 0.5 + Math.sin(elapsed * 3 + gp.x) * 0.5;
    ctx.fillStyle = "#2a2a33";
    ctx.beginPath();
    ctx.arc(x, gp.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha = 0.5 + glint * 0.5;
    ctx.fillStyle = "#f2c94c";
    ctx.beginPath();
    ctx.arc(x, gp.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawWindZones() {
  for (const wz of windZones) {
    const x0 = wz.x - cameraX;
    if (x0 + wz.w < 0 || x0 > W) continue;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#cfe8ff";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const sx = x0 + ((i * 41 + 11) % wz.w);
      const cycle = (elapsed * 90 + i * 47) % (wz.h + 24);
      const sy = wz.y + wz.h - cycle;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 2, sy + 12);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGrappleLine(ch) {
  if (!ch.grappling || !ch.grappleTarget) return;
  const x1 = ch.x + ch.w / 2 - cameraX, y1 = ch.y + ch.h / 2;
  const x2 = ch.grappleTarget.x - cameraX, y2 = ch.grappleTarget.y;
  ctx.strokeStyle = "#c9cbd8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.fillStyle = "#8a8d9c";
  ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}

// the classic bat emblem: pointed ears, swept wings, scalloped wingtips
function drawBatSymbol(bx, by, s) {
  const pts = [
    [0, -9], [2.5, -11], [4, -7], [7, -4],
    [23, -10], [13, 3], [19, 11], [6, 6], [3, 13],
    [0, 8],
    [-3, 13], [-6, 6], [-19, 11], [-13, 3], [-23, -10],
    [-7, -4], [-4, -7], [-2.5, -11],
  ];
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const X = bx + px * s, Y = by + py * s;
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  });
  ctx.closePath();
  ctx.fill();
}

function beaconIntensity() {
  if (!beaconActive) return 0;
  // a quick flicker-on, then steady
  const t = endTimer;
  if (t < 0.1) return 0.2;
  if (t < 0.16) return 0.9;
  if (t < 0.24) return 0.15;
  if (t < 0.32) return 1;
  if (t < 0.4) return 0.35;
  return 1;
}

function drawBeacon() {
  const x = beacon.x - cameraX;
  if (x < -60 || x > W + 60) return;

  // pedestal
  ctx.fillStyle = "#23242b";
  ctx.fillRect(x + 4, beacon.y + 30, 10, beacon.h - 30);
  ctx.fillRect(x, beacon.y + 26, 18, 6);

  // dish housing
  ctx.fillStyle = "#33343d";
  ctx.beginPath();
  ctx.arc(x + 9, beacon.y + 22, 11, Math.PI, Math.PI * 2);
  ctx.fill();

  const glow = beaconIntensity();

  // lens base (dark disc, glow overlaid on top when lit)
  ctx.fillStyle = "#4a4c56";
  ctx.beginPath();
  ctx.arc(x + 9, beacon.y + 22, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  if (glow > 0) {
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath();
    ctx.arc(x + 9, beacon.y + 22, 7, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (glow > 0) {
    ctx.save();
    ctx.globalAlpha = glow;

    // beam — kept entirely on-screen so the signal reads clearly in the sky
    const beamTopY = 16;
    const grad = ctx.createLinearGradient(0, beacon.y + 16, 0, beamTopY);
    grad.addColorStop(0, "rgba(255,243,176,0.5)");
    grad.addColorStop(1, "rgba(255,243,176,0.08)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + 2, beacon.y + 18);
    ctx.lineTo(x - 36, beamTopY);
    ctx.lineTo(x + 54, beamTopY);
    ctx.lineTo(x + 16, beacon.y + 18);
    ctx.closePath();
    ctx.fill();

    // the real bat-signal, high in the beam but fully visible
    ctx.fillStyle = "rgba(15,12,10,0.88)";
    drawBatSymbol(x + 9, 52, 1.15);
    ctx.restore();
  }
}

function drawGordon() {
  const x = gordon.x - cameraX;
  if (x < -20 || x > W + 20) return;
  const frame = Math.floor(gordon.animTimer * 6) % 2;
  const walking = gordon.state === "walk";

  ctx.save();
  ctx.translate(Math.round(x), Math.round(gordon.y));

  // legs
  ctx.fillStyle = "#2e2b26";
  if (walking && frame === 0) { ctx.fillRect(3, 14, 4, 6); ctx.fillRect(8, 13, 4, 7); }
  else if (walking) { ctx.fillRect(3, 13, 4, 7); ctx.fillRect(8, 14, 4, 6); }
  else { ctx.fillRect(3, 14, 4, 6); ctx.fillRect(8, 14, 4, 6); }

  // trenchcoat torso
  ctx.fillStyle = "#8a7355";
  ctx.fillRect(1, 6, 12, 9);
  ctx.fillStyle = "#6f5b42";
  ctx.fillRect(1, 6, 12, 2);
  ctx.fillStyle = "#4a3f30";
  ctx.fillRect(6, 7, 2, 8);

  // arms
  ctx.fillStyle = "#8a7355";
  if (walking) {
    const sway = frame === 0 ? -1 : 1;
    ctx.fillRect(0, 8 + sway, 3, 6);
    ctx.fillRect(11, 8 - sway, 3, 6);
  } else {
    ctx.fillRect(0, 8, 3, 6);
    ctx.fillRect(11, 8, 3, 6);
  }

  // head
  ctx.fillStyle = "#dba876";
  ctx.fillRect(2, 0, 10, 7);
  // grey hair
  ctx.fillStyle = "#c9c9c9";
  ctx.fillRect(2, -2, 10, 3);
  ctx.fillRect(1, 0, 2, 4);
  ctx.fillRect(11, 0, 2, 4);
  // mustache
  ctx.fillStyle = "#b6b6b6";
  ctx.fillRect(4, 4, 6, 1);
  // glasses
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(3, 2, 3, 2);
  ctx.fillRect(8, 2, 3, 2);
  ctx.fillRect(6, 2, 2, 1);

  ctx.restore();
}

function drawHealthPips(width, hp, maxHp, yOff) {
  const pipW = 4, gap = 1;
  const totalW = maxHp * pipW + (maxHp - 1) * gap;
  const startX = width / 2 - totalW / 2;
  for (let i = 0; i < maxHp; i++) {
    const px = startX + i * (pipW + gap);
    ctx.fillStyle = i < hp ? "#e0413d" : "#2a2530";
    ctx.fillRect(px, yOff, pipW, 3);
  }
}

function drawHenchman(en) {
  const x = en.x - cameraX;
  if (x < -30 || x > W + 30) return;
  const bob = Math.round(Math.sin(elapsed * 3 + en.x) * 1);
  const aiming = en.telegraphTimer > 0;

  ctx.save();
  ctx.translate(Math.round(x + en.w / 2), Math.round(en.y + bob));
  ctx.scale(en.facing, 1);
  ctx.translate(-en.w / 2, 0);

  drawHealthPips(en.w, en.hp, en.maxHp, -9);

  if (en.type === "joker") {
    ctx.fillStyle = "#2c2233";
    ctx.fillRect(2, en.h - 6, 4, 6);
    ctx.fillRect(en.w - 6, en.h - 6, 4, 6);

    ctx.fillStyle = "#5a3a7a";
    ctx.fillRect(1, 7, en.w - 2, en.h - 13);
    ctx.fillStyle = "#3c8f4a";
    ctx.fillRect(en.w / 2 - 1, 8, 2, en.h - 15);

    ctx.fillStyle = "#5a3a7a";
    ctx.fillRect(-1, 9, 4, 6);
    if (aiming) {
      ctx.fillRect(en.w - 2, 4, 7, 3);
      ctx.fillStyle = "#fff3b0";
      ctx.fillRect(en.w + 4, 3, 2, 2);
    } else {
      ctx.fillRect(en.w - 3, 9, 4, 6);
    }

    ctx.fillStyle = "#f0e6d8";
    ctx.fillRect(2, 0, en.w - 4, 7);
    ctx.fillStyle = "#5fbf4a";
    ctx.fillRect(1, -3, 3, 4);
    ctx.fillRect(en.w - 4, -3, 3, 4);
    ctx.fillRect(en.w / 2 - 2, -4, 4, 4);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(3, 4, en.w - 6, 1);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(3, 2, 2, 2);
    ctx.fillRect(en.w - 5, 2, 2, 2);
  } else {
    // Two-Face — split palette down the middle
    const half = Math.floor(en.w / 2);
    ctx.fillStyle = "#26282f";
    ctx.fillRect(2, en.h - 7, 4, 7);
    ctx.fillStyle = "#4a1414";
    ctx.fillRect(en.w - 6, en.h - 7, 4, 7);

    ctx.fillStyle = "#3a3f4d";
    ctx.fillRect(1, 7, half, en.h - 13);
    ctx.fillStyle = "#7a2a2a";
    ctx.fillRect(1 + half, 7, en.w - 1 - half, en.h - 13);

    ctx.fillStyle = "#7a2a2a";
    ctx.fillRect(-1, 9, 4, 7);
    ctx.fillStyle = "#3a3f4d";
    if (aiming) {
      ctx.fillRect(en.w - 2, 4, 8, 3);
      ctx.fillStyle = "#e8c34a";
      ctx.fillRect(en.w + 5, 3, 2, 2);
    } else {
      ctx.fillRect(en.w - 3, 9, 4, 7);
    }

    ctx.fillStyle = "#c9a883";
    ctx.fillRect(2, 0, half, 8);
    ctx.fillStyle = "#9aa0a8";
    ctx.fillRect(2 + half, 0, en.w - 2 - half, 8);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(en.w - 5, 3, 2, 2);

    ctx.fillStyle = "#e8c34a";
    ctx.beginPath();
    ctx.arc(en.w / 2, en.h - 9, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawEnemies() {
  for (const en of enemies) {
    if (en.alive) drawHenchman(en);
  }
}

function drawJokerBoss() {
  if (!jokerBoss.alive) return;
  const x = jokerBoss.x - cameraX;
  if (x < -40 || x > W + 40) return;

  const telegraphing = jokerBoss.mode === "telegraph";
  const slamming = jokerBoss.mode === "slam";
  const armed = telegraphing || slamming;
  const bob = Math.round(Math.sin(elapsed * 3.2) * 1);
  const w = jokerBoss.w, h = jokerBoss.h;

  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(jokerBoss.y + bob));
  ctx.scale(jokerBoss.facing, 1);
  ctx.translate(-w / 2, 0);

  if (slamming) {
    ctx.rotate(-0.15);
  } else if (telegraphing) {
    ctx.translate(w / 2, h);
    ctx.scale(1.08, 0.9);
    ctx.translate(-w / 2, -h);
  }

  // tailcoat flap (behind)
  ctx.fillStyle = "#4a2c66";
  ctx.beginPath();
  ctx.moveTo(2, h - 10);
  ctx.lineTo(-3, h + 2);
  ctx.lineTo(1, h - 4);
  ctx.lineTo(3, h + 3);
  ctx.lineTo(6, h - 6);
  ctx.closePath();
  ctx.fill();

  // legs
  ctx.fillStyle = "#2c2233";
  ctx.fillRect(3, h - 8, 5, 8);
  ctx.fillRect(w - 8, h - 8, 5, 8);

  // purple suit torso
  ctx.fillStyle = "#5a3a7a";
  ctx.fillRect(1, 9, w - 2, h - 19);
  // green waistcoat
  ctx.fillStyle = "#3c8f4a";
  ctx.fillRect(w / 2 - 2, 10, 4, h - 20);
  // flower lapel
  ctx.fillStyle = "#e0413d";
  ctx.fillRect(3, 10, 3, 3);

  // arms — mallet raised when winding up or swinging
  ctx.fillStyle = "#5a3a7a";
  ctx.fillRect(-2, 11, 4, 8);
  if (armed) {
    ctx.fillRect(w - 3, 3, 9, 4);
    ctx.fillStyle = "#3a2a22";
    ctx.fillRect(w + 4, -1, 6, 6);
  } else {
    ctx.fillRect(w - 4, 11, 4, 8);
  }

  // head
  ctx.fillStyle = "#f0e6d8";
  ctx.fillRect(w / 2 - 8, 0, 16, 9);
  // wild green hair
  ctx.fillStyle = "#5fbf4a";
  ctx.fillRect(w / 2 - 9, -4, 5, 6);
  ctx.fillRect(w / 2 + 4, -4, 5, 6);
  ctx.fillRect(w / 2 - 3, -5, 6, 5);
  // grin
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(w / 2 - 6, 5, 12, 2);
  // eyes — flare red when about to attack
  ctx.fillStyle = armed ? "#ff5b4a" : "#1a1a1a";
  ctx.fillRect(w / 2 - 5, 2, 3, 2);
  ctx.fillRect(w / 2 + 2, 2, 3, 2);

  ctx.restore();
}

function drawBane() {
  if (!bane.alive) return;
  const x = bane.x - cameraX;
  if (x < -50 || x > W + 50) return;

  const charging = bane.mode === "charging";
  const telegraphing = bane.mode === "telegraph";
  const bob = Math.round(Math.sin(elapsed * 2.4) * 1);
  const w = bane.w, h = bane.h;

  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(bane.y + bob));
  ctx.scale(bane.facing, 1);
  ctx.translate(-w / 2, 0);

  if (charging) {
    ctx.rotate(0.12);
  } else if (telegraphing) {
    ctx.translate(w / 2, h);
    ctx.scale(1.05, 0.94);
    ctx.translate(-w / 2, -h);
  }

  // legs
  ctx.fillStyle = "#1c1c22";
  ctx.fillRect(4, h - 10, 8, 10);
  ctx.fillRect(w - 12, h - 10, 8, 10);

  // muscular torso + harness straps
  ctx.fillStyle = "#8a6a52";
  ctx.fillRect(2, 12, w - 4, 15);
  ctx.fillStyle = "#3a2a22";
  ctx.fillRect(2, 12, w - 4, 3);
  ctx.fillRect(w / 2 - 2, 12, 4, 15);

  // huge arms + fists
  ctx.fillStyle = "#8a6a52";
  ctx.fillRect(-4, 11, 7, 13);
  ctx.fillRect(w - 3, 11, 7, 13);
  ctx.fillStyle = "#6e523d";
  ctx.fillRect(-5, 22, 8, 6);
  ctx.fillRect(w - 3, 22, 8, 6);

  // bald head
  ctx.fillStyle = "#c79a78";
  ctx.fillRect(w / 2 - 7, 0, 14, 11);
  // venom mask
  ctx.fillStyle = telegraphing ? "#8a2020" : "#3a1418";
  ctx.fillRect(w / 2 - 7, 5, 14, 7);
  // tubes into the mask
  ctx.fillStyle = "#4a4a4a";
  ctx.fillRect(w / 2 - 9, 3, 2, 6);
  ctx.fillRect(w / 2 + 7, 3, 2, 6);
  // eyes — flare red when about to attack
  ctx.fillStyle = telegraphing || charging ? "#ff5b4a" : "#1a1a1a";
  ctx.fillRect(w / 2 - 5, 3, 3, 2);
  ctx.fillRect(w / 2 + 2, 3, 3, 2);

  ctx.restore();
}

// hoisted out of drawCharacter so these aren't recreated as new closures every
// single frame for every character — cheap individually, but adds up as GC pressure
function capePath(points, capeColor, edgeColor) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = capeColor;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = edgeColor;
  ctx.stroke();
}

// one leg of the running gait: swings fore/aft and shortens (knee-bend) as it lifts through recovery
function runLeg(baseX, phase) {
  const swing = Math.sin(phase);
  const xOff = Math.round(swing * 3);
  const lift = Math.max(0, -swing) * 3;
  const len = 7 - Math.round(lift);
  ctx.fillRect(baseX + xOff, 13, 4, len);
}

function drawCharacter(ch, palette) {
  const x = Math.round(ch.x - cameraX);
  const y = Math.round(ch.y);

  if (ch.invulnTimer > 0 && Math.floor(elapsed * 14) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  // continuous running gait — a smooth sine-driven stride instead of a hard frame-switch
  const runPhase = ch.animTimer * 16;
  const bob = ch.state === "run" ? Math.round((1 - Math.abs(Math.cos(runPhase))) * 1.6) : 0;
  const flap = Math.round(Math.sin(ch.animTimer * 9) * 2); // cape flutter while gliding
  const laughShake = ch.state === "laughing" ? Math.round(Math.sin(ch.animTimer * 26) * 1) : 0;

  ctx.save();
  ctx.translate(x + ch.w / 2 + laughShake, y + bob);
  ctx.scale(ch.facing, 1);
  ctx.translate(-ch.w / 2, 0);

  // acrobatic flip on double jump
  if (ch.flipTimer > 0) {
    const angle = (1 - ch.flipTimer / FLIP_DURATION) * Math.PI * 2;
    ctx.translate(ch.w / 2, ch.h / 2);
    ctx.rotate(angle);
    ctx.translate(-ch.w / 2, -ch.h / 2);
  }

  // landing squash, anchored at the feet
  if (ch.landTimer > 0 && ch.flipTimer <= 0) {
    const t = ch.landTimer / LAND_SQUASH_TIME;
    ctx.translate(ch.w / 2, ch.h);
    ctx.scale(1 + t * 0.18, 1 - t * 0.22);
    ctx.translate(-ch.w / 2, -ch.h);
  }

  // lean into the run for a sense of speed
  if (ch.state === "run") {
    ctx.translate(ch.w / 2, ch.h * 0.75);
    ctx.rotate(0.1);
    ctx.translate(-ch.w / 2, -ch.h * 0.75);
  }

  const { K, KD, CAPE, CAPE_EDGE, Y, SK, WH } = palette;

  // ---- cape (behind body) ----
  if (ch.state === "laughing") {
    const wobble = Math.round(Math.sin(ch.animTimer * 10) * 2);
    capePath([[5, 2], [-5 + wobble, 5], [-3 + wobble, 14], [4, 11]], CAPE, CAPE_EDGE);
  } else if (ch.state === "grapple") {
    capePath([[6, 2], [-9, 3], [-7, 9], [-3, 7], [3, 12]], CAPE, CAPE_EDGE);
  } else if (ch.state === "glide") {
    capePath([[6, 3], [-14, 2 + flap], [-10, 9], [-19, 10 + flap], [-9, 15], [2, 12]], CAPE, CAPE_EDGE);
  } else if (ch.state === "wallslide") {
    capePath([[5, 2], [-4, 6], [-2, 15], [4, 12]], CAPE, CAPE_EDGE);
  } else if (ch.state === "jump" || ch.state === "fall") {
    capePath([[6, 2], [-8, 4], [-6, 10], [-2, 8], [3, 12]], CAPE, CAPE_EDGE);
  } else if (ch.state === "run") {
    const sway = Math.round(Math.sin(runPhase) * 4);
    capePath([[5, 2], [-6 + sway, 6], [-3 + sway, 13], [4, 10]], CAPE, CAPE_EDGE);
  } else {
    capePath([[5, 2], [-5, 5], [-3, 14], [4, 11]], CAPE, CAPE_EDGE);
  }

  // ---- legs ----
  ctx.fillStyle = KD;
  if (ch.state === "laughing") {
    const kneeBounce = Math.round(Math.abs(Math.sin(ch.animTimer * 13)) * 2);
    ctx.fillRect(3, 14 - kneeBounce, 4, 6 + kneeBounce);
    ctx.fillRect(8, 14 - kneeBounce, 4, 6 + kneeBounce);
  } else if (ch.state === "run") {
    runLeg(3, runPhase);
    runLeg(8, runPhase + Math.PI);
  } else if (ch.state === "grapple") {
    ctx.fillRect(2, 14, 4, 5);
    ctx.fillRect(9, 15, 4, 5);
  } else if (ch.state === "jump") {
    ctx.fillRect(3, 13, 4, 5);
    ctx.fillRect(8, 14, 4, 5);
  } else if (ch.state === "fall" || ch.state === "glide") {
    ctx.fillRect(2, 14, 4, 5);
    ctx.fillRect(9, 15, 4, 5);
  } else if (ch.state === "wallslide") {
    ctx.fillRect(3, 13, 4, 7);
    ctx.fillRect(8, 13, 4, 7);
  } else {
    ctx.fillRect(3, 14, 4, 6);
    ctx.fillRect(8, 14, 4, 6);
  }

  // ---- torso ----
  ctx.fillStyle = K;
  ctx.fillRect(2, 7, 11, 8);

  // belt
  ctx.fillStyle = Y;
  ctx.fillRect(2, 13, 11, 2);

  // chest emblem
  ctx.fillStyle = Y;
  ctx.fillRect(6, 9, 3, 3);

  // ---- arms ----
  ctx.fillStyle = K;
  if (ch.punchTimer > 0) {
    // jabbing arm punches forward with an impact spark, other arm braces back
    ctx.fillRect(10, 7, 9, 3);
    ctx.fillRect(1, 9, 3, 5);
    ctx.fillStyle = "#fff6d0";
    ctx.fillRect(19, 6, 2, 2);
    ctx.fillRect(21, 7, 1, 1);
    ctx.fillRect(19, 9, 1, 1);
  } else if (ch.throwTimer > 0) {
    ctx.fillRect(10, 6, 8, 3);
    ctx.fillRect(1, 9, 3, 5);
  } else if (ch.state === "laughing") {
    // arms clutched around the belly, shaking with laughter
    ctx.fillRect(1, 10, 5, 4);
    ctx.fillRect(9, 10, 5, 4);
  } else if (ch.state === "grapple") {
    // leading arm stretched taut toward the hook line
    ctx.fillRect(10, 4, 9, 3);
    ctx.fillRect(1, 9, 3, 5);
  } else if (ch.state === "glide") {
    ctx.fillRect(-4, 5 + flap, 7, 3);
    ctx.fillRect(11, 5 - flap, 7, 3);
  } else if (ch.state === "wallslide") {
    ctx.fillRect(-3, 7, 5, 4);
    ctx.fillRect(11, 10, 3, 5);
  } else if (ch.state === "jump") {
    ctx.fillRect(1, 3, 3, 6);
    ctx.fillRect(11, 3, 3, 6);
  } else if (ch.state === "fall") {
    ctx.fillRect(1, 8, 3, 5);
    ctx.fillRect(11, 8, 3, 5);
  } else if (ch.state === "run") {
    const armSwing = Math.round(Math.sin(runPhase + Math.PI) * 4);
    ctx.fillRect(1, 8 + armSwing, 3, 6);
    ctx.fillRect(11, 8 - armSwing, 3, 6);
  } else {
    ctx.fillRect(1, 8, 3, 6);
    ctx.fillRect(11, 8, 3, 6);
  }

  // ---- cowl / head ----
  if (palette.hasEars) {
    ctx.fillStyle = K;
    ctx.fillRect(2, 0, 11, 8);
    // ears
    ctx.beginPath();
    ctx.moveTo(3, 0); ctx.lineTo(4, -5); ctx.lineTo(6, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, 0); ctx.lineTo(11, -5); ctx.lineTo(12, 0);
    ctx.closePath(); ctx.fill();
    // jaw
    ctx.fillStyle = SK;
    ctx.fillRect(4, 5, 7, 3);
    // glowing eyes (a touch bigger/brighter for readability)
    ctx.fillStyle = WH;
    ctx.fillRect(4, 3, 3, 2);
    ctx.fillRect(9, 3, 3, 2);
  } else {
    // Robin: bare face with dark hair and a domino mask instead of a full cowl
    ctx.fillStyle = SK;
    ctx.fillRect(2, 2, 11, 6);
    ctx.fillStyle = "#241a12";
    ctx.fillRect(2, -1, 11, 4);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(2, 3, 11, 2);
    ctx.fillStyle = WH;
    ctx.fillRect(4, 3, 3, 2);
    ctx.fillRect(9, 3, 3, 2);
  }

  if (ch.state === "laughing") {
    // bouncing "HA" marks above the head to sell the stun
    const bounce = Math.sin(ch.animTimer * 10);
    ctx.fillStyle = "#8de84c";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HA", 6, -9 + Math.round(bounce * 2));
    ctx.fillText("HA", 13, -13 - Math.round(bounce * 2));
    ctx.textAlign = "left";
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawDamageFlash() {
  if (damageFlashTimer <= 0) return;
  ctx.fillStyle = `rgba(200,30,30,${(damageFlashTimer / 0.15) * 0.35})`;
  ctx.fillRect(0, 0, W, H);
}

function render() {
  drawBackground();
  drawGround();
  drawGrapplePoints();
  drawWindZones();
  drawEcoCounter();
  drawFreezeStatue();
  drawValve();
  drawBeacon();
  if (gordonVisible) drawGordon();
  drawBatmobile();
  if (intro) drawIntroGoon();
  drawEnemies();
  drawJokerBoss();
  drawBane();
  drawEnemyProjectiles();
  drawShockwaves();
  drawParticles();
  drawProjectiles();
  drawGrappleLine(batman);
  if (robin.active) drawGrappleLine(robin);
  if (!intro || introBatmanRevealed) drawCharacter(batman, BATMAN_PALETTE);
  if (robin.active && (!intro || introRobinRevealed)) drawCharacter(robin, ROBIN_PALETTE);
  drawDamageFlash();
}

// ---------------------------------------------------------------------------
// Networking — serialize the host's state for the guest, or apply a
// received snapshot on the guest side
// ---------------------------------------------------------------------------
function charSnapshot(ch) {
  return {
    x: ch.x, y: ch.y, facing: ch.facing, state: ch.state,
    animTimer: ch.animTimer, flipTimer: ch.flipTimer, landTimer: ch.landTimer,
    throwTimer: ch.throwTimer, punchTimer: ch.punchTimer, invulnTimer: ch.invulnTimer,
    health: ch.health, maxHealth: ch.maxHealth,
    grappling: ch.grappling, grappleTarget: ch.grappleTarget,
  };
}

function enemySnapshot(en) {
  return {
    x: en.x, y: en.y, facing: en.facing, alive: en.alive,
    hp: en.hp, maxHp: en.maxHp, telegraphTimer: en.telegraphTimer,
  };
}

function bossSnapshot(b) {
  return {
    x: b.x, y: b.y, facing: b.facing, alive: b.alive,
    hp: b.hp, maxHp: b.maxHp, mode: b.mode,
  };
}

function serializeState() {
  return {
    cameraX, elapsed, gameWon, gameRunning, beaconActive, ending, endTimer,
    lives, villainsDefeated,
    intro, batmobileX: batmobile.x, introBatmanRevealed, introRobinRevealed,
    introGoon: { x: introGoon.x, y: introGoon.y, rot: introGoon.rot, hit: introGoon.hit, facing: introGoon.facing },
    batman: charSnapshot(batman),
    robin: robin.active ? charSnapshot(robin) : null,
    enemies: enemies.map(enemySnapshot),
    jokerBoss: bossSnapshot(jokerBoss),
    bane: bossSnapshot(bane),
    projectiles: projectiles.map((p) => ({ x: p.x, y: p.y, rot: p.rot, owner: p.owner })),
    enemyProjectiles: enemyProjectiles.map((p) => ({ x: p.x, y: p.y, rot: p.rot, type: p.type })),
    shockwaves: shockwaves.map((sw) => ({ x: sw.x, y: sw.y, dist: sw.dist })),
    particles: particles.map((p) => ({ x: p.x, y: p.y, size: p.size, life: p.life, maxLife: p.maxLife })),
    gordon: { x: gordon.x, y: gordon.y, state: gordon.state, animTimer: gordon.animTimer },
    gordonVisible,
    jokerBossEngaged, bossEngaged,
    iceThawed, valveTurnTimer, ecoIn, ecoOut,
    winStatsText: gameWon
      ? `VILLAINS DEFEATED: ${villainsDefeated}/${enemies.length + 2}   TIME: ${elapsed.toFixed(1)}s`
      : "",
  };
}

function applyState(s) {
  cameraX = s.cameraX;
  elapsed = s.elapsed;
  gameWon = s.gameWon;
  gameRunning = s.gameRunning;
  beaconActive = s.beaconActive;
  ending = s.ending;
  endTimer = s.endTimer;
  lives = s.lives;
  villainsDefeated = s.villainsDefeated;
  intro = s.intro;
  batmobile.x = s.batmobileX;
  introBatmanRevealed = s.introBatmanRevealed;
  introRobinRevealed = s.introRobinRevealed;
  Object.assign(introGoon, s.introGoon);

  Object.assign(batman, s.batman);
  if (s.robin) {
    Object.assign(robin, s.robin);
    robin.active = true;
  } else {
    robin.active = false;
  }

  s.enemies.forEach((es, i) => { if (enemies[i]) Object.assign(enemies[i], es); });
  Object.assign(jokerBoss, s.jokerBoss);
  Object.assign(bane, s.bane);

  projectiles.length = 0;
  s.projectiles.forEach((p) => projectiles.push(p));
  enemyProjectiles.length = 0;
  s.enemyProjectiles.forEach((p) => enemyProjectiles.push(p));
  shockwaves.length = 0;
  s.shockwaves.forEach((sw) => shockwaves.push(sw));
  particles.length = 0;
  s.particles.forEach((p) => particles.push(p));

  Object.assign(gordon, s.gordon);
  gordonVisible = s.gordonVisible;
  jokerBossEngaged = s.jokerBossEngaged;
  bossEngaged = s.bossEngaged;
  iceThawed = s.iceThawed;
  valveTurnTimer = s.valveTurnTimer;
  ecoIn = s.ecoIn;
  ecoOut = s.ecoOut;

  updateHealthUIFor(batman);
  if (robin.active) updateHealthUIFor(robin);
  document.getElementById("villainCount").textContent = villainsDefeated;
  document.getElementById("livesCount").textContent = Math.max(lives, 0);
  document.getElementById("robinHealthBox").classList.toggle("hidden", !robin.active);

  refreshBossBar();

  document.getElementById("titleScreen").classList.toggle("hidden", gameRunning || gameWon || intro);
  document.getElementById("winScreen").classList.toggle("hidden", !gameWon);
  if (gameWon) document.getElementById("winStats").textContent = s.winStatsText;
}

function updateUIForRole(role) {
  const startBtn = document.getElementById("startBtn");
  const controlsBlock = document.getElementById("controlsBlock");
  const coopStatus = document.getElementById("coopStatus");
  const titleTagline = document.getElementById("titleTagline");

  if (role === "guest") {
    startBtn.classList.add("hidden");
    controlsBlock.classList.add("hidden");
    titleTagline.textContent = "You are ROBIN.";
    coopStatus.textContent = "Connected! Waiting for Batman to press start...";
  } else if (role === "host") {
    coopStatus.textContent = NET.guestConnected
      ? "Robin has joined! Press start when ready."
      : `Playing solo. For 2-player co-op, have a second device on this WiFi open: http://${location.host}`;
  } else {
    coopStatus.textContent = "";
  }
}

NET.on("role", updateUIForRole);
NET.on("peerJoin", () => {
  robin.active = true;
  robin.x = batman.x - 15;
  robin.y = batman.y;
  robin.checkpoint = { x: robin.x, y: robin.y };
  robin.health = robin.maxHealth;
  updateHealthUIFor(robin);
  document.getElementById("robinHealthBox").classList.remove("hidden");
  updateUIForRole("host");
});
NET.on("peerLeave", () => {
  robin.active = false;
  document.getElementById("robinHealthBox").classList.add("hidden");
  updateUIForRole("host");
});
NET.on("input", (input) => {
  remoteRobinInput.left = !!input.left;
  remoteRobinInput.right = !!input.right;
  remoteRobinInput.jumpHeld = !!input.jumpHeld;
  if (input.jumpEdge) remoteRobinInput.jumpEdgeQueued = true;
  if (input.throwEdge) remoteRobinInput.throwEdgeQueued = true;
  if (input.punchEdge) remoteRobinInput.punchEdgeQueued = true;
  if (input.grappleEdge) remoteRobinInput.grappleEdgeQueued = true;
  if (input.interactEdge) remoteRobinInput.interactEdgeQueued = true;
});
NET.on("state", (s) => {
  if (NET.role === "guest") applyState(s);
});

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  if (NET.role === "guest") {
    // no local physics — the render below just draws whatever the host last sent
  } else {
    if (intro) {
      updateIntro(dt);
    } else if (gameRunning && !gameWon) {
      update(dt);
    } else if (ending) {
      updateEnding(dt);
    }
    // building the state snapshot allocates a fair bit (maps over every enemy,
    // projectile, particle...) so skip it entirely unless a guest is actually
    // connected to receive it — solo play shouldn't pay that cost every frame
    if (NET.role === "host" && NET.guestConnected) {
      NET.sendState(serializeState());
    }
  }

  render();

  requestAnimationFrame(loop);
}

function winGame() {
  gameRunning = false;
  document.getElementById("winStats").textContent =
    `VILLAINS DEFEATED: ${villainsDefeated}/${enemies.length + 2}   TIME: ${elapsed.toFixed(1)}s`;
  document.getElementById("winScreen").classList.remove("hidden");
}

function resetCharacter(ch, x, y) {
  ch.x = x; ch.y = y; ch.vx = 0; ch.vy = 0;
  ch.state = "idle"; ch.animTimer = 0; ch.facing = 1;
  ch.jumpsUsed = 0; ch.flipTimer = 0; ch.landTimer = 0;
  ch.throwTimer = 0; ch.throwCooldown = 0; ch.wasOnGround = false;
  ch.punchTimer = 0; ch.punchCooldown = 0; ch.punchHits = new Set();
  ch.onWallLeft = false; ch.onWallRight = false; ch.wallJumpLockTimer = 0;
  ch.hitStunTimer = 0; ch.invulnTimer = 0;
  ch.grappling = false; ch.grappleTarget = null; ch.grappleCooldown = 0; ch.grappleBufferTimer = 0;
  ch.stunTimer = 0;
  ch.onIce = false;
  ch.health = ch.maxHealth;
  ch.checkpoint = { x, y };
  updateHealthUIFor(ch);
}

function startGame() {
  document.getElementById("titleScreen").classList.add("hidden");
  document.getElementById("winScreen").classList.add("hidden");
  gameWon = false;
  gameRunning = false;
  beaconActive = false;
  ending = false;
  endTimer = 0;
  gordonVisible = false;
  cameraX = 0;
  intro = true;
  introTimer = 0;
  introParkedTimer = -1;
  introBatmanRevealed = false;
  introRobinRevealed = false;
  batmobile.x = -160;
  introGoon.x = introGoon.startX;
  introGoon.y = introGoon.startY;
  introGoon.facing = -1;
  introGoon.hit = false;
  introGoon.vx = 0;
  introGoon.vy = 0;
  introGoon.rot = 0;
  gordon.x = beaconCameraX - 15;
  gordon.state = "stand";
  gordon.animTimer = 0;
  elapsed = 0;
  villainsDefeated = 0;
  lives = 3;
  document.getElementById("villainCount").textContent = 0;
  document.getElementById("livesCount").textContent = 3;

  for (const en of enemies) {
    en.alive = true;
    en.hp = en.maxHp;
    en.x = en.startX;
    en.dir = en.startDir;
    en.facing = en.startDir;
    en.attackTimer = 1 + Math.random();
    en.telegraphTimer = 0;
    en.pendingAttack = false;
    en.knockbackVx = 0;
    en.knockbackTimer = 0;
  }

  jokerBoss.alive = true;
  jokerBoss.hp = jokerBoss.maxHp;
  jokerBoss.x = jokerBoss.startX;
  jokerBoss.dir = jokerBoss.startDir;
  jokerBoss.facing = jokerBoss.startDir;
  jokerBoss.mode = "patrol";
  jokerBoss.pendingAction = null;
  jokerBoss.telegraphTimer = 0;
  jokerBoss.volleyShotsLeft = 0;
  jokerBoss.volleyTimer = 0;
  jokerBoss.slamTimer = 0;
  jokerBoss.recoverTimer = 0;
  jokerBoss.attackTimer = 1.3 + Math.random();
  jokerBoss.knockbackVx = 0;
  jokerBoss.knockbackTimer = 0;
  jokerBossEngaged = false;

  bane.alive = true;
  bane.hp = bane.maxHp;
  bane.x = bane.startX;
  bane.dir = bane.startDir;
  bane.facing = bane.startDir;
  bane.mode = "patrol";
  bane.pendingAction = null;
  bane.telegraphTimer = 0;
  bane.chargeTimer = 0;
  bane.recoverTimer = 0;
  bane.dustTimer = 0;
  bane.attackTimer = 1.5 + Math.random();
  bane.knockbackVx = 0;
  bane.knockbackTimer = 0;
  bossEngaged = false;

  document.getElementById("bossBar").classList.add("hidden");
  document.getElementById("bossHint").classList.add("hidden");

  particles.length = 0;
  projectiles.length = 0;
  enemyProjectiles.length = 0;
  shockwaves.length = 0;
  damageFlashTimer = 0;
  iceThawed = false;
  valveTurnTimer = 0;
  ecoIn = 0;
  ecoOut = 0;

  resetCharacter(batman, 20, 150);
  if (robin.active) resetCharacter(robin, 5, 150);
}

// background theme — each device plays its own local copy, independent of
// the host/guest simulation; drop a licensed audio file at assets/audio/theme.mp3
// (or .ogg) to enable it, playback fails silently if none is present
const bgMusic = document.getElementById("bgMusic");
bgMusic.volume = 0.5;
const muteBtn = document.getElementById("muteBtn");
let musicMuted = false;
muteBtn.addEventListener("click", () => {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  muteBtn.textContent = musicMuted ? "MUSIC: OFF" : "MUSIC: ON";
});

document.getElementById("startBtn").addEventListener("click", () => {
  bgMusic.muted = musicMuted;
  bgMusic.play().catch(() => {});
  if (NET.role !== "guest") startGame();
});
document.getElementById("winRestartBtn").addEventListener("click", () => {
  if (NET.role !== "guest") startGame();
});

requestAnimationFrame(loop);
