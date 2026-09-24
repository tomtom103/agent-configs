# Specification: Monitor plugin for opencode

## 1. Problem Statement

In opencode, a background `shell` command tells the session only when it exits. To watch a log, a dev server, CI, or a
PR while it runs, the agent either polls, which spends a turn on every check, or waits blind until the command ends.
Claude Code's built-in Monitor tool solves this by delivering a background command's stdout to the session line by line
while the agent keeps working. opencode 2.0.15 has nothing equivalent.

## 2. Proposed Solution

A personal opencode V2 plugin at `opencode/plugins/monitor/`, loaded into every session through the existing
`~/.config/opencode/plugins` link. It adds two direct tools:

- `monitor` starts a **monitor**: a background shell command whose stdout lines (**events**) reach the session as
  **notifications** while the agent keeps working. It returns the monitor's ID at once.
- `monitor_stop` ends one.

Each notification arrives as a synthetic message with `steer` delivery. It joins the current turn when the agent is
busy, and wakes the session when it's idle. A monitor ends when its command exits, at its **deadline**, when it trips
the noise limit, when `monitor_stop` names it, or when its session goes away. The tool description, written in our own
words, teaches the agent to write monitors that report failures as well as success.

## 3. Ubiquitous Language & Entities

From `CONTEXT.md`:

- **Monitor:** a background shell command, started by the agent and identified by an ID, whose stdout reaches the
  session while the agent keeps working.
- **Event:** one line a monitor's command prints to stdout.
- **Notification:** the events from one 200 ms window, delivered to the monitor's session as a single message.
- **Deadline:** the point at which a monitor ends on its own, if its command hasn't exited and nobody stopped it first.
- **Re-arm:** starting a monitor again with the same command after its deadline.

Avoid *task* (opencode's name for background shell jobs) and *watch* as a noun.

## 4. User Stories & Acceptance Criteria

1. **As an** agent, **I want** to start a monitor and keep working, **so that** I can react to output without polling.
   - **Given:** a session with the plugin loaded
   - **When:** the agent calls `monitor` with a command and a description
   - **Then:** the call returns at once with the monitor's ID, its deadline, and the path of its stderr file, while the
     command keeps running
2. **As an** agent, **I want** lines that arrive together to reach me together, **so that** one burst of output costs
   one notification.
   - **Given:** a running monitor
   - **When:** its command prints several lines within 200 ms
   - **Then:** the session receives one notification carrying all of them, starting with
     `[monitor <id>: <description>]`, with the same text in the synthetic message's `description`
3. **As an** agent, **I want** only stdout to count as events, **so that** noise on stderr doesn't wake me.
   - **Given:** a monitor whose command writes to stderr
   - **When:** it does
   - **Then:** no notification is sent, and the text is appended to `monitor-<id>.stderr` in opencode's tool-output
     directory
4. **As an** agent, **I want** to know when a monitor's command exits, and with what code, **so that** silence never
   looks like "still running".
   - **Given:** a running monitor
   - **When:** its command exits
   - **Then:** a final notification carries any events still pending plus the exit code, and the monitor ends
5. **As an** agent, **I want** every monitor to end on its own, **so that** a forgotten one can't run forever.
   - **Given:** a monitor started with no `timeout_ms`
   - **When:** 5 minutes pass without the command exiting
   - **Then:** the command's process group is killed, and one notification says the deadline passed and the monitor can
     be re-armed
6. **As an** agent, **I want** to choose a longer deadline, up to a ceiling.
   - **Given:** a call to `monitor`
   - **When:** `timeout_ms` is above 30 minutes
   - **Then:** the deadline is 30 minutes, and the returned text says so
7. **As the** user, **I want** a noisy monitor stopped, **so that** it can't spend turns without bound.
   - **Given:** a running monitor
   - **When:** it would send an 11th notification within any 60 seconds
   - **Then:** its process group is killed, and one notification says it was stopped for noise and should be restarted
     with a tighter filter. Final notifications (exit, deadline, noise) don't count toward the limit, so a noisy
     monitor still reports how it ended
8. **As an** agent, **I want** a huge burst cut down, **so that** one notification can't flood my context.
   - **Given:** a running monitor
   - **When:** more than 50 events land in one 200 ms window
   - **Then:** the notification carries the first 50 events and says how many more were dropped
9. **As an** agent, **I want** to stop a monitor I no longer need.
   - **Given:** a running monitor
   - **When:** the agent calls `monitor_stop` with its ID
   - **Then:** its process group is killed, no further notification arrives for it, and the call returns `stopped`. An
     unknown or already-ended ID returns `not running`
10. **As the** user, **I want** interrupting the agent (Esc) to leave monitors running, matching Claude Code.
    - **Given:** a running monitor
    - **When:** the user interrupts the agent's turn
    - **Then:** the monitor keeps running, and its next notification wakes the session
11. **As the** user, **I want** a subagent's monitors to end with the subagent, **so that** they don't wake a session
    nobody reads.
    - **Given:** a monitor started inside a subagent's session (one with a `parentID`)
    - **When:** that session's agent goes idle
    - **Then:** every monitor it started is stopped without a notification
12. **As the** user, **I want** a monitor whose session is gone to stop.
    - **Given:** a running monitor
    - **When:** delivering a notification fails because its session no longer exists
    - **Then:** the monitor is stopped
13. **As the** user, **I want** no monitor process to outlive opencode.
    - **Given:** running monitors
    - **When:** the plugin unloads (opencode shuts down or reloads the plugin)
    - **Then:** every monitor's process group is killed
14. **As the** user, **I want** denying the shell to deny monitors too.
    - **Given:** a permission rule `{ action: "shell", resource: "*", effect: "deny" }`
    - **When:** a session starts
    - **Then:** neither `monitor` nor `monitor_stop` is offered to the agent

## 5. Public Seams & Interfaces

The tests go through one seam: the core module `monitors.ts`. The plugin wiring in `index.ts` stays thin enough that
the live trial covers it.

```ts
// monitors.ts
export interface Limits {
  batchMs: number             // 200
  defaultDeadlineMs: number   // 300_000
  maxDeadlineMs: number       // 1_800_000
  maxNotifications: number    // 10 ...
  noiseWindowMs: number       // ... per 60_000
  maxEvents: number           // 50 per notification
}

export interface Delivery {
  sessionID: string
  description: string  // "[monitor <id>: <description>]", also the first line of text
  text: string
}

export function createMonitors(options: {
  /** Resolves false when the session no longer exists; the monitor is then stopped. */
  deliver: (delivery: Delivery) => Promise<boolean>
  stderrDir: string
  limits?: Partial<Limits>
}): Monitors

export interface Monitors {
  /** Spawns `bash -c command` in its own process group, stdin closed. */
  start(input: {
    sessionID: string
    command: string
    description: string
    cwd: string
    deadlineMs?: number
  }): { id: string; deadlineMs: number; stderrPath: string }
  /** Kills the process group without a notification. False when the ID isn't running. */
  stop(id: string): boolean
  /** Stops every monitor a session started, without notifications. */
  stopSession(sessionID: string): void
  /** Stops everything; the plugin's cleanup calls it. */
  stopAll(): void
}
```

Invariants:

- A monitor sends at most one final notification (exit, deadline, or noise), and nothing after it.
- `stop`, `stopSession`, and `stopAll` never deliver.
- Every monitor has a deadline no later than `maxDeadlineMs` after it starts.
- Ending a monitor for any reason kills its whole process group: SIGTERM, then SIGKILL after 3 seconds.

`index.ts` default-exports `{ id: "agent-configs.monitor", setup }`, and needs no imports at runtime. `setup`:

- registers `monitor` and `monitor_stop` with `options: { codemode: false, permission: "shell" }`. `monitor` takes
  `command`, `description`, and an optional `timeout_ms`, and has no working-directory input: the command runs in its
  session's directory, as Claude Code's Monitor does
- implements `deliver` with `ctx.session.synthetic({ sessionID, text, description, delivery: "steer" })`, returning
  false on a session-not-found error
- for a session with a `parentID`, calls `ctx.session.wait` once and then `stopSession`
- returns a cleanup function that calls `stopAll`

opencode never installs a local plugin's dependencies, and `@opencode/plugin` doesn't resolve from the plugins folder,
so the plugin imports its types with `import type` only. opencode reads a plugin folder's entry point from its
`package.json`, so that file has to name `index.ts` as the entry. The first ticket confirms which field opencode reads.

## 6. 3-Tier Boundaries

- **Always Do:** start every notification with `[monitor <id>: <description>]`. Give every monitor a deadline. Kill the
  whole process group when a monitor ends. Keep stderr out of events.
- **Ask First:** nothing settled.
- **Never Do:** deliver a notification with `session.prompt` (which the model reads as the user speaking). Copy text
  from Claude Code's Monitor tool description.

## 7. Out of Scope (Non-Goals)

- The WebSocket source.
- Checking each monitor command against command-level `shell` rules such as `git push *`. A plugin tool can't reach
  opencode's per-call permission check.
- A `monitor_list` tool.
- Monitors surviving an opencode restart.
- Claude Code, where Monitor is built in, and publishing the plugin as a package.

## 8. Verification Strategy

- `bun run check` in `opencode/plugins/monitor/` runs `tsc --noEmit` against `@opencode/plugin@2.0.15` and `bun test`.
- `monitors.test.ts` drives `createMonitors` with real `bash -c` commands, shortened `limits`, and a recording
  `deliver`, covering stories 1–9, 12, and 13.
- A trial in a live opencode session covers the wiring and stories 10, 11, and 14:
  - Start a monitor on `for i in 1 2 3; do echo $i; sleep 1; done` and watch its notifications arrive mid-turn and
    while idle.
  - Interrupt a turn and confirm the monitor survives.
  - Start a monitor from a subagent and confirm it ends with the subagent.
  - Stop a monitor with `monitor_stop`.
