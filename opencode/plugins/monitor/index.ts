import type { Plugin } from "@opencode/plugin"
import { homedir } from "node:os"
import { join } from "node:path"
import { createMonitors } from "./monitors.ts"

// opencode lets the agent read its tool-output directory without an external-directory prompt.
const toolOutputDir = join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "opencode", "tool-output")

const description = `Start a monitor: a shell command that runs in the background, in this session's directory, while you keep working. Every non-blank line it prints to stdout is an event, and events reach you as notifications without you having to poll. The first event opens a 200 ms window, and every event printed within it arrives in one notification headed "[monitor <id>: <description>]". When the command exits, a last notification gives its exit code, and the monitor ends. The call returns at once with the monitor's ID.

Every notification takes your attention, so filter the command's output down to the lines you would act on, for example \`tail -f server.log | grep --line-buffered -E 'ERROR|Listening on'\`. Use \`grep --line-buffered\` in pipelines: without it, grep holds its output back and events arrive late or in lumps.

Make the filter match failure as well as success: errors, tracebacks, crashes, non-zero exit codes. A monitor that prints only when things go right stays silent when they go wrong, and that silence looks the same as "still running".

Stderr is not an event. It is appended to the file named in this tool's reply, which you can read when you need it.`

// A JSON Schema input reaches execute typed as unknown, so check it here.
function readInput(input: unknown): { command: string; description: string } {
  const { command, description } = (input ?? {}) as Record<string, unknown>
  if (typeof command !== "string" || typeof description !== "string") {
    throw new Error("monitor needs `command` and `description`, both strings")
  }
  return { command, description }
}

const plugin: Plugin.Plugin = {
  id: "agent-configs.monitor",
  async setup(ctx) {
    const monitors = createMonitors({
      stderrDir: toolOutputDir,
      deliver: async ({ sessionID, description, text }) => {
        await ctx.session.synthetic({ sessionID, text, description, delivery: "steer" })
        return true
      },
    })

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "monitor",
        description,
        input: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Shell command, run with `bash -c`. Each line it prints to stdout is an event.",
            },
            description: {
              type: "string",
              description: 'Short label for what the monitor reports, e.g. "dev server errors". It heads every notification.',
            },
          },
          required: ["command", "description"],
          additionalProperties: false,
        },
        options: { codemode: false, permission: "shell" },
        // Ignores context.signal: interrupting the turn must leave the monitor running.
        execute: async (input, context) => {
          const { command, description } = readInput(input)
          const session = await ctx.session.get({ sessionID: context.sessionID })
          const { id, deadlineMs, stderrPath } = monitors.start({
            sessionID: context.sessionID,
            command,
            description,
            cwd: session.location.directory,
          })
          return {
            content: [
              `Started monitor ${id}. Its notifications are headed "[monitor ${id}: ${description}]".`,
              `Deadline: ${deadlineMs / 60_000} minutes from now.`,
              `Stderr: ${stderrPath}`,
            ].join("\n"),
          }
        },
      })
    })
  },
}

export default plugin
