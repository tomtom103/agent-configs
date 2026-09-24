---
description: Build the next ticket from TICKETS.md test-first, or every ticket with auto
---

Build tickets from the `TICKETS.md` that `/plan` wrote, or from the issue tracker if it published them there. If there
are several and neither the arguments nor the conversation says which, ask. Arguments (may be empty): $ARGUMENTS

- **Empty:** build the next ticket on the frontier (an unticked ticket whose blockers are all ticked), then stop for
  review.
- **`auto`:** build frontier tickets one after another until none are left or a tripwire fires.
- **A ticket ID:** build that ticket, then stop for review.

For each ticket:

1. Note the output of `git rev-parse HEAD`. The ticket's diff is `git diff` against that commit plus the files the
   ticket created. When an earlier ticket's changes are still uncommitted, the ticket's diff is the files this ticket
   touched instead.
2. Call the skill tool with "tdd" and build the ticket at its seam.
3. If the ticket changes what a user sees in a browser, call the skill tool with "browser-verify" and check it there.
4. Run the project's linters, typecheckers, and full test suite.
5. Give the `reviewer` agent only the ticket's text and its diff, so its judgement stays independent of how you built
   it. Fix each `blocking` finding, and each `nit` that's cheap, then repeat from step 4. Each
   round's reviewer starts fresh, so when you judge a finding mistaken, put the finding and your evidence in the next
   round's brief.
6. Tick the ticket off, or close its issue. If you're committing as you go, commit only this ticket's files, in a
   commit that names it.

A ticket is done when every acceptance criterion holds, step 4 passes clean, and the reviewer's verdict is `pass`.

Stop and report to the user when a tripwire fires:

- A test still fails after 3 attempts at a fix.
- The reviewer still reports `blocking` findings after 2 rounds of fixes.
- The reviewer keeps a finding you disputed with evidence.
- The ticket needs a change to a production database schema, payment processing, or secret keys.
- You hit an edge case the spec doesn't cover, or one that contradicts it.
