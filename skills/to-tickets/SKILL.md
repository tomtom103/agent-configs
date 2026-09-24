---
name: to-tickets
description: Break a spec, plan, or design into tracer-bullet tickets, each declaring the tickets that block it. Use when the user wants work broken into tickets or slices before it's built.
license: MIT
metadata:
  pack: core
  attribution: Adapted from mattpocock/skills (MIT License)
---

# To Tickets

Break a spec, plan, or design into **tickets**: **tracer-bullet** slices, each declaring the tickets that **block**
it. Tickets with no open blockers are the **frontier**, and can be built now or in parallel.

## Slicing

- **Vertical.** Each ticket cuts a narrow but complete path through every layer it touches (schema, logic, interface,
  tests), so it's verifiable on its own and the software works when it lands. Slicing by layer ("all the tables", then
  "all the routes") defers integration to the end and leaves nothing testable in between.
- **Sized for one fresh context window**: roughly 50–150 lines of focused diff.
- **Blocked only by what truly gates it.** Every extra edge shrinks the frontier.
- **Prefactor first.** "Make the change easy, then make the easy change." If the code needs reshaping before the
  feature fits, that's the first ticket.

A **wide refactor** is the exception: one mechanical change (renaming a column, retyping a shared symbol) whose blast
radius fans across the codebase, so no single slice can land green. Sequence it as **expand-contract**:

1. **Expand:** add the new form beside the old, so nothing breaks.
2. **Migrate:** move callers over in batches sized by blast radius (per package or directory). Each batch is a ticket
   blocked by the expand, and CI stays green because the old form still exists.
3. **Contract:** delete the old form, in a ticket blocked by every migrate batch.

When even the batches can't stay green on their own, put them on a shared integration branch, all blocking one final
integrate-and-verify ticket. Only that ticket promises green.

## Process

1. **Gather.** Work from the spec or plan in the conversation. If the user passed a path or an issue, read it in full;
   with neither, read `SPEC.md`. Read the code the tickets will touch, and name things in the project's domain
   vocabulary (`CONTEXT.md`, if it exists).
2. **Draft** the tickets by the slicing rules. Give each one a **seam**: the test file where its first test goes red.
3. **Quiz the user.** Show the tickets as a numbered list with title, blockers, and what each delivers end to end. Ask
   whether the granularity is right, whether any blocking edge could go, and what to merge or split. Revise until the
   user approves.
4. **Write** the approved tickets to `TICKETS.md` beside the spec (at the repo root if there's no spec file), blockers
   first, in the format in [TICKET-TEMPLATE.md](TICKET-TEMPLATE.md). If the project tracks work in an issue tracker
   (GitHub, Linear), publish one issue per ticket instead, blockers first, using the tracker's native blocking links
   where it has them.

Done when every approved ticket is written with its blockers, seam, and acceptance criteria.
