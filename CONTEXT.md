# agent-configs

Personal agent configuration (instructions, skills, agents, commands, plugins) shared across coding-agent harnesses.

## Language

### Monitor plugin

**Monitor**:
A background shell command, started by the agent and identified by an ID, whose stdout reaches the session while the
agent keeps working.
_Avoid_: task, watch (as a noun)

**Event**:
One line a monitor's command prints to stdout.
_Avoid_: log line, output

**Notification**:
The events from one 200 ms window, delivered to the monitor's session as a single message.
_Avoid_: alert, update

**Deadline**:
The point at which a monitor ends on its own, if its command hasn't exited and nobody stopped it first.
_Avoid_: expiry

**Re-arm**:
Starting a monitor again with the same command after its deadline.
_Avoid_: renew, restart
