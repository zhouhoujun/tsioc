import { SshOptions } from './tokens';
import { SshHostConfig } from './ssh-config';

export const defaultSshOptions: SshOptions = {
    hosts: {},
    allowlist: [],
    defaultTimeoutMs: 60000,
    maxTimeoutMs: 600000
};

export function mergeSshOptions(options?: SshOptions): SshOptions {
    const merged: SshOptions = {
        hosts: { ...(defaultSshOptions.hosts ?? {}), ...(options?.hosts ?? {}) },
        allowlist: [...(defaultSshOptions.allowlist ?? []), ...(options?.allowlist ?? [])],
        defaultTimeoutMs: options?.defaultTimeoutMs ?? defaultSshOptions.defaultTimeoutMs,
        maxTimeoutMs: options?.maxTimeoutMs ?? defaultSshOptions.maxTimeoutMs
    };
    return merged;
}

export function resolveSshHostId(config: SshHostConfig): string {
    return config.id ?? `${config.username ?? 'ssh'}@${config.host}:${config.port ?? 22}`;
}
