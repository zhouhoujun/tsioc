import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type SshKnownHostsPolicy = 'strict' | 'accept-new' | 'off';

export interface SshKeyAuth {
    type: 'key';
    keyPath?: string;
    privateKey?: string;
    passphrase?: string;
}

export interface SshPasswordAuth {
    type: 'password';
    password?: string;
    passwordEnv?: string;
}

export interface SshAgentAuth {
    type: 'agent';
    agent?: string;
}

export type SshAuth = SshKeyAuth | SshPasswordAuth | SshAgentAuth;

export interface SshHostConfig {
    id?: string;
    host: string;
    port?: number;
    username?: string;
    auth?: SshAuth;
    knownHosts?: SshKnownHostsPolicy;
    readyTimeoutMs?: number;
    keepaliveIntervalMs?: number;
    connectTimeoutMs?: number;
}

export function defaultSshHostConfig(config: SshHostConfig): Required<Pick<SshHostConfig, 'port' | 'username' | 'knownHosts' | 'readyTimeoutMs' | 'keepaliveIntervalMs' | 'connectTimeoutMs'>> & SshHostConfig {
    return {
        ...config,
        port: config.port ?? 22,
        username: config.username ?? os.userInfo().username,
        knownHosts: config.knownHosts ?? 'accept-new',
        readyTimeoutMs: config.readyTimeoutMs ?? 10000,
        keepaliveIntervalMs: config.keepaliveIntervalMs ?? 30000,
        connectTimeoutMs: config.connectTimeoutMs ?? 30000
    };
}

export function resolveSshHostKey(host: string, port: number): string {
    return port === 22 ? host : `[${host}]:${port}`;
}

export function resolveSshAuth(auth: SshAuth | undefined, env: NodeJS.ProcessEnv = process.env): Record<string, unknown> | undefined {
    if (!auth) {
        return undefined;
    }
    switch (auth.type) {
        case 'key': {
            const privateKey = auth.privateKey
                || (auth.keyPath ? readSshPrivateKey(auth.keyPath) : readDefaultSshPrivateKey(env));
            if (!privateKey) {
                throw new Error('SSH key auth requires privateKey or keyPath (or a key under ~/.ssh).');
            }
            return {
                privateKey,
                ...(auth.passphrase ? { passphrase: auth.passphrase } : {})
            };
        }
        case 'password': {
            const password = auth.password ?? (auth.passwordEnv ? env[auth.passwordEnv] : undefined);
            if (!password) {
                throw new Error(`SSH password auth requires password or passwordEnv (got env '${auth.passwordEnv}').`);
            }
            return { password };
        }
        case 'agent':
            return auth.agent ? { agent: auth.agent } : { agent: process.env.SSH_AUTH_SOCK };
        default:
            return undefined;
    }
}

function readDefaultSshPrivateKey(env: NodeJS.ProcessEnv): string | undefined {
    const candidates = [env.SSH_PRIVATE_KEY_PATH, path.join(os.homedir(), '.ssh', 'id_ed25519'), path.join(os.homedir(), '.ssh', 'id_rsa')];
    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }
        const resolved = readSshPrivateKey(candidate);
        if (resolved) {
            return resolved;
        }
    }
    return undefined;
}

function readSshPrivateKey(keyPath: string): string | undefined {
    const expanded = keyPath.startsWith('~/') ? path.join(os.homedir(), keyPath.slice(2)) : keyPath;
    try {
        return fs.readFileSync(expanded, 'utf-8');
    } catch {
        return undefined;
    }
}
