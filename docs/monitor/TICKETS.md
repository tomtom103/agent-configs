# Tickets: Monitor plugin for opencode

Spec: `docs/monitor/SPEC.md`

Every ticket's seam is `opencode/plugins/monitor/monitors.test.ts`, driving `createMonitors` with real `bash -c`
commands, shortened `limits`, and a recording `deliver`. `bun run check` in `opencode/plugins/monitor/` runs
`tsc --noEmit` and `bun test`. A criterion marked "Live trial" is checked in a running opencode session, because
`index.ts` has no tests of its own.

## [x] T1: Start a monitor and deliver its stdout in batches

- **Blocked by:** none
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** In a live session, the agent calls `monitor` with a command and a description. The call returns at once
  with the monitor's ID, its deadline, and its stderr path, while `bash -c` keeps running in the session's directory
  in its own process group, with stdin closed. Stdout lines that land within 200 ms reach the session as a single
  `steer` synthetic notification. Stderr is appended to `monitor-<id>.stderr` in opencode's tool-output directory and
  never becomes a notification. This ticket also sets up the package: `package.json` naming `index.ts` as the entry,
  a `check` script, dev dependencies with `@opencode/plugin` pinned to `2.0.15`, a lockfile, and a `tsconfig.json`.
  `index.ts` uses `import type` only, and `monitor` is registered with `{ codemode: false, permission: "shell" }`
  and a description, in our own words, teaching the agent to write monitors that report failures as well as success.
  `start` returns the default deadline, but T3 is what enforces it. Stories 1–3, plus 10 and 14 in the live trial.
- **Acceptance criteria:**
  - `start` returns `{ id, deadlineMs, stderrPath }` while the command is still running
  - Lines printed within one `batchMs` window arrive as one delivery, whose `description` is
    `[monitor <id>: <description>]` and whose `text` starts with that same line
  - Output on stderr produces no delivery and is appended to `stderrPath`, inside `stderrDir`
  - `opencode/plugins/.gitkeep` is gone, and the plugin layout in `AGENTS.md` and `README.md` covers plugin folders
  - Live trial: opencode loads the plugin from its folder, and the `package.json` field it reads is recorded in
    `docs/monitor/SPEC.md`
  - Live trial: `for i in 1 2 3; do echo $i; sleep 1; done` delivers notifications mid-turn, and wakes the session
    when it's idle
  - Live trial: interrupting the turn (Esc) leaves the monitor running, and its next notification wakes the session
  - Live trial: with `{ action: "shell", resource: "*", effect: "deny" }`, `monitor` isn't offered to the agent

## [ ] T2: Report the command's exit

- **Blocked by:** T1
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** When a monitor's command exits, one final notification carries the events still pending plus the exit
  code, the monitor ends, and nothing is delivered for it afterwards. This sets up the rule that a monitor sends at
  most one final notification, which T3 and T7 build on. Blank lines (empty or only whitespace) aren't events: they're
  never delivered and never open a window, so `CONTEXT.md` and `SPEC.md` define an event as one non-blank line.
  Story 4.
- **Acceptance criteria:**
  - `echo a; echo b; exit 3` produces one final delivery containing `a`, `b`, and exit code 3
  - A command that exits without printing anything still gets a final delivery with its exit code
  - A final line with no trailing newline counts as an event
  - No delivery arrives for a monitor after its final one
  - `echo; echo '   '; echo x; echo` delivers `x` and no blank events
  - A command that prints only blank lines and then exits gets a final delivery carrying just its exit code

## [ ] T3: End a monitor at its deadline

- **Blocked by:** T2
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** A monitor with no `timeout_ms` ends 5 minutes after it starts, and a `timeout_ms` above 30 minutes is
  capped at 30 minutes, with `monitor`'s reply saying so. At the deadline the monitor's process group gets SIGTERM,
  then SIGKILL 3 seconds later, and one notification says the deadline passed and the monitor can be re-armed. The
  command's exit after the kill sends no second notification. The `monitor` description gains the deadline and re-arm
  guidance. Stories 5–6.
- **Acceptance criteria:**
  - A `sleep 60` monitor with a short `defaultDeadlineMs` receives exactly one delivery, which mentions the deadline
    and re-arming
  - `deadlineMs` above `maxDeadlineMs` is capped at `maxDeadlineMs`, and `start` returns the capped value
  - A child of the command (`sleep 60 & wait`) is killed along with it
  - A command that ignores SIGTERM (`trap '' TERM; sleep 60`) is killed by SIGKILL after 3 seconds

## [ ] T4: Stop a monitor with `monitor_stop`, and stop every monitor on unload

- **Blocked by:** T3
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** `monitor_stop` with a running monitor's ID kills its process group and returns `stopped`, and nothing
  more is delivered for that monitor. An unknown or already-ended ID returns `not running`. `monitor_stop` is
  registered with `{ codemode: false, permission: "shell" }`. `setup` returns a cleanup function that calls `stopAll`,
  so no monitor process outlives opencode or a plugin reload. `createMonitors` deletes `monitor-*.stderr` files in
  `stderrDir` last modified more than 7 days ago, because opencode's own tool-output cleanup only removes its `tool_*`
  files. Stories 9 and 13.
- **Acceptance criteria:**
  - When `createMonitors` runs, an 8-day-old `monitor-<id>.stderr` is deleted, while a 1-day-old one and an 8-day-old
    file with any other name are left alone
  - `stop` returns true for a running monitor, and nothing is delivered for it afterwards, not even events that were
    waiting in the current window
  - `stop` returns false for an unknown ID and for a monitor that has already ended
  - `stopAll` kills every monitor's process group and delivers nothing
  - Live trial: `monitor_stop` on a running monitor returns `stopped`, and a second call returns `not running`

## [ ] T5: Stop monitors whose session is gone or whose subagent has finished

- **Blocked by:** T4
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** A monitor stops when a delivery fails: `deliver` resolves false, which `index.ts` returns on a
  session-not-found error from `ctx.session.synthetic`, or rejects. A rejection is also logged with `console.error`,
  naming the monitor, so it's never swallowed, and a failure reading the command's stdout is handled the same way.
  `stopSession` stops every monitor a session started, without notifications. For a
  session with a `parentID`, `index.ts` calls `ctx.session.wait` once per session, then `stopSession`, so a
  subagent's monitors end with the subagent. Stories 11–12.
- **Acceptance criteria:**
  - When `deliver` resolves false, the monitor's process group is killed and nothing more is delivered for it
  - When `deliver` rejects, the monitor's process group is killed, nothing more is delivered for it, the error is
    logged, and no unhandled rejection escapes
  - `stopSession` stops that session's monitors, delivers nothing, and leaves other sessions' monitors running
  - Live trial: a monitor started inside a subagent ends, silently, when the subagent goes idle

## [ ] T6: Cap a burst at 50 events

- **Blocked by:** T1
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** A notification carries at most 50 events. When more land in one 200 ms window, it carries the first 50
  and says how many were dropped. Story 8.
- **Acceptance criteria:**
  - `seq 1 120; sleep 1` delivers events 1 through 50 in one notification, which says 70 more were dropped
  - A window of exactly `maxEvents` events is delivered whole, with no note about dropped events

## [ ] T7: Stop a noisy monitor

- **Blocked by:** T3
- **Seam:** `opencode/plugins/monitor/monitors.test.ts`
- **Verify:** `bun run check` in `opencode/plugins/monitor/`
- **Delivers:** When a monitor would send an 11th notification within any 60 seconds, its process group is killed
  and one final notification says it was stopped for noise and should be restarted with a tighter filter. Final
  notifications (exit, deadline, noise) don't count toward the limit. The `monitor` description gains the advice on
  filtering. Story 7.
- **Acceptance criteria:**
  - With a shortened `maxNotifications` and `noiseWindowMs`, a command that prints a line on every window delivers
    `maxNotifications` event notifications, then one noise notification, then nothing
  - A monitor that sends exactly `maxNotifications` notifications and then exits still gets its exit notification
  - Notifications spread out beyond `noiseWindowMs` don't trip the limit
