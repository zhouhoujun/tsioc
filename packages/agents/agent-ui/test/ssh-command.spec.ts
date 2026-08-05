import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionState } from '../src';

class RuntimeStub {
    messages = [{ id: '1', role: 'assistant', content: 'ready', createdAt: 1 } as any];

    async runTurn(sessionId: string, input: string): Promise<any> {
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(): Promise<any[]> {
        return this.messages;
    }
}

class SchedulerStub {
    async schedule(task: any): Promise<any> {
        return task;
    }
}

class FakeSshClient {
    constructor(public readonly hostId: string) {
    }

    async forwardOut(srcAddr: string, srcPort: number, destAddr: string, destPort: number): Promise<{ close(): void }> {
        return { close: () => void 0 };
    }
}

class FakeSshManager {
    connected = new Set<string>();
    hosts = new Map<string, any>([
        ['web', { id: 'web', host: 'example.com', port: 22, username: 'root' }],
        ['db', { id: 'db', host: 'db.internal', port: 2222, username: 'deploy' }]
    ]);

    hasHost(id: string): boolean {
        return this.hosts.has(id);
    }

    list(): any[] {
        return Array.from(this.hosts.keys()).map(id => {
            const config = this.hosts.get(id);
            return {
                id,
                host: config.host,
                port: config.port,
                username: config.username,
                connected: this.connected.has(id)
            };
        });
    }

    async connect(id: string): Promise<FakeSshClient> {
        if (!this.hosts.has(id)) {
            throw new Error(`SSH host '${id}' is not configured.`);
        }
        this.connected.add(id);
        return new FakeSshClient(`root@example.com:22`);
    }

    async disconnect(id: string): Promise<boolean> {
        if (!this.connected.has(id)) {
            return false;
        }
        this.connected.delete(id);
        return true;
    }
}

function createSshConsole(sshManager?: FakeSshManager | null): { state: AgentConsoleSessionState; component: AgentConsoleComponent } {
    const state = new AgentConsoleSessionState();
    const runtime = new RuntimeStub() as any;
    const bridge = new AgentConsoleEventBridge(state, runtime, null, null, null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: { title: 'Console' } } as any,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        sshManager as any
    );
    return { state, component };
}

@Suite('ssh console commands')
export class SshConsoleCommandTest {

    @Test('ssh list command reports hosts and connection status')
    async sshListReportsHosts() {
        const manager = new FakeSshManager();
        manager.connected.add('web');
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh');
        expect(state.notice).toContain('web · root@example.com:22 · connected');
        expect(state.notice).toContain('db · deploy@db.internal:2222 · disconnected');

        await (component as any).handleCommand('/ssh list');
        expect(state.notice).toContain('web · root@example.com:22 · connected');
    }

    @Test('ssh list command reports when no hosts are configured')
    async sshListNoHosts() {
        const { state, component } = createSshConsole(new FakeSshManager());
        (component as any).sshManager.hosts.clear();
        await (component as any).handleCommand('/ssh');
        expect(state.notice).toContain('No SSH hosts configured');
    }

    @Test('ssh list command reports when ssh is not configured')
    async sshListNotConfigured() {
        const { state, component } = createSshConsole(null);
        await (component as any).handleCommand('/ssh');
        expect(state.notice).toContain('SSH is not configured');
    }

    @Test('ssh connect command connects a configured host')
    async sshConnectConnectsHost() {
        const manager = new FakeSshManager();
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh connect web');
        expect(state.notice).toContain('Connected to');
        expect(manager.connected.has('web')).toEqual(true);
    }

    @Test('ssh connect command rejects unknown hosts')
    async sshConnectUnknownHost() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh connect missing');
        expect(state.notice).toContain(`SSH host 'missing' is not configured`);
    }

    @Test('ssh connect command without host shows usage')
    async sshConnectWithoutHost() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh connect');
        expect(state.notice).toContain('Usage: /ssh connect <host>');
    }

    @Test('ssh disconnect command disconnects a connected host')
    async sshDisconnectDisconnectsHost() {
        const manager = new FakeSshManager();
        manager.connected.add('db');
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh disconnect db');
        expect(state.notice).toContain('Disconnected from db');
        expect(manager.connected.has('db')).toEqual(false);
    }

    @Test('ssh disconnect command reports when host is not connected')
    async sshDisconnectNotConnected() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh disconnect web');
        expect(state.notice).toContain(`SSH host 'web' is not connected`);
    }

    @Test('ssh forward command establishes a tunnel')
    async sshForwardEstablishesTunnel() {
        const manager = new FakeSshManager();
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh forward web 127.0.0.1 3306');
        expect(state.notice).toContain('Tunnel established');
        expect(manager.connected.has('web')).toEqual(true);
    }

    @Test('ssh forward command rejects invalid arguments')
    async sshForwardInvalidArgs() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh forward');
        expect(state.notice).toContain('Usage: /ssh forward <host> <destAddr> <destPort>');

        await (component as any).handleCommand('/ssh forward web 127.0.0.1 notaport');
        expect(state.notice).toContain('Usage: /ssh forward <host> <destAddr> <destPort>');
    }

    @Test('ssh unknown subcommand shows usage')
    async sshUnknownSubcommand() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh bogus');
        expect(state.notice).toContain('Unknown /ssh command');
    }

    @Test('ssh help shows usage')
    async sshHelpShowsUsage() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh help');
        expect(state.notice).toContain('Usage: /ssh');
    }
}
