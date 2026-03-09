# FIFA World Cup 2026 Predictor

Predict every match of the FIFA World Cup 2026 — from the group stage all the way to the final.

## Features

- **Group Stage** — 48 teams across 12 groups (A–L), 6 matches per group. Predict each match as Home Win, Draw, or Away Win. Live standings update as you go.
- **Best 3rd Place** — Cross-group ranking of all 12 third-place teams. Top 8 advance to the knockout stage.
- **Knockout Bracket** — Auto-populates once all 48 group matches are predicted. Round of 32 → Round of 16 → Quarterfinals → Semifinals → Third Place Match → Final.
- **Champion Screen** — Displays your predicted champion with a trophy animation.
- **Progress Tracker** — Persistent bar showing your progress across all 104 matches.
- **Local Storage** — All predictions are saved in the browser and persist across sessions.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- TypeScript
- Tailwind CSS 4

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Production build         |
| `npm start`     | Start production server  |
