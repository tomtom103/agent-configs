# AGENTS.md — agent-configs

Personal agent configuration (instructions, skills, agents, commands, plugins) shared across
coding-agent harnesses. `install.sh` symlinks it into each harness's config directory, so
edits here are live everywhere.

## Layout
- `instructions/global.md` — personal instructions loaded in every session, for every harness
- `skills/<id>/SKILL.md` — portable [Agent Skills](https://agentskills.io), shared by every harness
- `commands/<name>.md` — slash commands (`/<name>`), shared by opencode and Claude Code
- `opencode/` — opencode-only files, mirroring `~/.config/opencode/`
  - `opencode.jsonc` — server config (models, providers, permissions, MCP)
  - `cli.json` — TUI settings (theme, keybinds, terminal plugins)
  - `agents/<id>.md`
  - `plugins/<id>/` — one folder per plugin; opencode loads its `index.ts` by filename, and its
    `package.json` holds only dev dependencies and a `check` script
- `claude/` — Claude Code-only files, mirroring `~/.claude/`
  - `agents/<id>.md` — subagents (frontmatter: `name`, `description`, `tools`/`disallowedTools`)
- `CLAUDE.md` — imports this file; Claude Code reads `CLAUDE.md`, not `AGENTS.md`
- `CONTEXT.md` — the domain glossary
- `install.sh` — one `harness_<name>` function per harness, each a list of `link SRC DST` calls
- `docs/` — design notes; `docs/writing-skills.md` is how skills, commands, and agents are written
- `scripts/lint-skills.sh` — mechanical checks for skills, commands, and agents

## Commands
```sh
./install.sh --dry-run    # preview
./install.sh              # link every harness (or: ./install.sh opencode claude)
./install.sh --check      # report link status; exit 1 on missing/drifted links
./install.sh --force      # back up and replace targets that differ from the repo
scripts/lint-skills.sh    # frontmatter, agent-copy parity, harness tool names, links
```

## Rules
- Put anything that works across harnesses at the top level (`skills/`, `instructions/`);
  harness-specific formats go under that harness's directory
- `instructions/global.md` is sent with every request, in every project and both harnesses. A line
  belongs there only when it holds across projects and changes what the agent does by default; a
  rule for one project goes in that project's `AGENTS.md`
- Skills must stay portable: reference supporting files with paths relative to `SKILL.md`, and
  describe a capability ("whichever browser automation this session provides") rather than naming
  a tool only one harness or plugin provides
- Shared commands may only use frontmatter both harnesses understand (`description`); a command
  needing `agent`, `model`, or `allowed-tools` goes under that harness's directory instead
- Agents exist once per harness (`opencode/agents/`, `claude/agents/`) because their frontmatter
  differs; the two copies share one body
- Run `/review-skill` on any change to `skills/`, `commands/`, or an agent, and use its revision
  note as the commit body. Before committing, run `scripts/lint-skills.sh` and fix what it reports
  in the files you touched
- `skills/writing-for-agents/SKILL.md` is vendored: its body stays as upstream wrote it, updated by
  diffing against the commit in its `metadata`. This repo's mechanics live in its `SKILL-MECHANICS.md`
- Claude Code: `~/.claude/skills` also holds Claude-managed skills, so `install.sh` links each skill
  individually — rerun it after adding a skill, and delete the stale link after removing one
- Only the repo root may contain a file named `AGENTS.md` — opencode loads any `AGENTS.md` it
  discovers as instructions for that directory
- Never commit secrets. Use `{env:VAR}` substitution in opencode config, and prefer OAuth for MCP servers
- `.opencode/` is machine-local and gitignored; its `opencode.json` only applies when working in this repo,
  so shared config never goes there
- Every `link` call in `install.sh` must have a source in the repo
- Adding a harness: create `<harness>/`, add a `harness_<harness>` function, and append it to
  `ALL_HARNESSES`
- opencode: follow the V2 docs at https://opencode.ai/v2/docs/, not the V1 docs. V2 reads only
  `AGENTS.md` for instructions (no `CLAUDE.md` fallback)
- opencode saves TUI settings (theme, plugins) by rewriting `cli.json`, which replaces the link with a regular file.
  When `./install.sh --check` reports it as `differs`, copy the file back into `opencode/cli.json` and rerun `install.sh`
- `opencode/opencode.jsonc` still uses V1 field names (`provider`, `options`); V2 accepts them.
  Keep each provider/agent/command entry entirely in one format when editing
