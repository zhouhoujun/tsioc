import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Injectable, Optional, Provider, token } from '@tsdi/ioc';
import { AgentHooksOptions, AgentHookDefinition } from '@tsdi/agent';
import { AgentMcpServerOptions } from '../mcp/types';
import { loadAgentSkillsFromRootsSync } from './local-skill-loader';
import { AgentSkillDefinition, RemoteSkillSource } from './types';
import { NodeRemoteSkillProcessRunner, RemoteSkillProcessRunner } from './remote-skill-manager';

export type AgentPluginScope = 'local' | 'personal' | 'workspace' | 'remote';

export interface AgentPluginManifest {
    name: string;
    description?: string;
    version: string;
    skills?: string[];
    connectors?: Array<{ id: string; type: string; config?: Record<string, any> }>;
    mcpServers?: AgentMcpServerOptions[];
    hooks?: AgentHooksOptions;
    agentsDoc?: string;
    /** Agent Plugins specification version, e.g. `1.0.0`. */
    manifestVersion?: string;
    /** Reverse-domain client extension namespaces retained for portability. */
    clientExtensions?: Record<string, Record<string, any>>;
    author?: string | { name?: string; url?: string };
    homepage?: string;
    repository?: string | { type?: string; url?: string };
    license?: string;
    keywords?: string[];
}

export interface AgentPluginStandardInfo {
    format: 'legacy' | 'agentplugins';
    manifestVersion?: string;
    clientNamespaces: string[];
    mcpConfig?: string;
}

export interface InstalledAgentPlugin {
    id: string;
    scope: AgentPluginScope;
    root: string;
    manifest: AgentPluginManifest;
    standard: AgentPluginStandardInfo;
    source?: RemoteSkillSource;
    installedAt: number;
    analytics: { installs: number; activations: number; calls: number };
}

export interface AgentPluginContributions {
    plugins: InstalledAgentPlugin[];
    skills: AgentSkillDefinition[];
    mcpServers: AgentMcpServerOptions[];
    hooks: AgentHooksOptions;
    connectors: Array<{ plugin: string; id: string; type: string; config?: Record<string, any> }>;
    agentsDocs: Array<{ plugin: string; path: string }>;
}

/** DI token exposing merged contributions of all installed plugins (skills/MCP/hooks/connectors/AGENTS docs). */
export const AGENT_PLUGIN_CONTRIBUTIONS = token<AgentPluginContributions>('AGENT_PLUGIN_CONTRIBUTIONS');

/** Provider factory for AGENT_PLUGIN_CONTRIBUTIONS resolved from the DI plugin manager. */
export function provideAgentPluginContributions(pluginRoots?: Partial<Record<AgentPluginScope, string>>): Provider {
    return {
        provide: AGENT_PLUGIN_CONTRIBUTIONS,
        useFactory: (manager: AgentPluginManager) => {
            const roots = { ...manager.defaultRoots(), ...(pluginRoots ?? {}) };
            return manager.contributions(manager.discover(roots).map(plugin => manager.activate(plugin)));
        },
        deps: [AgentPluginManager]
    };
}

const PLUGIN_FILE = 'plugin.json';
const PLUGIN_METADATA = '.agent-plugin.json';
const STAGE_NAMES = ['beforeTurn', 'afterTurn', 'beforeTool', 'afterTool', 'onApproval', 'beforeCompaction', 'afterCompaction'] as const;

@Injectable()
export class AgentPluginManager {
    private runner?: RemoteSkillProcessRunner | null;

    constructor(@Optional() runner?: RemoteSkillProcessRunner | null) {
        this.runner = runner ?? new NodeRemoteSkillProcessRunner();
    }

    defaultRoots(workspace?: string): Partial<Record<AgentPluginScope, string>> {
        return {
            personal: path.join(os.homedir(), '.tsdi-agent', 'plugins'),
            ...(workspace ? { workspace: path.join(workspace, '.tsdi-agent', 'plugins') } : {}),
            remote: path.join(os.homedir(), '.tsdi-agent', 'plugin-cache')
        };
    }

    discover(roots: Partial<Record<AgentPluginScope, string>>): InstalledAgentPlugin[] {
        const merged = new Map<string, InstalledAgentPlugin>();
        for (const scope of ['remote', 'personal', 'workspace', 'local'] as AgentPluginScope[]) {
            const root = roots[scope];
            if (!root || !fs.existsSync(root)) continue;
            for (const entry of fs.readdirSync(root, { withFileTypes: true }).filter(item => item.isDirectory())) {
                const plugin = this.readPlugin(path.join(root, entry.name), scope);
                if (plugin) merged.set(plugin.id, plugin);
            }
        }
        return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
    }

    async install(source: RemoteSkillSource, root: string, scope: AgentPluginScope = 'remote', force = false): Promise<InstalledAgentPlugin> {
        const destination = path.join(path.resolve(root), source.id);
        if (fs.existsSync(destination)) {
            if (!force) throw new Error(`Plugin '${source.id}' is already installed.`);
            fs.rmSync(destination, { recursive: true, force: true });
        }
        fs.mkdirSync(root, { recursive: true });
        try {
            if (source.type === 'git') {
                const runner = this.requireRunner();
                const args = ['clone', '--depth', '1', ...(source.ref ? ['--branch', source.ref] : []), source.url, destination];
                const result = await runner.run('git', args, { timeoutMs: 120_000 });
                if (result.code !== 0) throw new Error(`Plugin git clone failed: ${result.stderr || result.stdout}`);
            } else {
                const manifest = JSON.parse(await this.requireRunner().fetchText(source.url, 30_000)) as AgentPluginManifest & { mcp?: string };
                fs.mkdirSync(destination, { recursive: true });
                fs.writeFileSync(path.join(destination, PLUGIN_FILE), JSON.stringify(manifest, null, 2));
                if (typeof manifest.mcp === 'string') {
                    const mcpPath = this.resolvePluginRelativePath(destination, manifest.mcp, 'MCP config');
                    const mcpUrl = new URL(manifest.mcp, source.url).toString();
                    fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
                    fs.writeFileSync(mcpPath, await this.requireRunner().fetchText(mcpUrl, 30_000));
                }
            }
            const plugin = this.readPlugin(destination, scope, source);
            if (!plugin) throw new Error(`Plugin '${source.id}' does not contain a valid ${PLUGIN_FILE}.`);
            plugin.analytics.installs++;
            this.writeMetadata(plugin);
            return plugin;
        } catch (error) {
            fs.rmSync(destination, { recursive: true, force: true });
            throw error;
        }
    }

    remove(id: string, root: string): boolean {
        const destination = path.join(path.resolve(root), id);
        if (!fs.existsSync(destination)) return false;
        fs.rmSync(destination, { recursive: true, force: true });
        return true;
    }

    activate(plugin: InstalledAgentPlugin): InstalledAgentPlugin {
        plugin.analytics.activations++;
        this.writeMetadata(plugin);
        return plugin;
    }

    recordCall(plugin: InstalledAgentPlugin): void {
        plugin.analytics.calls++;
        this.writeMetadata(plugin);
    }

    contributions(plugins: InstalledAgentPlugin[]): AgentPluginContributions {
        const mcp = new Map<string, AgentMcpServerOptions>();
        const connectors = new Map<string, AgentPluginContributions['connectors'][number]>();
        const hooks: AgentHooksOptions = {};
        const skills = new Map<string, AgentSkillDefinition>();
        const agentsDocs: AgentPluginContributions['agentsDocs'] = [];
        for (const plugin of plugins) {
            const roots = (plugin.manifest.skills?.length ? plugin.manifest.skills : ['.']).map(item => path.resolve(plugin.root, item));
            loadAgentSkillsFromRootsSync(roots, { source: `plugin:${plugin.id}` }).forEach(skill => skills.set(skill.id, skill));
            plugin.manifest.mcpServers?.forEach(server => mcp.set(server.id, { ...server }));
            plugin.manifest.connectors?.forEach(connector => connectors.set(connector.id, { plugin: plugin.id, ...connector }));
            this.mergeHooks(hooks, plugin.manifest.hooks);
            if (plugin.manifest.agentsDoc) agentsDocs.push({ plugin: plugin.id, path: path.resolve(plugin.root, plugin.manifest.agentsDoc) });
        }
        return { plugins, skills: [...skills.values()], mcpServers: [...mcp.values()], hooks, connectors: [...connectors.values()], agentsDocs };
    }

    private readPlugin(root: string, scope: AgentPluginScope, source?: RemoteSkillSource): InstalledAgentPlugin | undefined {
        const file = path.join(root, PLUGIN_FILE);
        if (!fs.existsSync(file)) return undefined;
        try {
            const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, any>;
            const { manifest, standard } = this.normalizeManifest(root, raw);
            if (!manifest.name?.trim() || !manifest.version?.trim()) return undefined;
            const metadataFile = path.join(root, PLUGIN_METADATA);
            const metadata = fs.existsSync(metadataFile) ? JSON.parse(fs.readFileSync(metadataFile, 'utf8')) : {};
            return { id: path.basename(root), scope, root, manifest, standard, source: source ?? metadata.source, installedAt: metadata.installedAt ?? Date.now(), analytics: { installs: 0, activations: 0, calls: 0, ...(metadata.analytics ?? {}) } };
        } catch { return undefined; }
    }

    private normalizeManifest(root: string, raw: Record<string, any>): { manifest: AgentPluginManifest; standard: AgentPluginStandardInfo } {
        const manifest = { ...raw } as AgentPluginManifest;
        const mcpConfig = typeof raw.mcp === 'string' ? raw.mcp : fs.existsSync(path.join(root, 'mcp.json')) ? 'mcp.json' : undefined;
        const namespaces = this.clientNamespaces(raw);
        const isStandard = !!raw.manifestVersion || !!mcpConfig || namespaces.length > 0;
        if (isStandard) {
            manifest.skills = Array.isArray(raw.skills) && raw.skills.length ? raw.skills.map(String) : ['skills'];
            manifest.clientExtensions = Object.fromEntries(namespaces.map(key => [key, raw[key]]));
            if (mcpConfig) manifest.mcpServers = this.readStandardMcp(root, mcpConfig);
        }
        return {
            manifest,
            standard: {
                format: isStandard ? 'agentplugins' : 'legacy',
                ...(raw.manifestVersion ? { manifestVersion: String(raw.manifestVersion) } : {}),
                clientNamespaces: namespaces,
                ...(mcpConfig ? { mcpConfig } : {})
            }
        };
    }

    private clientNamespaces(raw: Record<string, any>): string[] {
        return Object.keys(raw).filter(key => /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/i.test(key) && raw[key] && typeof raw[key] === 'object').sort();
    }

    private readStandardMcp(root: string, relativeFile: string): AgentMcpServerOptions[] {
        const file = this.resolvePluginRelativePath(root, relativeFile, 'MCP config');
        const document = JSON.parse(fs.readFileSync(file, 'utf8')) as any;
        const source = document.mcpServers ?? document.servers ?? document;
        const entries: Array<[string, any]> = Array.isArray(source)
            ? source.map((item: any, index: number) => [String(item?.id ?? item?.name ?? `server-${index + 1}`), item])
            : Object.entries(source ?? {});
        return entries.map(([name, value]) => this.normalizeMcpServer(name, value));
    }

    private normalizeMcpServer(name: string, value: any): AgentMcpServerOptions {
        if (!value || typeof value !== 'object') throw new Error(`Invalid MCP server '${name}'.`);
        const transport = value.transport && typeof value.transport === 'object' ? value.transport : value;
        const type = String(transport.type ?? value.type ?? (transport.command ? 'stdio' : 'streamable-http')).toLowerCase();
        const server: AgentMcpServerOptions = { id: String(value.id ?? name), ...(value.title ? { title: String(value.title) } : {}) };
        if (type === 'stdio') {
            if (!transport.command) throw new Error(`MCP stdio server '${name}' requires command.`);
            server.command = String(transport.command);
            if (Array.isArray(transport.args)) server.args = transport.args.map(String);
            if (transport.cwd) server.cwd = String(transport.cwd);
            if (transport.env && typeof transport.env === 'object') server.env = this.stringRecord(transport.env);
        } else if (['streamable-http', 'streamable_http', 'http', 'sse', 'http+sse', 'legacy-sse'].includes(type)) {
            const url = transport.url ?? transport.endpoint;
            if (!url) throw new Error(`MCP HTTP server '${name}' requires url.`);
            server.url = String(url);
            if (transport.headers && typeof transport.headers === 'object') server.headers = this.stringRecord(transport.headers);
        } else {
            throw new Error(`Unsupported MCP transport '${type}' for server '${name}'.`);
        }
        return server;
    }

    private stringRecord(value: Record<string, unknown>): Record<string, string> {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
    }

    private resolvePluginRelativePath(root: string, relativeFile: string, label: string): string {
        const resolvedRoot = path.resolve(root);
        const file = path.resolve(resolvedRoot, relativeFile);
        if (file !== resolvedRoot && !file.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`Plugin ${label} must stay inside the plugin root.`);
        return file;
    }

    private writeMetadata(plugin: InstalledAgentPlugin): void {
        fs.writeFileSync(path.join(plugin.root, PLUGIN_METADATA), JSON.stringify({ source: plugin.source, installedAt: plugin.installedAt, analytics: plugin.analytics }, null, 2));
    }

    private requireRunner(): RemoteSkillProcessRunner {
        if (!this.runner) throw new Error('Plugin installation requires a configured process/fetch runner.');
        return this.runner;
    }

    private mergeHooks(target: AgentHooksOptions, source?: AgentHooksOptions): void {
        if (!source) return;
        for (const stage of STAGE_NAMES) {
            const value = source[stage] as AgentHookDefinition | AgentHookDefinition[] | undefined;
            if (!value) continue;
            const current = target[stage] as AgentHookDefinition | AgentHookDefinition[] | undefined;
            (target as any)[stage] = [...(current ? Array.isArray(current) ? current : [current] : []), ...(Array.isArray(value) ? value : [value])];
        }
    }
}
