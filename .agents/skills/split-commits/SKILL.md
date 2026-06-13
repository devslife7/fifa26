---
name: split-commits
description: Analyze uncommitted or staged changes, group them by intent, and create separate focused commits in dependency order. Use when the user asks to split commits, separate concerns, commit changes individually, divide work by intent, or organize a messy working tree into reviewable commits.
---

# Split Commits by Concern

Turn one dirty working tree into several small, reviewable commits, each with a single clear intent.

## Hard Rules

- Never use `git add .` or `git add -A` unless the user explicitly wants one big commit.
- Never commit secrets (`.env`, credentials, keys).
- Never run destructive git commands (`reset --hard`, force-push, etc.) unless explicitly requested.
- Never amend unless the user asks and the last commit was unpushed and created in this session.
- Stage only the files or hunks belonging to the current commit.

## Phase 1: Inspect

Run in parallel:

```bash
git status
git diff && git diff --staged
git log -8 --oneline
```

Also check untracked files:

```bash
git ls-files --others --exclude-standard
```

## Phase 2: Group by Intent

Cluster changed files into logical groups.

| Group type | Examples |
|------------|----------|
| Schema / infra | Prisma migrations, config, auth events |
| New feature | New routes, components, lib modules |
| Refactor | Extracted modules, renamed paths, no behavior change |
| UI polish | Layout, responsive, styling only |
| Docs / assets | README, DESIGN.md, logos, mockups |
| Tests | Test files matching a feature |

For each group, write:

1. Intent: one sentence on why these files belong together.
2. Files: exact paths.
3. Depends on: which other groups must land first.

Draw dependencies when non-obvious, with foundations before consumers.

## Phase 3: Propose Commit Plan

Present an ordered table before committing:

```markdown
| # | Message | Files | Depends on |
|---|---------|-------|------------|
| 1 | Track user last login on sign-in. | prisma/..., auth.ts | - |
| 2 | Rebrand logo mark and PWA icons. | public/logo.svg, ... | - |
```

Order commits by these rules:

- Migrations before code that uses the schema.
- Shared components before pages that import them.
- Brand assets before UI that references new paths.
- When unsure, order so each commit leaves the tree buildable.

Wait for user approval unless they already said to execute, such as "implement the plan."

## Phase 4: Execute Commits

For each commit, in order:

```bash
git add <file1> <file2> ...
git commit -m "$(cat <<'EOF'
Short summary sentence.

Optional body with extra detail.
EOF
)"
git status
```

### Mixed-Intent Files

When one file spans two groups, use partial staging:

```bash
git add -p path/to/file
```

If splitting hunks is too tedious, note in the commit message that the file includes a secondary concern, or ask the user which group wins.

### Commit Messages

- Match recent repo style from `git log`.
- Focus on why, not a file list.
- Use one intent per commit. If the message needs "and also", split further.

## Phase 5: Verify

After the last commit:

```bash
git status
git log -N --oneline
```

Use `N` as the number of commits created. Report the commit list with hashes and note anything left unstaged.

## Example Split

Input: 36 files mixing last-login tracking, logo rebrand, profile page, sidebar redesign, and gallery responsive fixes.

Output:

1. Track user last login on sign-in.
2. Rebrand logo mark, wordmark, and PWA icons.
3. Add shared AccessDenied component for tool pages.
4. Add team members list for managers and admins.
5. Add profile page with team tab and extracted sign-out modal.
6. Redesign sidebar with profile footer.
7. Preserve callbackUrl across login, logout, and auth errors.
8. Improve responsive layout for review drink selection cards.
9. Improve mobile PDF preview and gallery review layout.

## Anti-Patterns

- One commit per file, which is too granular.
- Mixing unrelated features, such as "Add profile page and fix PDF footer."
- Committing generated lockfile churn with unrelated UI work.
- Skipping dependency analysis, such as putting a profile page before an AccessDenied component exists.
