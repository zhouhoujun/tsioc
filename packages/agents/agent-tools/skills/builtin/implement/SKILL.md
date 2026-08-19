---
name: implement
description: Implement requested code or file changes end to end with focused planning and verification.
aliases: [build, code, tdd]
tools: [todo, ask_user, coding_task, read_file, write_file, edit_file, content_search, list_dir]
---

# Implementation

Use for requests that explicitly ask to create, generate, build, implement, fix, or modify code or files. Do not use for design-only discussion.

## Workspace Root

When a workspace is explicitly provided, treat that directory as the project root and create or modify project files directly there. Do not create an additional project directory beneath it unless the user explicitly names a project subdirectory or asks for a separate project.

Relative paths, generated files, package manifests, and project configuration must resolve from the provided workspace root by default. Ask only when the requested project location is ambiguous and cannot be inferred from the workspace or the user's wording.

## Workflow

1. Inspect the workspace and existing patterns.
2. Track a short plan for multi-step work.
3. Ask one question only when a missing product choice materially changes the result; otherwise proceed.
4. Prefer a failing test first for behavioral changes, then implement the smallest complete fix.
5. Run relevant tests or builds and inspect changed files before reporting completion.

Do not stop at a proposal, partial scaffold, or status update while safe implementation work remains.
