# "Just for fun" preview toggle on the leaderboard

## Context

The leaderboard page (`ranking` tab) currently lists only **approved** predictions —
those an admin has confirmed as competing (`is_approved = true`). Predictions that
are complete but not yet approved are invisible to everyone except their own
submitter.

The owner wants a low-stakes way to see the *full picture*: a "just for fun"
toggle that, when on, drops the non-competing (unapproved) predictions into the
same leaderboard table so you can see **where they would rank if they were
approved/participating**. These rows must be visually unmistakable as
non-competing previews, not part of the real standings.

Two confirmed UX decisions:
- **Ranking:** approved competitors keep their official rank numbers (the board
  never renumbers). Each preview row is slotted into its sorted position and
  labelled with a distinct "would-be" rank marker (e.g. `~3`).
- **Interactivity:** preview rows are fully interactive (View / Compare /
  open picks), same as real rows.

## Approach

### 1. API — return unapproved predictions on demand
**File:** `src/app/api/leaderboard/predictions/route.ts`

- Change the handler to read the request URL: `export async function GET(request: Request)`.
- Add a query flag, e.g. `?preview=1`. When present, **skip** the
  `.eq('is_approved', true)` filter (line 17) so all `is_complete = true`
  predictions are returned. Without the flag, behaviour is unchanged (approved
  only) — this keeps every other consumer safe.
- Each row already carries `is_approved` (line 143) and, when
  `arePredictionDetailsPublic()` is true, full `group_matches`/`knockout_matches`
  details — so preview rows get View/Compare for free under the same global gate
  as approved rows.
- Keep `total_users` meaning the **approved** count:
  `total_users: predictions.filter(p => p.is_approved).length`.

### 2. RankingView — toggle state, fetch, combined rows
**File:** `src/components/ranking/RankingView.tsx`

- Add `const [showPreview, setShowPreview] = useState(false);`
- In `loadLeaderboard`, fetch predictions with the preview flag:
  `fetch('/api/leaderboard/predictions?preview=1')`. Unapproved rows now live in
  the `predictions` state alongside approved ones. `visiblePredictions`
  (`predictions.filter(p => p.is_approved)`) and the participant count are
  **unchanged** — the real board is untouched.
- Derive `const previewPredictions = predictions.filter(p => !p.is_approved);`
- In the table IIFE (currently builds `approved` + `ranks` via
  `computeTiedRanks`, then `renderPredictionRow`):
  - Keep `approved` sorted + `approvedRanks` from `computeTiedRanks` exactly as
    now → these are the **official** ranks.
  - Build a unified row model `{ pred, rank, isPreview }[]`:
    - approved rows: `rank = approvedRanks[idx]`, `isPreview = false`.
    - when `showPreview`, for each preview pred compute
      `wouldBeRank = approved.filter(a => points(a) > points(pred)).length + 1`,
      push `{ pred, rank: wouldBeRank, isPreview: true }`.
    - sort the combined rows with the **same** points-desc / name-asc comparator
      already used for `approved` (extract it into one function so order is
      consistent).
  - Pass the row model into `renderPredictionRow` (change its signature from
    `(pred, idx)` to take the row object so `rank` and `isPreview` are explicit
    instead of `ranks[idx]`).
- `renderPredictionRow` changes for `isPreview` rows:
  - rank cell shows a muted `~{rank}` (tilde marker), no medal.
  - row styling distinct: dashed/`border-dashed border-white/15`, reduced
    opacity, subtle bg — clearly "not the real board".
  - add a `PREVIEW · not competing` pill next to the name (reuse the existing
    pill pattern used for the `Late` badge).
  - keep View/Compare/open-details behaviour (reuse existing
    `openPredictionDetails` / `openPredictionCompare`).
- Reuse existing helpers — no new scoring logic: `getPredictionPoints`,
  `getPredictionPrimaryName`, `renderPositionChange`, `entryMatchesPrediction`,
  and `computeTiedRanks` (`src/lib/services/leaderboard-position.ts`).
- Participant line (line ~382): when `showPreview` and previews exist, append a
  caption like `· {n} preview` and a one-line note under it making clear preview
  rows are not competing — shown only to compare positions.

### 3. Toggle UI placement
**File:** `src/components/ranking/RankingView.tsx` — inside the existing
`<section className="... md:sticky md:top-20 ...">` (currently lines ~499–502),
**after** `<KnockoutScoringCard />`.

This puts it at the bottom of the point explainer on every breakpoint: on desktop
it's the foot of the sticky right column; on mobile (single column) the explainer
is the last block before `<AppFooter />` (rendered in `src/app/page.tsx`, right
after `<RankingView />`), so the toggle lands exactly "bottom of the point
explainer, before the footer".

- A labelled switch card: title "Just for fun" + caption "Show predictions that
  aren't competing to preview where they'd rank." + a `role="switch"`
  `aria-checked={showPreview}` button styled with the app's primary color
  (mirror the pill/toggle styling already used in `KnockoutScoringCard`'s
  EN/ES toggle for visual consistency).
- `KnockoutScoringCard` itself is **not** modified (it's reused on other tabs);
  the toggle is a sibling inside the section.

## Critical files
- `src/app/api/leaderboard/predictions/route.ts` — gated unapproved fetch.
- `src/components/ranking/RankingView.tsx` — toggle state, fetch param, combined
  row model, preview styling, toggle UI.
- (read-only reuse) `src/lib/services/leaderboard-position.ts` `computeTiedRanks`.

## Verification
1. `grep` for other callers of `/api/leaderboard/predictions` (e.g. MatchesView)
   to confirm none break — the param is opt-in so defaults are unchanged, but
   verify.
2. Run the app: `npm run dev` (port 5588), open the `Ranking` tab.
3. Toggle OFF (default): table = approved only, ranks and participant count
   identical to today (no regression).
4. Toggle ON: unapproved predictions appear interleaved at their would-be
   position with `~N` rank markers, dashed styling, and a `PREVIEW · not
   competing` badge; approved competitors' rank numbers are unchanged.
5. Click a preview row → View opens its picks; Compare works against an approved
   row.
6. Confirm other tabs (Matches) are unaffected by the API change.
