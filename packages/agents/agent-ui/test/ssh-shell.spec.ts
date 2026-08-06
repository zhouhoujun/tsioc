import expect = require('expect');
import { EventEmitter } from 'events';
import { Suite, Test } from '@tsdi/unit';
import { ConsoleTerminalSurfaceAccessor, TerminalClickTarget } from '@tsdi/components/console';
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

class FakeChannel extends EventEmitter {
    readonly stderr = new EventEmitter();
    written: string[] = [];
    ended = false;

    write(input: string): boolean {
        this.written.push(input);
        return true;
    }

    end(): void {
        this.ended = true;
        this.emit('close');
    }
}

class FakeSshClient {
    constructor(public readonly hostId: string, public shellError?: Error) {
    }

    async shell(options?: any): Promise<any> {
        if (this.shellError) {
            throw this.shellError;
        }
        const stream = new FakeChannel();
        return {
            stream,
            write: (input: string) => stream.write(input),
            close: async () => {
                if (!stream.ended) {
                    stream.end();
                }
            }
        };
    }
}

class FakeSshManager {
    connected = new Set<string>();
    hosts = new Map<string, any>([
        ['web', { id: 'web', host: 'example.com', port: 22, username: 'root' }],
        ['db', { id: 'db', host: 'db.internal', port: 2222, username: 'deploy' }]
    ]);
    shellError?: Error;

    hasHost(id: string): boolean {
        return this.hosts.has(id);
    }

    async connect(id: string): Promise<FakeSshClient> {
        if (!this.hosts.has(id)) {
            throw new Error(`SSH host '${id}' is not configured.`);
        }
        this.connected.add(id);
        return new FakeSshClient(`root@example.com:22`, this.shellError);
    }

    async disconnect(id: string): Promise<boolean> {
        if (!this.connected.has(id)) {
            return false;
        }
        this.connected.delete(id);
        return true;
    }
}

class FakeSurfaceAccessor extends ConsoleTerminalSurfaceAccessor {
    rawWrites: string[] = [];
    resetCount = 0;

    getLastRenderedLines(): string[] {
        return [];
    }

    getLastRenderedText(): string {
        return '';
    }

    dispatchTerminalMouse(): boolean {
        return false;
    }

    getClickTargets(): TerminalClickTarget[] {
        return [];
    }

    getTerminalRootStartRow(): number {
        return 0;
    }

    dispatchClickAt(): boolean {
        return false;
    }

    dispatchMouse(): boolean {
        return false;
    }

    writeTerminalClipboardText(): boolean {
        return false;
    }

    notifyNonMouseInput(): boolean {
        return false;
    }

    writeRawTerminalData(text: string): boolean {
        this.rawWrites.push(text);
        return true;
    }

    resetTerminalRenderState(): boolean {
        this.resetCount += 1;
        return true;
    }

    getTerminalSize(): { cols: number; rows: number } {
        return { cols: 100, rows: 30 };
    }
}

function createSshConsole(
    sshManager?: FakeSshManager | null,
    surface?: FakeSurfaceAccessor | null
): { state: AgentConsoleSessionState; component: AgentConsoleComponent; surface: FakeSurfaceAccessor } {
    const state = new AgentConsoleSessionState();
    const runtime = new RuntimeStub() as any;
    const bridge = new AgentConsoleEventBridge(state, runtime, null, null, null);
    const surfaceAccessor = surface ?? new FakeSurfaceAccessor();
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
        surfaceAccessor as any,
        undefined,
        sshManager as any
    );
    return { state, component, surface: surfaceAccessor };
}

@Suite('ssh interactive shell')
export class SshInteractiveShellTest {

    @Test('ssh shell command requires a host')
    async shellWithoutHostShowsUsage() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh shell');
        expect(state.notice).toContain('Usage: /ssh shell <host>');
    }

    @Test('ssh shell command rejects unknown hosts')
    async shellUnknownHost() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh shell missing');
        expect(state.notice).toContain(`SSH host 'missing' is not configured`);
    }

    @Test('ssh shell starts a session and activates shell mode')
    async shellStartsSession() {
        const manager = new FakeSshManager();
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh shell web');

        expect(state.isSshShellActive).toEqual(true);
        expect(state.sshShell).toEqual({ hostId: 'web' });
        expect(manager.connected.has('web')).toEqual(true);
        expect(state.notice).toContain('SSH shell started on web');
    }

    @Test('ssh shell streams remote data to the terminal surface')
    async shellStreamsRemoteData() {
        const { component, surface } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh shell web');
        const stream = (component as any).sshShell.stream as FakeChannel;

        stream.emit('data', 'prompt$ ');
        stream.stderr.emit('data', 'stderr-line');

        expect(surface.rawWrites).toEqual(['prompt$ ', 'stderr-line']);
    }

    @Test('ssh shell forwards input bytes to the remote stream')
    async shellForwardsInput() {
        const { component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh shell web');
        const stream = (component as any).sshShell.stream as FakeChannel;

        await (component as any).handleTerminalInput({} as any, 'ls -la\n');
        await (component as any).handleTerminalInput({} as any, 'cd /tmp');

        expect(stream.written).toEqual(['ls -la\n', 'cd /tmp']);
    }

    @Test('ssh shell detaches on Ctrl+] and restores the render state')
    async shellDetachesOnCtrlBracket() {
        const { state, component, surface } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh shell web');
        const stream = (component as any).sshShell.stream as FakeChannel;

        await (component as any).handleTerminalInput({} as any, '\x1d');

        expect(state.isSshShellActive).toEqual(false);
        expect(state.sshShell).toBeNull();
        expect((component as any).sshShell).toBeNull();
        expect(stream.ended).toEqual(true);
        expect(surface.resetCount).toBeGreaterThan(0);
        expect(state.notice).toContain('SSH shell detached from web');
    }

    @Test('ssh shell auto-detaches when the remote stream closes')
    async shellAutoDetachesOnClose() {
        const { state, component, surface } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh shell web');
        const stream = (component as any).sshShell.stream as FakeChannel;

        stream.emit('close');
        await new Promise(resolve => setImmediate(resolve));

        expect(state.isSshShellActive).toEqual(false);
        expect(surface.resetCount).toBeGreaterThan(0);
        expect(state.notice).toContain('SSH shell on web closed');
    }

    @Test('ssh shell refuses to start a second session while one is active')
    async shellRefusesSecondSession() {
        const manager = new FakeSshManager();
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh shell web');
        await (component as any).handleCommand('/ssh shell db');

        expect(state.sshShell).toEqual({ hostId: 'web' });
        expect(state.notice).toContain('Already in SSH shell on web');
    }

    @Test('ssh shell reports connection failures')
    async shellConnectFailure() {
        const manager = new FakeSshManager();
        const { state, component } = createSshConsole(manager);
        (manager as any).connect = async () => {
            throw new Error('timeout');
        };

        await (component as any).handleCommand('/ssh shell web');

        expect(state.isSshShellActive).toEqual(false);
        expect(state.notice).toContain('SSH connect failed: timeout');
    }

    @Test('ssh shell reports shell open failures')
    async shellOpenFailure() {
        const manager = new FakeSshManager();
        manager.shellError = new Error('channel closed');
        const { state, component } = createSshConsole(manager);

        await (component as any).handleCommand('/ssh shell web');

        expect(state.isSshShellActive).toEqual(false);
        expect(state.notice).toContain('SSH shell failed: channel closed');
    }

    @Test('ssh help documents the shell subcommand')
    async sshHelpDocumentsShell() {
        const { state, component } = createSshConsole(new FakeSshManager());

        await (component as any).handleCommand('/ssh help');
        expect(state.notice).toContain('shell <host>');
    }
}
