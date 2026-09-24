---
name: tdd
description: Test-driven development with a red-green-refactor loop. Use when the user wants to build a feature or fix a bug test-first, mentions TDD or red-green-refactor, or wants a bug reproduced as a failing test before it's fixed.
license: MIT
metadata:
  pack: core
  attribution: Adapted from mattpocock/skills & addyosmani/agent-skills (MIT License)
  source: https://github.com/mattpocock/skills/tree/c55ee46073ed923f86ce59a5eb3b6d895095d1b7/skills/engineering/tdd
  source-commit: c55ee46073ed923f86ce59a5eb3b6d895095d1b7
---

# Test-Driven Development

TDD is the red → green → refactor loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle: consult them before and during the loop, not after.

When exploring the codebase, read `CONTEXT.md` (if it exists) so test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams: where tests go

A **seam** is where a module's interface lives, and where you test: the place where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at agreed seams.** A seam named in the ticket or spec is already agreed. Otherwise, write down the seams under test and confirm them with the user before writing any test. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), call the skill tool with "codebase-design" for the vocabulary.

## Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological**: the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing**: writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features. Red counts only when the test fails because the behavior is missing; a test that fails to compile hasn't gone red yet.
- **A bug starts red.** The first test reproduces the symptom the user reported, and goes red for that reason, before you touch the fix. A test that passes before the fix hasn't reproduced the bug.
- **Green is the whole suite passing** with every test running and every error and lint rule live.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactor on green.** Remove duplication, deepen shallow modules, move logic to the module whose data it uses, and fix code the new code shows up as awkward. Run the tests after each step, so every refactor starts and ends green.
