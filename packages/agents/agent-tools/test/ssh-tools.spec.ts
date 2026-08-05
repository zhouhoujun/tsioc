import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Server, Connection, Session, utils } from 'ssh2';
import { SshConnectionManager, SshHostConfig } from '@tsdi/agent-ssh';
import { SshExecTool, SshGetTool, SshPutTool, SshTunnelTool } from '../ssh/ssh.tool';

async function startMockServer(onSession?: (session: Session) => void): Promise<{ server: Server; port: number }> {
    const keys = await new Promise<{ private: string }>((resolve, reject) => {
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
    return { server, port: (server.address() as any).port as number };
}

function mockConfig(port: number): SshHostConfig {
    return {
        id: 'mock',
        host: '127.0.0.1',
        port,
        username: 'tester',
        auth: { type: 'password', password: 'secret' },
        knownHosts: 'off'
    };
}

@Suite('agent-tools: ssh tools')
export class SshToolsTest {
    @Test('ssh_exec runs a remote command through the tool')
    async execTool() {
        const mock = await startMockServer(session => {
            session.on('exec', (accept, reject, info) => {
                const stream = accept();
                stream.write(`out:${info.command}\n`);
                stream.exit(0);
                stream.end();
            });
        });
        try {
            const manager = new SshConnectionManager();
            manager.register(mockConfig(mock.port));
            const tool = new SshExecTool(manager, { ssh: { defaultTimeoutMs: 10000 } });
            const result = await tool.invoke({ host: 'mock', command: 'uname' }, { sessionId: 's1' } as any);
            expect(result.stdout).toBe('out:uname');
            expect(result.exitCode).toBe(0);
            expect(result.host).toBe('mock');
        } finally {
            mock.server.close();
        }
    }

    @Test('ssh_exec rejects when no connection manager is configured')
    async execToolWithoutManager() {
        const tool = new SshExecTool(null, undefined);
        let rejected = false;
        try {
            await tool.invoke({ host: 'mock', command: 'ls' }, { sessionId: 's1' } as any);
        } catch (error) {
            rejected = true;
            expect(String(error)).toContain('require');
        }
        expect(rejected).toBe(true);
    }

    @Test('ssh_put uploads a file through the tool')
    async putTool() {
        const mock = await startMockServer(session => {
            session.on('sftp', accept => {
                accept();
            });
        });
        try {
            const manager = new SshConnectionManager();
            manager.register(mockConfig(mock.port));
            const tool = new SshPutTool(manager);
            let rejected = false;
            try {
                await tool.invoke({ host: 'mock', localPath: '/dev/null', remotePath: '/tmp/x' }, { sessionId: 's1' } as any);
            } catch (error) {
                rejected = true;
            }
            expect(rejected).toBe(true);
        } finally {
            mock.server.close();
        }
    }

    @Test('ssh_get rejects without a connection manager')
    async getToolWithoutManager() {
        const tool = new SshGetTool(null);
        let rejected = false;
        try {
            await tool.invoke({ host: 'mock', remotePath: '/tmp/x', localPath: '/dev/null' }, { sessionId: 's1' } as any);
        } catch (error) {
            rejected = true;
        }
        expect(rejected).toBe(true);
    }

    @Test('ssh_tunnel opens a forwarding channel to the mock server')
    async tunnelTool() {
        const mock = await startMockServer();
        try {
            const manager = new SshConnectionManager();
            manager.register(mockConfig(mock.port));
            const tool = new SshTunnelTool(manager);
            let rejected = false;
            try {
                await tool.invoke({ host: 'mock', destAddr: '127.0.0.1', destPort: 22 }, { sessionId: 's1' } as any);
            } catch (error) {
                rejected = true;
            }
            expect(rejected).toBe(true);
        } finally {
            mock.server.close();
        }
    }
}
