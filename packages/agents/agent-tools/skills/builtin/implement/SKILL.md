---
name: implement
description: Implement requested code or file changes end to end with focused planning and verification.
aliases: [build, code, tdd]
tools: [todo, ask_user, coding_task, read_file, write_file, edit_file, content_search, list_dir]
---

# Implementation

Use for requests that explicitly ask to create, generate, build, implement, fix, or modify code or files. Do not use for design-only discussion.

## Workflow

1. Inspect the workspace and existing patterns.
2. Track a short plan for multi-step work.
3. Ask one question only when a missing product choice materially changes the result; otherwise proceed.
4. Prefer a failing test first for behavioral changes, then implement the smallest complete fix.
5. Run relevant tests or builds and inspect changed files before reporting completion.

Do not stop at a proposal, partial scaffold, or status update while safe implementation work remains.
