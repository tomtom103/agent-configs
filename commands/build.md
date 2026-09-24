---
description: Build the next ticket from TICKETS.md test-first, or every ticket with auto
---

Build tickets from the `TICKETS.md` that `/plan` wrote, or from the issue tracker if it published them there. If there
are several and neither the arguments nor the conversation says which, ask. Arguments (may be empty): $ARGUMENTS

- **Empty:** build the next ticket on the frontier (an unticked ticket whose blockers are all ticked), then stop for
  review.
- **`auto`:** build frontier tickets one after another until none are left or a tripwire fires.
- **A ticket ID:** build that ticket, then stop for review.

You coordinate: the `craftsman` agent builds each ticket and the `reviewer` agent judges it, so every ticket gets the
fresh context it was sized for. Each agent run starts from nothing, so its brief carries everything it needs.

For each ticket:

1. Note the output of `git rev-parse HEAD`. The ticket's diff is `git diff` against that commit plus the files the
   ticket created. When an earlier ticket's changes are still uncommitted, the ticket's diff is the files this ticket
   touched instead.
2. Give the `craftsman` agent the ticket's text, the spec's path, and the tripwires below, to stop and report on.
3. Run the project's linters, typecheckers, and full test suite.
4. Give the `reviewer` agent only the ticket's text and its diff, so its judgement stays independent of how the ticket
   was built. Send each `blocking` finding, and each cheap `nit`, to a new `craftsman` run with the ticket's text and
   the tripwires, then repeat from step 3. When the craftsman shows a finding is mistaken, put the finding and its
   evidence in the next reviewer's brief.
5. Tick the ticket off, or close its issue. If you're committing as you go, commit only this ticket's files, in a
   commit that names it.

A ticket is done when every acceptance criterion holds, step 3 passes clean, and the reviewer's verdict is `pass`.

When the last ticket is ticked, give the `reviewer` agent the spec and the feature's diff: on a feature branch,
everything since the merge-base with the default branch; otherwise, everything since the parent of the first ticket's
commit. Handle its findings as in step 4. The feature is done when that verdict is `pass`.

Stop and report to the user when a tripwire fires:

- A test still fails after 3 attempts at a fix.
- The reviewer still reports `blocking` findings after 2 rounds of fixes.
- The reviewer keeps a finding the craftsman disputed with evidence.
- The ticket needs a change to a production database schema, payment processing, or secret keys.
- You hit an edge case the spec doesn't cover, or one that contradicts it.
