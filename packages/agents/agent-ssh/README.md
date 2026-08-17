# packaged @tsdi/agent-ssh

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/agent-ssh` provides SSH client primitives and a connection manager for
`@tsdi/agent` remote sessions. It powers `@tsdi/agent-tools` SSH tools
(`ssh_exec`, `ssh_put`, `ssh_get`, `ssh_tunnel`) and the agent-ui `/ssh`
command family.

## Install

```shell
npm install @tsdi/agent-ssh
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

## Features

- **SshClient**: Lazy SSH connection with configurable auth (key / password / agent), known hosts policy, and bounded timeouts.
- **SshConnectionManager**: Named host registry with connection pooling, allowlist enforcement, and shared lifecycle.
- **SshForwarding**: TCP port forwarding channel verification.
- **Sftp operations**: File upload/download through the SSH session.
- **Zero external dependencies**: Uses Node.js built-in `net` and `crypto` for SSH transport.

## API

```ts
import { SshClient, SshConnectionManager } from '@tsdi/agent-ssh';

// Direct client
const client = new SshClient();
await client.connect({
  host: 'example.com',
  port: 22,
  username: 'root',
  auth: { type: 'key', keyPath: '~/.ssh/id_ed25519' },
  knownHosts: 'accept-new',
  timeoutMs: 30000,
});
const result = await client.exec('ls -la');
await client.close();

// Named host manager
const mgr = new SshConnectionManager({
  hosts: {
    web: { host: 'example.com', username: 'root', auth: { type: 'key' } },
  },
  allowlist: ['web'],
});
const conn = await mgr.connect('web');
```

## Host configuration

```ts
interface SshHostConfig {
  host: string;
  port?: number;          // default 22
  username: string;
  auth: {
    type: 'key' | 'password' | 'agent';
    keyPath?: string;     // default ~/.ssh/id_ed25519
    password?: string;
    passwordEnv?: string; // env var name for password
  };
  knownHosts?: 'strict' | 'accept-new' | 'off'; // default 'accept-new'
  timeoutMs?: number;     // default 30000
}
```

## Integration

- `@tsdi/agent-tools`: `ssh_exec`, `ssh_put`, `ssh_get`, `ssh_tunnel` tools
- `@tsdi/agent-ui`: `/ssh list`, `/ssh connect <host>`, `/ssh disconnect <host>`, `/ssh forward`
- `@tsdi/agent-cli`: SSH config from `settings.json` `ssh` section

## License

This package is published under the Apache License 2.0.

Apache License 2.0 © [Houjun](https://github.com/zhouhoujun/)
