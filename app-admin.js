const STORAGE_KEY = 'footballBroadcastSettings';
const STATE_KEY = 'footballBroadcastMatchState';

const defaults = {
  teamA: { name: 'Team A', logo: '' },
  teamB: { name: 'Team B', logo: '' },
  durationSec: 30,
  theme: 'champions',
  schedule: { date: '', time: '20:45 CET' },
  score: { a: 0, b: 0 }
};

const els = {
  teamAName: document.getElementById('teamAName'),
  teamBName: document.getElementById('teamBName'),
  teamALogo: document.getElementById('teamALogo'),
  teamBLogo: document.getElementById('teamBLogo'),
  duration: document.getElementById('duration'),
  durationLabel: document.getElementById('durationLabel'),
  theme: document.getElementById('theme'),
  matchDate: document.getElementById('matchDate'),
  matchTime: document.getElementById('matchTime'),
  saveBtn: document.getElementById('saveBtn'),
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  openMatchBtn: document.getElementById('openMatchBtn'),
  schedulePreview: document.getElementById('schedulePreview')
};

const state = { ...defaults };

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
function saveSettings(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function setMatchState(matchState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(matchState));
}
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function formatDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function setThemeClass(themeName) {
  document.body.classList.remove('theme-champions', 'theme-laliga', 'theme-premier');
  document.body.classList.add(`theme-${themeName}`);
}
function drawPreview() {
  const dateText = formatDate(state.schedule.date);
  const timeText = state.schedule.time || 'Time TBD';
  els.schedulePreview.innerHTML = `
    <div class="team-chip">
      <img class="preview-logo" src="${state.teamA.logo || ''}" alt="A" />
      <strong>${state.teamA.name || 'Team A'}</strong>
    </div>
    <div class="schedule-meta">${dateText}<br>${timeText}</div>
    <div class="team-chip" style="justify-content:flex-end;">
      <strong>${state.teamB.name || 'Team B'}</strong>
      <img class="preview-logo" src="${state.teamB.logo || ''}" alt="B" />
    </div>`;
}
function fillForm() {
  Object.assign(state, getStoredSettings());
  els.teamAName.value = state.teamA.name;
  els.teamBName.value = state.teamB.name;
  els.duration.value = state.durationSec;
  els.theme.value = state.theme;
  els.matchDate.value = state.schedule.date;
  els.matchTime.value = state.schedule.time;
  updateDurationLabel();
  setThemeClass(state.theme);
  drawPreview();
}
function collectFormToState() {
  state.teamA.name = els.teamAName.value.trim() || 'Team A';
  state.teamB.name = els.teamBName.value.trim() || 'Team B';
  state.durationSec = Math.min(60, Math.max(15, Number(els.duration.value) || 30));
  state.theme = els.theme.value;
  state.schedule.date = els.matchDate.value;
  state.schedule.time = els.matchTime.value.trim();
  state.score = state.score || { a: 0, b: 0 };
}
function updateDurationLabel() {
  const sec = Number(els.duration.value);
  const ratio = 5400 / sec;
  els.durationLabel.textContent = `${sec}s real time => 90:00 broadcast clock (x${ratio.toFixed(1)} speed)`;
}

els.theme.addEventListener('change', () => {
  setThemeClass(els.theme.value);
  collectFormToState();
  drawPreview();
});
els.duration.addEventListener('input', updateDurationLabel);
['teamAName', 'teamBName', 'matchDate', 'matchTime'].forEach((key) => {
  els[key].addEventListener('input', () => {
    collectFormToState();
    drawPreview();
  });
});
els.teamALogo.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  state.teamA.logo = await readFileAsDataUrl(file);
  drawPreview();
});
els.teamBLogo.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  state.teamB.logo = await readFileAsDataUrl(file);
  drawPreview();
});
els.saveBtn.addEventListener('click', () => {
  collectFormToState();
  saveSettings(state);
});
els.startBtn.addEventListener('click', () => {
  collectFormToState();
  saveSettings({ ...state, score: state.score || { a: 0, b: 0 } });
  setMatchState({ status: 'running', startedAt: Date.now(), resetNonce: Date.now() });
});
els.resetBtn.addEventListener('click', () => {
  collectFormToState();
  state.score = { a: 0, b: 0 };
  saveSettings(state);
  setMatchState({ status: 'ready', startedAt: null, resetNonce: Date.now() });
});
els.openMatchBtn.addEventListener('click', () => {
  window.open('match.html', '_blank', 'noopener');
});

fillForm();
