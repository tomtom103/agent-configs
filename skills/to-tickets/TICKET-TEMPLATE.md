# TICKETS.md format

One file per spec, tickets in dependency order (blockers first). Tick a ticket's box when it's built.

```markdown
# Tickets: <feature>

Spec: `<path to the spec>`

## [ ] T1: <imperative title>

- **Blocked by:** none
- **Seam:** `<test file>`
- **Verify:** `<command that runs the seam's tests>`
- **Delivers:** <the end-to-end behaviour this ticket makes work, from the caller's side>
- **Acceptance criteria:**
  - <observable condition>
  - <observable condition>

## [ ] T2: <imperative title>

- **Blocked by:** T1
- ...
```

On an issue tracker, each ticket is one issue carrying the same fields.
