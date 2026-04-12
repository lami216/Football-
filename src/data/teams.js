export const teams = [
  {
    id: 'barcelona',
    displayName: 'Barcelona',
    shortName: 'BAR',
    logo: '/logos/barcelona.svg',
    primaryColor: '#A50044',
    secondaryColor: '#004D98',
    attackRating: 89,
    defenseRating: 81,
    aggressionRating: 66
  },
  {
    id: 'real-madrid',
    displayName: 'Real Madrid',
    shortName: 'RMA',
    logo: '/logos/real-madrid.svg',
    primaryColor: '#FFFFFF',
    secondaryColor: '#FEBE10',
    attackRating: 92,
    defenseRating: 86,
    aggressionRating: 62
  },
  {
    id: 'atletico-madrid',
    displayName: 'Atletico Madrid',
    shortName: 'ATM',
    logo: '/logos/atletico.svg',
    primaryColor: '#C8102E',
    secondaryColor: '#1D428A',
    attackRating: 81,
    defenseRating: 86,
    aggressionRating: 75
  },
  {
    id: 'manchester-city',
    displayName: 'Manchester City',
    shortName: 'MCI',
    logo: '/logos/man-city.svg',
    primaryColor: '#6CABDD',
    secondaryColor: '#1C2C5B',
    attackRating: 93,
    defenseRating: 88,
    aggressionRating: 58
  },
  {
    id: 'liverpool',
    displayName: 'Liverpool',
    shortName: 'LIV',
    logo: '/logos/liverpool.svg',
    primaryColor: '#C8102E',
    secondaryColor: '#00B2A9',
    attackRating: 88,
    defenseRating: 79,
    aggressionRating: 80
  },
  {
    id: 'arsenal',
    displayName: 'Arsenal',
    shortName: 'ARS',
    logo: '/logos/arsenal.svg',
    primaryColor: '#EF0107',
    secondaryColor: '#9C824A',
    attackRating: 86,
    defenseRating: 80,
    aggressionRating: 72
  },
  {
    id: 'bayern',
    displayName: 'Bayern Munich',
    shortName: 'FCB',
    logo: '/logos/bayern.svg',
    primaryColor: '#DC052D',
    secondaryColor: '#0066B2',
    attackRating: 91,
    defenseRating: 84,
    aggressionRating: 70
  },
  {
    id: 'psg',
    displayName: 'Paris Saint-Germain',
    shortName: 'PSG',
    logo: '/logos/psg.svg',
    primaryColor: '#004170',
    secondaryColor: '#DA291C',
    attackRating: 90,
    defenseRating: 78,
    aggressionRating: 64
  }
];

export const getTeamById = (id) => teams.find((team) => team.id === id) || teams[0];
