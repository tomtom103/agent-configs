# Skill mechanics

The skill-specific branch of [`writing-for-agents`](SKILL.md), for this repo: frontmatter, the invocation choice,
calling other skills, and routers. Everything else about writing is the universal reference in `SKILL.md`.

## Frontmatter

A skill's frontmatter holds only the [Agent Skills spec](https://agentskills.io/specification) fields: `name`
(equal to the directory name), `description`, and optionally `license`, `compatibility`, `metadata`, and
`allowed-tools`. Anything else (attribution, an upstream source) goes under `metadata` as a string value.

## Invocation

Three layers, each paying a different load:

- A **skill** is the model-invoked layer. Its `description` is a context pointer loaded in every session, in every
  harness: permanent context load, paid so the agent, a command, an agent, or another skill can reach it. Write a
  model-facing description carrying the trigger branches (the pointer rules in `SKILL.md` apply in full).
- A **command** (`commands/<name>.md`) is the user-invoked layer: only a human typing `/<name>` runs it. Zero context
  load; it spends cognitive load instead. Its `description` is a one-line summary for a human, and it is the only
  frontmatter a shared command carries. Keep the body thin: which skills to call, in what order, and the done-condition.
- An **agent** (`claude/agents/`, `opencode/agents/`) is a role plus permissions, run in its own context window. Its
  description is the pointer the main agent reads to decide when to delegate, so write it like a skill's: the job, then
  when to hand off. Its body calls skills rather than restating them and names no harness tool, so the Claude Code and
  opencode copies share one body and differ only in frontmatter.

Make it a skill when the agent must reach the material on its own, or a command or agent must. Make it a command when
only a human should start it. Make it an agent when the work needs its own context window or narrower permissions.

## Calling other skills

Write `Call the skill tool with "<name>".` Both harnesses expose a skill tool, and naming the tool fires more reliably
than a bare skill name in prose. The tool takes one skill per call, so a step needing two says so: `Call the skill tool
twice, for "grilling" and "domain-modeling".`

Shared reference lives inside the skill that owns it. Other files reach it by calling that skill, not by linking into
its folder.

## Splitting by invocation

Split off a new skill when a distinct leading word should trigger it on its own (a word you actually use in prompts),
or when a command, agent, or another skill must reach it. The new description is permanent context load, so that
independent reach has to be worth it.

## Routers

The commands (`/define`, `/plan`, `/build`) are the router layer: they sequence skills into one flow. Routing lives
there and nowhere else. A skill's steps end on its own completion criterion rather than naming the next command, since
the same skill also runs inside agents, where no command exists. When a command restates a skill, replace the
restatement with a call to that skill.
