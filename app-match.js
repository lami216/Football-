const STORAGE_KEY = 'footballBroadcastSettings';
const STATE_KEY = 'footballBroadcastMatchState';
const { Engine, Runner, Bodies, Composite, Body, Events, Vector } = Matter;

const defaults = {
  teamA: { name: 'Team A', logo: '' },
  teamB: { name: 'Team B', logo: '' },
  durationSec: 30,
  theme: 'champions',
  schedule: { date: '', time: 'Time TBD' },
  score: { a: 0, b: 0 }
};

const canvas = document.getElementById('arenaCanvas');
const ctx = canvas.getContext('2d');
const nameA = document.getElementById('nameA');
const nameB = document.getElementById('nameB');
const logoA = document.getElementById('logoA');
const logoB = document.getElementById('logoB');
const scoreAEl = document.getElementById('scoreA');
const scoreBEl = document.getElementById('scoreB');
const clockEl = document.getElementById('clock');
const scheduleNameA = document.getElementById('scheduleNameA');
const scheduleNameB = document.getElementById('scheduleNameB');
const scheduleLogoA = document.getElementById('scheduleLogoA');
const scheduleLogoB = document.getElementById('scheduleLogoB');
const scheduleMeta = document.getElementById('scheduleMeta');
const goalOverlay = document.getElementById('goalOverlay');
const countdownOverlay = document.getElementById('countdownOverlay');
const fullTimeOverlay = document.getElementById('fullTimeOverlay');
const startMatchBtn = document.getElementById('startMatchBtn');
const resetMatchBtn = document.getElementById('resetMatchBtn');

const worldSize = 1000;
const center = { x: worldSize / 2, y: worldSize / 2 };
const arenaR = 420;
let ballR = 0;
const baseSpeed = 6.4;
const segments = 140;
const gapSize = 0.44;
const goalRotationSpeed = 0.00033;

const engine = Engine.create();
engine.world.gravity.y = 0;
const runner = Runner.create();

const physics = {
  walls: [],
  teamA: null,
  teamB: null,
  running: false,
  fullTime: false,
  goalLock: false,
  goalAngle: 0,
  lastGoalAngleUpdate: performance.now(),
  activeResetNonce: null,
  runnerStarted: false
};

const logoCache = { A: null, B: null };
const audio = {
  ctx: null,
  unlocked: false
};

let settings = loadSettings();
let matchState = loadMatchState();

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
function saveSettings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
function loadMatchState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) || { status: 'ready', startedAt: null, resetNonce: Date.now() };
  } catch {
    return { status: 'ready', startedAt: null, resetNonce: Date.now() };
  }
}
function saveMatchState() { localStorage.setItem(STATE_KEY, JSON.stringify(matchState)); }

function ensureAudio() {
  if (!audio.ctx) audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (!audio.unlocked) {
    const src = audio.ctx.createBufferSource();
    const gain = audio.ctx.createGain();
    gain.gain.value = 0;
    src.connect(gain).connect(audio.ctx.destination);
    src.start();
    audio.unlocked = true;
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
  return audio.ctx;
}

function whistle(type) {
  const audioCtx = ensureAudio();
  const now = audioCtx.currentTime;
  const duration = type === 'final' ? 0.62 : 0.32;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(type === 'final' ? 1680 : 1880, now);
  osc.frequency.exponentialRampToValueAtTime(type === 'final' ? 1460 : 1620, now + duration);

  lfo.type = 'sine';
  lfo.frequency.value = type === 'final' ? 16 : 22;
  lfoGain.gain.value = type === 'final' ? 75 : 60;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gain).connect(audioCtx.destination);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + duration + 0.03);
  lfo.stop(now + duration + 0.03);
}

function playCollisionTick(intensity = 1) {
  const audioCtx = ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 420 + Math.random() * 180;
  const vol = Math.min(0.09, 0.035 + intensity * 0.025);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

function playGoalCheer() {
  const audioCtx = ensureAudio();
  const now = audioCtx.currentTime;
  [260, 320, 390, 470].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 ? 'sawtooth' : 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.06 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.22);
  });
}

function setTheme(theme) {
  document.body.classList.remove('theme-champions', 'theme-laliga', 'theme-premier');
  document.body.classList.add(`theme-${theme}`);
}
function friendlyDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function updateControlButtons() {
  const showStart = matchState.status === 'ready';
  const showReset = matchState.status === 'finished';
  startMatchBtn.classList.toggle('hidden', !showStart);
  resetMatchBtn.classList.toggle('hidden', !showReset);
}

function setupLogoCache() {
  logoCache.A = settings.teamA.logo ? new Image() : null;
  logoCache.B = settings.teamB.logo ? new Image() : null;
  if (logoCache.A) logoCache.A.src = settings.teamA.logo;
  if (logoCache.B) logoCache.B.src = settings.teamB.logo;
}

function renderData() {
  setTheme(settings.theme);
  setupLogoCache();
  nameA.textContent = settings.teamA.name;
  nameB.textContent = settings.teamB.name;
  logoA.src = settings.teamA.logo || '';
  logoB.src = settings.teamB.logo || '';
  scheduleNameA.textContent = settings.teamA.name;
  scheduleNameB.textContent = settings.teamB.name;
  scheduleLogoA.src = settings.teamA.logo || '';
  scheduleLogoB.src = settings.teamB.logo || '';
  scheduleMeta.innerHTML = `${friendlyDate(settings.schedule.date)}<br>${settings.schedule.time || 'Time TBD'}`;
  scoreAEl.textContent = String(settings.score?.a || 0);
  scoreBEl.textContent = String(settings.score?.b || 0);
  updateControlButtons();
}

function buildArenaBoundary() {
  if (physics.walls.length) Composite.remove(engine.world, physics.walls);
  physics.walls = [];
  const thickness = 22;
  const segLen = (2 * Math.PI * arenaR) / segments;
  for (let i = 0; i < segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const delta = Math.abs(Math.atan2(Math.sin(theta - physics.goalAngle), Math.cos(theta - physics.goalAngle)));
    if (delta <= gapSize / 2) continue;
    const x = center.x + Math.cos(theta) * arenaR;
    const y = center.y + Math.sin(theta) * arenaR;
    physics.walls.push(Bodies.rectangle(x, y, segLen + 6, thickness, {
      isStatic: true,
      angle: theta + Math.PI / 2,
      restitution: 1,
      label: 'wall',
      render: { visible: false }
    }));
  }
  Composite.add(engine.world, physics.walls);
}

function createBall(x, label) {
  return Bodies.circle(x, center.y, ballR, {
    restitution: 0.95,
    frictionAir: 0,
    friction: 0,
    frictionStatic: 0,
    slop: 0.02,
    label
  });
}

function spawnBalls() {
  if (physics.teamA) Composite.remove(engine.world, [physics.teamA, physics.teamB]);
  physics.teamA = createBall(center.x - 56, 'A');
  physics.teamB = createBall(center.x + 56, 'B');
  Composite.add(engine.world, [physics.teamA, physics.teamB]);
  placeBallsAtCenter();
}

function placeBallsAtCenter() {
  [physics.teamA, physics.teamB].forEach((ball, index) => {
    const dir = index === 0 ? -1 : 1;
    Body.setPosition(ball, {
      x: center.x + dir * 60,
      y: center.y + (Math.random() * 24 - 12)
    });
    Body.setVelocity(ball, { x: 0, y: 0 });
    Body.setAngularVelocity(ball, 0);
  });
}

function normaliseOrFallback(vector, fallback = { x: 1, y: 0 }) {
  const magnitude = Vector.magnitude(vector);
  if (magnitude < 0.0001) return fallback;
  return Vector.mult(vector, 1 / magnitude);
}

function enforceBallSpeed(ball) {
  const fallbackDirection = ball.plugin?.lastDirection || { x: 1, y: 0 };
  const direction = normaliseOrFallback(ball.velocity, fallbackDirection);
  ball.plugin = ball.plugin || {};
  ball.plugin.lastDirection = direction;
  Body.setVelocity(ball, Vector.mult(direction, baseSpeed));
}

function redirectBallToCenter(ball) {
  const directionToCenter = normaliseOrFallback(Vector.sub(center, ball.position));
  ball.plugin = ball.plugin || {};
  ball.plugin.lastDirection = directionToCenter;
  Body.setVelocity(ball, Vector.mult(directionToCenter, baseSpeed));
}

function reflectVelocity(velocity, normal) {
  const n = normaliseOrFallback(normal);
  return Vector.sub(velocity, Vector.mult(n, 2 * Vector.dot(velocity, n)));
}

function kickOff() {
  [physics.teamA, physics.teamB].forEach((ball) => {
    const angle = Math.random() * Math.PI * 2;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    ball.plugin = ball.plugin || {};
    ball.plugin.lastDirection = direction;
    Body.setVelocity(ball, Vector.mult(direction, baseSpeed));
  });
}

function keepInsideHard(ball) {
  const fromCenter = Vector.sub(ball.position, center);
  const dist = Vector.magnitude(fromCenter);
  const theta = Math.atan2(fromCenter.y, fromCenter.x);
  const angularDistance = Math.abs(Math.atan2(Math.sin(theta - physics.goalAngle), Math.cos(theta - physics.goalAngle)));
  if (angularDistance <= gapSize / 2) {
    enforceBallSpeed(ball);
    return;
  }

  const maxDist = arenaR - ballR - 4;
  if (dist > maxDist) {
    const n = normaliseOrFallback(fromCenter);
    Body.setPosition(ball, Vector.add(center, Vector.mult(n, maxDist)));
    redirectBallToCenter(ball);
  }
  enforceBallSpeed(ball);
}

function inGoalMouth(ball) {
  const p = Vector.sub(ball.position, center);
  const dist = Vector.magnitude(p);
  const theta = Math.atan2(p.y, p.x);
  const angDist = Math.abs(Math.atan2(Math.sin(theta - physics.goalAngle), Math.cos(theta - physics.goalAngle)));
  return angDist <= gapSize / 2 && dist >= arenaR - ballR * 0.7;
}

function onGoal(scoringTeam) {
  if (physics.goalLock || physics.fullTime || !physics.running) return;
  physics.goalLock = true;
  if (scoringTeam === 'A') settings.score.a += 1;
  else settings.score.b += 1;
  saveSettings();
  scoreAEl.textContent = settings.score.a;
  scoreBEl.textContent = settings.score.b;
  goalOverlay.classList.add('show');
  playGoalCheer();

  placeBallsAtCenter();
  kickOff();
  setTimeout(() => {
    goalOverlay.classList.remove('show');
    physics.goalLock = false;
  }, 280);
}

function updateClock() {
  if (!matchState.startedAt) {
    clockEl.textContent = '00:00';
    return;
  }
  const elapsedSec = Math.max(0, (Date.now() - matchState.startedAt) / 1000);
  const pct = Math.min(1, elapsedSec / settings.durationSec);
  const broadcastSeconds = Math.round(5400 * pct);
  const mm = String(Math.floor(broadcastSeconds / 60)).padStart(2, '0');
  const ss = String(broadcastSeconds % 60).padStart(2, '0');
  clockEl.textContent = `${mm}:${ss}`;

  if (elapsedSec >= settings.durationSec && !physics.fullTime) finishMatch();
}

function showCountdownAndStart() {
  let count = 3;
  countdownOverlay.textContent = String(count);
  countdownOverlay.classList.add('show');

  const step = () => {
    count -= 1;
    if (count > 0) {
      countdownOverlay.textContent = String(count);
      setTimeout(step, 1000);
      return;
    }
    countdownOverlay.classList.remove('show');
    matchState.status = 'running';
    matchState.startedAt = Date.now();
    saveMatchState();
    physics.running = true;
    whistle('start');
    kickOff();
  };

  setTimeout(step, 1000);
}

function finishMatch() {
  physics.fullTime = true;
  physics.running = false;
  fullTimeOverlay.classList.add('show');
  whistle('final');
  matchState.status = 'finished';
  saveMatchState();
  updateControlButtons();
}

function resetMatch() {
  settings.score = { a: 0, b: 0 };
  saveSettings();
  scoreAEl.textContent = '0';
  scoreBEl.textContent = '0';

  fullTimeOverlay.classList.remove('show');
  countdownOverlay.classList.remove('show');
  goalOverlay.classList.remove('show');

  matchState = {
    status: 'ready',
    startedAt: null,
    resetNonce: Date.now()
  };
  saveMatchState();

  physics.fullTime = false;
  physics.running = false;
  physics.goalLock = false;
  placeBallsAtCenter();
  clockEl.textContent = '00:00';
  updateControlButtons();
}

function maybeRun() {
  settings = loadSettings();
  matchState = loadMatchState();

  if (physics.activeResetNonce !== matchState.resetNonce) {
    settings.score = settings.score || { a: 0, b: 0 };
    renderData();
    syncBallSizeToScoreboardLogo();
    spawnBalls();
    physics.fullTime = false;
    physics.goalLock = false;
    physics.running = false;
    fullTimeOverlay.classList.remove('show');
    countdownOverlay.classList.remove('show');
    physics.activeResetNonce = matchState.resetNonce;
  } else {
    renderData();
  }

  if (matchState.status === 'running' && !physics.fullTime) {
    physics.running = true;
  }
  if (matchState.status === 'finished') {
    physics.fullTime = true;
    physics.running = false;
    fullTimeOverlay.classList.add('show');
  }
}

function separateOverlappingBalls() {
  const overlapCheckRadius = ballR * 2.03;
  const delta = Vector.sub(physics.teamB.position, physics.teamA.position);
  const dist = Vector.magnitude(delta);
  if (dist > overlapCheckRadius || dist === 0) return;
  const normal = Vector.normalise(delta);
  const separation = overlapCheckRadius - dist;
  const push = Math.min(10, separation * 0.45 + 2.2);
  Body.translate(physics.teamA, Vector.mult(normal, -push * 0.5));
  Body.translate(physics.teamB, Vector.mult(normal, push * 0.5));
}

function updateGoalRotation() {
  const now = performance.now();
  const dt = Math.min(50, now - physics.lastGoalAngleUpdate);
  physics.lastGoalAngleUpdate = now;
  physics.goalAngle = (physics.goalAngle + dt * goalRotationSpeed) % (Math.PI * 2);
  buildArenaBoundary();
}

function drawNet() {
  ctx.save();
  ctx.translate(center.x, center.y);
  const mouthDepth = 90;
  const xFront = Math.cos(physics.goalAngle) * arenaR;
  const yFront = Math.sin(physics.goalAngle) * arenaR;
  const xBack = Math.cos(physics.goalAngle) * (arenaR + mouthDepth);
  const yBack = Math.sin(physics.goalAngle) * (arenaR + mouthDepth);
  const width = (gapSize / 2) * arenaR;
  ctx.strokeStyle = 'rgba(230,247,255,0.65)';
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i += 1) {
    const off = (i / 4) * width;
    const nx = Math.cos(physics.goalAngle + Math.PI / 2) * off;
    const ny = Math.sin(physics.goalAngle + Math.PI / 2) * off;
    ctx.beginPath();
    ctx.moveTo(xFront + nx, yFront + ny);
    ctx.lineTo(xBack + nx, yBack + ny);
    ctx.stroke();
  }
  for (let i = 1; i <= 6; i += 1) {
    const t = i / 6;
    const fx = xFront + (xBack - xFront) * t;
    const fy = yFront + (yBack - yFront) * t;
    const nx = Math.cos(physics.goalAngle + Math.PI / 2) * width;
    const ny = Math.sin(physics.goalAngle + Math.PI / 2) * width;
    ctx.beginPath();
    ctx.moveTo(fx - nx, fy - ny);
    ctx.lineTo(fx + nx, fy + ny);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ball, color, logoImg) {
  ctx.save();
  ctx.translate(ball.position.x, ball.position.y);
  ctx.rotate(ball.angle);

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(0, 0, ballR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const clipRadius = ballR;
    const imageDiameter = clipRadius * 2;
    const minSide = Math.min(logoImg.naturalWidth, logoImg.naturalHeight);
    const sourceX = (logoImg.naturalWidth - minSide) / 2;
    const sourceY = (logoImg.naturalHeight - minSide) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, clipRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      logoImg,
      sourceX,
      sourceY,
      minSide,
      minSide,
      -imageDiameter / 2,
      -imageDiameter / 2,
      imageDiameter,
      imageDiameter
    );
    ctx.restore();
  }

  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, worldSize, worldSize);
  ctx.save();
  ctx.strokeStyle = 'rgba(246, 253, 255, 0.96)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center.x, center.y, arenaR, physics.goalAngle + gapSize / 2, physics.goalAngle + Math.PI * 2 - gapSize / 2);
  ctx.stroke();
  drawNet();

  drawBall(physics.teamA, '#39e0ff', logoCache.A);
  drawBall(physics.teamB, '#ff7e5e', logoCache.B);
  ctx.restore();
}

Events.on(engine, 'collisionStart', (event) => {
  event.pairs.forEach((pair) => {
    const labels = [pair.bodyA.label, pair.bodyB.label];
    if (labels.includes('A') && labels.includes('B')) {
      const speed = pair.collision?.depth ? Math.min(1.6, pair.collision.depth * 0.2) : 1;
      playCollisionTick(speed);

      const bodyA = pair.bodyA.label === 'A' ? pair.bodyA : pair.bodyB;
      const bodyB = pair.bodyA.label === 'B' ? pair.bodyA : pair.bodyB;
      const normal = normaliseOrFallback(Vector.sub(bodyB.position, bodyA.position));

      Body.setVelocity(bodyA, reflectVelocity(bodyA.velocity, normal));
      Body.setVelocity(bodyB, reflectVelocity(bodyB.velocity, Vector.mult(normal, -1)));
      enforceBallSpeed(bodyA);
      enforceBallSpeed(bodyB);
    }

    const ball = pair.bodyA.label === 'A' || pair.bodyA.label === 'B' ? pair.bodyA : (pair.bodyB.label === 'A' || pair.bodyB.label === 'B' ? pair.bodyB : null);
    const hitWall = pair.bodyA.label === 'wall' || pair.bodyB.label === 'wall';
    if (ball && hitWall) {
      redirectBallToCenter(ball);
    }
  });
});

function syncBallSizeToScoreboardLogo() {
  const rect = logoA.getBoundingClientRect();
  const scoreboardLogoDiameter = rect.width;
  ballR = scoreboardLogoDiameter / 2;
}

function refreshBallSizing() {
  syncBallSizeToScoreboardLogo();
  spawnBalls();
}

Events.on(engine, 'beforeUpdate', () => {
  if (!physics.teamA || !physics.teamB) return;

  updateGoalRotation();

  if (!physics.running || physics.fullTime) {
    Body.setVelocity(physics.teamA, { x: 0, y: 0 });
    Body.setVelocity(physics.teamB, { x: 0, y: 0 });
    return;
  }

  keepInsideHard(physics.teamA);
  keepInsideHard(physics.teamB);

  [physics.teamA, physics.teamB].forEach((ball) => {
    enforceBallSpeed(ball);
  });

  separateOverlappingBalls();

  if (inGoalMouth(physics.teamA)) onGoal('B');
  if (inGoalMouth(physics.teamB)) onGoal('A');
});

function loop() {
  updateClock();
  drawScene();
  maybeRun();
  requestAnimationFrame(loop);
}

startMatchBtn.addEventListener('click', () => {
  ensureAudio();
  startMatchBtn.classList.add('hidden');
  resetMatchBtn.classList.add('hidden');
  fullTimeOverlay.classList.remove('show');
  physics.fullTime = false;
  physics.running = false;
  placeBallsAtCenter();
  showCountdownAndStart();
});

resetMatchBtn.addEventListener('click', () => {
  ensureAudio();
  resetMatch();
});

buildArenaBoundary();
renderData();
refreshBallSizing();
if (!physics.runnerStarted) {
  Runner.run(runner, engine);
  physics.runnerStarted = true;
}
maybeRun();
loop();
window.addEventListener('storage', maybeRun);
window.addEventListener('resize', refreshBallSizing);
