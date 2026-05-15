# FIFA World Cup 2026 Predictor

Predict every match of the FIFA World Cup 2026 — from the group stage all the way to the final.

## Features

- **Group Stage** — 48 teams across 12 groups (A–L), 6 matches per group. Predict each match as Home Win, Draw, or Away Win. Live standings update as you go.
- **Best 3rd Place** — Cross-group ranking of all 12 third-place teams. Top 8 advance to the knockout stage.
- **Knockout Bracket** — Auto-populates once all 48 group matches are predicted. Round of 32 → Round of 16 → Quarterfinals → Semifinals → Third Place Match → Final.
- **Champion Screen** — Displays your predicted champion with a trophy animation.
- **Progress Tracker** — Persistent bar showing your progress across all 104 matches.
- **Local Storage** — All predictions are saved in the browser and persist across sessions.

## Scoring

### Group stage

- **+1 point** for each group match where the predicted result (Home / Draw / Away) matches the actual result.

### Knockout stage

Knockout scoring is **team-based, not slot-based**. For each match in your predicted bracket, look at the team you picked to win it. If that team actually advanced past the corresponding round in reality, you earn that round's points — even if the match-up in the real bracket was against a different opponent than you predicted.

| Round                   | Points |
| ----------------------- | ------ |
| Round of 32 (R32)       | 2      |
| Round of 16 (R16)       | 3      |
| Quarterfinal (QF)       | 4      |
| Semifinal (SF)          | 5      |
| Third-place match (3RD) | 3      |
| Final (FIN)             | 6      |

If the team you predicted to win a match never reached that round in reality (because they lost earlier), you score 0 for that pick.

### Champion bonus

- **+10 points** if your predicted champion actually wins the tournament. All-or-nothing — there is no partial credit for the champion reaching the Final or Semifinal.

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
