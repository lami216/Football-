const eventStyles = {
  goal: { title: 'GOAL!', color: '#5eff9b' },
  yellow_card: { title: 'Yellow Card', color: '#ffd60a' },
  red_card: { title: 'Red Card', color: '#ff4d4d' },
  dangerous_attack: { title: 'Dangerous Attack', color: '#8ec5ff' },
  big_chance: { title: 'Big Chance', color: '#c77dff' },
  save: { title: 'Great Save', color: '#64dfdf' },
  foul: { title: 'Hard Tackle', color: '#ff8f00' }
};

export default function EventPopup({ event }) {
  if (!event) return null;
  const style = eventStyles[event.type] || eventStyles.dangerous_attack;
  return (
    <div className="event-popup" style={{ borderColor: style.color, boxShadow: `0 0 25px ${style.color}55` }}>
      <strong style={{ color: style.color }}>{style.title}</strong>
      <div>
        {event.player || (event.team === 'home' ? 'Home Team' : 'Away Team')}
        {event.secondaryPlayer ? ` • ${event.secondaryPlayer}` : ''}
        {' '} {event.minute}’
      </div>
    </div>
  );
}
