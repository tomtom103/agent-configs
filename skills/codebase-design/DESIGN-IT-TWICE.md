# Design It Twice

Your first interface for a module is unlikely to be the best one (Ousterhout). When the user wants to compare
alternatives, design it several radically different ways at once, each under its own constraint, then compare.

Uses the vocabulary in [SKILL.md](SKILL.md): **module**, **interface**, **seam**, **adapter**, **leverage**.

## 1. Frame the problem space

Write the user a short explanation of the problem for the chosen module:

- The constraints any new interface has to satisfy.
- The dependencies it relies on, and each one's category from [DEEPENING.md](DEEPENING.md).
- A rough code sketch that makes the constraints concrete: an illustration, not a proposal.

Show it to the user, then go straight on to step 2. The user reads while the designs are drafted.

## 2. One design per constraint

Dispatch the `design-explorer` agent once per constraint, all in parallel, so no design sees the others:

1. Minimise the interface: 1–3 entry points, maximum leverage per entry point.
2. Maximise flexibility: support many use cases and extension.
3. Optimise for the most common caller: make the default case trivial.
4. If a dependency is remote or external: design around ports and adapters at those seams.

Every run gets the same technical brief, plus its one constraint. The brief covers the files involved, how they're
coupled, each dependency's category, and what sits behind the seam. It's separate from the step 1 explanation, which is
written for the user. Without a `design-explorer` agent, send a general subagent the same brief plus the vocabulary from
[SKILL.md](SKILL.md) and `CONTEXT.md`, and ask it for the interface, a call site, what the implementation hides, the
dependency strategy, and the trade-offs.

Done when every run has returned a design.

## 3. Compare and recommend

Present the designs one at a time so the user can absorb each, then compare them in prose by **depth** (leverage at the
interface), **locality** (where change concentrates), and **seam placement**.

Finish with your recommendation: the strongest design and why, or a hybrid where parts of different designs combine
well. The user wants a strong read, not a menu.
