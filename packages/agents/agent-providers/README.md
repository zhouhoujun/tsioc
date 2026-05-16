# packaged @tsdi/agent-providers

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-providers` contains model provider adapters for `@tsdi/agent`.
Each provider can be imported independently.

## Install

```shell
npm install @tsdi/agent-providers
```

## Build

```shell
npm run build
```

## Test

```shell
npm test
npm run test:coverage
```

## Provider entrypoints

- `@tsdi/agent-providers/openai`
- `@tsdi/agent-providers/anthropic`
- `@tsdi/agent-providers/gemini`
- `@tsdi/agent-providers/deepseek`
- `@tsdi/agent-providers/openai-compatible`

## Main exports

- `withAgentModelAdapter`
- provider-specific options, tokens, and adapter implementations from each subpath export

## Notes

- This package is intentionally modular: import only the provider entrypoints you need.
- Provider tests live under `test/*.spec.ts` and are organized per vendor adapter.

## License

MIT © [Houjun](https://github.com/zhouhoujun/)