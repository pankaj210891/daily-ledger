---
name: git-workflow
description: Follow this repository's branch, commit, push, and merge conventions for implementation tasks.
metadata:
  short-description: Repository Git workflow
---

# Git workflow

Apply these instructions to every repository task that changes files.

## Start a task

1. Inspect `git status --short --branch`, the current branch, and relevant remote branches before changing anything.
2. Preserve existing user changes. If there are unrelated uncommitted changes, do not stage or commit them; keep them intact while working.
3. Update local `develop` from `origin/develop` when available. If `develop` does not exist yet, create it from the current project base branch without rewriting history.
4. Create a fresh task branch from `develop` before editing. Name it with a conventional type prefix and concise kebab-case summary, for example `feat/monthly-reports`, `fix/session-refresh`, `chore/git-workflow`, or `enhancement/mobile-navigation`.

## Commit and integrate

- After implementation, leave task changes uncommitted and give the developer a clear summary of the changes and what needs testing or review. Wait for the developer to test/review the implementation and explicitly confirm before staging or committing any task files. Do not treat silence, elapsed time, or a request to implement as confirmation.
- If the developer requests changes during review, make them on the same task branch and return the updated work for review. Keep the changes uncommitted until the developer confirms the review is complete.
- After explicit confirmation, stage only files belonging to the task and commit them on the task branch. Use a concise conventional commit subject where appropriate.
- After the confirmed task commit, push the task branch to `origin`, then merge it into `develop` and push the updated `develop` so the shared base stays current. Do not push or merge before developer confirmation.
- Prefer fast-forward merges when possible. If a merge conflict occurs, inspect both sides and preserve all valid work. Do not resolve by blindly choosing one side. Review the merged diff and status before pushing.
- Never merge `develop` into `main` unless the user explicitly asks or requests a production deployment.
- Leave unrelated local changes untouched. Do not include them just to make a branch clean.

## Before finishing

Before confirmation, report the task branch, changed files, implementation summary, and checks already run (or that review/testing is pending). Leave task changes uncommitted and wait for the developer's review confirmation.

After confirmation and integration, report the task commit and branch, whether the task branch and `develop` were pushed, confirm that `main` was not changed, and report any remaining uncommitted changes that predated the task.
