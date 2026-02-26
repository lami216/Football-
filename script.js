const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Body,
  Events,
  Composite,
  Vector
} = Matter;

// ---- DOM refs ----
const teamAInput = document.getElementById('teamAInput');
const teamBInput = document.getElementById('teamBInput');
const durationInput = document.getElementById('durationInput');
const themeSelect = document.getElementById('themeSelect');
const startBtn = document.getElementById('startBtn');
const teamANameEl = document.getElementById('teamAName');
const teamBNameEl = document.getElementById('teamBName');
const teamAScoreEl = document.getElementById('teamAScore');
const teamBScoreEl = document.getElementById('teamBScore');
const timerEl = document.getElementById('timer');
const winnerBanner = document.getElementById('winnerBanner');
const canvas = document.getElementById('arenaCanvas');

// ---- Match/arena setup ----
const ARENA_SIZE = 700;
const CENTER = { x: ARENA_SIZE / 2, y: ARENA_SIZE / 2 };
const ARENA_RADIUS = 300;
const BALL_RADIUS = 18;
const WALL_SEGMENTS = 72;
const GAP_SEGMENTS = 4;

const engine = Engine.create();
engine.gravity.y = 0;
const world = engine.world;

const render = Render.create({
  canvas,
  engine,
  options: {
    width: ARENA_SIZE,
    height: ARENA_SIZE,
    wireframes: false,
    background: 'transparent',
    pixelRatio: window.devicePixelRatio || 1
  }
});

let runner = null;
let walls = [];
let gapCenterSegment = 0;
let matchRunning = false;
let matchTime = 30;
let scoreA = 0;
let scoreB = 0;
let timerInterval = null;
let goalLock = false;

// ---- Entities ----
const teamABall = Bodies.circle(CENTER.x - 35, CENTER.y, BALL_RADIUS, {
  label: 'teamA',
  friction: 0.01,
  frictionAir: 0.003,
  restitution: 0.55,
  render: { fillStyle: '#2f8dff' }
});

const teamBBall = Bodies.circle(CENTER.x + 35, CENTER.y, BALL_RADIUS, {
  label: 'teamB',
  friction: 0.01,
  frictionAir: 0.003,
  restitution: 0.55,
  render: { fillStyle: '#ff6b4a' }
});

World.add(world, [teamABall, teamBBall]);

function createWalls() {
  Composite.remove(world, walls);
  walls = [];

  const segLength = (2 * Math.PI * ARENA_RADIUS) / WALL_SEGMENTS;
  const thickness = 14;

  for (let i = 0; i < WALL_SEGMENTS; i += 1) {
    const angle = (i / WALL_SEGMENTS) * Math.PI * 2;
    const x = CENTER.x + Math.cos(angle) * ARENA_RADIUS;
    const y = CENTER.y + Math.sin(angle) * ARENA_RADIUS;

    const wall = Bodies.rectangle(x, y, segLength + 4, thickness, {
      isStatic: true,
      angle: angle + Math.PI / 2,
      render: { fillStyle: '#f5f7ff' }
    });

    walls.push(wall);
  }

  World.add(world, walls);
}

function updateRotatingGoal() {
  gapCenterSegment = (gapCenterSegment + 0.06) % WALL_SEGMENTS;

  for (let i = 0; i < WALL_SEGMENTS; i += 1) {
    const distance = Math.min(
      Math.abs(i - gapCenterSegment),
      WALL_SEGMENTS - Math.abs(i - gapCenterSegment)
    );

    const isGap = distance <= GAP_SEGMENTS / 2;
    const wall = walls[i];

    wall.collisionFilter.mask = isGap ? 0 : 0xffffffff;
    wall.render.opacity = isGap ? 0 : 1;
  }
}

function applyRandomVelocity(body) {
  const speed = 3 + Math.random() * 2;
  const angle = Math.random() * Math.PI * 2;
  Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
}

function resetBalls() {
  Body.setPosition(teamABall, { x: CENTER.x - 35, y: CENTER.y });
  Body.setPosition(teamBBall, { x: CENTER.x + 35, y: CENTER.y });
  Body.setAngularVelocity(teamABall, 0);
  Body.setAngularVelocity(teamBBall, 0);
  applyRandomVelocity(teamABall);
  applyRandomVelocity(teamBBall);
}

function keepBallVisible(ball) {
  const toBall = Vector.sub(ball.position, CENTER);
  const distance = Vector.magnitude(toBall);
  const maxDistance = ARENA_RADIUS + 25;

  if (distance > maxDistance) {
    const normalized = Vector.normalise(toBall);
    const safePos = Vector.add(CENTER, Vector.mult(normalized, ARENA_RADIUS - BALL_RADIUS - 8));
    Body.setPosition(ball, safePos);
    Body.setVelocity(ball, Vector.mult(normalized, -2.2));
  }
}

function isInGoalArc(ball) {
  const dx = ball.position.x - CENTER.x;
  const dy = ball.position.y - CENTER.y;
  const angle = Math.atan2(dy, dx);
  const wrappedBallSeg = ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * WALL_SEGMENTS;
  const distanceToGap = Math.min(
    Math.abs(wrappedBallSeg - gapCenterSegment),
    WALL_SEGMENTS - Math.abs(wrappedBallSeg - gapCenterSegment)
  );
  const radialDistance = Math.sqrt(dx * dx + dy * dy);

  return distanceToGap <= GAP_SEGMENTS / 2 && radialDistance >= ARENA_RADIUS - BALL_RADIUS * 0.8;
}

function scoreGoal(team) {
  if (!matchRunning || goalLock) {
    return;
  }

  goalLock = true;
  if (team === 'teamA') {
    scoreA += 1;
    teamAScoreEl.textContent = scoreA;
  } else {
    scoreB += 1;
    teamBScoreEl.textContent = scoreB;
  }

  resetBalls();
  setTimeout(() => {
    goalLock = false;
  }, 300);
}

function setTheme(themeName) {
  document.body.style.background = `url('assets/themes/${themeName}.jpg') center/cover no-repeat fixed`;
}

function endMatch() {
  matchRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;

  if (runner) {
    Runner.stop(runner);
  }

  let winnerText = 'Draw';
  if (scoreA > scoreB) {
    winnerText = `${teamANameEl.textContent} Wins!`;
  } else if (scoreB > scoreA) {
    winnerText = `${teamBNameEl.textContent} Wins!`;
  }

  winnerBanner.textContent = winnerText;
  winnerBanner.classList.remove('hidden');
}

function startMatch() {
  const nameA = teamAInput.value.trim() || 'Team A';
  const nameB = teamBInput.value.trim() || 'Team B';
  const duration = Math.max(15, Math.min(60, Number(durationInput.value) || 30));

  teamANameEl.textContent = nameA;
  teamBNameEl.textContent = nameB;
  durationInput.value = duration;

  scoreA = 0;
  scoreB = 0;
  teamAScoreEl.textContent = '0';
  teamBScoreEl.textContent = '0';

  matchTime = duration;
  timerEl.textContent = String(matchTime);
  winnerBanner.classList.add('hidden');

  setTheme(themeSelect.value);
  resetBalls();

  if (runner) {
    Runner.stop(runner);
  }

  runner = Runner.create();
  Runner.run(runner, engine);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!matchRunning) {
      return;
    }

    matchTime -= 1;
    timerEl.textContent = String(Math.max(matchTime, 0));

    if (matchTime <= 0) {
      endMatch();
    }
  }, 1000);

  matchRunning = true;
}

// ---- Engine events ----
Events.on(engine, 'beforeUpdate', () => {
  updateRotatingGoal();
  keepBallVisible(teamABall);
  keepBallVisible(teamBBall);

  if (!matchRunning) {
    return;
  }

  if (isInGoalArc(teamABall)) {
    scoreGoal('teamA');
  } else if (isInGoalArc(teamBBall)) {
    scoreGoal('teamB');
  }
});

// ---- UI events ----
startBtn.addEventListener('click', startMatch);
themeSelect.addEventListener('change', () => setTheme(themeSelect.value));

createWalls();
Render.run(render);
setTheme(themeSelect.value);
