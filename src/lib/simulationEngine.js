import { minuteToMs } from './timeMapping';

export const buildTimeline = ({ mode, scriptedEvents, autoEvents, durationSec }) => {
  const source = mode === 'scripted' ? scriptedEvents : autoEvents;
  return source
    .map((event) => ({
      ...event,
      triggerMs: minuteToMs(event.minute, durationSec)
    }))
    .sort((a, b) => a.triggerMs - b.triggerMs);
};

export const getScoreFromEvents = (events, elapsedMs) => {
  return events.reduce(
    (acc, event) => {
      if (event.triggerMs <= elapsedMs && event.type === 'goal') {
        if (event.team === 'home') acc.home += 1;
        if (event.team === 'away') acc.away += 1;
      }
      return acc;
    },
    { home: 0, away: 0 }
  );
};
