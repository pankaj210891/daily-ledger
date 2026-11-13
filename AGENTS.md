# Development guidelines

## Git workflow

- For every task that changes repository files, start from `develop` and create a new task branch before editing. Use a conventional prefix such as `feat/`, `fix/`, `chore/`, or `enhancement/` and a concise kebab-case name.
- Read `.agents/skills/git-workflow/SKILL.md` before branching, committing, pushing, or merging.
- Commit task changes on the task branch. When asked to commit and push, push the task branch, merge it into `develop`, and push the updated `develop`. Never merge into `main` unless the user asks or requests a production deployment.
- Preserve unrelated working-tree changes. Stage only files belonging to the task. Resolve merge conflicts carefully, retaining all valid work, and verify the resulting diff before completing the merge.

## Code and component guidelines

- Read `.agents/skills/component-guidelines/SKILL.md` when formatting code or designing and sizing components.
