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
const fullTimeOverlay = document.getElementById('fullTimeOverlay');

const worldSize = 1000;
const center = { x: worldSize / 2, y: worldSize / 2 };
const arenaR = 420;
const ballR = 28;
const segments = 120;
const goalAngle = 0;
const goalHalfWidth = 0.22;

const engine = Engine.create({ gravity: { x: 0, y: 0 } });
const runner = Runner.create();
engine.timing.timeScale = 1;

const physics = {
  walls: [],
  teamA: null,
  teamB: null,
  running: false,
  fullTime: false,
  goalLock: false,
  lastImpulse: 0,
  activeResetNonce: null
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
function setTheme(theme) {
  document.body.classList.remove('theme-champions', 'theme-laliga', 'theme-premier');
  document.body.classList.add(`theme-${theme}`);
}
function friendlyDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function renderData() {
  setTheme(settings.theme);
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
}

function buildArenaBoundary() {
  if (physics.walls.length) Composite.remove(engine.world, physics.walls);
  physics.walls = [];
  const thickness = 14;
  const segLen = (2 * Math.PI * arenaR) / segments;
  for (let i = 0; i < segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const delta = Math.abs(Math.atan2(Math.sin(theta - goalAngle), Math.cos(theta - goalAngle)));
    if (delta <= goalHalfWidth) continue;
    const x = center.x + Math.cos(theta) * arenaR;
    const y = center.y + Math.sin(theta) * arenaR;
    physics.walls.push(Bodies.rectangle(x, y, segLen + 4, thickness, {
      isStatic: true,
      angle: theta + Math.PI / 2,
      render: { visible: false }
    }));
  }
  Composite.add(engine.world, physics.walls);
}
function spawnBalls() {
  if (physics.teamA) Composite.remove(engine.world, [physics.teamA, physics.teamB]);
  physics.teamA = Bodies.circle(center.x - 52, center.y, ballR, {
    restitution: 0.92, frictionAir: 0.0028, friction: 0.003, label: 'A'
  });
  physics.teamB = Bodies.circle(center.x + 52, center.y, ballR, {
    restitution: 0.92, frictionAir: 0.0028, friction: 0.003, label: 'B'
  });
  Composite.add(engine.world, [physics.teamA, physics.teamB]);
  kickOff();
}
function kickOff() {
  [physics.teamA, physics.teamB].forEach((ball) => {
    const a = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 5;
    Body.setPosition(ball, { x: ball === physics.teamA ? center.x - 50 : center.x + 50, y: center.y + (Math.random() * 20 - 10) });
    Body.setVelocity(ball, { x: Math.cos(a) * speed, y: Math.sin(a) * speed });
    Body.setAngularVelocity(ball, 0);
  });
}
function keepInsideHard(ball) {
  const fromCenter = Vector.sub(ball.position, center);
  const dist = Vector.magnitude(fromCenter);
  if (dist > arenaR + ballR + 16) {
    const n = Vector.normalise(fromCenter);
    Body.setPosition(ball, Vector.add(center, Vector.mult(n, arenaR - ballR - 12)));
    Body.setVelocity(ball, Vector.mult(n, -8));
  }
}
function inGoalMouth(ball) {
  const p = Vector.sub(ball.position, center);
  const dist = Vector.magnitude(p);
  const theta = Math.atan2(p.y, p.x);
  const angDist = Math.abs(Math.atan2(Math.sin(theta - goalAngle), Math.cos(theta - goalAngle)));
  return angDist <= goalHalfWidth && dist >= arenaR - ballR * 0.7;
}
function playGoalSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioCtx.currentTime;
  const notes = [180, 240, 320, 260];
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 ? 'triangle' : 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.17, now + i * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.16);
  });
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
  playGoalSound();
  setTimeout(() => goalOverlay.classList.remove('show'), 1000);
  setTimeout(() => {
    kickOff();
    physics.goalLock = false;
  }, 800);
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
function finishMatch() {
  physics.fullTime = true;
  physics.running = false;
  Runner.stop(runner);
  fullTimeOverlay.classList.add('show');
  matchState.status = 'finished';
  saveMatchState();
}
function maybeRun() {
  settings = loadSettings();
  matchState = loadMatchState();
  if (physics.activeResetNonce !== matchState.resetNonce) {
    settings.score = settings.score || { a: 0, b: 0 };
    renderData();
    spawnBalls();
    physics.fullTime = false;
    fullTimeOverlay.classList.remove('show');
    physics.activeResetNonce = matchState.resetNonce;
  }
  if (matchState.status === 'running' && !physics.fullTime) {
    physics.running = true;
    Runner.run(runner, engine);
  }
}
function drawNet() {
  ctx.save();
  ctx.translate(center.x, center.y);
  const mouthDepth = 90;
  const xFront = Math.cos(goalAngle) * arenaR;
  const yFront = Math.sin(goalAngle) * arenaR;
  const xBack = Math.cos(goalAngle) * (arenaR + mouthDepth);
  const yBack = Math.sin(goalAngle) * (arenaR + mouthDepth);
  const width = goalHalfWidth * arenaR;
  ctx.strokeStyle = 'rgba(230,247,255,0.65)';
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i += 1) {
    const off = (i / 4) * width;
    const nx = Math.cos(goalAngle + Math.PI / 2) * off;
    const ny = Math.sin(goalAngle + Math.PI / 2) * off;
    ctx.beginPath();
    ctx.moveTo(xFront + nx, yFront + ny);
    ctx.lineTo(xBack + nx, yBack + ny);
    ctx.stroke();
  }
  for (let i = 1; i <= 6; i += 1) {
    const t = i / 6;
    const fx = xFront + (xBack - xFront) * t;
    const fy = yFront + (yBack - yFront) * t;
    const nx = Math.cos(goalAngle + Math.PI / 2) * width;
    const ny = Math.sin(goalAngle + Math.PI / 2) * width;
    ctx.beginPath();
    ctx.moveTo(fx - nx, fy - ny);
    ctx.lineTo(fx + nx, fy + ny);
    ctx.stroke();
  }
  ctx.restore();
}
function drawScene() {
  ctx.clearRect(0, 0, worldSize, worldSize);
  ctx.save();
  ctx.strokeStyle = 'rgba(246, 253, 255, 0.96)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(center.x, center.y, arenaR, goalHalfWidth, Math.PI * 2 - goalHalfWidth);
  ctx.stroke();
  drawNet();
  const drawBall = (ball, color) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(ball.position.x, ball.position.y, ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };
  drawBall(physics.teamA, '#39e0ff');
  drawBall(physics.teamB, '#ff7e5e');
  ctx.restore();
}

Events.on(engine, 'beforeUpdate', () => {
  keepInsideHard(physics.teamA);
  keepInsideHard(physics.teamB);
  const now = Date.now();
  if (now - physics.lastImpulse > 420) {
    physics.lastImpulse = now;
    [physics.teamA, physics.teamB].forEach((ball) => {
      const force = 0.018 + Math.random() * 0.02;
      const ang = Math.random() * Math.PI * 2;
      Body.applyForce(ball, ball.position, { x: Math.cos(ang) * force, y: Math.sin(ang) * force });
    });
  }
  if (inGoalMouth(physics.teamA)) onGoal('B');
  if (inGoalMouth(physics.teamB)) onGoal('A');
});

function loop() {
  updateClock();
  drawScene();
  maybeRun();
  requestAnimationFrame(loop);
}

buildArenaBoundary();
spawnBalls();
renderData();
maybeRun();
loop();
window.addEventListener('storage', maybeRun);
