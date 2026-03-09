# FIFA World Cup 2026 Predictions Web App

Build a FIFA World Cup 2026 predictor app.
Use the attached FIFA World Cup trophy image as the logo/hero asset.

## Visual Identity — from the trophy image:
Background: Crisp white (#FFFFFF)
Primary text: Pure black (#000000)

Accent: Rich metallic gold (warm, from the trophy — not yellow)

Secondary accent: Deep malachite green (from the trophy base) not used much

Typography: from image provided

UI feel: Premium luxury sports app.

## Tournament Format (2026 — 48 teams, 12 groups): Group Stage:

12 groups (A–L) of 4 teams each → each of the 12 groups has 4 teams, and every team plays the other 3 once. That's 6 matches per group × 12 groups = 72 matches.

User predicts every single match: Team A wins | Draw | Team B wins

After all 6 matches in a group are predicted, auto-calculate standings: Points (3W/1D/0L)

Top 2 teams from each group automatically advance (24 teams total) Best 3rd Place Selection:

All 12 third-place teams are ranked in a single cross-group table: Points

The best 8 of the 12 advance to the Round of 32; 4 are eliminated

Show a dedicated "Best 3rd Place" screen with the live cross-group ranking table updating as the user fills in group matches

Once all 72 group matches are predicted, automatically select the 8 advancing 3rd-place teams and slot them into the bracket using FIFA's predefined pairing matrix based on their group of origin — fully programmatic, no manual input needed Knockout Stage:

Round of 32 → Round of 16 → Quarterfinals → Semifinals → Third Place Match → Final

No draws in knockout rounds — every match has a winner only (Team A | Team B)

The full bracket auto-populates the moment all 48 group predictions are complete

Users can then predict all remaining knockout matches straight through to the champion

Unresolved knockout slots (upstream not yet predicted) show a pulsing gold "?" placeholder — non-interactive until unlocked

Total: 104 matches predicted across the entire tournament Match Prediction UI:

Each match card: flag + country name on both sides

Group stage: three tap targets (Home | Draw | Away)

Knockout stage: two tap targets (Home | Away)

Gold highlight + glow on the selected outcome

Locked matches show a gold lock icon Progress & Navigation:

Persistent progress tracker: "X / 104 matches predicted"

Sticky bottom nav: Groups | 3rd Place | Bracket | Champion | Leaderboard

Smooth transitions between all sections

Flag icons next to every country name throughout Champion Screen:

Final screen showing the user's predicted champion

Trophy logo image displayed prominently with a gold glow/pulse animation Save & Share via Email:

Once the user completes all 104 match predictions, show a "Save & Share My Predictions" screen

Ask the user for: their name (display name for the leaderboard) + their email address

On submission:

Save their full predictions to a backend linked to their name and email

Generate a unique shareable link to their bracket

Send them a confirmation email containing a full summary of their predictions, a styled bracket image or PDF in the black/white/gold palette, and their unique bracket link

Show a confirmation screen after submission: trophy icon + "Your predictions have been saved!" in gold

Also include a native share button (copy link / share sheet) for WhatsApp, iMessage, etc. Leaderboard:

Accessible from the bottom nav at any time

Displays all users who have submitted their predictions, ranked by score on a leaderboard

Scoring system (calculated automatically as real World Cup results come in fron api):

Correct group stage match result: 1 point

Correct Round of 32 qualifier (team advances): 2 points

Correct Round of 16 qualifier: 3 points

Correct Quarterfinal qualifier: 4 points

Correct Semifinal qualifier: 5 points

Correct finalist: 6 points

Correct champion: 10 points

show the point system explanined in the leaderboard section

Leaderboard shows: display name, score, predicted champion flag

Highlight the current user's row in gold so they can find themselves instantly

Top 3 entries get gold / silver / bronze trophy icons next to their rank