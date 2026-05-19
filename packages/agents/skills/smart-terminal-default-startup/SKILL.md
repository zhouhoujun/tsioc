---
name: smart-terminal-default-startup
description: "Use when an agent should begin in terminal-first mode with safe startup checks, workspace discovery, and command discipline."
version: 1.0.0
author: TSDI Agent
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [terminal, startup, defaults, shell, workspace, cli, agent]
    related_skills: []
---

# Smart Terminal Default Startup

## Overview

This skill defines the default behavior for an agent that starts in an intelligent terminal workflow. The goal is to establish workspace context quickly, prefer deterministic shell usage, and avoid risky or noisy commands until the task is understood.

Use this skill to make terminal-driven sessions feel consistent: start with lightweight discovery, keep commands non-interactive, operate inside the intended workspace, and only escalate to mutating actions after the request is clear.

The command examples in this document assume a POSIX-style shell, which matches the current terminal-first workflows in this repository.

## When to Use

Use this skill when:
- the agent starts in a terminal-centric session
- the user expects shell-first execution
- the task involves repo inspection, builds, tests, scripts, or CLI workflows
- the agent needs a default startup routine before acting

Do not use this skill when:
- the task is purely conversational and needs no shell access
- the task is primarily about editing prose without command execution
- the environment is intentionally restricted away from terminal usage

## Core Startup Behavior

At the beginning of a terminal-first session:

1. Confirm the working context.
2. Prefer fast, read-only discovery before any mutation.
3. Keep commands non-interactive and reproducible.
4. Stay inside the configured workspace unless the user asks otherwise.
5. Delay destructive or externally visible actions until explicitly requested.

## Default Startup Checklist

Run a minimal startup pass when it is relevant to the user task:

1. Identify the current workspace.
2. List top-level files or folders relevant to the task.
3. Detect whether the workspace is a git repository.
4. If the task is code-related, identify the package, build entrypoint, and test entrypoint before editing.
5. Only after that, choose the narrowest command sequence that advances the task.

Recommended first-pass commands:

```bash
pwd
ls
git status --short --branch
```

Use them selectively. Do not run all three if the task does not benefit from them.

## Command Discipline

### Prefer

- non-interactive commands
- package-local build and test commands
- short command chains with clear failure behavior
- explicit paths and explicit working directories
- read-only inspection before mutation

### Avoid

- interactive installers or prompts unless the user is driving them
- broad destructive commands
- long opaque shell one-liners when a clearer command will do
- changing directories repeatedly when an explicit workdir is sufficient
- guessing environment state without checking it

## Tool Usage Rules

When a terminal tool is available:

- Use the terminal for shell-native operations: builds, tests, git status, script execution, process inspection.
- Use file-reading tools for source inspection when structured reads are clearer than shell output.
- Use file-editing tools for code changes instead of shell text mangling when possible.
- Keep terminal commands focused on execution, not on rewriting files.

## Workdir Rules

- Default to the configured workspace root.
- If the task clearly targets a subpackage, run the command in that package directory instead of relying on repeated `cd` hops.
- If the user specifies a directory, honor it exactly.
- If a command would affect files outside the workspace, stop and ask.

## Safe Escalation Model

Start with the least invasive action that can answer the question.

1. Read state.
2. Verify the relevant package or script.
3. Run the smallest meaningful command.
4. Edit only the files required.
5. Validate with targeted tests or builds.
6. Ask before irreversible or shared-state actions.

## Output Style

During terminal-first work:

- keep user-facing updates brief
- summarize findings, not every command
- surface blockers immediately
- include exact file paths and command outcomes when they matter
- avoid claiming success before validation finishes

## Monorepo Guidance

In multi-package repositories:

- identify the owning package before running build or test commands
- prefer package-level commands over root-wide commands when the root is broader than the task
- inspect package manifests or taskfiles before assuming script names
- validate only the touched surface when possible, then broaden if needed

## Failure Handling

When a command fails:

1. report the failure clearly
2. inspect the error message before retrying
3. adjust the command or approach based on the actual cause
4. avoid blind retries
5. avoid bypass flags unless the user explicitly asks for them

## Risk Boundaries

Always pause and ask before:
- deleting files
- resetting git state
- force-pushing
- changing remote resources
- installing or removing dependencies that could affect the shared workspace
- running migrations or scripts with irreversible side effects

## Example Startup Patterns

### Repo inspection

```bash
git status --short --branch
ls
```

### Package-oriented build discovery

```bash
ls packages
ls packages/agents
```

### Focused validation after edits

```bash
npm test
npm run build
```

Use the repository's actual package-level commands when known; do not assume root scripts cover nested packages.

## Common Pitfalls

1. Running a broad build before identifying the affected package.
2. Using interactive shell flows in an unattended agent session.
3. Editing files through shell redirection when a structured edit tool is safer.
4. Treating terminal access as permission to mutate immediately.
5. Reporting completion before tests or builds finish.

## Verification Checklist

- [ ] The workspace has been identified.
- [ ] The task-relevant package or directory has been identified.
- [ ] Initial terminal usage stayed read-first and non-interactive.
- [ ] Mutating commands were limited to the task scope.
- [ ] Validation commands matched the touched surface.
- [ ] No risky command was run without user authorization.
