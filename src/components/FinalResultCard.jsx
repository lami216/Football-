import { getWinnerText } from '../lib/helpers';

export default function FinalResultCard({ show, homeTeam, awayTeam, score, theme }) {
  if (!show) return null;
  return (
    <div className="final-card-overlay">
      <div className="final-card" style={{ borderColor: theme.accent }}>
        <div className="competition-pill" style={{ background: theme.headerGradient }}>{theme.name}</div>
        <h2>FULL TIME</h2>
        <div className="final-score-line">
          <div className="team-stack"><img src={homeTeam.logo} alt={homeTeam.displayName} /><span>{homeTeam.displayName}</span></div>
          <strong>{score.home} - {score.away}</strong>
          <div className="team-stack"><img src={awayTeam.logo} alt={awayTeam.displayName} /><span>{awayTeam.displayName}</span></div>
        </div>
        <p>{getWinnerText(homeTeam, awayTeam, score.home, score.away)}</p>
      </div>
    </div>
  );
}
