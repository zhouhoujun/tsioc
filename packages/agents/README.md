# @tsdi agents packages

This directory groups the `@tsdi/agent*` subprojects published from this monorepo.

## License note

The repository root license may differ from the packages in this directory.
For all packages under `packages/agents/*`, distribution and consumption should follow the **package-level Apache-2.0 license declarations** in each subproject's `package.json` and README.

This currently applies to:

- `@tsdi/agent`
- `@tsdi/agent-tools`
- `@tsdi/agent-gateway`
- `@tsdi/agent-channels`
- `@tsdi/agent-providers`
- `@tsdi/agent-cli`

## Maintainer guidance

When adding a new subproject under `packages/agents/`:

1. Set `"license": "Apache-2.0"` in its `package.json`
2. Add an explicit Apache 2.0 note in its README / localized README files
3. Keep this directory overview aligned with the published package list
