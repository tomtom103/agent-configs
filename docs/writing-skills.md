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

### 1. `writing-for-agents`, vendored

[`skills/writing-for-agents/SKILL.md`](../skills/writing-for-agents/SKILL.md) is upstream's file with the body
unchanged. Its `metadata` records the source URL and commit (`c55ee46`, 2026-09-18). To update it, diff against
upstream and pull the change into that one directory.

Upstream's `SKILL-MECHANICS.md` is replaced by [ours](../skills/writing-for-agents/SKILL-MECHANICS.md). The vendored
file promises that its mechanics file covers frontmatter, the invocation choice, and routers. Ours covers those for
this repo's three layers: skills (model-invoked), commands (user-invoked, and the router layer), and agents (a role
plus permissions, one body shared by both harnesses).

There's no AGENTS.md pointer to the reference, because its description should fire on its own. Add one only if a
trial run shows it failing to.

### 2. `/review-skill`

[`commands/review-skill.md`](../commands/review-skill.md) applies the reference as seven ordered passes. It ends on a
done-condition and prints a revision note. Its shape is deliberate:

- The name is the process, not the output. Upstream found that concision commands named after their output (`/tldr`,
  `/no-fluff`) make the model clip words instead of cutting whole sentences.
- Deletion is the second pass, so that later passes don't polish lines that are about to be cut.
- Each pass names a lever the reference defines rather than explaining it, so the command doesn't become a second copy
  of the reference.

### 3. Revision notes

```
tdd: drop the Common Rationalizations table

Observed: each row restates a step of the loop as an objection to it.
Failure mode: duplication, negation.
Lever: delete; the RED step already carries the rule and its reason.
```

AGENTS.md requires `/review-skill` on any change to `skills/`, `commands/`, or an agent, with its revision note as the
commit body. AGENTS.md is loaded only when working in this repo, so the rule costs nothing anywhere else.

### 4. `scripts/lint-skills.sh`

[The script](../scripts/lint-skills.sh) checks skill frontmatter against the spec, keeps shared commands to
`description`, requires each agent's two copies to share one body, and catches harness tool names outside `claude/` and
`opencode/`, unquoted `: ` in frontmatter values (invalid YAML), broken relative links, and escaped code fences. A
`SKILL.md` over 150 lines gets a warning, not an error.
The script itself is the full list of checks.

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

1. **Infrastructure.** Done: the vendored reference with our `SKILL-MECHANICS.md`, `/review-skill`,
   `scripts/lint-skills.sh`, the AGENTS.md rules, and a baseline commit.
2. **Commands, agents, and the workflow's vocabulary.** Done, in one change so the chain worked at every commit.
   - The commands are thin callers of skills, which removed the extra copies of the TDD loop, the plan template, the
     spec outline, and the question cap.
   - The workflow says *ticket* throughout and keeps one plan file, `TICKETS.md`, beside the spec. `/build` works
     through it one ticket at a time and ticks each off.
   - Each agent pair shares one body that calls skills and names no harness tool. The descriptions say when to delegate.
     `craftsman` and `/build` call `browser-verify`, and `codebase-researcher` and `design-explorer` call
     `codebase-design`.
   - Skills end on their own completion criterion. Routing to the next step lives only in the commands, since a skill
     running inside an agent has no command to route to.
3. **`codebase-design`.** Done. The glossary, the `_Avoid_` lists, and "Use these terms exactly" are restored from
   upstream, and the exposition is cut. `DESIGN-IT-TWICE.md` sends out one `design-explorer` run per constraint, in
   parallel, and leaves the shape of each design to the agent.
4. **`grilling`, `tdd`, `domain-modeling`.** Done. `grilling` is upstream's, question cap gone. `domain-modeling`
   and its two format files are upstream's too, which fixed the escaped fences in `ADR-FORMAT.md`. `tdd` gets back
   upstream's `tests.md` and `mocking.md`. Four departures from upstream:
   - `tdd` keeps REFACTOR, as a rule of the loop. Upstream moved it into a `code-review` skill, which this repo doesn't
     have.
   - `tdd`'s description narrows to test-first work, red-green-refactor, and bugs reproduced as a failing test.
     `/build` and `craftsman` call it directly, so the broad trigger only made it fire where nobody asked for test-first.
   - `tdd` keeps three rules from our version, in positive form: red means the behaviour is missing (not a compile
     error), a bug's first test reproduces the reported symptom, and green means every test and lint rule is live. A seam
     named in the ticket counts as agreed, so `/build` doesn't stop to reconfirm it.
   - `domain-modeling` writes to the project's existing glossary or ADR location when it has one, instead of creating
     `docs/adr/` next to it.
5. **Frontmatter.** Done. `pack` and `attribution` sit under `metadata`, and `references` is gone, since each body
   already links its sibling files.
6. **`browser-verify`:** run it on a real task, then decide whether "close the tabs you opened" and "wait on conditions"
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
