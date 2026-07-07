# packaged @tsdi/agent-channels

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-channels` provides conversation channel contracts, adapters, and orchestration
for delivering `@tsdi/agent` requests across different transports.

## Install

```shell
npm install @tsdi/agent-channels
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

## Package layout

- `src/contracts`: channel capabilities, messages, attachments, health status, and channel interfaces
- `src/orchestrator`: channel registry, envelope mapping, and orchestration flow
- `src/adapters`: local loopback, pub/sub, console, webhook, and SSE adapters

## Main exports

- `AgentChannelsModule`
- `AgentConversationChannel`
- `AgentChannelRegistry`
- `AgentChannelOrchestrator`
- `ChannelEnvelopeMapper`
- `LocalLoopbackAgentChannel`
- `PubSubConversationChannel`
- `ConsoleAgentChannel`
- `WebhookAgentChannel`
- `SSEAgentChannel`
- `provideChannels`, `withAgentChannels`, `withAgentChannelFeatures`

## Notes

- Use this package when the core runtime needs to send or receive messages through pluggable conversation channels.
- Features can be composed with providers and imported modules through `provideChannels(...)`.
- Channel adapters transport agent requests and responses, but they do not bypass tool activation or MCP allowlist checks enforced inside the runtime.

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)