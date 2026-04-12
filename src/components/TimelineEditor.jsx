import { EVENT_TYPES, uid } from '../lib/helpers';

const newEvent = () => ({
  id: uid(),
  minute: 45,
  team: 'home',
  type: 'dangerous_attack',
  player: '',
  secondaryPlayer: ''
});

export default function TimelineEditor({ scriptedEvents, setScriptedEvents }) {
  return (
    <div className="timeline-editor">
      <div className="timeline-header">
        <h2>Scripted Event Editor</h2>
        <button onClick={() => setScriptedEvents((prev) => [...prev, newEvent()])}>Add Event</button>
      </div>
      {scriptedEvents.map((event, index) => (
        <div key={event.id} className="timeline-row">
          <input
            type="number"
            min="1"
            max="90"
            value={event.minute}
            onChange={(e) => {
              const minute = Number(e.target.value || 1);
              setScriptedEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, minute } : item)));
            }}
          />
          <select value={event.team} onChange={(e) => setScriptedEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, team: e.target.value } : item)))}>
            <option value="home">Home</option>
            <option value="away">Away</option>
          </select>
          <select value={event.type} onChange={(e) => setScriptedEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, type: e.target.value } : item)))}>
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <input placeholder="Player" value={event.player} onChange={(e) => setScriptedEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, player: e.target.value } : item)))} />
          <input placeholder="Secondary player / assist" value={event.secondaryPlayer} onChange={(e) => setScriptedEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, secondaryPlayer: e.target.value } : item)))} />
          <div className="timeline-actions">
            <button className="small" onClick={() => setScriptedEvents((prev) => { if (index===0) return prev; const next=[...prev]; [next[index-1],next[index]]=[next[index],next[index-1]]; return next; })}>↑</button>
            <button className="small" onClick={() => setScriptedEvents((prev) => { if (index===prev.length-1) return prev; const next=[...prev]; [next[index+1],next[index]]=[next[index],next[index+1]]; return next; })}>↓</button>
            <button className="small danger" onClick={() => setScriptedEvents((prev) => prev.filter((item) => item.id !== event.id))}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
