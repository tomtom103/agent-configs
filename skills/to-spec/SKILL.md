---
name: to-spec
description: Write requirements already agreed in conversation up as a spec, without interviewing again. Use when the user wants a spec or SPEC.md, or asks to write up what was discussed.
license: MIT
metadata:
  pack: core
  attribution: Adapted from mattpocock/skills (MIT License)
---

# To Spec

Turn what the conversation has already settled into a testable spec. This is **synthesis**, not an interview: the one
question you put to the user is whether the seams are right. A decision the spec needs that was never made goes on a
list you present with the spec, rather than into a new round of questions.

1. **Ground it in the code.** Read the code the feature touches, the project's domain vocabulary (`CONTEXT.md`, if it
   exists), any ADRs that bear on it, and how the existing tests are written. Use that vocabulary throughout the spec.
2. **Pick the seams**, the public interfaces the tests will go through. Prefer an existing seam to a new one, and the
   highest seam that reaches the behaviour; one or two across the whole feature is ideal. Confirm them with the user
   before writing.
3. **Write** `SPEC.md`, or wherever the project already keeps specs, from [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md).
4. **Present it** for approval, with the list of decisions it needed that the conversation never made.

Done when the user has approved the spec.
