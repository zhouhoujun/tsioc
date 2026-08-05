import { SshHostConfig } from '@tsdi/agent-ssh';

export interface SshToolOptions {
    hosts?: Record<string, SshHostConfig>;
    allowlist?: string[];
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
}
