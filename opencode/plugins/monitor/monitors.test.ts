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
    async waitFor(count: number, timeoutMs = 3000) {
      const giveUp = Date.now() + timeoutMs
      while (deliveries.length < count && Date.now() < giveUp) await Bun.sleep(10)
      return deliveries
    },
  }
}

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
  expect((await waitFor(1)).map((d) => d.text)).toEqual([`[monitor ${started.id}: test]\nfinished`])
  expect(existsSync(finished)).toBe(true)
})

test("start returns the deadline it is given", () => {
  const { deliver } = recorder()
  const monitors = createMonitors({ deliver, stderrDir })

  const started = monitors.start({ sessionID: "ses_test", command: "true", description: "test", cwd: root, deadlineMs: 60_000 })

  expect(started.deadlineMs).toBe(60_000)
})

test("lines printed within one window arrive as one delivery headed by the monitor's ID and description", async () => {
  const { start, waitFor } = setup(100)

  const { id } = start("echo a; sleep 0.02; echo b; sleep 0.6; echo c", "dev server errors")

  expect(await waitFor(2)).toEqual([
    { sessionID: "ses_test", description: `[monitor ${id}: dev server errors]`, text: `[monitor ${id}: dev server errors]\na\nb` },
    { sessionID: "ses_test", description: `[monitor ${id}: dev server errors]`, text: `[monitor ${id}: dev server errors]\nc` },
  ])
})

test("stderr is appended to the stderr file and never delivered", async () => {
  const { start, deliveries, waitFor } = setup()

  const { id, stderrPath } = start("echo one >&2; echo two >&2; echo out")
  await waitFor(1)
  await Bun.sleep(300)

  expect(deliveries.map((d) => d.text)).toEqual([`[monitor ${id}: test]\nout`])
  expect(stderrPath.startsWith(stderrDir + "/")).toBe(true)
  expect(await Bun.file(stderrPath).text()).toBe("one\ntwo\n")
})

test("the command runs in the given directory", async () => {
  const { start, waitFor } = setup()

  const { id } = start("pwd")

  expect((await waitFor(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\n${root}`])
})

test("the command's stdin is closed", async () => {
  const { start, waitFor } = setup()

  const { id } = start('if read -r line; then echo "read $line"; else echo eof; fi')

  expect((await waitFor(1)).map((d) => d.text)).toEqual([`[monitor ${id}: test]\neof`])
})

test("the command leads its own process group", async () => {
  const { start, waitFor } = setup()

  start("echo $$ $(ps -o pgid= -p $$)")

  const [pid, pgid] = (await waitFor(1))[0]?.text.split("\n")[1]?.split(" ") ?? []
  expect(pid).toMatch(/^\d+$/)
  expect(pgid).toBe(pid)
})
