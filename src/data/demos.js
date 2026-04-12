export const demoSetups = {
  elClasico: {
    name: 'El Clasico Demo',
    themeId: 'la-liga',
    homeTeamId: 'barcelona',
    awayTeamId: 'real-madrid',
    matchDate: '2026-04-25',
    matchTime: '21:00',
    duration: 30,
    mode: 'scripted',
    scriptedEvents: [
      { id: 'e1', minute: 9, team: 'home', type: 'dangerous_attack', player: 'Lamine Yamal', secondaryPlayer: '' },
      { id: 'e2', minute: 18, team: 'away', type: 'goal', player: 'Vinicius Jr', secondaryPlayer: 'Bellingham' },
      { id: 'e3', minute: 33, team: 'home', type: 'yellow_card', player: 'Gavi', secondaryPlayer: '' },
      { id: 'e4', minute: 42, team: 'home', type: 'goal', player: 'Lewandowski', secondaryPlayer: 'Pedri' },
      { id: 'e5', minute: 71, team: 'away', type: 'big_chance', player: 'Rodrygo', secondaryPlayer: '' },
      { id: 'e6', minute: 84, team: 'home', type: 'save', player: 'Ter Stegen', secondaryPlayer: '' }
    ]
  },
  uclFinal: {
    name: 'UCL Final Demo',
    themeId: 'ucl',
    homeTeamId: 'manchester-city',
    awayTeamId: 'bayern',
    matchDate: '2026-05-30',
    matchTime: '20:00',
    duration: 20,
    mode: 'auto',
    scriptedEvents: []
  }
};
