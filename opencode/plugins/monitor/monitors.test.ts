import { afterEach, beforeEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createMonitors, type Delivery } from "./monitors.ts"

let root: string
let stderrDir: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "monitor-test-")))
  // Not created up front: the monitors create it on first use, as opencode's tool-output dir may not exist yet.
  stderrDir = join(root, "tool-output")
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function recorder() {
  const deliveries: Delivery[] = []
  return {
    deliveries,
    deliver: async (delivery: Delivery) => {
      deliveries.push(delivery)
      return true
    },
    waitFor,
    /** Waits for `count` deliveries, then long enough to show that no more follow. */
    async settle(count: number) {
      await waitFor(count)
      await Bun.sleep(300)
      return deliveries
    },
  }

  async function waitFor(count: number, timeoutMs = 3000) {
    const giveUp = Date.now() + timeoutMs
    while (deliveries.length < count && Date.now() < giveUp) await Bun.sleep(10)
    return deliveries
  }
}

const exited = (code: number) => `The command exited with code ${code}. The monitor has ended.`

function setup(batchMs = 100) {
  const record = recorder()
  const monitors = createMonitors({ deliver: record.deliver, stderrDir, limits: { batchMs } })
  const start = (command: string, description = "test") =>
    monitors.start({ sessionID: "ses_test", command, description, cwd: root })
  return { ...record, start }
}

test("start returns the ID, the default deadline, and the stderr path while the command is still running", async () => {
  const { start, waitFor } = setup()
  const finished = join(root, "finished")

  const started = start("sleep 0.3; touch finished; echo finished")

  expect(existsSync(finished)).toBe(false)
  expect(started.deadlineMs).toBe(300_000)
  expect(started.stderrPath).toBe(join(stderrDir, `monitor-${started.id}.stderr`))
  expect((await waitFor(1)).map((d) => d.text)).toEqual([`[monitor ${started.id}: test]\nfinished\n${exited(0)}`])
  expect(existsSync(finished)).toBe(true)
})

test("start returns the deadline it is given", () => {
  const { deliver } = recorder()
  const monitors = createMonitors({ deliver, stderrDir })

  const started = monitors.start({ sessionID: "ses_test", command: "true", description: "test", cwd: root, deadlineMs: 60_000 })

  expect(started.deadlineMs).toBe(60_000)
})

test("lines printed within one window arrive as one delivery headed by the monitor's ID and description", async () => {
  const { start, settle } = setup(100)

  const { id } = start("echo a; sleep 0.02; echo b; sleep 0.6; echo c", "dev server errors")

  expect(await settle(2)).toEqual([
    { sessionID: "ses_test", description: `[monitor ${id}: dev server errors]`, text: `[monitor ${id}: dev server errors]\na\nb` },
    { sessionID: "ses_test", description: `[monitor ${id}: dev server errors]`, text: `[monitor ${id}: dev server errors]\nc\n${exited(0)}` },
  ])
})

test("stderr is appended to the stderr file and never delivered", async () => {
  const { start, settle } = setup()

  const { id, stderrPath } = start("echo one >&2; echo two >&2; echo out")

  expect((await settle(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\nout\n${exited(0)}`])
  expect(stderrPath.startsWith(stderrDir + "/")).toBe(true)
  expect(await Bun.file(stderrPath).text()).toBe("one\ntwo\n")
})

test("the command runs in the given directory", async () => {
  const { start, waitFor } = setup()

  const { id } = start("pwd")

  expect((await waitFor(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\n${root}\n${exited(0)}`])
})

test("the command's stdin is closed", async () => {
  const { start, waitFor } = setup()

  const { id } = start('if read -r line; then echo "read $line"; else echo eof; fi')

  expect((await waitFor(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\neof\n${exited(0)}`])
})

test("the command leads its own process group", async () => {
  const { start, waitFor } = setup()

  start("echo $$ $(ps -o pgid= -p $$)")

  const [pid, pgid] = (await waitFor(1))[0]?.text.split("\n")[1]?.split(" ") ?? []
  expect(pid).toMatch(/^\d+$/)
  expect(pgid).toBe(pid)
})

test("when the command exits, one final delivery carries the pending events and the exit code, and nothing follows", async () => {
  const { start, settle } = setup()

  const { id } = start("echo a; echo b; exit 3", "build")

  expect(await settle(1)).toEqual([
    { sessionID: "ses_test", description: `[monitor ${id}: build]`, text: `[monitor ${id}: build]\na\nb\n${exited(3)}` },
  ])
})

test("a command that exits without printing still gets a final delivery", async () => {
  const { start, settle } = setup()

  const { id } = start("exit 0")

  expect((await settle(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\n${exited(0)}`])
})

test("a last line with no trailing newline is an event", async () => {
  const { start, settle } = setup()

  const { id } = start("printf last")

  expect((await settle(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\nlast\n${exited(0)}`])
})

test("a command killed by a signal is reported by the signal's name", async () => {
  const { start, settle } = setup()

  const { id } = start("kill -TERM $$")

  expect((await settle(1)).map((d) => d.text)).toEqual([
    `[monitor ${id}: test]\nThe command was killed by SIGTERM. The monitor has ended.`,
  ])
})

test("blank lines are not events and never open a window", async () => {
  const { start, settle } = setup()

  const { id } = start("echo; echo '   '; sleep 0.4; echo x; echo; sleep 0.4")

  expect((await settle(2)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\nx`, `[monitor ${id}: test]\n${exited(0)}`])
})

test("a command that prints only blank lines gets a final delivery with just its exit code", async () => {
  const { start, settle } = setup()

  const { id } = start("echo; echo '  '")

  expect((await settle(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\n${exited(0)}`])
})
