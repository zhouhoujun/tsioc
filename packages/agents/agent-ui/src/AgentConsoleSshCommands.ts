export function listSshHosts(sshManager: any, notify: (message: string) => void): void {
    if (!sshManager) {
        notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    const infos = sshManager.list();
    if (!infos.length) {
        notify('No SSH hosts configured.');
        return;
    }
    const lines = infos.map((info: any) =>
        `${info.id} · ${info.username}@${info.host}:${info.port} · ${info.connected ? 'connected' : 'disconnected'}`
    );
    notify(lines.join('\n'));
}

export async function connectSshHost(sshManager: any, notify: (message: string) => void, id: string | undefined): Promise<void> {
    if (!id) {
        notify('Usage: /ssh connect <host>');
        return;
    }
    if (!sshManager) {
        notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    if (!sshManager.hasHost(id)) {
        notify(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`);
        return;
    }
    try {
        const client = await sshManager.connect(id);
        notify(`Connected to ${client.hostId}.`);
    } catch (error) {
        notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export async function forwardSshTunnel(sshManager: any, notify: (message: string) => void, tokens: string[]): Promise<void> {
    const id = tokens[0];
    const destAddr = tokens[1];
    const destPort = Number(tokens[2]);
    if (!id || !destAddr || !Number.isInteger(destPort) || destPort < 1 || destPort > 65535) {
        notify('Usage: /ssh forward <host> <destAddr> <destPort> [srcAddr] [srcPort]');
        return;
    }
    if (!sshManager) {
        notify('SSH is not configured. Configure hosts via provideSsh({ hosts }) and import AgentSshModule.');
        return;
    }
    const srcAddr = tokens[3] || '127.0.0.1';
    const srcPort = tokens[4] == null ? 0 : Number(tokens[4]);
    if (!Number.isInteger(srcPort) || srcPort < 0 || srcPort > 65535) {
        notify('Invalid srcPort: must be an integer in 0..65535.');
        return;
    }
    let client: any;
    try {
        client = await sshManager.connect(id);
    } catch (error) {
        notify(`SSH connect failed: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }
    try {
        const channel = await client.forwardOut(srcAddr, srcPort, destAddr, destPort);
        channel.close();
        notify(`Tunnel established: ${srcAddr}:${srcPort} -> ${destAddr}:${destPort} via ${client.hostId}.`);
    } catch (error) {
        notify(`SSH forward failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
