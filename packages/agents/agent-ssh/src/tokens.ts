import { InjectToken } from '@tsdi/ioc';
import { SshHostConfig } from './ssh-config';

export const AGENT_SSH_OPTIONS = new InjectToken<SshOptions>('AGENT_SSH_OPTIONS');

export interface SshOptions {
    hosts?: Record<string, SshHostConfig>;
    allowlist?: string[];
    defaultTimeoutMs?: number;
    maxTimeoutMs?: number;
}
