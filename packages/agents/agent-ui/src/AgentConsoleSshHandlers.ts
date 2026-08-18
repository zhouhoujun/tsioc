import { SshConnectionManager, SshClient, SshShellSession } from '@tsdi/agent-ssh';

// ── SSH handler context ──────────────────────────────────────────────────────

export interface SshHandlerContext {
    state: {
        isSshShellActive: boolean;
        sshShell: { hostId: string } | null;
        setSshShell: (shell: { hostId: string } | null) => void;
    };
    sshManager: SshConnectionManager | null;
    surfaceAccessor?: {
        getTerminalSize?: () => { cols: number; rows: number };
        writeRawTerminalData?: (data: string) => void;
        resetTerminalRenderState?: () => void;
    } | null;
    notify: (msg: string, duration?: number) => void;
}

// ── SSH command dispatch ─────────────────────────────────────────────────────

export async function runSshCommand(
    ctx: SshHandlerContext,
    args: string,
    shellRef: { current: SshShellSession | null }
): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const action = (tokens[0] || 'list').toLowerCase();
    if (action === 'help' || action === '?') {
        ctx.notify('Usage: /ssh [list] | connect <host> | disconnect <host> | shell <host> | forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
        return;
    }
    if (action === 'list' || action === 'ls') {
        listSshHosts(ctx);
        return;
    }
    if (action === 'connect') {
        await connectSshHost(ctx, tokens[1]);
        return;
    }
    if (action === 'disconnect') {
        await disconnectSshHost(ctx, tokens[1]);
        return;
    }
    if (action === 'shell') {
        await startSshShell(ctx, tokens[1], shellRef);
        return;
    }
    if (action === 'forward') {
        await forwardSshTunnel(ctx, tokens.slice(1));
        return;
    }
    ctx.notify('Unknown /ssh command. Usage: /ssh [list] | connect <host> | disconnect <host> | shell <host> | forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
}

export function listSshHosts(ctx: SshHandlerContext): void {
    if (!ctx.sshManager) {
        ctx.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    const infos = ctx.sshManager.list();
    if (!infos.length) {
        ctx.notify('No SSH hosts configured.');
        return;
    }
    const lines = infos.map(info =>
        `${info.id} · ${info.username}@${info.host}:${info.port} · ${info.connected ? 'connected' : 'disconnected'}`
    );
    ctx.notify(lines.join('\n'));
}

export async function connectSshHost(
    ctx: SshHandlerContext,
    id: string | undefined
): Promise<void> {
    if (!id) {
        ctx.notify('Usage: /ssh connect <host>');
        return;
    }
    if (!ctx.sshManager) {
        ctx.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    if (!ctx.sshManager.hasHost(id)) {
        ctx.notify(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`);
        return;
    }
    try {
        const client = await ctx.sshManager.connect(id);
        ctx.notify(`Connected to ${client.hostId}.`);
    } catch (error) {
        ctx.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function disconnectSshHost(
    ctx: SshHandlerContext,
    id: string | undefined
): Promise<void> {
    if (!id) {
        ctx.notify('Usage: /ssh disconnect <host>');
        return;
    }
    if (!ctx.sshManager) {
        ctx.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    const disconnected = await ctx.sshManager.disconnect(id);
    ctx.notify(disconnected
        ? `Disconnected from ${id}.`
        : `SSH host '${id}' is not connected.`);
}

export async function forwardSshTunnel(
    ctx: SshHandlerContext,
    tokens: string[]
): Promise<void> {
    const id = tokens[0];
    const destAddr = tokens[1];
    const destPort = Number(tokens[2]);
    if (!id || !destAddr || !Number.isInteger(destPort) || destPort < 1 || destPort > 65535) {
        ctx.notify('Usage: /ssh forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
        return;
    }
    if (!ctx.sshManager) {
        ctx.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    const srcAddr = tokens[3] || '127.0.0.1';
    const srcPort = tokens[4] == null ? 0 : Number(tokens[4]);
    if (!Number.isInteger(srcPort) || srcPort < 0 || srcPort > 65535) {
        ctx.notify('Invalid srcPort: must be an integer in 0..65535.');
        return;
    }
    let client: SshClient;
    try {
        client = await ctx.sshManager.connect(id);
    } catch (error) {
        ctx.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    try {
        const channel = await client.forwardOut(srcAddr, srcPort, destAddr, destPort);
        channel.close();
        ctx.notify(`Tunnel established: ${srcAddr}:${srcPort} -> ${destAddr}:${destPort} via ${client.hostId}.`);
    } catch (error) {
        ctx.notify(`SSH forward failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function startSshShell(
    ctx: SshHandlerContext,
    id: string | undefined,
    shellRef: { current: SshShellSession | null }
): Promise<void> {
    if (!id) {
        ctx.notify('Usage: /ssh shell <host>');
        return;
    }
    if (!ctx.sshManager) {
        ctx.notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    if (!ctx.sshManager.hasHost(id)) {
        ctx.notify(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`);
        return;
    }
    if (ctx.state.isSshShellActive) {
        ctx.notify(`Already in SSH shell on ${ctx.state.sshShell?.hostId}. Press Ctrl+] to detach.`);
        return;
    }
    let client: SshClient;
    try {
        client = await ctx.sshManager.connect(id);
    } catch (error) {
        ctx.notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    const size = ctx.surfaceAccessor?.getTerminalSize?.() ?? { cols: 80, rows: 24 };
    let shell: SshShellSession;
    try {
        shell = await client.shell({ term: 'xterm-256color', cols: size.cols, rows: size.rows });
    } catch (error) {
        ctx.notify(`SSH shell failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    shellRef.current = shell;
    ctx.state.setSshShell({ hostId: id });
    shell.stream.on('data', (chunk: Uint8Array | string) => {
        ctx.surfaceAccessor?.writeRawTerminalData?.(String(chunk));
    });
    shell.stream.stderr?.on('data', (chunk: Uint8Array | string) => {
        ctx.surfaceAccessor?.writeRawTerminalData?.(String(chunk));
    });
    const onEnd = () => {
        if (ctx.state.isSshShellActive && shellRef.current === shell) {
            void detachSshShell(ctx, 'closed', shellRef);
        }
    };
    shell.stream.on('close', onEnd);
    shell.stream.on('error', onEnd);
    ctx.notify(`SSH shell started on ${id}. Terminal bytes stream live; press Ctrl+] to detach.`);
}

export async function detachSshShell(
    ctx: SshHandlerContext,
    reason: 'detached' | 'closed',
    shellRef: { current: SshShellSession | null }
): Promise<void> {
    const hostId = ctx.state.sshShell?.hostId || '';
    const shell = shellRef.current;
    shellRef.current = null;
    ctx.state.setSshShell(null);
    if (shell) {
        try {
            await shell.close();
        } catch {
            void 0;
        }
    }
    ctx.surfaceAccessor?.resetTerminalRenderState?.();
    if (hostId) {
        ctx.notify(reason === 'detached'
            ? `SSH shell detached from ${hostId}.`
            : `SSH shell on ${hostId} closed.`);
    }
}
