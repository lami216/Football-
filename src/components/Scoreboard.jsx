import { formatMatchMinute } from '../lib/helpers';

export default function Scoreboard({ theme, homeTeam, awayTeam, score, minute, matchDate, matchTime, pulseGoal }) {
  return (
    <div className={`scoreboard ${pulseGoal ? 'goal-pulse' : ''}`} style={{ borderColor: theme.accent }}>
      <div className="competition-pill" style={{ background: theme.headerGradient }}>{theme.name}</div>
      <div className="teams-row">
        <div className="team-cell">
          <img src={homeTeam.logo} alt={homeTeam.displayName} />
          <span>{homeTeam.shortName}</span>
        </div>
        <div className="score-cell">{score.home} - {score.away}</div>
        <div className="team-cell away">
          <span>{awayTeam.shortName}</span>
          <img src={awayTeam.logo} alt={awayTeam.displayName} />
        </div>
      </div>
      <div className="meta-row">
        <span>{formatMatchMinute(minute)}</span>
        <span>{matchDate}</span>
        <span>{matchTime}</span>
      </div>
    </div>
  );
}
