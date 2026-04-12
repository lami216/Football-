export const MATCH_MINUTES = 90;

export const minuteToMs = (minute, durationSec) => (minute / MATCH_MINUTES) * durationSec * 1000;

export const elapsedMsToMinute = (elapsedMs, durationSec) => {
  const ratio = elapsedMs / (durationSec * 1000);
  return Math.max(1, Math.min(MATCH_MINUTES, Math.round(ratio * MATCH_MINUTES)));
};
