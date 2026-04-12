import { clamp, uid } from './helpers';

const FIELD = {
  width: 900,
  height: 530,
  margin: 28,
  goalTop: 215,
  goalBottom: 315,
  goalDepth: 10
};

const playerPool = {
  generic: ['Player A', 'Player B', 'Player C', 'Player D'],
  barcelona: ['Lewandowski', 'Pedri', 'Gavi', 'Lamine Yamal', 'Raphinha'],
  'real-madrid': ['Vinicius Jr', 'Bellingham', 'Rodrygo', 'Valverde', 'Tchouameni'],
  'atletico-madrid': ['Griezmann', 'Morata', 'Koke', 'De Paul', 'Llorente'],
  'manchester-city': ['Haaland', 'De Bruyne', 'Foden', 'Bernardo Silva', 'Rodri'],
  liverpool: ['Salah', 'Nunez', 'Szoboszlai', 'Mac Allister', 'Diaz'],
  arsenal: ['Saka', 'Odegaard', 'Havertz', 'Rice', 'Martinelli'],
  bayern: ['Kane', 'Musiala', 'Sane', 'Kimmich', 'Coman'],
  psg: ['Dembele', 'Vitinha', 'Hakimi', 'Ramos', 'Barcola']
};

const randomPlayer = (team) => {
  const pool = playerPool[team.id] || playerPool.generic;
  return pool[Math.floor(Math.random() * pool.length)];
};

const chance = (p) => Math.random() < p;

const normalize = (x, y) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

const makeToken = (team, side) => ({
  side,
  x: side === 'home' ? 250 : 650,
  y: FIELD.height / 2 + (Math.random() - 0.5) * 25,
  vx: 0,
  vy: 0,
  radius: 23,
  color: team.primaryColor,
  accent: team.secondaryColor,
  player: randomPlayer(team)
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

export const createLiveMatchEngine = ({ homeTeam, awayTeam, scriptedEvents = [], mode = 'auto' }) => ({
  phase: 'kickoff',
  phaseClock: 0,
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
  attackQuality: 0,
  shotOutcome: null,
  shotTeam: null,
  shotSpeed: 0,
  flash: 0,
  activeScriptedIndex: 0,
  scriptedEvents: [...scriptedEvents].sort((a, b) => a.minute - b.minute),
  mode,
  events: []
});

const pushEvent = (engine, event) => {
  engine.events.push(event);
  if (event.type === 'goal' || event.type === 'save' || event.type === 'big_chance') {
    engine.flash = 1;
  }
};

const clampInsideField = (token) => {
  token.x = clamp(token.x, FIELD.margin + token.radius, FIELD.width - FIELD.margin - token.radius);
  token.y = clamp(token.y, FIELD.margin + token.radius, FIELD.height - FIELD.margin - token.radius);
};

const steer = (token, tx, ty, speed = 75, smooth = 0.18) => {
  const dir = normalize(tx - token.x, ty - token.y);
  token.vx += (dir.x * speed - token.vx) * smooth;
  token.vy += (dir.y * speed - token.vy) * smooth;
};

const updateToken = (token, dt) => {
  token.x += token.vx * dt;
  token.y += token.vy * dt;
  token.vx *= 0.93;
  token.vy *= 0.93;
  clampInsideField(token);
};

const enterAttackPhase = (engine, team) => {
  engine.phase = team === 'home' ? 'home_attack' : 'away_attack';
  engine.phaseClock = 0;
  engine.possession = team;
  engine.attackQuality = clamp(Math.random() * 0.4 + 0.25, 0.2, 0.78);
};

const resolveCardEvent = (engine, aggressorTeam, minute, homeTeam, awayTeam) => {
  const teamObj = aggressorTeam === 'home' ? homeTeam : awayTeam;
  const redProbability = 0.02 + teamObj.aggressionRating / 800;
  const yellowProbability = 0.12 + teamObj.aggressionRating / 260;

  if (chance(redProbability)) {
    pushEvent(engine, createEvent({ type: 'red_card', team: aggressorTeam, minute, player: randomPlayer(teamObj), emphasis: true }));
  } else if (chance(yellowProbability)) {
    pushEvent(engine, createEvent({ type: 'yellow_card', team: aggressorTeam, minute, player: randomPlayer(teamObj) }));
  }
};

const chooseShotOutcome = (engine, shootingTeam, homeTeam, awayTeam) => {
  const attacker = shootingTeam === 'home' ? homeTeam : awayTeam;
  const defender = shootingTeam === 'home' ? awayTeam : homeTeam;

  const attackFactor = attacker.attackRating / 100;
  const defenseFactor = defender.defenseRating / 100;
  const quality = engine.attackQuality;

  const goalWeight = clamp(0.18 + attackFactor * 0.45 + quality * 0.32 - defenseFactor * 0.26, 0.12, 0.68);
  const saveWeight = clamp(0.2 + defenseFactor * 0.36 - quality * 0.12, 0.12, 0.52);
  const blockWeight = clamp(0.12 + defenseFactor * 0.24, 0.08, 0.35);
  const missWeight = clamp(1 - goalWeight - saveWeight - blockWeight, 0.08, 0.3);

  const bag = [
    ['goal', goalWeight],
    ['save', saveWeight],
    ['block', blockWeight],
    ['miss', missWeight]
  ];

  const total = bag.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [type, weight] of bag) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return 'miss';
};

const targetGoalX = (team) => (team === 'home' ? FIELD.width - FIELD.goalDepth : FIELD.goalDepth);

export const stepLiveMatch = ({ engine, dt, minute, homeTeam, awayTeam }) => {
  engine.phaseClock += dt;
  engine.flash = Math.max(0, engine.flash - dt * 1.9);

  const attackingToken = engine.possession === 'home' ? engine.home : engine.away;
  const defendingToken = engine.possession === 'home' ? engine.away : engine.home;

  if (engine.phase === 'kickoff') {
    steer(engine.home, 310, FIELD.height / 2 + 18, 55, 0.16);
    steer(engine.away, 590, FIELD.height / 2 - 18, 55, 0.16);
    engine.ball.vx += (FIELD.width / 2 - engine.ball.x) * 0.15 * dt;
    engine.ball.vy += (FIELD.height / 2 - engine.ball.y) * 0.15 * dt;

    if (engine.phaseClock > 0.8) {
      engine.phase = 'neutral_play';
      engine.phaseClock = 0;
    }
  }

  if (engine.phase === 'neutral_play') {
    steer(engine.home, FIELD.width * 0.42, FIELD.height * (0.3 + Math.random() * 0.4), 65, 0.08);
    steer(engine.away, FIELD.width * 0.58, FIELD.height * (0.3 + Math.random() * 0.4), 65, 0.08);

    const scripted = engine.mode === 'scripted' ? engine.scriptedEvents[engine.activeScriptedIndex] : null;
    if (scripted && minute >= scripted.minute) {
      enterAttackPhase(engine, scripted.team);
      pushEvent(engine, createEvent({
        type: scripted.type === 'foul' ? 'foul' : 'dangerous_attack',
        team: scripted.team,
        minute,
        player: scripted.player || (scripted.team === 'home' ? homeTeam.displayName : awayTeam.displayName)
      }));
      engine.activeScriptedIndex += 1;
    } else if (engine.phaseClock > 1.9 + Math.random() * 1.5) {
      const homePressure = homeTeam.attackRating * (0.55 + Math.random() * 0.6);
      const awayPressure = awayTeam.attackRating * (0.55 + Math.random() * 0.6);
      enterAttackPhase(engine, homePressure >= awayPressure ? 'home' : 'away');
      pushEvent(engine, createEvent({
        type: 'dangerous_attack',
        team: engine.possession,
        minute,
        player: engine.possession === 'home' ? homeTeam.displayName : awayTeam.displayName
      }));
    }
  }

  if (engine.phase === 'home_attack' || engine.phase === 'away_attack') {
    const team = engine.phase === 'home_attack' ? 'home' : 'away';
    const attackToken = team === 'home' ? engine.home : engine.away;
    const defenseToken = team === 'home' ? engine.away : engine.home;

    const forwardX = team === 'home' ? FIELD.width * 0.83 : FIELD.width * 0.17;
    const laneY = FIELD.height * (0.35 + Math.random() * 0.3);
    steer(attackToken, forwardX, laneY, 95, 0.14);
    steer(defenseToken, attackToken.x - (team === 'home' ? 85 : -85), attackToken.y + (Math.random() - 0.5) * 35, 90, 0.18);

    engine.ball.vx += (attackToken.x - engine.ball.x) * 0.5 * dt;
    engine.ball.vy += (attackToken.y - engine.ball.y) * 0.5 * dt;

    const pressure = clamp(engine.phaseClock / 2.3 + Math.random() * 0.08, 0, 1);
    engine.attackQuality = clamp(engine.attackQuality + pressure * 0.015, 0.2, 0.95);

    const dist = Math.hypot(defenseToken.x - engine.ball.x, defenseToken.y - engine.ball.y);
    if (dist < attackToken.radius + 11 && chance((team === 'home' ? awayTeam.defenseRating : homeTeam.defenseRating) / 1200)) {
      if (chance(((team === 'home' ? awayTeam : homeTeam).aggressionRating + 12) / 180)) {
        engine.phase = 'foul_event';
        engine.phaseClock = 0;
        const foulingTeam = team === 'home' ? 'away' : 'home';
        pushEvent(engine, createEvent({ type: 'foul', team: foulingTeam, minute, player: randomPlayer(foulingTeam === 'home' ? homeTeam : awayTeam), emphasis: true }));
        resolveCardEvent(engine, foulingTeam, minute, homeTeam, awayTeam);
      } else {
        engine.phase = 'neutral_play';
        engine.phaseClock = 0;
        engine.possession = team === 'home' ? 'away' : 'home';
      }
    }

    if (engine.phaseClock > 1.3 && engine.attackQuality > 0.55 && chance(0.02)) {
      pushEvent(engine, createEvent({ type: 'big_chance', team, minute, player: randomPlayer(team === 'home' ? homeTeam : awayTeam), emphasis: true }));
    }

    if (engine.phaseClock > 2 + Math.random() * 1.2 || engine.attackQuality > 0.82) {
      engine.phase = 'shot_attempt';
      engine.phaseClock = 0;
      engine.shotTeam = team;
      engine.shotOutcome = chooseShotOutcome(engine, team, homeTeam, awayTeam);
      engine.shotSpeed = 190 + Math.random() * 85;

      const gx = targetGoalX(team);
      const gy = FIELD.height / 2 + (Math.random() - 0.5) * 80;
      const d = normalize(gx - engine.ball.x, gy - engine.ball.y);
      engine.ball.vx = d.x * engine.shotSpeed;
      engine.ball.vy = d.y * engine.shotSpeed;
    }
  }

  if (engine.phase === 'shot_attempt') {
    const shootingTeam = engine.shotTeam;
    const defendingTeam = shootingTeam === 'home' ? 'away' : 'home';
    const keeperLineX = shootingTeam === 'home' ? FIELD.width - 55 : 55;
    const defenderToken = defendingTeam === 'home' ? engine.home : engine.away;
    steer(defenderToken, keeperLineX, FIELD.height / 2, 120, 0.26);

    const inGoalLane = engine.ball.y > FIELD.goalTop && engine.ball.y < FIELD.goalBottom;
    const reachedGoal = shootingTeam === 'home' ? engine.ball.x >= FIELD.width - FIELD.goalDepth : engine.ball.x <= FIELD.goalDepth;

    if (engine.shotOutcome === 'save' && Math.abs(engine.ball.x - keeperLineX) < 14 && inGoalLane) {
      pushEvent(engine, createEvent({ type: 'save', team: defendingTeam, minute, player: randomPlayer(defendingTeam === 'home' ? homeTeam : awayTeam), emphasis: true }));
      engine.phase = 'save_reset';
      engine.phaseClock = 0;
      engine.ball.vx *= -0.35;
      engine.ball.vy *= 0.25;
      engine.possession = defendingTeam;
    } else if (engine.shotOutcome === 'block' && Math.hypot(defenderToken.x - engine.ball.x, defenderToken.y - engine.ball.y) < defenderToken.radius + 8) {
      pushEvent(engine, createEvent({ type: 'save', team: defendingTeam, minute, player: randomPlayer(defendingTeam === 'home' ? homeTeam : awayTeam) }));
      engine.phase = 'save_reset';
      engine.phaseClock = 0;
      engine.ball.vx *= -0.25;
      engine.ball.vy *= 0.35;
      engine.possession = defendingTeam;
    } else if (reachedGoal && inGoalLane && engine.shotOutcome === 'goal') {
      engine.score[shootingTeam] += 1;
      pushEvent(engine, createEvent({
        type: 'goal',
        team: shootingTeam,
        minute,
        player: randomPlayer(shootingTeam === 'home' ? homeTeam : awayTeam),
        secondaryPlayer: chance(0.45) ? randomPlayer(shootingTeam === 'home' ? homeTeam : awayTeam) : '',
        emphasis: true
      }));
      engine.phase = 'goal_reset';
      engine.phaseClock = 0;
      engine.possession = defendingTeam;
    } else if (reachedGoal && (engine.shotOutcome === 'miss' || !inGoalLane)) {
      pushEvent(engine, createEvent({ type: 'big_chance', team: shootingTeam, minute, player: randomPlayer(shootingTeam === 'home' ? homeTeam : awayTeam) }));
      engine.phase = 'save_reset';
      engine.phaseClock = 0;
      engine.possession = defendingTeam;
      engine.ball.vx *= -0.2;
      engine.ball.vy *= 0.2;
    }

    if (engine.phaseClock > 1.7) {
      engine.phase = 'save_reset';
      engine.phaseClock = 0;
      engine.possession = defendingTeam;
    }
  }

  if (engine.phase === 'save_reset' || engine.phase === 'foul_event') {
    steer(engine.home, 320, FIELD.height * 0.5, 70, 0.1);
    steer(engine.away, 580, FIELD.height * 0.5, 70, 0.1);
    engine.ball.vx += (FIELD.width / 2 - engine.ball.x) * 0.08 * dt;
    engine.ball.vy += (FIELD.height / 2 - engine.ball.y) * 0.08 * dt;

    if (engine.phaseClock > 1) {
      engine.phase = 'neutral_play';
      engine.phaseClock = 0;
    }
  }

  if (engine.phase === 'goal_reset') {
    steer(engine.home, 320, FIELD.height * 0.5, 60, 0.12);
    steer(engine.away, 580, FIELD.height * 0.5, 60, 0.12);
    engine.ball.vx += (FIELD.width / 2 - engine.ball.x) * 0.15 * dt;
    engine.ball.vy += (FIELD.height / 2 - engine.ball.y) * 0.15 * dt;
    if (engine.phaseClock > 1.4) {
      engine.phase = 'kickoff';
      engine.phaseClock = 0;
    }
  }

  updateToken(engine.home, dt);
  updateToken(engine.away, dt);

  engine.ball.x += engine.ball.vx * dt;
  engine.ball.y += engine.ball.vy * dt;
  engine.ball.vx *= 0.975;
  engine.ball.vy *= 0.975;
  engine.ball.x = clamp(engine.ball.x, 4, FIELD.width - 4);
  engine.ball.y = clamp(engine.ball.y, 6, FIELD.height - 6);
  engine.ball.trail.push({ x: engine.ball.x, y: engine.ball.y, life: 1 });
  engine.ball.trail = engine.ball.trail.slice(-8).map((t) => ({ ...t, life: t.life - dt * 3 })).filter((t) => t.life > 0);

  const emittedEvents = engine.events;
  engine.events = [];

  return {
    emittedEvents,
    visual: {
      phase: engine.phase,
      possession: engine.possession,
      flash: engine.flash,
      home: engine.home,
      away: engine.away,
      ball: engine.ball
    },
    score: engine.score
  };
};
