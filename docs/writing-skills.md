# Writing skills

How this repo writes skills, commands, and agents, and how that style gets taught and enforced. It's distilled from
this repo's skills and [mattpocock/skills](https://github.com/mattpocock/skills), and it combines two earlier drafts.
Their disagreements are settled at the end of this file.

## Decisions

1. **The style reference is vendored, not rewritten.** Copy `writing-for-agents` from mattpocock/skills into
   `skills/writing-for-agents/`, unchanged and pinned to a commit. Replace only its `SKILL-MECHANICS.md` with one that
   describes this repo's mechanics. A house digest of it would be a second copy of a source we don't control, and
   copies drift. Drift is the main problem this document diagnoses.
2. **The style is applied through a command.** `/review-skill` runs the reference as an ordered review, ending on a
   done-condition, and prints its result as a revision note.
3. **Revision notes are the examples.** Every commit that touches a skill, command, or agent explains itself as
   *observed → failure mode → lever*, so running `git log` over those paths gives a growing set of worked examples
   from this repo.
4. **Mechanical rules go in a lint script**, so reviews are spent on judgement calls.
5. **A skill is done when it has passed review and run once on a real task**, with the trace read for where the agent
   went off course. Skills that matter get `skill-creator` evals.
6. **Rewrite commands and agents first**, then the skills, in the order under [Rollout](#rollout).

## What makes a good skill

A good skill makes the agent follow the same *process* on every run, using the fewest words that change its
default behaviour. That requires four things:

- **It fires on the right tasks.** The description is always loaded, and it decides when the skill runs. Write it as
  `<Job>. Use when the user <situation>, <situation>, or says "<word>".`, with one trigger for each distinct
  situation, in the words a user actually types. A command gets a one-line summary for a human reader instead.
- **Every sentence changes behaviour.** If deleting a sentence wouldn't change what the agent does, it's a **no-op**:
  delete the whole sentence rather than trimming words from it.
- **Its steps can't be faked.** Each step ends on a criterion that is observable and demanding, stated on that step
  ("No red-capable command, no Phase 2").
- **Each meaning lives in one place.** Commands, agents, and other skills call the skill instead of restating it.

Length isn't the measure. The source's `diagnosing-bugs` is 138 lines and earns every one of them with specifics the
model wouldn't produce on its own, such as ten ways to build a feedback loop, in order. What matters is what each line does.

### Structure

| Move | Example |
| --- | --- |
| Open with the job and the one constraint that separates this skill from the default | "A prototype is **throwaway code that answers a question**. The question decides the shape." |
| Add headings only where the skill has parts | `grilling` has none |
| Bold a **leading word** (a term the model already knows) once where it's defined, then use it plainly everywhere, the description included | *seam*, *frontier*, *tight*, *red*, *tracer bullet* |
| Put each gate on the step it guards | "Done when every remaining element is load-bearing." |
| Write branches as condition → action, and move material only one branch needs into a sibling file | `prototype`: a logic question goes to `LOGIC.md`, a UI question to `UI.md` |
| Give output formats as literal templates, set apart from the instructions | the `❓ **Q1**` / `➡️` round format, `<spec-template>` |
| Invoke other skills instead of restating them | `Call the skill tool with "grilling".` |
| Record what was deliberately left out, so nobody adds it back | a "Rejected framings" section, an out-of-scope note |

### Sentences

- Imperative and addressed to the agent. No persona.
- State the target behaviour plus a clause of why. The why lets the agent handle cases the skill doesn't list:
  "Generate 3–5 ranked hypotheses before testing any of them. Single-hypothesis generation anchors on the first
  plausible idea."
- Say what to do, not what to avoid. A prohibition earns its place only as a guard on an irreversible or external
  action, and it sits next to the positive target. Uppercase adds no weight.
- Give examples as the words the agent should say, and give a default for ambiguous cases ("…and state the
  assumption").
- Say which things are facts, which the agent looks up, and which are decisions, which it puts to the user.
- Don't restate what the environment already says (`package.json`, `--help`, the directory layout). Write down
  what can't be found by looking: an unwritten convention, the reason behind a choice, a gotcha.

### Kept from this repo's current style

- **Stop-and-ask guardrails** for irreversible or external actions, like the "Stop and Ask" section in `browser-verify`.
- **Tripwires with numbers**, like `/build` halting after "3 consecutive fix attempts".
- **Always / Ask First / Never** as a section of a *spec*. It doesn't belong in a skill's instructions.
- **A negative trigger** in a description, but only where a trial run shows the skill firing on the wrong task.

## The teaching system

A craft is teachable once it has names for its failure modes, a procedure, worked examples, feedback from real use,
and machine checks. mattpocock/skills has all five, spread across different files. Here is where each one lives in
this repo:

| Piece | Where | Cost |
| --- | --- | --- |
| Failure-mode names (*no-op*, *duplication*, *sediment*, *sprawl*, *negation*, *premature completion*) | `skills/writing-for-agents/` (vendored) | Always-loaded description, which fires when skills or `AGENTS.md` are edited |
| Procedure | `commands/review-skill.md` | Nothing until you run it |
| Worked examples | Revision notes in `git log` | They accumulate as you commit |
| Feedback from real use | A trial run per skill, plus `skill-creator` evals when a skill matters | Per skill |
| Machine checks | `scripts/lint-skills.sh` | Runs before each commit |

### 1. Vendoring `writing-for-agents`

- Copy `skills/productivity/writing-for-agents/SKILL.md` from upstream commit
  `c55ee46073ed923f86ce59a5eb3b6d895095d1b7` (2026-09-18) unchanged. Add `license: MIT` and, under `metadata`, the
  source URL and that SHA. To update it, diff against upstream and pull the changes into this one directory.
- Write our own `SKILL-MECHANICS.md`. The vendored `SKILL.md` promises that file covers frontmatter, the invocation
  choice, and router skills, so ours must cover the same three topics:
  - **Frontmatter:** only the [spec](https://agentskills.io/specification) fields. Custom keys go under `metadata`.
  - **Invocation:** skills are the model-invoked layer. Anything only a user should trigger is a command, which stays
    thin: it says which skills to call, in what order, and what the done-condition is. Agents are a role plus
    permissions, and their body calls skills. (Claude Code can also preload skills through an agent's `skills:` frontmatter
    field.) Once agent bodies stop mentioning harness tools, the Claude Code and opencode copies differ only in
    frontmatter.
  - **Calling other skills:** write `Call the skill tool with "<name>"`, one call per skill. Both harnesses expose a
    skill tool, and naming the tool makes the call fire more reliably than a bare skill name does.
  - **Routers:** the commands in `commands/` (`/define`, `/plan`, `/build`) are the router layer. When one of them
    restates a skill, replace the restatement with a call to that skill.
- Don't add a pointer to AGENTS.md unless a trial run shows the description failing to fire.

### 2. `/review-skill`

The command names the process it runs, not the output it produces. The source learned that concision commands named
after their output (`/tldr`, `/no-fluff`) make the model clip words instead of cutting whole sentences.

```md
---
description: Review a skill, command, or agent against writing-for-agents
---

Call the skill tool with "writing-for-agents", then review $ARGUMENTS in this order, finishing each pass
before starting the next:

1. **Pointer.** The description names the job, then one trigger per distinct situation, in words a user types.
2. **Delete.** Run the no-op test on every sentence. Delete each sentence that fails, whole.
3. **Dedupe.** Anything another skill, command, or agent already states becomes a call to that skill.
4. **Collapse.** Replace each restated idea with a leading word, defined once.
5. **Positive.** Rewrite each prohibition as the target behaviour; keep only guards on irreversible actions.
6. **Criteria.** Every step ends on a criterion an agent could not claim without doing the work.
7. **Ladder.** Keep what every run needs; move what only some branches need into a sibling file.

Done when every remaining sentence survives the no-op test and you can name the file's leading word.
Output a revision note (Observed / Failure mode / Lever) for the commit message, then propose one real
task to trial the result on.
```

Deletion is the second pass so that later passes don't polish lines that are about to be cut. Each pass names a lever
the reference defines rather than explaining it, so the command doesn't become a second copy of the reference.

### 3. Revision notes

```
tdd: drop the Common Rationalizations table

Observed: each row restates a step of the loop as an objection to it.
Failure mode: duplication, negation.
Lever: delete; the RED step already carries the rule and its reason.
```

Add a rule to AGENTS.md: *"Run `/review-skill` on any change to `skills/`, `commands/`, or an agent, and use its revision
note as the commit body."* AGENTS.md is loaded only when working in this repo, so the rule costs nothing anywhere else.

### 4. `scripts/lint-skills.sh`

- Frontmatter keys are spec fields, `name` matches the directory, and the description is at most 1024 characters.
- Relative links resolve, and there are no escaped code fences.
- No harness-specific tool names (`WebFetch`, `run_in_background`, `mcp__`) outside `claude/` and `opencode/`.
- Command frontmatter holds only `description`.
- A warning, not a failure, when a `SKILL.md` goes over 150 lines.

When the same review comment comes up twice, ask whether the rule behind it is mechanical. If it is, turn it into a
lint check instead of adding another sentence of guidance.

## Evidence

Most of our skills say "Adapted from mattpocock/skills". Comparing them with their sources shows what an agent does
when it rewrites skills without a reference to follow:

| Source | Our adaptation |
| --- | --- |
| `grilling`: 28 lines, no headings. Asks the whole frontier each round. A cap on questions is [explicitly out of scope](https://github.com/mattpocock/skills/blob/main/.out-of-scope/question-limits.md) | 96 lines, 11 headings. Adds "max 3–4 questions per turn", which contradicts the frontier |
| `ADR-FORMAT.md`: "That's it. An ADR can be a single paragraph." | An eight-section template whose code fences are escaped, so the file renders broken |
| `codebase-design`: "Use these terms exactly", with `_Avoid_: boundary` | Glossary dropped. Uses "boundary". Adds Hyrum's Law, a leverage formula, and Chesterton's Fence |
| `to-tickets`: "ticket" throughout | Says "task" 20 times and writes `tasks/plan.md` |
| — | The TDD loop appears four times: `skills/tdd`, `commands/build.md`, and both `craftsman` agents, each worded differently |

A fixed skeleton (When to Use, When NOT to Use, Common Rationalizations, Verification) makes up about a third of the
lines in `codebase-design`, `grilling`, and `tdd`.

## Worked revisions

**Description: `codebase-design`.**
Before: "Principles for deep module architecture and high-leverage interface design. Use when creating new services or
modules, untangling tightly coupled subsystems, designing APIs, or refactoring architecture."
After: "Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface,
find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill
needs the deep-module vocabulary."
Failure modes: the leading words are missing from the pointer, and nothing lets other skills reach it. "Principles"
invites exposition, where "vocabulary" asks for exact terms.

**Agent: `craftsman`.**
Before: 34 lines. A persona, restated `tdd` and `codebase-design` rules, and tool-usage lines that differ between the
two harnesses.
After:

```md
Implement the task you are given, test-first. Call the skill tool with "tdd" and follow it. When the shape of
an interface is in question, call it with "codebase-design" too. Finish by reporting what changed and the
command whose output proves it.
```

Failure modes: persona (a no-op), duplication, and harness tool names.

**Rationalization row: `tdd`.**
Before: `| "I will write the tests after implementing." | Tests written after code test what was built… |`
After: deleted. The RED step already carries the rule, and quoting the temptation puts it into context. Keep a row like
this only when a trace shows the agent making that exact argument, and even then write it as the target behaviour plus
the reason.

## Rollout

1. **Infrastructure:** vendor `writing-for-agents` with our `SKILL-MECHANICS.md`, add `/review-skill`,
   `scripts/lint-skills.sh`, and the AGENTS.md rule. Make the repo's first commit, so revision notes have a baseline.
2. **Commands and agents:** make them thin callers of skills. This removes the extra copies of the TDD loop, the second
   plan template, and the third copy of the spec outline.
3. **`codebase-design`:** restore the glossary, the `_Avoid_` lists, and "Use these terms exactly". Cut the exposition.
4. **`grilling`, `tdd`, `ADR-FORMAT.md`:** bring them back toward the source, removing the question cap and fixing the
   escaped fences.
5. **Vocabulary:** use *ticket*, matching the skill name and the vendored reference, in the body and the output path.
   Replace "human architect" with "the user".
6. **Frontmatter:** move `pack`, `attribution`, and `references` under `metadata`. `references` can go entirely, since
   the body already links its sibling files.
7. **`browser-verify`:** run it on a real task, then decide whether "close the tabs you opened" and "wait on conditions"
   change the agent's behaviour.

Each rewrite goes through `/review-skill`, one trial run, and a commit with a revision note.

## Settled disagreements

| Question | Drafts | Settled | Why |
| --- | --- | --- | --- |
| Where the reference comes from | A house `writing-skills` skill, or vendoring upstream | Vendor | A digest is a copy that drifts, which is the failure being fixed |
| Where the procedure lives | Inside the model-invoked skill, or a command | Command | Costs no context until it's run, and runs the same way every time |
| Where examples come from | A static `EXAMPLES.md`, or git history | Revision notes | They accumulate on their own, and a static file has to be maintained |
| AGENTS.md pointer to the reference | Add one, or wait for evidence | Wait. Add the `/review-skill` rule instead | The description should fire on its own; the rule is what makes revision notes happen |
| Is the problem length? | "About twice as long", or "what the lines do" | What the lines do | Long skills upstream earn their length with specifics |
