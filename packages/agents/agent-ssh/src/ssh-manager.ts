import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { SshClient } from './ssh-client';
import { SshHostConfig, defaultSshHostConfig } from './ssh-config';
import { AGENT_SSH_OPTIONS, SshOptions } from './tokens';

export interface SshConnectionInfo {
    id: string;
    host: string;
    port: number;
    username: string;
    connected: boolean;
}

@Injectable()
export class SshConnectionManager {
    protected readonly hosts = new Map<string, SshHostConfig>();
    protected readonly connections = new Map<string, SshClient>();
    protected readonly allowlist: Set<string>;

    constructor(
        @Optional() @Inject(AGENT_SSH_OPTIONS, { defaultValue: null })
        options?: SshOptions | null
    ) {
        const hosts = options?.hosts ?? {};
        Object.keys(hosts).forEach(id => {
            this.hosts.set(id, defaultSshHostConfig({ ...hosts[id], id }));
        });
        this.allowlist = new Set((options?.allowlist ?? []).map(value => value.toLowerCase()));
    }

    get hostCount(): number {
        return this.hosts.size;
    }

    get connectionCount(): number {
        return this.connections.size;
    }

    register(config: SshHostConfig): string {
        const id = config.id ?? `${config.username ?? 'ssh'}@${config.host}:${config.port ?? 22}`;
        this.hosts.set(id, defaultSshHostConfig({ ...config, id }));
        return id;
    }

    hasHost(id: string): boolean {
        return this.hosts.has(id);
    }

    getHost(id: string): SshHostConfig | undefined {
        return this.hosts.get(id);
    }

    isAllowed(hostId: string, host: string, port: number): boolean {
        if (!this.allowlist.size) {
            return true;
        }
        const normalized = hostId.toLowerCase();
        const hostPort = `${host.toLowerCase()}:${port}`;
        return this.allowlist.has(normalized) || this.allowlist.has(hostPort) || this.allowlist.has(host.toLowerCase());
    }

    connect(id: string): Promise<SshClient> {
        const config = this.hosts.get(id);
        if (!config) {
            return Promise.reject(new Error(`SSH host '${id}' is not configured. Use /ssh list to see available hosts.`));
        }
        const client = this.connections.get(id);
        if (client?.isConnected) {
            return Promise.resolve(client);
        }
        if (!this.isAllowed(id, config.host, config.port ?? 22)) {
            return Promise.reject(new Error(`SSH host '${id}' is not in the allowed hosts list.`));
        }
        const created = new SshClient(config);
        this.connections.set(id, created);
        return created.connect().then(
            () => created,
            error => {
                this.connections.delete(id);
                throw error;
            }
        );
    }

    get(id: string): SshClient | undefined {
        return this.connections.get(id);
    }

    list(): SshConnectionInfo[] {
        return Array.from(this.hosts.keys()).map(id => {
            const config = this.hosts.get(id) as SshHostConfig;
            const client = this.connections.get(id);
            return {
                id,
                host: config.host,
                port: config.port ?? 22,
                username: config.username ?? '',
                connected: !!client?.isConnected
            };
        });
    }

    async disconnect(id: string): Promise<boolean> {
        const client = this.connections.get(id);
        if (!client) {
            return false;
        }
        await client.disconnect();
        this.connections.delete(id);
        return true;
    }

    async disposeAll(): Promise<void> {
        const pending = Array.from(this.connections.values()).map(client => client.disconnect());
        await Promise.all(pending);
        this.connections.clear();
    }
}
