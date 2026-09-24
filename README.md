# agent-configs

My coding-agent setup — instructions, skills, agents, commands, and plugins — in one repo,
symlinked into each harness's config directory.

## Quick start

```sh
git clone <this repo> ~/projects/agent-configs
cd ~/projects/agent-configs
./install.sh --dry-run   # preview
./install.sh             # link
```

## Layout

```
agent-configs/
├── install.sh              # symlinks the repo into harness config dirs
├── AGENTS.md               # instructions for agents working on this repo
├── CLAUDE.md               # imports AGENTS.md for Claude Code
├── instructions/
│   └── global.md           # my global instructions, loaded in every session
├── skills/                 # portable Agent Skills, shared by every harness
│   └── <id>/SKILL.md
├── commands/               # <name>.md → /<name>, shared by opencode and Claude Code
├── docs/                   # design notes, e.g. writing-skills.md
├── scripts/
│   └── lint-skills.sh      # mechanical checks for skills, commands, and agents
├── opencode/               # opencode-only files
│   ├── opencode.jsonc      # server config: models, providers, permissions, MCP
│   ├── cli.json            # TUI settings: theme, keybinds, terminal plugins
│   ├── agents/             # <id>.md
│   └── plugins/            # *.ts / *.js
└── claude/                 # Claude Code-only files
    └── agents/             # <id>.md
```

Top-level directories are harness-neutral. Anything in a format only one harness understands
goes under that harness's directory.

## What gets linked

### opencode

| Repo | Target |
| --- | --- |
| `instructions/global.md` | `~/.config/opencode/AGENTS.md` |
| `skills/` | `~/.config/opencode/skills` |
| `opencode/opencode.jsonc` | `~/.config/opencode/opencode.jsonc` |
| `opencode/cli.json` | `~/.config/opencode/cli.json` |
| `opencode/agents/` | `~/.config/opencode/agents` |
| `commands/` | `~/.config/opencode/commands` |
| `opencode/plugins/` | `~/.config/opencode/plugins` |

Machine state in `~/.config/opencode` (`service.json`, `node_modules`, lockfiles) stays unmanaged.
`$XDG_CONFIG_HOME` is respected.

### claude

| Repo | Target |
| --- | --- |
| `instructions/global.md` | `~/.claude/CLAUDE.md` |
| `skills/<id>/` | `~/.claude/skills/<id>` (one link per skill) |
| `commands/` | `~/.claude/commands` |
| `claude/agents/` | `~/.claude/agents` |

`~/.claude/skills` also holds skills Claude Code syncs itself, so each skill is linked on its own:
rerun `./install.sh claude` after adding one. `settings.json` and other state in `~/.claude` stay
unmanaged. `$CLAUDE_CONFIG_DIR` is respected.

## Browser automation

Each harness drives a different browser; `skills/browser-verify` holds the shared workflow and
doesn't name either one's tools.

| Harness | Browser | Setup |
| --- | --- | --- |
| opencode | Firefox via Playwright MCP, dedicated profile in `~/.local/share/playwright-mcp/firefox` | `mcp.servers.playwright` in `opencode/opencode.jsonc` |
| Claude Code | Your own Chrome via the Claude in Chrome extension | Install the extension, then `claude --chrome` or `/chrome`; nothing in this repo |

Claude in Chrome talks to Claude Code over Chrome native messaging, so opencode can't use it.
The Playwright server stays opencode-only: Claude Code keeps user MCP servers in `~/.claude.json`,
which can't be symlinked, and the Firefox profile allows only one browser at a time.

## install.sh

```sh
./install.sh [--dry-run] [--force] [--check] [HARNESS...]
```

- An existing target with the same content as the repo is backed up (`*.bak.<timestamp>`) and linked.
- A target that differs is left alone and reported; `--force` backs it up and links anyway.
- `--check` reports each link as `ok`, `missing`, `identical`, or `differs`, and exits 1 on anything
  but `ok`. Run it after changing settings from a harness UI to catch a tool that replaced a
  symlink with a regular file.

`opencode mcp add --global` and similar CLI commands write through the symlink into the repo.

## Adding things

Write skills, commands, and agents the way [docs/writing-skills.md](docs/writing-skills.md) describes, run
`/review-skill` on the result, and run `scripts/lint-skills.sh` before committing.

**Skill** — `skills/<id>/SKILL.md`, portable across harnesses:

```md
---
name: git-release
description: Prepare release notes, version bumps, and GitHub releases. Use when cutting a release.
---

1. Read `references/release-policy.md`.
2. ...
```

**opencode agent** — `opencode/agents/<id>.md` ([docs](https://opencode.ai/v2/docs/agents/)):

```md
---
description: Reviews changes for correctness and regressions
mode: subagent
permissions:
  - { action: edit, resource: "*", effect: deny }
---

Review the current changes. List findings in severity order with file and line references.
```

**Claude Code agent** — `claude/agents/<id>.md` ([docs](https://docs.anthropic.com/en/docs/claude-code/sub-agents)):

```md
---
name: reviewer
description: Reviews changes for correctness and regressions
disallowedTools: Write, Edit, NotebookEdit
---

Review the current changes. List findings in severity order with file and line references.
```

**Command** — `commands/<name>.md`, run as `/<name>` in opencode ([docs](https://opencode.ai/v2/docs/commands/))
and Claude Code ([docs](https://docs.anthropic.com/en/docs/claude-code/slash-commands)). Keep frontmatter to
`description`; anything harness-specific goes in `<harness>/commands/`:

```md
---
description: Review the current diff
---

Review this diff for bugs and missing tests, focusing on $ARGUMENTS:

!`git diff`
```

## Adding a harness

1. Create `<harness>/` mirroring that harness's config directory.
2. Add a `harness_<harness>` function to `install.sh` with its `link` calls, including
   `instructions/global.md` and `skills/` at the harness's global locations.
3. Append the harness to `ALL_HARNESSES`.
