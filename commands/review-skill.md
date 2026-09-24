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
