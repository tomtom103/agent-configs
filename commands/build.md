---
description: Build the next ticket from TICKETS.md test-first, or every ticket with auto
---

Build tickets from `TICKETS.md`, or from the issue tracker if `/plan` published them there. Arguments (may be empty):
$ARGUMENTS

- **Empty:** build the next ticket on the frontier (an unticked ticket whose blockers are all ticked), then stop for
  review.
- **`auto`:** build frontier tickets one after another until none are left or a tripwire fires.
- **A ticket ID:** build that ticket, then stop for review.

For each ticket:

1. Call the skill tool with "tdd" and build the ticket at its seam.
2. If the ticket changes what a user sees in a browser, call the skill tool with "browser-verify" and check it there.
3. Run the project's linters, typecheckers, and full test suite.
4. Tick the ticket off, or close its issue. If you're committing as you go, commit only this ticket's files, in a commit that names it.

A ticket is done when every acceptance criterion holds and step 3 passes clean.

Stop and report to the user when a tripwire fires:

- A test still fails after 3 attempts at a fix.
- The ticket needs a change to a production database schema, payment processing, or secret keys.
- You hit an edge case the spec doesn't cover, or one that contradicts it.
