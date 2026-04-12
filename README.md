# Football Match Content Studio

A polished MVP creator tool for generating short, stylized football match simulation content for TikTok, Reels, and Shorts.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
```

## How to replace team logos

1. Put your logo files into `public/logos`.
2. Open `src/data/teams.js`.
3. Update each team object's `logo` path.

Current setup uses lightweight SVG placeholders so swapping to real assets later is trivial.

## Where to edit core data

- Themes/competitions: `src/data/themes.js`
- Teams and ratings: `src/data/teams.js`
- Demo presets and scripted examples: `src/data/demos.js`

## Main project structure

- `src/components`: setup panel, scoreboard, canvas container, popups, final card
- `src/canvas`: field/token drawing helpers
- `src/hooks`: simulation loop state hook
- `src/lib`: event generation, timeline mapping, helpers
- `src/styles`: app styling
