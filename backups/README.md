# Database backups & how this DB is managed

## ⚠️ Do NOT run `supabase db push`

This project has **no Supabase CLI in its toolchain** — it is not pinned in
`package.json`, lockfiles, `config.toml`, CI, or any tool-version manager, and
only the client library (`@supabase/supabase-js`) is installed.

Schema changes are applied directly to the remote project
(`mdfnkufrlnoodqhdnrtj`) via the **Supabase MCP** or the **dashboard SQL
editor**. The files in `supabase/migrations/*.sql` are a *record of intended
changes*, not a CLI-driven pipeline.

Because of that, the remote migration-tracking table and the local file history
are **disjoint**:

- Remote `schema_migrations` contains only two timestamp-versioned rows
  (`20260517060422 prediction_pdfs`, `20260517061252 security_hardening`).
- Local files use a `NNN_name.sql` scheme (`001`–`017`).

To the CLI, *every* local migration `001`–`017` looks unapplied, so
`supabase db push` would try to replay the entire history starting at
`001_initial_schema.sql` and fail/conflict against the already-built schema.
**Don't do it** without first reconciling history (`migration repair
--status applied 001 … 017`) and renaming files to 14-digit timestamp prefixes
— a deliberate migration project, not a reflex.

As of 2026-06-29, migrations `015`, `016`, and `017` are already fully live in
the remote schema (verified column-by-column against the database).

## Snapshots

Snapshots protect the **irreplaceable user data**: `public.predictions` (the
bracket picks) and `public.profiles` (who made them). Everything else is
reconstructable — `fixtures` / `actual_results` come from the football API, and
`scores` is recalculated from predictions + results.

### `2026-06-29/`
Pulled live through the MCP (no DB password needed):

| File | Contents |
|------|----------|
| `predictions.json` | All predictions — full `group_matches`, `knockout_matches`, `champion_code`, tiebreakers, submitter info |
| `profiles.json` | All user profiles (id / name / email) |
| `restore.sql` | `BEGIN`…`COMMIT` of `INSERT … ON CONFLICT (id) DO NOTHING` for both tables — re-runnable, won't clobber existing rows |

**To restore:** feed `restore.sql` back through the MCP (`apply_migration` /
`execute_sql`) or `psql`. It only re-inserts missing rows, so it is safe to run
against a partially-intact table.

## Making a new snapshot

Re-run the live `SELECT json_agg(...)` queries for `predictions` and `profiles`
via the MCP and regenerate `restore.sql` (INSERT … ON CONFLICT DO NOTHING). For
a full restorable dump of the entire DB, use `pg_dump` with the direct
connection string from Dashboard → Project Settings → Database.

## ⚠️ Do not commit snapshot data

`predictions.json`, `profiles.json`, and `restore.sql` contain **real user
emails**. Keep them out of git (see repo `.gitignore`). This README is the only
file in `backups/` safe to commit.
