import { randomBytes } from "node:crypto"
import { closeSync, mkdirSync, openSync } from "node:fs"
import { join } from "node:path"

export interface Limits {
  batchMs: number
  defaultDeadlineMs: number
  maxDeadlineMs: number
  maxNotifications: number
  noiseWindowMs: number
  maxEvents: number
}

export interface Delivery {
  sessionID: string
  /** `[monitor <id>: <description>]`, also the first line of `text`. */
  description: string
  text: string
}

export interface Monitors {
  /** Spawns `bash -c command` in its own process group, stdin closed. */
  start(input: { sessionID: string; command: string; description: string; cwd: string; deadlineMs?: number }): {
    id: string
    deadlineMs: number
    stderrPath: string
  }
}

const defaultLimits: Limits = {
  batchMs: 200,
  defaultDeadlineMs: 300_000,
  maxDeadlineMs: 1_800_000,
  maxNotifications: 10,
  noiseWindowMs: 60_000,
  maxEvents: 50,
}

export function createMonitors(options: {
  deliver: (delivery: Delivery) => Promise<boolean>
  stderrDir: string
  limits?: Partial<Limits>
}): Monitors {
  const limits = { ...defaultLimits, ...options.limits }

  return {
    start({ sessionID, command, description, cwd, deadlineMs = limits.defaultDeadlineMs }) {
      // Random rather than counted, so a new plugin load never appends to an earlier load's stderr file.
      const id = randomBytes(4).toString("hex")
      const header = `[monitor ${id}: ${description}]`
      mkdirSync(options.stderrDir, { recursive: true })
      const stderrPath = join(options.stderrDir, `monitor-${id}.stderr`)
      const child = spawnInOwnGroup(command, cwd, stderrPath)

      let pending: string[] = []
      let window: ReturnType<typeof setTimeout> | undefined
      const flush = () => {
        window = undefined
        const events = pending
        pending = []
        void options.deliver({ sessionID, description: header, text: [header, ...events].join("\n") })
      }
      void readLines(child.stdout, (event) => {
        pending.push(event)
        window ??= setTimeout(flush, limits.batchMs)
      })

      return { id, deadlineMs, stderrPath }
    },
  }
}

function spawnInOwnGroup(command: string, cwd: string, stderrPath: string) {
  const stderr = openSync(stderrPath, "a")
  try {
    // A process group of its own lets ending the monitor kill everything the command started.
    return Bun.spawn(["bash", "-c", command], { cwd, detached: true, stdin: "ignore", stdout: "pipe", stderr })
  } finally {
    closeSync(stderr)
  }
}

async function readLines(stream: ReadableStream<Uint8Array>, onLine: (line: string) => void) {
  const decoder = new TextDecoder()
  let partial = ""
  for await (const chunk of stream) {
    const lines = (partial + decoder.decode(chunk, { stream: true })).split("\n")
    partial = lines.pop() ?? ""
    lines.forEach((line) => onLine(line))
  }
}
