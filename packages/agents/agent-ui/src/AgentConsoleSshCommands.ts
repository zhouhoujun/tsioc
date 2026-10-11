import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export interface AgentConsoleSshTerminalSurface {
    getTerminalSize?(): { cols?: number; rows: number };
    writeRawTerminalData?(data: string): void;
    resetTerminalRenderState?(): void;
}

export interface AgentConsoleSshState {
    sshShell: { hostId: string } | null;
    readonly isSshShellActive: boolean;
}

export interface AgentConsoleSshHost {
    translator?: AgentUiTranslator | null;
    state: AgentConsoleSshState;
    sshManager?: any;
    sshShell: any;
    surface?: AgentConsoleSshTerminalSurface | null;
    notify(message: string, duration?: number): void;
}

interface SshShellStreamLike {
    on(event: string, listener: (chunk: Uint8Array | string) => void): void;
    stderr?: { on(event: string, listener: (chunk: Uint8Array | string) => void): void } | null;
}

interface SshShellSessionLike {
    stream: SshShellStreamLike;
    close(): Promise<void> | void;
}

interface SshClientLike {
    shell(options: { term: string; cols: number; rows: number }): Promise<SshShellSessionLike>;
}

export function listSshHosts(sshManager: any, notify: (message: string) => void, translator?: AgentUiTranslator | null): void {
    if (!sshManager) {
        notify(formatAgentUiNotice(translator, 'sshNotConfigured'));
        return;
    }
    const infos = sshManager.list();
    if (!infos.length) {
        notify(formatAgentUiNotice(translator, 'sshNoHosts'));
        return;
    }
    const lines = infos.map((info: any) =>
        `${info.id} · ${info.username}@${info.host}:${info.port} · ${info.connected ? formatAgentUiNotice(translator, 'sshHostConnected') : formatAgentUiNotice(translator, 'sshHostDisconnected')}`
    );
    notify(lines.join('\n'));
}

export async function connectSshHost(sshManager: any, notify: (message: string) => void, id: string | undefined, translator?: AgentUiTranslator | null): Promise<void> {
    if (!id) {
        notify(formatAgentUiNotice(translator, 'sshConnectUsage'));
        return;
    }
    if (!sshManager) {
        notify(formatAgentUiNotice(translator, 'sshNotConfigured'));
        return;
    }
    if (!sshManager.hasHost(id)) {
        notify(formatAgentUiNotice(translator, 'sshHostNotConfigured', { id }));
        return;
    }
    try {
        const client = await sshManager.connect(id);
        notify(formatAgentUiNotice(translator, 'sshConnected', { hostId: client.hostId }));
    } catch (error) {
        notify(formatAgentUiNotice(translator, 'sshConnectFailed', { error: error instanceof Error ? error.message : String(error) }));
    }
}

export async function forwardSshTunnel(sshManager: any, notify: (message: string) => void, tokens: string[], translator?: AgentUiTranslator | null): Promise<void> {
    const id = tokens[0];
    const destAddr = tokens[1];
    const destPort = Number(tokens[2]);
    if (!id || !destAddr || !Number.isInteger(destPort) || destPort < 1 || destPort > 65535) {
        notify(formatAgentUiNotice(translator, 'sshForwardUsage'));
        return;
    }
    if (!sshManager) {
        notify(formatAgentUiNotice(translator, 'sshNotConfigured'));
        return;
    }
    const srcAddr = tokens[3] || '127.0.0.1';
    const srcPort = tokens[4] == null ? 0 : Number(tokens[4]);
    if (!Number.isInteger(srcPort) || srcPort < 0 || srcPort > 65535) {
        notify(formatAgentUiNotice(translator, 'sshInvalidSrcPort'));
        return;
    }
    let client: any;
    try {
        client = await sshManager.connect(id);
    } catch (error) {
        notify(formatAgentUiNotice(translator, 'sshConnectFailed', { error: error instanceof Error ? error.message : String(error) }));
        return;
    }
    try {
        const channel = await client.forwardOut(srcAddr, srcPort, destAddr, destPort);
        channel.close();
        notify(formatAgentUiNotice(translator, 'sshTunnelEstablished', { srcAddr, srcPort, destAddr, destPort, hostId: client.hostId }));
    } catch (error) {
        notify(formatAgentUiNotice(translator, 'sshForwardFailed', { error: error instanceof Error ? error.message : String(error) }));
    }
}

export async function runSshCommand(host: AgentConsoleSshHost, args: string): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const action = (tokens[0] || 'list').toLowerCase();
    if (action === 'help' || action === '?') {
        host.notify(formatAgentUiNotice(host.translator, 'sshUsage'));
        return;
    }
    if (action === 'list' || action === 'ls') {
        listSshHosts(host.sshManager, (message: string) => host.notify(message), host.translator);
        return;
    }
    if (action === 'connect') {
        await connectSshHost(host.sshManager, (message: string) => host.notify(message), tokens[1], host.translator);
        return;
    }
    if (action === 'disconnect') {
        await disconnectSshHost(host, tokens[1]);
        return;
    }
    if (action === 'shell') {
        await startSshShell(host, tokens[1]);
        return;
    }
    if (action === 'forward') {
        await forwardSshTunnel(host.sshManager, (message: string) => host.notify(message), tokens.slice(1), host.translator);
        return;
    }
    host.notify(formatAgentUiNotice(host.translator, 'unknownSshCommand'));
}

export async function disconnectSshHost(host: AgentConsoleSshHost, id: string | undefined): Promise<void> {
    if (!id) {
        host.notify(formatAgentUiNotice(host.translator, 'sshDisconnectUsage'));
        return;
    }
    if (!host.sshManager) {
        host.notify(formatAgentUiNotice(host.translator, 'sshNotConfigured'));
        return;
    }
    const disconnected = await host.sshManager.disconnect(id);
    host.notify(disconnected
        ? formatAgentUiNotice(host.translator, 'sshDisconnected', { id: id })
        : formatAgentUiNotice(host.translator, 'sshHostNotConnected', { id: id }));
}

export async function startSshShell(host: AgentConsoleSshHost, id: string | undefined): Promise<void> {
    if (!id) {
        host.notify(formatAgentUiNotice(host.translator, 'sshShellUsage'));
        return;
    }
    if (!host.sshManager) {
        host.notify(formatAgentUiNotice(host.translator, 'sshNotConfigured'));
        return;
    }
    if (!host.sshManager.hasHost(id)) {
        host.notify(formatAgentUiNotice(host.translator, 'sshHostNotConfigured', { id: id }));
        return;
    }
    if (host.state.isSshShellActive) {
        host.notify(formatAgentUiNotice(host.translator, 'alreadySshShell', { hostId: host.state.sshShell?.hostId }));
        return;
    }
    let client: SshClientLike;
    try {
        client = await host.sshManager.connect(id);
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'sshConnectFailed', { error: error instanceof Error ? error.message : String(error) }));
        return;
    }
    const size = host.surface?.getTerminalSize?.() ?? { cols: 80, rows: 24 };
    let shell: SshShellSessionLike;
    try {
        shell = await client.shell({ term: 'xterm-256color', cols: size.cols ?? 80, rows: size.rows });
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'sshShellFailed', { error: error instanceof Error ? error.message : String(error) }));
        return;
    }
    host.sshShell = shell;
    host.state.sshShell = { hostId: id };
    shell.stream.on('data', (chunk: Uint8Array | string) => {
        host.surface?.writeRawTerminalData?.(String(chunk));
    });
    shell.stream.stderr?.on('data', (chunk: Uint8Array | string) => {
        host.surface?.writeRawTerminalData?.(String(chunk));
    });
    const onEnd = () => {
        if (host.state.isSshShellActive && host.sshShell === shell) {
            void detachSshShell(host, 'closed');
        }
    };
    shell.stream.on('close', onEnd);
    shell.stream.on('error', onEnd);
    host.notify(formatAgentUiNotice(host.translator, 'sshShellStarted', { id: id }));
}

export async function detachSshShell(host: AgentConsoleSshHost, reason: 'detached' | 'closed'): Promise<void> {
    const hostId = host.state.sshShell?.hostId || '';
    const shell = host.sshShell;
    host.sshShell = null;
    host.state.sshShell = null;
    if (shell) {
        try {
            await shell.close();
        } catch {
            void 0;
        }
    }
    host.surface?.resetTerminalRenderState?.();
    if (hostId) {
        host.notify(reason === 'detached'
            ? formatAgentUiNotice(host.translator, 'sshShellDetached', { hostId: hostId })
            : formatAgentUiNotice(host.translator, 'sshShellClosed', { hostId: hostId }));
    }
}
