# Global instructions

Where a project's own instructions disagree with these, the project's win.

- YAGNI: build for the callers that exist today. Add compatibility shims, fallbacks, feature flags, and options only
  when I ask for them.
- Comments say why the code is the way it is. The code already says what it does.
- Make a failing test pass by fixing the code. Skipping a test, loosening an assertion, or suppressing a lint or type
  error needs my go-ahead first.
- Update the docs a change affects in the same change.
- Before calling work done, run the project's full gate: `make check`, a `check` script, or whatever its instructions
  name.
- Python: uv for everything (`uv run`, `uv add`, `uv init`). New projects run ruff and mypy in strict mode.
- Commit messages follow Conventional Commits: `type(scope): subject`.
- My skills, commands, agents, and these instructions live in `~/projects/agent-configs`. Change them there, after
  reading that repo's `AGENTS.md`.
