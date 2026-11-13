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

- Commit only files belonging to the current task, on its task branch. Use a concise conventional commit subject where appropriate.
- When the user asks to commit and push, push the task branch to `origin`, then merge the completed task branch into `develop` and push `develop` so the shared base stays current.
- Prefer fast-forward merges when possible. If a merge conflict occurs, inspect both sides and preserve all valid work. Do not resolve by blindly choosing one side. Review the merged diff and status before pushing.
- Never merge `develop` into `main` unless the user explicitly asks or requests a production deployment.
- Leave unrelated local changes untouched. Do not include them just to make a branch clean.

## Before finishing

Confirm the commit and branch names, whether the task branch and `develop` were pushed, and that `main` was not changed. Report any remaining uncommitted changes that predated the task.
