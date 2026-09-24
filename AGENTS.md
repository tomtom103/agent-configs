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
  - `agents/<id>.md`, `plugins/*.ts`
- `claude/` — Claude Code-only files, mirroring `~/.claude/`
  - `agents/<id>.md` — subagents (frontmatter: `name`, `description`, `tools`/`disallowedTools`)
- `CLAUDE.md` — imports this file; Claude Code reads `CLAUDE.md`, not `AGENTS.md`
- `install.sh` — one `harness_<name>` function per harness, each a list of `link SRC DST` calls

## Commands
```sh
./install.sh --dry-run    # preview
./install.sh              # link every harness (or: ./install.sh opencode claude)
./install.sh --check      # report link status; exit 1 on missing/drifted links
./install.sh --force      # back up and replace targets that differ from the repo
```

## Rules
- Put anything that works across harnesses at the top level (`skills/`, `instructions/`);
  harness-specific formats go under that harness's directory
- Skills must stay portable: directory name is the ID (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤64 chars),
  frontmatter `name` equals the directory name, and `description` says when to use it.
  Reference supporting files with paths relative to `SKILL.md`, and don't name tools that
  only one harness or plugin provides
- Shared commands may only use frontmatter both harnesses understand (`description`); a command
  needing `agent`, `model`, or `allowed-tools` goes under that harness's directory instead
- Agents exist once per harness (`opencode/agents/`, `claude/agents/`) because their frontmatter
  differs; when editing an agent's prompt, update both copies
- Claude Code: `~/.claude/skills` also holds Claude-managed skills, so `install.sh` links each skill
  individually — rerun it after adding a skill, and delete the stale link after removing one
- Only the repo root may contain a file named `AGENTS.md` — opencode loads any `AGENTS.md` it
  discovers as instructions for that directory
- Never commit secrets. Use `{env:VAR}` substitution in opencode config, and prefer OAuth for MCP servers
- `.opencode/opencode.json` is machine-local and gitignored; it only applies when working in this repo,
  so shared config never goes there
- Every `link` call in `install.sh` must have a source in the repo
- Adding a harness: create `<harness>/`, add a `harness_<harness>` function, and append it to
  `ALL_HARNESSES`
- opencode: follow the V2 docs at https://opencode.ai/v2/docs/, not the V1 docs. V2 reads only
  `AGENTS.md` for instructions (no `CLAUDE.md` fallback)
- `opencode/opencode.jsonc` still uses V1 field names (`provider`, `options`); V2 accepts them.
  Keep each provider/agent/command entry entirely in one format when editing
