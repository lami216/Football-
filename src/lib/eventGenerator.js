import { randomItem, uid, clamp } from './helpers';

const playerPool = {
  generic: ['Player A', 'Player B', 'Player C', 'Player D'],
  barcelona: ['Lewandowski', 'Pedri', 'Gavi', 'Lamine Yamal', 'Raphinha'],
  'real-madrid': ['Vinicius Jr', 'Bellingham', 'Rodrygo', 'Valverde', 'Tchouameni'],
  'atletico-madrid': ['Griezmann', 'Morata', 'Koke', 'De Paul', 'Llorente'],
  'manchester-city': ['Haaland', 'De Bruyne', 'Foden', 'Bernardo Silva', 'Rodri'],
  liverpool: ['Salah', 'Nunez', 'Szoboszlai', 'Mac Allister', 'Diaz'],
  arsenal: ['Saka', 'Odegaard', 'Havertz', 'Rice', 'Martinelli'],
  bayern: ['Kane', 'Musiala', 'Sane', 'Kimmich', 'Coman'],
  psg: ['Mbappe', 'Dembele', 'Vitinha', 'Hakimi', 'Ramos']
};

const weightedPick = (weights) => {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let r = Math.random() * total;
  for (const [value, weight] of weights) {
    r -= weight;
    if (r <= 0) return value;
  }
  return weights[weights.length - 1][0];
};

const playerForTeam = (team) => randomItem(playerPool[team.id] || playerPool.generic);

export const generateAutoEvents = ({ homeTeam, awayTeam, durationSec }) => {
  const pace = durationSec / 30;
  const baseEvents = clamp(Math.round(9 * pace + Math.random() * 4), 6, 18);

  const events = [];
  for (let i = 0; i < baseEvents; i += 1) {
    const minute = clamp(Math.round(Math.random() * 89) + 1, 1, 90);

    const homePower = homeTeam.attackRating - awayTeam.defenseRating * 0.7 + Math.random() * 15;
    const awayPower = awayTeam.attackRating - homeTeam.defenseRating * 0.7 + Math.random() * 15;
    const team = homePower >= awayPower ? 'home' : 'away';
    const activeTeam = team === 'home' ? homeTeam : awayTeam;
    const passiveTeam = team === 'home' ? awayTeam : homeTeam;

    const aggressionBoost = activeTeam.aggressionRating / 100;
    const defenseResistance = passiveTeam.defenseRating / 100;

    const type = weightedPick([
      ['dangerous_attack', 2.5 + activeTeam.attackRating / 45],
      ['big_chance', 1.7 + activeTeam.attackRating / 60],
      ['goal', 1 + (activeTeam.attackRating / 100) * (1.2 - defenseResistance * 0.7)],
      ['foul', 1 + aggressionBoost],
      ['yellow_card', 0.5 + aggressionBoost],
      ['red_card', 0.15 + aggressionBoost * 0.4],
      ['save', 0.8 + defenseResistance]
    ]);

    events.push({
      id: uid(),
      minute,
      team,
      type,
      player: type === 'dangerous_attack' ? activeTeam.displayName : playerForTeam(activeTeam),
      secondaryPlayer: type === 'goal' && Math.random() > 0.45 ? playerForTeam(activeTeam) : ''
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
};
