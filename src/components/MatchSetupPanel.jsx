import { demoSetups } from '../data/demos';
import { uid } from '../lib/helpers';
import TimelineEditor from './TimelineEditor';

const durations = [15, 20, 30, 45];

export default function MatchSetupPanel({
  themes,
  teams,
  settings,
  setSettings,
  onReset,
  onRandomize,
  scriptedEvents,
  setScriptedEvents
}) {
  const updateSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const applyDemo = (demoKey) => {
    const demo = demoSetups[demoKey];
    setSettings({
      themeId: demo.themeId,
      homeTeamId: demo.homeTeamId,
      awayTeamId: demo.awayTeamId,
      matchDate: demo.matchDate,
      matchTime: demo.matchTime,
      duration: demo.duration,
      mode: demo.mode
    });
    setScriptedEvents(demo.scriptedEvents.map((event) => ({ ...event, id: uid() })));
  };

  return (
    <aside className="setup-panel">
      <h1>Football Match Content Studio</h1>
      <div className="setup-grid">
        <label>Competition / Theme<select value={settings.themeId} onChange={(e) => updateSetting('themeId', e.target.value)}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
        <label>Home Team<select value={settings.homeTeamId} onChange={(e) => updateSetting('homeTeamId', e.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.displayName}</option>)}</select></label>
        <label>Away Team<select value={settings.awayTeamId} onChange={(e) => updateSetting('awayTeamId', e.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.displayName}</option>)}</select></label>
        <label>Match Date<input type="date" value={settings.matchDate} onChange={(e) => updateSetting('matchDate', e.target.value)} /></label>
        <label>Match Time<input type="time" value={settings.matchTime} onChange={(e) => updateSetting('matchTime', e.target.value)} /></label>
        <label>Simulation Duration<select value={settings.duration} onChange={(e) => updateSetting('duration', Number(e.target.value))}>{durations.map((duration) => <option key={duration} value={duration}>{duration}s</option>)}</select></label>
        <label>Simulation Mode<select value={settings.mode} onChange={(e) => updateSetting('mode', e.target.value)}><option value="auto">Auto Simulation</option><option value="scripted">Scripted Simulation</option></select></label>
      </div>

      <div className="button-row"><button onClick={() => applyDemo('elClasico')}>Load El Clasico Demo</button><button onClick={() => applyDemo('uclFinal')}>Load UCL Final Demo</button></div>
      <div className="button-row"><button onClick={onRandomize}>Randomize Auto Match</button><button className="secondary" onClick={onReset}>Reset Match</button></div>

      {settings.mode === 'scripted' && <TimelineEditor scriptedEvents={scriptedEvents} setScriptedEvents={setScriptedEvents} />}
    </aside>
  );
}
