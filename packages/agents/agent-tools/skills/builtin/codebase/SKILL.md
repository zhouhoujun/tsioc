---
name: codebase
description: Explore the repository before making changes.
aliases: [repo, code]
tools: [read_file, glob_search, content_search, todo]
---

# Codebase Exploration

Use this skill when you need to understand existing code before editing it.

## Core behavior

- Search for existing implementations before adding new code.
- Read the smallest set of files that can confirm the pattern.
- Prefer extending current architecture over introducing parallel systems.
- Track findings and next actions when the task spans multiple files.

## Working style

Start by identifying the files that own the relevant behavior.
Then trace related tests and provider wiring before proposing changes.
