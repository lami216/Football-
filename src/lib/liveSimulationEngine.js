import { clamp, uid } from './helpers';

const FIELD = {
  width: 900,
  height: 530,
  margin: 24,
  goalTop: 210,
  goalBottom: 320,
  goalDepth: 10
};

const PHYSICS = {
  tokenMaxSpeed: 278,
  tokenDrag: 0.92,
  tokenBounce: 0.76,
  ballDrag: 0.992,
  ballBounce: 0.9,
  ballGoalBounce: 0.72,
  tackleRange: 34,
  controlRange: 36
};

const playerPool = {
  generic: {
    goalkeeper: ['Goalkeeper'],
    defenders: ['Defender A', 'Defender B'],
    midfielders: ['Midfielder A', 'Midfielder B'],
    attackers: ['Forward A', 'Forward B']
  },
  barcelona: {
    goalkeeper: ['Ter Stegen'],
    defenders: ['Kounde', 'Araujo', 'Cubarsi', 'Balde'],
    midfielders: ['Pedri', 'Gavi', 'De Jong', 'Gundogan'],
    attackers: ['Lewandowski', 'Lamine Yamal', 'Raphinha', 'Ferran Torres']
  },
  'real-madrid': {
    goalkeeper: ['Courtois'],
    defenders: ['Carvajal', 'Rudiger', 'Militao', 'Mendy'],
    midfielders: ['Bellingham', 'Valverde', 'Tchouameni', 'Camavinga'],
    attackers: ['Vinicius Jr', 'Rodrygo', 'Mbappe', 'Brahim Diaz']
  },
  'atletico-madrid': {
    goalkeeper: ['Oblak'],
    defenders: ['Gimenez', 'Savic', 'Azpilicueta', 'Reinildo'],
    midfielders: ['Koke', 'De Paul', 'Llorente', 'Barrios'],
    attackers: ['Griezmann', 'Morata', 'Correa', 'Memphis']
  },
  'manchester-city': {
    goalkeeper: ['Ederson'],
    defenders: ['Walker', 'Dias', 'Akanji', 'Gvardiol'],
    midfielders: ['De Bruyne', 'Rodri', 'Silva', 'Foden'],
    attackers: ['Haaland', 'Alvarez', 'Doku', 'Grealish']
  },
  liverpool: {
    goalkeeper: ['Alisson'],
    defenders: ['Van Dijk', 'Konate', 'Robertson', 'Alexander-Arnold'],
    midfielders: ['Szoboszlai', 'Mac Allister', 'Gravenberch', 'Endo'],
    attackers: ['Salah', 'Nunez', 'Diaz', 'Jota']
  },
  arsenal: {
    goalkeeper: ['Raya'],
    defenders: ['Saliba', 'Gabriel', 'White', 'Tomiyasu'],
    midfielders: ['Odegaard', 'Rice', 'Partey', 'Havertz'],
    attackers: ['Saka', 'Martinelli', 'Jesus', 'Trossard']
  },
  bayern: {
    goalkeeper: ['Neuer'],
    defenders: ['Upamecano', 'Kim', 'Davies', 'De Ligt'],
    midfielders: ['Kimmich', 'Musiala', 'Goretzka', 'Laimer'],
    attackers: ['Kane', 'Sane', 'Coman', 'Gnabry']
  },
  psg: {
    goalkeeper: ['Donnarumma'],
    defenders: ['Hakimi', 'Marquinhos', 'Hernandez', 'Mendes'],
    midfielders: ['Vitinha', 'Ugarte', 'Zaire-Emery', 'Ruiz'],
    attackers: ['Dembele', 'Ramos', 'Barcola', 'Asensio']
  }
};

const chance = (p) => Math.random() < p;

const normalize = (x, y) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

const speedOf = (obj) => Math.hypot(obj.vx, obj.vy);

const makeToken = (team, side) => ({
  side,
  x: side === 'home' ? FIELD.width * 0.28 : FIELD.width * 0.72,
  y: FIELD.height * (0.36 + Math.random() * 0.28),
  vx: 0,
  vy: 0,
  radius: 23,
  color: team.primaryColor,
  accent: team.secondaryColor,
  aggression: team.aggressionRating,
  possessionGlow: 0,
  recentLunge: 0
});

const createEvent = ({ type, team, minute, player, secondaryPlayer = '', emphasis = false }) => ({
  id: uid(),
  type,
  team,
  minute,
  player,
  secondaryPlayer,
  emphasis
});

const getPools = (teamObj) => playerPool[teamObj.id] || playerPool.generic;

const randomFrom = (arr = []) => arr[Math.floor(Math.random() * arr.length)] || '';

const pickRoleFromZone = (team, x) => {
  const attackDirection = team === 'home' ? 1 : -1;
  const progress = team === 'home' ? x / FIELD.width : (FIELD.width - x) / FIELD.width;

  if (progress < 0.22) return 'goalkeeper';
  if (progress < 0.45) return 'defenders';
  if (progress < 0.74) return 'midfielders';
  return attackDirection > 0 ? 'attackers' : 'attackers';
};

const randomPlayerByZone = (teamObj, teamSide, x) => {
  const pools = getPools(teamObj);
  const role = pickRoleFromZone(teamSide, x);
  const pick = pools[role] && pools[role].length ? randomFrom(pools[role]) : '';

  if (pick) return pick;
  return randomFrom([
    ...(pools.attackers || []),
    ...(pools.midfielders || []),
    ...(pools.defenders || []),
    ...(pools.goalkeeper || [])
  ]) || teamObj.displayName;
};

const teamObjFor = (team, homeTeam, awayTeam) => (team === 'home' ? homeTeam : awayTeam);

const pushEvent = (engine, event) => {
  engine.events.push(event);
  if (event.type === 'goal') {
    engine.flash = 1;
    engine.pulse = 1;
  } else if (event.type === 'save' || event.type === 'big_chance' || event.type === 'red_card') {
    engine.flash = Math.max(engine.flash, 0.65);
    engine.pulse = Math.max(engine.pulse, 0.62);
  }
};

const addImpact = (engine, x, y, intensity = 0.5) => {
  engine.impacts.push({ x, y, life: 1, intensity: clamp(intensity, 0.25, 1) });
  engine.impacts = engine.impacts.slice(-12);
};

const boundAndBounce = (obj, radius, bounce) => {
  if (obj.x < FIELD.margin + radius) {
    obj.x = FIELD.margin + radius;
    obj.vx = Math.abs(obj.vx) * bounce;
  } else if (obj.x > FIELD.width - FIELD.margin - radius) {
    obj.x = FIELD.width - FIELD.margin - radius;
    obj.vx = -Math.abs(obj.vx) * bounce;
  }

  if (obj.y < FIELD.margin + radius) {
    obj.y = FIELD.margin + radius;
    obj.vy = Math.abs(obj.vy) * bounce;
  } else if (obj.y > FIELD.height - FIELD.margin - radius) {
    obj.y = FIELD.height - FIELD.margin - radius;
    obj.vy = -Math.abs(obj.vy) * bounce;
  }
};

const steer = (token, tx, ty, desiredSpeed, force) => {
  const dir = normalize(tx - token.x, ty - token.y);
  const targetVx = dir.x * desiredSpeed;
  const targetVy = dir.y * desiredSpeed;
  token.vx += (targetVx - token.vx) * force;
  token.vy += (targetVy - token.vy) * force;

  const s = speedOf(token);
  if (s > PHYSICS.tokenMaxSpeed) {
    const n = PHYSICS.tokenMaxSpeed / s;
    token.vx *= n;
    token.vy *= n;
  }
};

const updatePossession = (engine) => {
  const dHome = Math.hypot(engine.home.x - engine.ball.x, engine.home.y - engine.ball.y);
  const dAway = Math.hypot(engine.away.x - engine.ball.x, engine.away.y - engine.ball.y);

  if (dHome > PHYSICS.controlRange && dAway > PHYSICS.controlRange) {
    engine.possession = 'loose';
    return;
  }

  engine.possession = dHome <= dAway ? 'home' : 'away';
};

const classifyCollision = (intensity) => {
  if (intensity > 170) return 'heavy';
  if (intensity > 115) return 'medium';
  return 'light';
};

const maybeEmitCollisionEvent = ({ engine, minute, homeTeam, awayTeam, intensity, collisionX, attacker, defender, lungeFactor }) => {
  const severity = classifyCollision(intensity);
  if (severity === 'light' && !chance(0.22)) return;

  const foulTeam = intensity > 140 && lungeFactor > 0.4 ? defender : chance(0.55) ? defender : attacker;
  const foulTeamObj = teamObjFor(foulTeam, homeTeam, awayTeam);
  const rolePlayer = randomPlayerByZone(foulTeamObj, foulTeam, collisionX);

  if (severity === 'light') {
    if (chance(0.35)) {
      pushEvent(engine, createEvent({ type: 'foul', team: foulTeam, minute, player: rolePlayer }));
    }
    return;
  }

  const teamAggro = teamObjFor(foulTeam, homeTeam, awayTeam).aggressionRating;
  const zoneBias = collisionX > FIELD.width * 0.8 || collisionX < FIELD.width * 0.2 ? 0.1 : 0;

  const yellowChance = clamp(0.25 + teamAggro / 250 + (severity === 'medium' ? 0.28 : 0.18), 0.22, 0.9);
  const redChance = clamp((severity === 'heavy' ? 0.12 : 0.03) + teamAggro / 380 + lungeFactor * 0.22 + zoneBias, 0.02, 0.72);

  pushEvent(engine, createEvent({ type: 'foul', team: foulTeam, minute, player: rolePlayer, emphasis: severity === 'heavy' }));

  if (chance(redChance)) {
    pushEvent(engine, createEvent({ type: 'red_card', team: foulTeam, minute, player: rolePlayer, emphasis: true }));
  } else if (chance(yellowChance)) {
    pushEvent(engine, createEvent({ type: 'yellow_card', team: foulTeam, minute, player: rolePlayer, emphasis: severity === 'heavy' }));
  }
};

const resolveBallTokenContact = (engine, token, enemyToken, dt) => {
  const dx = engine.ball.x - token.x;
  const dy = engine.ball.y - token.y;
  const dist = Math.hypot(dx, dy) || 1;
  const reach = token.radius + engine.ball.radius + 1.8;

  if (dist > reach) return;

  const n = { x: dx / dist, y: dy / dist };
  const rel = {
    x: engine.ball.vx - token.vx,
    y: engine.ball.vy - token.vy
  };
  const impactSpeed = rel.x * n.x + rel.y * n.y;

  const hasMomentum = speedOf(token) > speedOf(enemyToken) + 6;
  const strike = 52 + speedOf(token) * (hasMomentum ? 1.25 : 0.95) + (token.recentLunge > 0 ? 22 : 0);

  engine.ball.x = token.x + n.x * reach;
  engine.ball.y = token.y + n.y * reach;
  engine.ball.vx = n.x * strike + token.vx * 0.42;
  engine.ball.vy = n.y * strike + token.vy * 0.42;

  if (impactSpeed < -25 || strike > 140) {
    addImpact(engine, engine.ball.x, engine.ball.y, clamp(strike / 210, 0.35, 1));
    engine.flash = Math.max(engine.flash, 0.25);
  }

  engine.lastTouch = token.side;
  engine.lastTouchClock = 0;

  if (strike > 185) {
    engine.recentBurst = 0.65;
  }

  if (dt > 0) {
    token.vx *= 0.98;
    token.vy *= 0.98;
  }
};

const resolveTokenCollision = ({ engine, minute, homeTeam, awayTeam }) => {
  const dx = engine.away.x - engine.home.x;
  const dy = engine.away.y - engine.home.y;
  const dist = Math.hypot(dx, dy) || 1;
  const minDist = engine.home.radius + engine.away.radius;
  if (dist >= minDist) return;

  const n = { x: dx / dist, y: dy / dist };
  const overlap = minDist - dist;

  engine.home.x -= n.x * overlap * 0.52;
  engine.home.y -= n.y * overlap * 0.52;
  engine.away.x += n.x * overlap * 0.52;
  engine.away.y += n.y * overlap * 0.52;

  const rvx = engine.away.vx - engine.home.vx;
  const rvy = engine.away.vy - engine.home.vy;
  const normalSpeed = rvx * n.x + rvy * n.y;
  const collisionIntensity = Math.abs(normalSpeed) + Math.max(speedOf(engine.home), speedOf(engine.away)) * 0.55;

  if (normalSpeed < 0) {
    const impulse = (-(1 + 0.84) * normalSpeed) / 2;
    engine.home.vx -= impulse * n.x;
    engine.home.vy -= impulse * n.y;
    engine.away.vx += impulse * n.x;
    engine.away.vy += impulse * n.y;
  }

  addImpact(engine, (engine.home.x + engine.away.x) / 2, (engine.home.y + engine.away.y) / 2, clamp(collisionIntensity / 220, 0.22, 1));

  if (collisionIntensity > 88 && engine.phaseClockSinceCollision > 0.4) {
    engine.phase = 'tackle_collision';
    engine.phaseClockSinceCollision = 0;
    const attacker = engine.possession === 'away' ? 'away' : 'home';
    const defender = attacker === 'home' ? 'away' : 'home';
    const lungeFactor = defender === 'home' ? engine.home.recentLunge : engine.away.recentLunge;
    maybeEmitCollisionEvent({
      engine,
      minute,
      homeTeam,
      awayTeam,
      intensity: collisionIntensity,
      collisionX: (engine.home.x + engine.away.x) / 2,
      attacker,
      defender,
      lungeFactor
    });
  }
};

const targetGoalX = (team) => (team === 'home' ? FIELD.width - FIELD.goalDepth : FIELD.goalDepth);

const goalHitboxFor = (team, ballRadius = 0) => {
  const depth = 24;
  const leftX = FIELD.margin + ballRadius;
  const rightX = FIELD.width - FIELD.margin - ballRadius;

  if (team === 'home') {
    return {
      minX: rightX - depth,
      maxX: rightX + 2,
      minY: FIELD.goalTop + ballRadius * 0.25,
      maxY: FIELD.goalBottom - ballRadius * 0.25
    };
  }

  return {
    minX: leftX - 2,
    maxX: leftX + depth,
    minY: FIELD.goalTop + ballRadius * 0.25,
    maxY: FIELD.goalBottom - ballRadius * 0.25
  };
};

const inPenaltyBand = (x) => x < FIELD.width * 0.22 || x > FIELD.width * 0.78;

const processGoalFromBallPosition = ({ engine, minute, homeTeam, awayTeam }) => {
  if (engine.phase === 'goal_reset' || engine.phase === 'kickoff') return false;

  const homeGoalBox = goalHitboxFor('home', engine.ball.radius);
  const awayGoalBox = goalHitboxFor('away', engine.ball.radius);
  const isHomeGoal = engine.ball.x >= homeGoalBox.minX && engine.ball.x <= homeGoalBox.maxX && engine.ball.y >= homeGoalBox.minY && engine.ball.y <= homeGoalBox.maxY;
  const isAwayGoal = engine.ball.x >= awayGoalBox.minX && engine.ball.x <= awayGoalBox.maxX && engine.ball.y >= awayGoalBox.minY && engine.ball.y <= awayGoalBox.maxY;

  if (!isHomeGoal && !isAwayGoal) return false;

  const scoringTeam = isHomeGoal ? 'home' : 'away';
  const concedingTeam = scoringTeam === 'home' ? 'away' : 'home';
  const shooterObj = teamObjFor(scoringTeam, homeTeam, awayTeam);
  const assistant = chance(0.36) ? randomPlayerByZone(shooterObj, scoringTeam, engine.ball.x + (scoringTeam === 'home' ? -68 : 68)) : '';

  engine.score[scoringTeam] += 1;
  pushEvent(engine, createEvent({
    type: 'goal',
    team: scoringTeam,
    minute,
    player: randomPlayerByZone(shooterObj, scoringTeam, engine.ball.x),
    secondaryPlayer: assistant,
    emphasis: true
  }));

  engine.possession = concedingTeam;
  engine.phase = 'goal_reset';
  engine.phaseClock = 0;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.recentBurst = 1;
  return true;
};

const tryCreateAttackEvent = (engine, minute, homeTeam, awayTeam) => {
  const team = engine.possession === 'loose' ? engine.lastTouch : engine.possession;
  if (!team) return;

  const token = team === 'home' ? engine.home : engine.away;
  const enemy = team === 'home' ? engine.away : engine.home;

  const progress = team === 'home' ? token.x / FIELD.width : (FIELD.width - token.x) / FIELD.width;
  const pressure = clamp((speedOf(token) - speedOf(enemy) + 45) / 110, 0, 1);

  if (progress > 0.58 && pressure > 0.52 && chance(0.022)) {
    const teamObj = teamObjFor(team, homeTeam, awayTeam);
    pushEvent(engine, createEvent({
      type: 'dangerous_attack',
      team,
      minute,
      player: randomPlayerByZone(teamObj, team, token.x),
      emphasis: progress > 0.74
    }));
  }

  if (progress > 0.7 && pressure > 0.62 && chance(0.018)) {
    const teamObj = teamObjFor(team, homeTeam, awayTeam);
    pushEvent(engine, createEvent({
      type: 'big_chance',
      team,
      minute,
      player: randomPlayerByZone(teamObj, team, token.x),
      emphasis: true
    }));
  }
};

const maybeTakeShot = (engine) => {
  const team = engine.possession;
  if (team !== 'home' && team !== 'away') return;

  const token = team === 'home' ? engine.home : engine.away;
  const progress = team === 'home' ? token.x / FIELD.width : (FIELD.width - token.x) / FIELD.width;
  if (progress < 0.55) return;

  const laneCloseness = 1 - Math.abs(token.y - FIELD.height / 2) / (FIELD.height / 2);
  const shotTrigger = clamp(progress * 0.9 + laneCloseness * 0.45 + engine.attackDrive * 0.55, 0, 1);

  const pressureBonus = inPenaltyBand(token.x) ? 0.02 : 0;
  if (!chance(shotTrigger * 0.028 + pressureBonus)) return;

  engine.phase = 'shot_attempt';
  engine.phaseClock = 0;
  engine.shotTeam = team;

  const goalX = targetGoalX(team);
  const shotY = FIELD.height / 2 + (Math.random() - 0.5) * (inPenaltyBand(token.x) ? 68 : 88);
  const dir = normalize(goalX - engine.ball.x, shotY - engine.ball.y);
  const baseShot = 318 + Math.random() * 150 + engine.attackDrive * 72;
  engine.ball.vx = dir.x * baseShot;
  engine.ball.vy = dir.y * baseShot;
  engine.recentBurst = 1;
  engine.lastTouch = team;
  engine.lastTouchClock = 0;
};

const settleAfterGoalLike = (engine) => {
  engine.phase = 'save_reset';
  engine.phaseClock = 0;
  engine.attackDrive *= 0.45;
};

export const createLiveMatchEngine = ({ homeTeam, awayTeam, scriptedEvents = [], mode = 'auto' }) => ({
  phase: 'kickoff',
  phaseClock: 0,
  phaseClockSinceCollision: 1,
  possession: Math.random() > 0.5 ? 'home' : 'away',
  score: { home: 0, away: 0 },
  home: makeToken(homeTeam, 'home'),
  away: makeToken(awayTeam, 'away'),
  ball: {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: 6,
    trail: []
  },
  flash: 0,
  pulse: 0,
  impacts: [],
  recentBurst: 0,
  shotTeam: null,
  attackDrive: 0.58,
  lastTouch: null,
  lastTouchClock: 0,
  activeScriptedIndex: 0,
  scriptedEvents: [...scriptedEvents].sort((a, b) => a.minute - b.minute),
  mode,
  events: []
});

export const stepLiveMatch = ({ engine, dt, minute, homeTeam, awayTeam }) => {
  engine.phaseClock += dt;
  engine.phaseClockSinceCollision += dt;
  engine.lastTouchClock += dt;
  engine.flash = Math.max(0, engine.flash - dt * 1.8);
  engine.pulse = Math.max(0, engine.pulse - dt * 1.5);
  engine.recentBurst = Math.max(0, engine.recentBurst - dt * 1.6);

  const homeHas = engine.possession === 'home';
  const awayHas = engine.possession === 'away';

  if (engine.phase === 'kickoff') {
    steer(engine.home, FIELD.width * 0.42, FIELD.height * 0.56, 80, 0.16);
    steer(engine.away, FIELD.width * 0.58, FIELD.height * 0.44, 80, 0.16);

    const toCenter = normalize(FIELD.width / 2 - engine.ball.x, FIELD.height / 2 - engine.ball.y);
    engine.ball.vx += toCenter.x * 32 * dt;
    engine.ball.vy += toCenter.y * 32 * dt;

    if (engine.phaseClock > 0.5) {
      engine.phase = 'neutral_play';
      engine.phaseClock = 0;
    }
  }

  if (engine.phase === 'neutral_play' || engine.phase === 'tackle_collision') {
    const scripted = engine.mode === 'scripted' ? engine.scriptedEvents[engine.activeScriptedIndex] : null;

    if (scripted && minute >= scripted.minute) {
      const scriptedTeam = scripted.team;
      const teamObj = teamObjFor(scriptedTeam, homeTeam, awayTeam);
      pushEvent(engine, createEvent({
        type: scripted.type === 'foul' ? 'foul' : 'dangerous_attack',
        team: scriptedTeam,
        minute,
        player: scripted.player || randomPlayerByZone(teamObj, scriptedTeam, FIELD.width / 2)
      }));
      engine.activeScriptedIndex += 1;
    }

    const nearPenalty = inPenaltyBand(engine.ball.x);

    if (engine.possession === 'loose') {
      steer(engine.home, engine.ball.x, engine.ball.y, nearPenalty ? 242 : 228, nearPenalty ? 0.34 : 0.31);
      steer(engine.away, engine.ball.x, engine.ball.y, nearPenalty ? 242 : 228, nearPenalty ? 0.34 : 0.31);
    } else {
      const attackingTeam = engine.possession;
      const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
      const attacker = attackingTeam === 'home' ? engine.home : engine.away;
      const defender = defendingTeam === 'home' ? engine.home : engine.away;
      const attackGoalX = attackingTeam === 'home' ? FIELD.width - FIELD.margin - 22 : FIELD.margin + 22;

      const pressureX = attackingTeam === 'home'
        ? clamp(engine.ball.x - 34, FIELD.margin + 40, FIELD.width - FIELD.margin - 40)
        : clamp(engine.ball.x + 34, FIELD.margin + 40, FIELD.width - FIELD.margin - 40);

      const angleY = clamp(engine.ball.y + (defender.y > engine.ball.y ? -16 : 16), FIELD.margin + 24, FIELD.height - FIELD.margin - 24);

      steer(attacker, attackGoalX, clamp(engine.ball.y, FIELD.margin + 20, FIELD.height - FIELD.margin - 20), nearPenalty ? 258 : 238, nearPenalty ? 0.34 : 0.3);
      steer(defender, pressureX, angleY, nearPenalty ? 252 : 232, nearPenalty ? 0.33 : 0.28);
    }

    tryCreateAttackEvent(engine, minute, homeTeam, awayTeam);
    maybeTakeShot(engine);

    if (engine.phase === 'tackle_collision' && engine.phaseClock > 0.14) {
      engine.phase = 'neutral_play';
      engine.phaseClock = 0;
    }

    if (engine.possession === 'home' || engine.possession === 'away') {
      engine.attackDrive = clamp(engine.attackDrive + dt * 0.38, 0.15, 1);
    } else {
      engine.attackDrive = clamp(engine.attackDrive - dt * 0.06, 0.15, 1);
    }
  }

  if (engine.phase === 'shot_attempt') {
    const shootingTeam = engine.shotTeam;
    const defendingTeam = shootingTeam === 'home' ? 'away' : 'home';
    const keeperX = shootingTeam === 'home' ? FIELD.width - 48 : 48;
    const defenderToken = defendingTeam === 'home' ? engine.home : engine.away;

    steer(defenderToken, keeperX, FIELD.height / 2, 210, 0.28);

    const inGoalLane = engine.ball.y > FIELD.goalTop && engine.ball.y < FIELD.goalBottom;
    const reachedGoal = shootingTeam === 'home' ? engine.ball.x >= FIELD.width - FIELD.goalDepth : engine.ball.x <= FIELD.goalDepth;

    const defenderDist = Math.hypot(defenderToken.x - engine.ball.x, defenderToken.y - engine.ball.y);

    if (defenderDist < defenderToken.radius + engine.ball.radius + 6 && chance(0.5)) {
      const defendObj = teamObjFor(defendingTeam, homeTeam, awayTeam);
      pushEvent(engine, createEvent({
        type: 'save',
        team: defendingTeam,
        minute,
        player: randomPlayerByZone(defendObj, defendingTeam, defenderToken.x),
        emphasis: true
      }));
      engine.ball.vx *= -0.66;
      engine.ball.vy = engine.ball.vy * 0.5 + (Math.random() - 0.5) * 110;
      addImpact(engine, engine.ball.x, engine.ball.y, 0.85);
      engine.possession = defendingTeam;
      settleAfterGoalLike(engine);
    } else if (reachedGoal && inGoalLane) {
      processGoalFromBallPosition({ engine, minute, homeTeam, awayTeam });
    } else if (reachedGoal && !inGoalLane) {
      const shooterObj = teamObjFor(shootingTeam, homeTeam, awayTeam);
      pushEvent(engine, createEvent({
        type: 'big_chance',
        team: shootingTeam,
        minute,
        player: randomPlayerByZone(shooterObj, shootingTeam, engine.ball.x),
        emphasis: true
      }));
      engine.ball.vx *= -0.25;
      engine.ball.vy *= 0.48;
      engine.possession = defendingTeam;
      settleAfterGoalLike(engine);
    }

    if (engine.phaseClock > 1.15 && engine.phase === 'shot_attempt') {
      engine.possession = defendingTeam;
      settleAfterGoalLike(engine);
    }
  }

  if (engine.phase === 'save_reset') {
    steer(engine.home, FIELD.width * 0.35, FIELD.height * 0.5, 110, 0.14);
    steer(engine.away, FIELD.width * 0.65, FIELD.height * 0.5, 110, 0.14);
    if (engine.phaseClock > 0.55) {
      engine.phase = 'neutral_play';
      engine.phaseClock = 0;
    }
  }

  if (engine.phase === 'goal_reset') {
    steer(engine.home, FIELD.width * 0.43, FIELD.height * 0.5, 95, 0.16);
    steer(engine.away, FIELD.width * 0.57, FIELD.height * 0.5, 95, 0.16);

    const pullToCenter = normalize(FIELD.width / 2 - engine.ball.x, FIELD.height / 2 - engine.ball.y);
    engine.ball.vx += pullToCenter.x * 55 * dt;
    engine.ball.vy += pullToCenter.y * 55 * dt;

    if (engine.phaseClock > 0.8) {
      engine.phase = 'kickoff';
      engine.phaseClock = 0;
    }
  }

  const targetBall = engine.possession === 'home' ? engine.home : engine.possession === 'away' ? engine.away : null;
  if (targetBall && engine.phase !== 'shot_attempt') {
    const tetherPoint = {
      x: targetBall.x + (engine.possession === 'home' ? 12 : -12),
      y: targetBall.y + 2
    };
    const toCarrier = normalize(tetherPoint.x - engine.ball.x, tetherPoint.y - engine.ball.y);
    const dist = Math.hypot(tetherPoint.x - engine.ball.x, tetherPoint.y - engine.ball.y);
    const gather = 28 + engine.attackDrive * 36 + clamp(dist * 0.45, 0, 62);
    engine.ball.vx += toCarrier.x * gather * dt;
    engine.ball.vy += toCarrier.y * gather * dt;
  }

  const lungeChanceHome = engine.possession === 'away' ? 0.015 + homeTeam.aggressionRating / 2100 : 0;
  const lungeChanceAway = engine.possession === 'home' ? 0.015 + awayTeam.aggressionRating / 2100 : 0;
  if (chance(lungeChanceHome)) engine.home.recentLunge = 1;
  if (chance(lungeChanceAway)) engine.away.recentLunge = 1;

  engine.home.recentLunge = Math.max(0, engine.home.recentLunge - dt * 2.2);
  engine.away.recentLunge = Math.max(0, engine.away.recentLunge - dt * 2.2);

  engine.home.x += engine.home.vx * dt;
  engine.home.y += engine.home.vy * dt;
  engine.away.x += engine.away.vx * dt;
  engine.away.y += engine.away.vy * dt;

  engine.home.vx *= PHYSICS.tokenDrag;
  engine.home.vy *= PHYSICS.tokenDrag;
  engine.away.vx *= PHYSICS.tokenDrag;
  engine.away.vy *= PHYSICS.tokenDrag;

  boundAndBounce(engine.home, engine.home.radius, PHYSICS.tokenBounce);
  boundAndBounce(engine.away, engine.away.radius, PHYSICS.tokenBounce);

  resolveTokenCollision({ engine, minute, homeTeam, awayTeam });

  resolveBallTokenContact(engine, engine.home, engine.away, dt);
  resolveBallTokenContact(engine, engine.away, engine.home, dt);

  engine.ball.x += engine.ball.vx * dt;
  engine.ball.y += engine.ball.vy * dt;

  processGoalFromBallPosition({ engine, minute, homeTeam, awayTeam });

  const inGoalMouth = engine.ball.y > FIELD.goalTop && engine.ball.y < FIELD.goalBottom;
  const sideBounce = inGoalMouth ? PHYSICS.ballGoalBounce : PHYSICS.ballBounce;
  boundAndBounce(engine.ball, engine.ball.radius, sideBounce);

  engine.ball.vx *= PHYSICS.ballDrag;
  engine.ball.vy *= PHYSICS.ballDrag;

  updatePossession(engine);

  engine.home.possessionGlow = clamp(engine.home.possessionGlow + (engine.possession === 'home' ? dt * 4 : -dt * 4), 0, 1);
  engine.away.possessionGlow = clamp(engine.away.possessionGlow + (engine.possession === 'away' ? dt * 4 : -dt * 4), 0, 1);

  if (engine.lastTouchClock > 0.6 && engine.possession === 'loose' && speedOf(engine.ball) < 35) {
    const nearest = Math.hypot(engine.home.x - engine.ball.x, engine.home.y - engine.ball.y) < Math.hypot(engine.away.x - engine.ball.x, engine.away.y - engine.ball.y) ? 'home' : 'away';
    engine.possession = nearest;
  }

  engine.impacts = engine.impacts
    .map((impact) => ({ ...impact, life: impact.life - dt * 3.2 }))
    .filter((impact) => impact.life > 0);

  engine.ball.trail.push({ x: engine.ball.x, y: engine.ball.y, life: 1, speed: speedOf(engine.ball) });
  engine.ball.trail = engine.ball.trail
    .slice(-14)
    .map((p) => ({ ...p, life: p.life - dt * (p.speed > 170 ? 3.8 : 2.8) }))
    .filter((p) => p.life > 0);

  const emittedEvents = engine.events;
  engine.events = [];

  return {
    emittedEvents,
    visual: {
      phase: engine.phase,
      possession: engine.possession,
      flash: engine.flash,
      pulse: engine.pulse,
      burst: engine.recentBurst,
      home: engine.home,
      away: engine.away,
      ball: engine.ball,
      impacts: engine.impacts
    },
    score: engine.score
  };
};
