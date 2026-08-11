import expect = require('expect');
import { Buffer } from 'buffer';
import { Suite, Test } from '@tsdi/unit';
import { Server, Client, Connection, Session, utils } from 'ssh2';
import { SshClient } from '../src/ssh-client';
import { SshConnectionManager } from '../src/ssh-manager';
import { SshHostConfig } from '../src/ssh-config';

interface MockServer {
    server: Server;
    port: number;
    hostKey: string;
}

async function startMockServer(onSession?: (session: Session) => void): Promise<MockServer> {
    const keys = await new Promise<{ private: string; public: string }>((resolve, reject) => {
        utils.generateKeyPair('ed25519', {}, (err, pair) => {
            if (err) {
                reject(err);
            } else {
                resolve(pair as any);
            }
        });
    });
    const server = new Server({ hostKeys: [keys.private] }, () => {});
    server.on('connection', (conn: Connection) => {
        conn.on('authentication', ctx => {
            ctx.accept();
        });
        conn.on('ready', () => {
            conn.on('session', accept => {
                const session = accept();
                if (onSession) {
                    onSession(session);
                }
            });
        });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as any).port as number;
    return { server, port, hostKey: keys.public };
}

@Suite('agent-ssh: SshClient')
export class SshClientTest {
    @Test('connects to a mock SSH server and runs a remote command')
    async execCommand() {
        const mock = await startMockServer(session => {
            session.on('exec', (accept, reject, info) => {
                const stream = accept();
                if (info.command.trim() === 'echo hello') {
                    stream.write('hello\n');
                    stream.exit(0);
                } else {
                    stream.write(`unexpected: ${info.command}\n`);
                    stream.exit(1);
                }
                stream.end();
            });
        });
        try {
            const client = new SshClient({
                id: 'mock',
                host: '127.0.0.1',
                port: mock.port,
                username: 'tester',
                auth: { type: 'password', password: 'secret' },
                knownHosts: 'off'
            });
            await client.connect();
            const result = await client.exec('echo hello');
            expect(result.stdout).toBe('hello');
            expect(result.exitCode).toBe(0);
            expect(result.timedOut).toBe(false);
            await client.disconnect();
        } finally {
            mock.server.close();
        }
    }

    @Test('reports non-zero exit codes from remote commands')
    async nonZeroExit() {
        const mock = await startMockServer(session => {
            session.on('exec', (accept, reject, info) => {
                const stream = accept();
                stream.write('boom\n');
                stream.exit(42);
                stream.end();
            });
        });
        try {
            const client = new SshClient({
                id: 'mock',
                host: '127.0.0.1',
                port: mock.port,
                username: 'tester',
                auth: { type: 'password', password: 'secret' },
                knownHosts: 'off'
            });
            await client.connect();
            const result = await client.exec('false');
            expect(result.exitCode).toBe(42);
            expect(result.stdout).toBe('boom');
            await client.disconnect();
        } finally {
            mock.server.close();
        }
    }

    @Test('rejects connect when the mock server closes the socket')
    async connectFailure() {
        const mock = await startMockServer();
        mock.server.close();
        const client = new SshClient({
            id: 'mock',
            host: '127.0.0.1',
            port: mock.port,
            username: 'tester',
            auth: { type: 'password', password: 'secret' },
            knownHosts: 'off',
            connectTimeoutMs: 2000
        });
        let rejected = false;
        try {
            await client.connect();
        } catch (error) {
            rejected = true;
            expect(String(error)).toContain('connect');
        }
        expect(rejected).toBe(true);
    }

    @Test('opens an interactive shell session over the mock server')
    async interactiveShell() {
        const mock = await startMockServer(session => {
            session.on('pty', accept => {
                accept();
            });
            session.on('shell', accept => {
                const stream = accept();
                stream.write('shell-ready\n');
                stream.on('data', () => {
                    stream.write('ack\n');
                });
                stream.on('end', () => {
                    stream.close();
                });
            });
        });
        try {
            const client = new SshClient({
                id: 'mock',
                host: '127.0.0.1',
                port: mock.port,
                username: 'tester',
                auth: { type: 'password', password: 'secret' },
                knownHosts: 'off'
            });
            await client.connect();
            const session = await client.shell({ term: 'xterm-256color', cols: 80, rows: 24 });
            const lines: string[] = [];
            session.stream.on('data', (chunk: Buffer) => {
                lines.push(String(chunk));
            });
            await new Promise<void>(resolve => {
                session.stream.once('data', () => resolve());
            });
            expect(lines.join('')).toContain('shell-ready');
            await session.close();
            await client.disconnect();
        } finally {
            mock.server.close();
        }
    }

    @Test('rejects sftp operations before connect')
    async sftpRequiresConnection() {
        const client = new SshClient({
            id: 'mock',
            host: '127.0.0.1',
            port: 22,
            username: 'tester',
            auth: { type: 'password', password: 'secret' },
            knownHosts: 'off'
        });
        let putRejected = false;
        try {
            await client.sftpPut('/dev/null', '/tmp/remote-file.txt');
        } catch (error) {
            putRejected = true;
        }
        expect(putRejected).toBe(true);
        let getRejected = false;
        try {
            await client.sftpGet('/tmp/remote-file.txt', '/dev/null');
        } catch (error) {
            getRejected = true;
        }
        expect(getRejected).toBe(true);
    }
}

@Suite('agent-ssh: SshConnectionManager')
export class SshConnectionManagerTest {
    @Test('registers hosts and connects through the manager')
    async registerAndConnect() {
        const mock = await startMockServer(session => {
            session.on('exec', (accept, reject, info) => {
                const stream = accept();
                stream.write(`pong:${info.command}\n`);
                stream.exit(0);
                stream.end();
            });
        });
        try {
            const manager = new SshConnectionManager();
            manager.register({
                id: 'mock',
                host: '127.0.0.1',
                port: mock.port,
                username: 'tester',
                auth: { type: 'password', password: 'secret' },
                knownHosts: 'off'
            });
            expect(manager.hostCount).toBe(1);
            const client = await manager.connect('mock');
            const result = await client.exec('ls');
            expect(result.stdout).toBe('pong:ls');
            expect(manager.list()[0].connected).toBe(true);
            await manager.disconnect('mock');
            expect(manager.list()[0].connected).toBe(false);
        } finally {
            mock.server.close();
        }
    }

    @Test('rejects connect for unknown hosts')
    async unknownHost() {
        const manager = new SshConnectionManager();
        let rejected = false;
        try {
            await manager.connect('nope');
        } catch (error) {
            rejected = true;
            expect(String(error)).toContain('not configured');
        }
        expect(rejected).toBe(true);
    }

    @Test('rejects connect when allowlist excludes the host')
    async allowlistBlocks() {
        const mock = await startMockServer();
        try {
            const manager = new SshConnectionManager({ allowlist: ['allowed-host'] });
            manager.register({
                id: 'blocked',
                host: '127.0.0.1',
                port: mock.port,
                username: 'tester',
                auth: { type: 'password', password: 'secret' },
                knownHosts: 'off'
            });
            let rejected = false;
            try {
                await manager.connect('blocked');
            } catch (error) {
                rejected = true;
                expect(String(error)).toContain('not in the allowed hosts');
            }
            expect(rejected).toBe(true);
        } finally {
            mock.server.close();
        }
    }
}
