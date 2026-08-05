import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { SshConnectionManager } from '@tsdi/agent-ssh';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_MAX_TIMEOUT_MS = 600000;

function requireSshManager(manager: SshConnectionManager | null | undefined): SshConnectionManager {
    if (!manager) {
        throw new Error('SSH tools require an SSH connection manager. Configure hosts via provideSsh({ hosts }) or agentTools.ssh.');
    }
    return manager;
}

function requireText(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Invalid SSH input: ${field} must be a non-empty string.`);
    }
    return value;
}

function requirePort(value: unknown, field: string): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid SSH input: ${field} must be an integer port in 1..65535.`);
    }
    return port;
}

@Injectable()
export class SshExecTool implements AgentTool {
    name = 'ssh_exec';
    description = 'Execute a command over SSH on a configured remote host and return its output.';
    inputSchema = {
        type: 'object',
        properties: {
            host: { type: 'string', description: 'Configured SSH host id (see /ssh list).' },
            command: { type: 'string', description: 'Remote command to execute.' },
            timeoutMs: { type: 'number', description: 'Optional command timeout in milliseconds.' }
        },
        required: ['host', 'command']
    };
    toolset = 'ssh';
    source = 'remote';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(SshConnectionManager, { defaultValue: null })
        private manager: SshConnectionManager | null,
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const host = requireText(input?.host, 'host');
        const command = requireText(input?.command, 'command');
        const manager = requireSshManager(this.manager);
        const timeoutMs = this.resolveTimeout(input?.timeoutMs);
        const client = await manager.connect(host);
        const result = await client.exec(command, timeoutMs);
        return {
            host,
            command,
            ...result
        };
    }

    private resolveTimeout(inputTimeout: unknown): number {
        const configured = this.options?.ssh ?? {};
        const maxTimeoutMs = configured.maxTimeoutMs ?? DEFAULT_MAX_TIMEOUT_MS;
        const timeoutMs = typeof inputTimeout === 'number'
            ? inputTimeout
            : configured.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
        if (timeoutMs <= 0 || timeoutMs > maxTimeoutMs) {
            throw new Error(`Invalid ssh_exec timeout: timeout must be between 1 and ${maxTimeoutMs} ms.`);
        }
        return timeoutMs;
    }
}

@Injectable()
export class SshPutTool implements AgentTool {
    name = 'ssh_put';
    description = 'Upload a local file to a configured SSH remote host via SFTP.';
    inputSchema = {
        type: 'object',
        properties: {
            host: { type: 'string', description: 'Configured SSH host id (see /ssh list).' },
            localPath: { type: 'string', description: 'Absolute path of the local file to upload.' },
            remotePath: { type: 'string', description: 'Absolute path on the remote host.' }
        },
        required: ['host', 'localPath', 'remotePath']
    };
    toolset = 'ssh';
    source = 'remote';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(SshConnectionManager, { defaultValue: null })
        private manager: SshConnectionManager | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const host = requireText(input?.host, 'host');
        const localPath = requireText(input?.localPath, 'localPath');
        const remotePath = requireText(input?.remotePath, 'remotePath');
        const manager = requireSshManager(this.manager);
        const client = await manager.connect(host);
        const result = await client.sftpPut(localPath, remotePath);
        return {
            host,
            localPath,
            remotePath,
            ...result
        };
    }
}

@Injectable()
export class SshGetTool implements AgentTool {
    name = 'ssh_get';
    description = 'Download a remote file from a configured SSH remote host via SFTP.';
    inputSchema = {
        type: 'object',
        properties: {
            host: { type: 'string', description: 'Configured SSH host id (see /ssh list).' },
            remotePath: { type: 'string', description: 'Absolute path on the remote host.' },
            localPath: { type: 'string', description: 'Absolute path of the local destination file.' }
        },
        required: ['host', 'remotePath', 'localPath']
    };
    toolset = 'ssh';
    source = 'remote';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(SshConnectionManager, { defaultValue: null })
        private manager: SshConnectionManager | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const host = requireText(input?.host, 'host');
        const remotePath = requireText(input?.remotePath, 'remotePath');
        const localPath = requireText(input?.localPath, 'localPath');
        const manager = requireSshManager(this.manager);
        const client = await manager.connect(host);
        const result = await client.sftpGet(remotePath, localPath);
        return {
            host,
            remotePath,
            localPath,
            ...result
        };
    }
}

@Injectable()
export class SshTunnelTool implements AgentTool {
    name = 'ssh_tunnel';
    description = 'Open a TCP forwarding channel over SSH to verify remote port reachability.';
    inputSchema = {
        type: 'object',
        properties: {
            host: { type: 'string', description: 'Configured SSH host id (see /ssh list).' },
            destAddr: { type: 'string', description: 'Remote destination address to reach.' },
            destPort: { type: 'number', description: 'Remote destination port.' },
            srcAddr: { type: 'string', description: 'Optional local source address.' },
            srcPort: { type: 'number', description: 'Optional local source port (default 0).' }
        },
        required: ['host', 'destAddr', 'destPort']
    };
    toolset = 'ssh';
    source = 'remote';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(SshConnectionManager, { defaultValue: null })
        private manager: SshConnectionManager | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const host = requireText(input?.host, 'host');
        const destAddr = requireText(input?.destAddr, 'destAddr');
        const destPort = requirePort(input?.destPort, 'destPort');
        const srcAddr = typeof input?.srcAddr === 'string' && input.srcAddr ? input.srcAddr : '127.0.0.1';
        const srcPort = input?.srcPort == null ? 0 : requirePort(input.srcPort, 'srcPort');
        const manager = requireSshManager(this.manager);
        const client = await manager.connect(host);
        const channel = await client.forwardOut(srcAddr, srcPort, destAddr, destPort);
        channel.close();
        return {
            host,
            srcAddr,
            srcPort,
            destAddr,
            destPort,
            established: true
        };
    }
}
