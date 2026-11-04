# Context pack

Everything an AI agent (or a new human) needs to continue this project, written so it does not depend on any one tool's memory or chat history. Claude Code's personal memory lives outside the repo and cannot be read by other tools, so its useful parts were copied here.

| File | What's inside |
|---|---|
| [requirements.md](requirements.md) | What the product must do, who it serves, and the future goals (owner's words, condensed) |
| [rules.md](rules.md) | How to work on this project: collaboration rules, git and deploy rules, invariants, what to ask |
| [history.md](history.md) | What was built, in order, and why, with commit hashes |
| [handoff.md](handoff.md) | Current state right now: branch, deploy status, open owner tasks, known issues, how to resume |

Also relevant:
- [../decisions.md](../decisions.md): numbered architecture decisions (ADRs). Add new ones at the bottom.
- [../roadmap.md](../roadmap.md): what is done, next, and planned.
- [../../AGENTS.md](../../AGENTS.md): the harness-neutral entry point with commands and invariants.

## Keeping this pack current
When you finish a unit of work, update `history.md` (one entry) and `handoff.md` (state) in the same commit. Add a decision to `decisions.md` if you chose between real alternatives. Do not write session transcripts here; write conclusions.
