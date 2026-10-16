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
    allow?: string | string[];
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

function normalizeToolNames(values?: string | string[]): string[] {
    const entries = Array.isArray(values) ? values : (values ? [values] : []);
    const seen = new Set<string>();
    const names: string[] = [];
    entries.forEach(entry => {
        const name = String(entry ?? '').trim();
        if (name && !seen.has(name)) {
            seen.add(name);
            names.push(name);
        }
    });
    return names;
}

/**
 * Split a shell-style command line into an executable + args, honoring single/double
 * quotes. `AgentMcpServerOptions` stores the executable in `command` and the rest in
 * `args`, and `StdioMcpClient` runs `spawn(command, args)` (no shell), so a raw
 * string like "node server.js" must be tokenized — otherwise spawn treats it as one
 * executable name and fails with a bare ENOENT.
 */
function splitCommandLine(value: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote: string | null = null;
    let hasToken = false;
    for (const ch of value) {
        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                current += ch;
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            hasToken = true;
        } else if (/\s/.test(ch)) {
            if (hasToken) {
                tokens.push(current);
                current = '';
                hasToken = false;
            }
        } else {
            current += ch;
            hasToken = true;
        }
    }
    if (hasToken) {
        tokens.push(current);
    }
    return tokens;
}

function normalizeMcpServerOptions(options: AgentMcpCliOptions): AgentMcpServerOptions {
    const id = options.args?.trim();
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error('MCP server id must be a non-empty string using letters, numbers, underscore, or dash.');
    }
    const commandTokens = options.command ? splitCommandLine(options.command.trim()) : [];
    if (!options.url && !commandTokens.length) {
        throw new Error('MCP server requires either --url (remote) or --command (stdio).');
    }
    if (options.url && commandTokens.length) {
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
    const allowedTools = normalizeToolNames(options.allow);
    const command = commandTokens[0];
    const commandArgs = commandTokens.slice(1);
    return {
        id,
        ...(options.title ? { title: options.title } : {}),
        ...(options.url ? { url: options.url.trim() } : {}),
        ...(command ? { command } : {}),
        ...(commandArgs.length ? { args: commandArgs } : {}),
        ...(options.header ? { headers: parseHeaders(options.header) } : {}),
        ...(auth ? { auth } : {}),
        ...(allowedTools.length ? { allowedTools } : {})
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
        // Re-adding a server without --allow keeps the previously configured allowlist.
        if (!server.allowedTools?.length && servers[existing].allowedTools?.length) {
            server.allowedTools = [...servers[existing].allowedTools];
        }
        servers[existing] = server;
    } else {
        servers.push(server);
    }
    const settingsPath = writeMcpServers(options, servers);
    process.stdout.write(`MCP server '${server.id}' saved to ${settingsPath}\n`);
    process.stdout.write(server.url
        ? `Transport: streamable HTTP (${server.url})\n`
        : `Transport: stdio (${[server.command, ...(server.args ?? [])].join(' ')})\n`);
    if (server.allowedTools?.length) {
        process.stdout.write(`Allowed tools: ${server.allowedTools.join(', ')}\n`);
    }
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
                authenticated: store.has(server.id),
                allowedTools: server.allowedTools ?? []
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
        const transport = server.url ?? (server.command ? `stdio: ${[server.command, ...(server.args ?? [])].join(' ')}` : 'custom client');
        const auth = server.auth?.type ?? 'none';
        const status = store.has(server.id) ? 'authenticated' : (auth === 'oauth' ? 'needs auth' : '-');
        const allow = server.allowedTools?.length ? `  |  allow: ${server.allowedTools.join(',')}` : '';
        process.stdout.write(`  ${server.id}  |  ${transport}  |  auth: ${auth} (${status})${allow}\n`);
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
    const resolved = mergeAgentMcpOptions({
        servers: [config],
        // Keep the OAuth credential store under the same root `mcp list` reads
        // from, so `mcp auth --root <dir>` is reflected by `mcp list --root <dir>`
        // (without this the token was written to the default root's store).
        credentialsPath: `${resolveAgentRoot(options.root)}/mcp-credentials.json`
    });
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
