import * as fs from 'fs';
import * as path from 'path';
import { AgentMcpServerOptions, AgentMcpOptions, McpOAuthClient, McpOAuthCredentialStore, McpServerAuthOptions, mergeAgentMcpOptions, resolveAgentRoot } from '@tsdi/agent-tools';
import { AgentCliOptions } from './config';

export interface AgentMcpCliOptions extends AgentCliOptions {
    args?: string;
    url?: string;
    command?: string;
    header?: string | string[];
    bearerToken?: string;
    clientId?: string;
    scope?: string;
    title?: string;
    json?: boolean;
}

function resolveSettingsPath(options: AgentCliOptions): string {
    return path.join(resolveAgentRoot(options.root), 'settings.json');
}

function readSettings(options: AgentCliOptions): Record<string, any> {
    const settingsPath = resolveSettingsPath(options);
    if (!fs.existsSync(settingsPath)) {
        return {};
    }
    const raw = fs.readFileSync(settingsPath, 'utf8').trim();
    if (!raw) {
        return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Invalid agent settings at '${settingsPath}': expected a JSON object.`);
    }
    return parsed;
}

function writeSettings(options: AgentCliOptions, settings: Record<string, any>): string {
    const settingsPath = resolveSettingsPath(options);
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    return settingsPath;
}

function readMcpServers(settings: Record<string, any>): AgentMcpServerOptions[] {
    const mcp = settings.mcp as AgentMcpOptions | undefined;
    if (!mcp || !Array.isArray(mcp.servers)) {
        return [];
    }
    return mcp.servers;
}

function writeMcpServers(options: AgentCliOptions, servers: AgentMcpServerOptions[]): string {
    const settings = readSettings(options);
    const mcp = (settings.mcp && typeof settings.mcp === 'object' && !Array.isArray(settings.mcp)
        ? { ...(settings.mcp as object) }
        : {}) as Record<string, any>;
    mcp.servers = servers;
    settings.mcp = mcp;
    return writeSettings(options, settings);
}

function parseHeaders(values?: string | string[]): Record<string, string> | undefined {
    const entries = Array.isArray(values) ? values : (values ? [values] : []);
    const headers: Record<string, string> = {};
    entries.forEach(entry => {
        const separator = entry.indexOf('=');
        if (separator <= 0) {
            throw new Error(`Invalid header '${entry}': expected name=value.`);
        }
        headers[entry.slice(0, separator).trim()] = entry.slice(separator + 1).trim();
    });
    return Object.keys(headers).length ? headers : undefined;
}

function normalizeMcpServerOptions(options: AgentMcpCliOptions): AgentMcpServerOptions {
    const id = options.args?.trim();
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error('MCP server id must be a non-empty string using letters, numbers, underscore, or dash.');
    }
    if (!options.url && !options.command) {
        throw new Error('MCP server requires either --url (remote) or --command (stdio).');
    }
    if (options.url && options.command) {
        throw new Error('MCP server cannot have both --url and --command.');
    }
    if (options.url && !/^https?:\/\/.+/.test(options.url.trim())) {
        throw new Error(`Invalid url '${options.url}': must be an absolute http(s) URL.`);
    }
    const auth: McpServerAuthOptions | undefined = options.bearerToken
        ? { type: 'bearer', bearerToken: options.bearerToken }
        : (options.clientId
            ? { type: 'oauth', clientId: options.clientId, scope: options.scope }
            : undefined);
    return {
        id,
        ...(options.title ? { title: options.title } : {}),
        ...(options.url ? { url: options.url.trim() } : {}),
        ...(options.command ? { command: options.command.trim() } : {}),
        ...(options.header ? { headers: parseHeaders(options.header) } : {}),
        ...(auth ? { auth } : {})
    };
}

function resolveCredentialStore(options: AgentCliOptions): McpOAuthCredentialStore {
    const root = resolveAgentRoot(options.root);
    return new McpOAuthCredentialStore(`${root}/mcp-credentials.json`);
}

export async function runMcpAdd(options: AgentMcpCliOptions): Promise<void> {
    const server = normalizeMcpServerOptions(options);
    const servers = readMcpServers(readSettings(options));
    const existing = servers.findIndex(item => item.id === server.id);
    if (existing >= 0) {
        servers[existing] = server;
    } else {
        servers.push(server);
    }
    const settingsPath = writeMcpServers(options, servers);
    process.stdout.write(`MCP server '${server.id}' saved to ${settingsPath}\n`);
    process.stdout.write(server.url
        ? `Transport: streamable HTTP (${server.url})\n`
        : `Transport: stdio (${server.command})\n`);
}

export async function runMcpList(options: AgentMcpCliOptions): Promise<void> {
    const servers = readMcpServers(readSettings(options));
    const store = resolveCredentialStore(options);
    if (options.json) {
        process.stdout.write(JSON.stringify({
            servers: servers.map(server => ({
                id: server.id,
                title: server.title,
                url: server.url,
                command: server.command,
                auth: server.auth?.type ?? 'none',
                authenticated: store.has(server.id)
            }))
        }, null, 2) + '\n');
        return;
    }
    if (!servers.length) {
        process.stdout.write('No MCP servers configured.\n');
        return;
    }
    process.stdout.write(`MCP servers (${servers.length}):\n`);
    servers.forEach(server => {
        const transport = server.url ?? (server.command ? `stdio: ${server.command}` : 'custom client');
        const auth = server.auth?.type ?? 'none';
        const status = store.has(server.id) ? 'authenticated' : (auth === 'oauth' ? 'needs auth' : '-');
        process.stdout.write(`  ${server.id}  |  ${transport}  |  auth: ${auth} (${status})\n`);
    });
}

export async function runMcpAuth(options: AgentMcpCliOptions): Promise<void> {
    const id = options.args?.trim();
    if (!id) {
        throw new Error('MCP auth requires a server id.');
    }
    const servers = readMcpServers(readSettings(options));
    const server = servers.find(item => item.id === id);
    if (!server) {
        throw new Error(`MCP server '${id}' is not configured. Run 'tsdi-agent mcp add ${id} --url <url>' first.`);
    }
    if (!server.url) {
        throw new Error(`MCP server '${id}' is a stdio server; OAuth authorization applies to remote (url) servers only.`);
    }
    if (server.auth?.type === 'bearer') {
        throw new Error(`MCP server '${id}' uses bearer auth; no OAuth flow needed.`);
    }
    const config: AgentMcpServerOptions = {
        ...server,
        auth: server.auth ?? { type: 'oauth', clientId: options.clientId ?? '' }
    };
    if (!config.auth?.clientId) {
        throw new Error(`MCP server '${id}' requires a clientId for OAuth. Configure it with 'tsdi-agent mcp add ${id} --url <url> --client-id <id>' or pass --client-id.`);
    }
    const resolved = mergeAgentMcpOptions({ servers: [config] });
    const oauth = new McpOAuthClient(resolved, { interaction: undefined });
    const ok = await oauth.authorizeAndStore(config);
    process.stdout.write(ok
        ? `MCP server '${id}' authorized; token stored.\n`
        : `MCP server '${id}' did not complete authorization.\n`);
}

export async function runMcpLogout(options: AgentMcpCliOptions): Promise<void> {
    const id = options.args?.trim();
    if (!id) {
        throw new Error('MCP logout requires a server id.');
    }
    const store = resolveCredentialStore(options);
    if (store.delete(id)) {
        process.stdout.write(`MCP server '${id}' credentials removed.\n`);
    } else {
        process.stdout.write(`MCP server '${id}' had no stored credentials.\n`);
    }
}

export async function runMcpRemove(options: AgentMcpCliOptions): Promise<void> {
    const id = options.args?.trim();
    if (!id) {
        throw new Error('MCP remove requires a server id.');
    }
    const servers = readMcpServers(readSettings(options));
    const remaining = servers.filter(item => item.id !== id);
    if (remaining.length === servers.length) {
        process.stdout.write(`MCP server '${id}' is not configured.\n`);
        return;
    }
    writeMcpServers(options, remaining);
    process.stdout.write(`MCP server '${id}' removed.\n`);
}
