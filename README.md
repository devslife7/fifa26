# FIFA World Cup 2026 — Static Archive

A permanent, view-only archive of the tournament and prediction competition. The deployed site contains only HTML, JavaScript, CSS, images, fonts, and the captured public data. It has no application server, database connection, authentication, analytics, or submission endpoints.

## What is preserved

- All 104 finished matches and the tournament champion.
- The final leaderboard: 20 competition entries, plus seven non-competing preview entries.
- Public prediction details, scoring breakdowns, and side-by-side comparisons.
- All 27 existing `/shared/<token>/` prediction pages, generated at build time.
- An interactive **Demo** of the original group picks → third-place qualifiers → knockout bracket → champion workflow.

Demo choices exist only in React memory. Reloading clears them. They never overwrite old browser drafts, change archived predictions, or submit anything. The final step displays a champion and offers **Browse demo bracket** and **Reset demo**.

Login, profile management, admin, news feeds, emails, private PDF downloads, and prediction submissions are retired. Their previous implementation remains in Git history. Team flags and fonts are bundled locally; external footer links remain optional links.

## Run and build

```sh
npm ci
npm run dev              # Next.js development server on port 7000
npm test
npm run build            # Static export to out/; no credentials or network needed
npm start                # Preview out/ at http://localhost:7000
```

If port 7000 is occupied, use `PORT=7001 npm start` or `npm run dev -- --port 7001`. Continue with ports 7002 and higher as needed. The static preview server allows GET and HEAD only. The build explicitly uses webpack for reliable local exports.

## Deployment

Configure the host to run `npm ci && npm run build` and publish **`out/`** as static files. Do not run `next start`. Use the same domain to preserve shared links. The export uses directory indexes (`/shared/<token>/index.html`); the host should serve these at the corresponding paths and use `404.html` for unknown paths. Do not add an SPA fallback that turns unknown shared tokens into the home page.

Deploy the complete export together, including `out/_next/`, flags, and fonts. No Supabase, football API, Resend, or admin environment variables are needed. Test the new deployment before retiring the previous backend; preserve the private backup separately first. This code change does not shut down remote services or delete their data.

## Archived data and privacy

The checked-in snapshot is in `src/data/archive/snapshot.json`. The separate `shared.json` token index is used only during page generation; it is not imported by the client application. Each generated shared page exposes only its own public prediction.

The capture was made on 2026-10-06. It preserves approval status, late-submission classification, and rank movements. Approved entries use the original public UI's dense ranking; preview entries do not displace them. Stored total scores and stored all-entry ranks were checked against the original scoring and ranking logic. Detail scores are also tested against the captured final fixtures.

Public records use synthetic prediction identifiers and explicitly selected fields. Account IDs, email addresses, unfinished drafts, private PDF storage paths, and authentication records are excluded. Everything shipped in a static site is public; it cannot provide private account views.

A private, ignored capture of `fixtures`, `actual_results`, `predictions`, `profiles`, and `scores` is kept under `backups/archive-<timestamp>/`. It contains personal data and must not be committed or deployed. It is a data snapshot, not a full database/storage/auth backup. See `backups/README.md` for database management details.

## Maintenance utilities

Normal builds use the checked-in snapshot and assets, never live services.

- `npm run archive:export -- --replace`: intentional read-only recapture from the existing database, using `.env.local`. It writes a private local backup first and rejects incomplete results or mismatched scores/ranks. Without `--replace`, an existing snapshot cannot be overwritten.
- `node --import tsx scripts/archive/assets.ts`: re-download the local team flags and fonts if intentionally updating assets. Existing font license files are in `src/fonts/licenses/`.
- `node scripts/verify-archive.mjs`: check the generated static files, shared pages, local assets, and absence of runtime API calls.

The original bracket, standings, third-place pairing, and scoring logic is retained. `npm test` includes archive completeness, score consistency, privacy, and demo isolation checks.
