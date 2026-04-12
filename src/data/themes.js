export const themes = [
  {
    id: 'la-liga',
    name: 'La Liga',
    accent: '#ff4d6d',
    secondary: '#462255',
    headerGradient: 'linear-gradient(110deg, #462255, #ff4d6d)',
    panelGlow: 'rgba(255, 77, 109, 0.35)'
  },
  {
    id: 'ucl',
    name: 'UEFA Champions League',
    accent: '#3f8cff',
    secondary: '#111f5a',
    headerGradient: 'linear-gradient(110deg, #111f5a, #3f8cff)',
    panelGlow: 'rgba(63, 140, 255, 0.35)'
  },
  {
    id: 'premier-league',
    name: 'Premier League',
    accent: '#b5179e',
    secondary: '#3a0ca3',
    headerGradient: 'linear-gradient(110deg, #3a0ca3, #b5179e)',
    panelGlow: 'rgba(181, 23, 158, 0.35)'
  },
  {
    id: 'world-cup',
    name: 'World Cup',
    accent: '#06d6a0',
    secondary: '#073b4c',
    headerGradient: 'linear-gradient(110deg, #073b4c, #06d6a0)',
    panelGlow: 'rgba(6, 214, 160, 0.35)'
  }
];

export const getThemeById = (id) => themes.find((theme) => theme.id === id) || themes[0];
