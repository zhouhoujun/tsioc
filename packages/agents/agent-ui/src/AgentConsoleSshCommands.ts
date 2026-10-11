import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

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
