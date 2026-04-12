export const EVENT_TYPES = [
  { value: 'goal', label: 'Goal' },
  { value: 'yellow_card', label: 'Yellow Card' },
  { value: 'red_card', label: 'Red Card' },
  { value: 'dangerous_attack', label: 'Dangerous Attack' },
  { value: 'big_chance', label: 'Big Chance' },
  { value: 'save', label: 'Save' },
  { value: 'foul', label: 'Foul / Hard Tackle' }
];

export const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const formatClock = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
};

export const formatMatchMinute = (minute) => `${minute}\u2019`;

export const getWinnerText = (home, away, homeScore, awayScore) => {
  if (homeScore === awayScore) return 'Draw';
  return homeScore > awayScore ? `${home.displayName} Win` : `${away.displayName} Win`;
};
