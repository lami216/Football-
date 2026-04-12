import { useMemo, useState } from 'react';
import MatchSetupPanel from './components/MatchSetupPanel';
import Scoreboard from './components/Scoreboard';
import MatchCanvas from './components/MatchCanvas';
import EventPopup from './components/EventPopup';
import FinalResultCard from './components/FinalResultCard';
import { themes, getThemeById } from './data/themes';
import { teams, getTeamById } from './data/teams';
import { demoSetups } from './data/demos';
import { useSimulation } from './hooks/useSimulation';

const initial = demoSetups.elClasico;

export default function App() {
  const [settings, setSettings] = useState({
    themeId: initial.themeId,
    homeTeamId: initial.homeTeamId,
    awayTeamId: initial.awayTeamId,
    matchDate: initial.matchDate,
    matchTime: initial.matchTime,
    duration: initial.duration,
    mode: initial.mode
  });
  const [scriptedEvents, setScriptedEvents] = useState(initial.scriptedEvents);
  const [autoSeed, setAutoSeed] = useState(0);

  const theme = getThemeById(settings.themeId);
  const homeTeam = getTeamById(settings.homeTeamId);
  const awayTeam = getTeamById(settings.awayTeamId === settings.homeTeamId ? 'real-madrid' : settings.awayTeamId);

  const sortedScriptedEvents = useMemo(() => [...scriptedEvents].sort((a, b) => a.minute - b.minute), [scriptedEvents]);

  const simulation = useSimulation({
    mode: settings.mode,
    scriptedEvents: sortedScriptedEvents,
    durationSec: settings.duration,
    homeTeam,
    awayTeam,
    randomSeed: autoSeed
  });

  const handleStart = () => simulation.start();
  const handleReset = () => {
    simulation.reset();
    setAutoSeed((seed) => seed + 1);
  };

  return (
    <div className="app-shell" style={{ '--theme-accent': theme.accent, '--theme-secondary': theme.secondary, '--theme-glow': theme.panelGlow }}>
      <MatchSetupPanel
        themes={themes}
        teams={teams}
        settings={settings}
        setSettings={setSettings}
        onReset={handleReset}
        onRandomize={() => setAutoSeed((seed) => seed + 1)}
        scriptedEvents={scriptedEvents}
        setScriptedEvents={setScriptedEvents}
      />

      <main className="broadcast-screen">
        <header className="broadcast-header" style={{ background: theme.headerGradient }}>
          <div>
            <h2>{theme.name} Broadcast View</h2>
            <p>{homeTeam.displayName} vs {awayTeam.displayName}</p>
          </div>
          <div className="header-actions">
            {!simulation.isRunning && !simulation.isFinished && <button onClick={handleStart}>Start Simulation</button>}
            {simulation.isFinished && <button onClick={handleStart}>Play Again</button>}
          </div>
        </header>

        <Scoreboard
          theme={theme}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          score={simulation.score}
          minute={simulation.currentMinute}
          matchDate={settings.matchDate}
          matchTime={settings.matchTime}
          pulseGoal={simulation.activeEvent?.type === 'goal'}
        />

        <section className={`field-wrap ${simulation.activeEvent?.type === 'goal' ? 'shake' : ''}`}>
          <MatchCanvas
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            activeEvent={simulation.activeEvent}
            visualState={simulation.visualState}
            isRunning={simulation.isRunning}
            finished={simulation.isFinished}
          />
          <EventPopup event={simulation.activeEvent} />
          <FinalResultCard show={simulation.isFinished} homeTeam={homeTeam} awayTeam={awayTeam} score={simulation.score} theme={theme} />
        </section>
      </main>
    </div>
  );
}
