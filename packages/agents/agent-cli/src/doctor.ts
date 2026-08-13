import * as fs from 'fs';
import * as path from 'path';
import {
    AgentCliOptions,
    AgentCliProviderProfile,
    resolveCliConfig,
    resolveCliModelConfig,
    resolveProviderApiKeyEnv
} from './config';

export type AgentDoctorSeverity = 'warn' | 'error';

export interface AgentDoctorIssue {
    severity: AgentDoctorSeverity;
    code: string;
    message: string;
    hint?: string;
}

export interface AgentDoctorPathEntry {
    label: string;
    path: string;
    exists: boolean;
}

export interface AgentDoctorSkillRootEntry {
    path: string;
    exists: boolean;
}

export interface AgentDoctorMcpServerEntry {
    id: string;
    title?: string;
    transport: 'stdio' | 'http' | 'client' | 'invalid';
    auth: 'none' | 'bearer' | 'oauth';
    configuredTools: number;
    allowedTools: number;
}

export interface AgentDoctorReport {
    cliVersion: string;
    generatedAt: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    cwd: string;
    sessionId: string;
    provider: string;
    model: string;
    baseUrl?: string;
    timeoutMs?: number;
    apiKeyConfigured: boolean;
    apiKeyEnv?: string;
    expectedApiKeyEnv?: string;
    pathEntries: AgentDoctorPathEntry[];
    skillRoots: AgentDoctorSkillRootEntry[];
    hooksConfigured: boolean;
    mcpServers: AgentDoctorMcpServerEntry[];
    toolPreset: string;
    channelPreset: string;
    /** G31: whether the workspace directory is trusted (recorded in `~/.tsdi-agent/trusted-projects.json`). */
    workspaceTrusted: boolean;
    workspaceTrustStore?: string;
    issues: AgentDoctorIssue[];
}

export interface AgentDoctorIo {
    stdout?: { write(chunk: string): any };
}

export const AGENT_CLI_VERSION = '6.0.31';

function normalizeProvider(value: string): string {
    return String(value || '').trim().toLowerCase();
}

function providerRequiresApiKey(provider: string): boolean {
    return !['', 'echo'].includes(normalizeProvider(provider));
}

function resolveProviderProfilePath(root: string): string {
    return path.join(root, 'provider.json');
}

function resolveHooksPath(root: string): string {
    return path.join(root, 'hooks.json');
}

function resolveWorkspaceTrust(workspace: string, root: string): { trusted: boolean; storePath?: string } {
    if (!workspace?.trim()) {
        return { trusted: false };
    }
    const trustStorePath = path.join(root, 'trusted-projects.json');
    try {
        if (!fs.existsSync(trustStorePath)) {
            return { trusted: false, storePath: trustStorePath };
        }
        const records = JSON.parse(fs.readFileSync(trustStorePath, 'utf-8'));
        if (!Array.isArray(records)) {
            return { trusted: false, storePath: trustStorePath };
        }
        const normalized = path.resolve(workspace);
        const trusted = records.some((record: any) =>
            !!record && typeof record.path === 'string' && path.resolve(record.path) === normalized);
        return { trusted, storePath: trustStorePath };
    } catch {
        return { trusted: false, storePath: trustStorePath };
    }
}

function classifyMcpTransport(server: Record<string, any>): AgentDoctorMcpServerEntry['transport'] {
    if (server.client) {
        return 'client';
    }
    if (typeof server.url === 'string' && server.url.trim()) {
        return 'http';
    }
    if (typeof server.command === 'string' && server.command.trim()) {
        return 'stdio';
    }
    return 'invalid';
}

function classifyMcpAuth(server: Record<string, any>): AgentDoctorMcpServerEntry['auth'] {
    const type = String(server.auth?.type || '').trim().toLowerCase();
    if (type === 'bearer' || type === 'oauth') {
        return type;
    }
    return 'none';
}

function collectPathEntries(root: string, workspace: string, toolsRoot: string): AgentDoctorPathEntry[] {
    const settingsPath = path.join(root, 'settings.json');
    const providerProfilePath = resolveProviderProfilePath(root);
    const hooksPath = resolveHooksPath(root);
    return [
        { label: 'root', path: root, exists: fs.existsSync(root) },
        { label: 'settings', path: settingsPath, exists: fs.existsSync(settingsPath) },
        { label: 'providerProfile', path: providerProfilePath, exists: fs.existsSync(providerProfilePath) },
        { label: 'workspace', path: workspace, exists: fs.existsSync(workspace) },
        { label: 'toolsRoot', path: toolsRoot, exists: fs.existsSync(toolsRoot) },
        { label: 'hooks', path: hooksPath, exists: fs.existsSync(hooksPath) }
    ];
}

function findPathEntry(entries: AgentDoctorPathEntry[], label: string): AgentDoctorPathEntry | undefined {
    return entries.find(entry => entry.label === label);
}

function inferIssues(report: AgentDoctorReport): AgentDoctorIssue[] {
    const issues: AgentDoctorIssue[] = [];
    const settings = findPathEntry(report.pathEntries, 'settings');
    const workspace = findPathEntry(report.pathEntries, 'workspace');
    const toolsRoot = findPathEntry(report.pathEntries, 'toolsRoot');

    if (settings && !settings.exists) {
        issues.push({
            severity: 'warn',
            code: 'settings_missing',
            message: `Settings file not found at ${settings.path}.`,
            hint: 'Run `tsdi-agent chat` or `/init` to bootstrap agent settings.'
        });
    }
    if (workspace && !workspace.exists) {
        issues.push({
            severity: 'warn',
            code: 'workspace_missing',
            message: `Workspace directory does not exist: ${workspace.path}.`,
            hint: 'Create the workspace or pass `--workspace <dir>`.'
        });
    }
    if (workspace?.exists && !report.workspaceTrusted) {
        issues.push({
            severity: 'warn',
            code: 'workspace_untrusted',
            message: `Workspace has not been trusted: ${workspace.path}.`,
            hint: 'Run `tsdi-agent trust <dir>` to allow agent modifications, or keep read-only mode.'
        });
    }
    if (toolsRoot && !toolsRoot.exists) {
        issues.push({
            severity: 'warn',
            code: 'tools_root_missing',
            message: `Tools root does not exist: ${toolsRoot.path}.`,
            hint: 'Create the tools root or adjust settings.tools.root.'
        });
    }
    report.skillRoots
        .filter(root => !root.exists)
        .forEach(root => {
            issues.push({
                severity: 'warn',
                code: 'skill_root_missing',
                message: `Configured skill root does not exist: ${root.path}.`,
                hint: 'Create the directory or remove it from settings.skills.roots.'
            });
        });
    report.mcpServers
        .filter(server => server.transport === 'invalid')
        .forEach(server => {
            issues.push({
                severity: 'error',
                code: 'mcp_server_invalid',
                message: `MCP server '${server.id}' is missing command/url/client transport configuration.`,
                hint: 'Set either `command`, `url`, or inject a client implementation.'
            });
        });
    if (providerRequiresApiKey(report.provider) && !report.apiKeyConfigured) {
        issues.push({
            severity: 'error',
            code: 'api_key_missing',
            message: `Provider '${report.provider}' has no configured API key.`,
            hint: report.expectedApiKeyEnv
                ? `Set ${report.expectedApiKeyEnv} or pass --api-key.`
                : 'Pass --api-key or configure a provider profile.'
        });
    }
    return issues;
}

function formatStatus(exists: boolean): string {
    return exists ? 'ok' : 'missing';
}

export function createAgentDoctorReport(options: AgentCliOptions): AgentDoctorReport {
    const resolved = resolveCliConfig(options);
    const model = resolveCliModelConfig(options, resolved.root);
    const toolsRoot = resolved.tools.file?.rootDir || resolved.workspace;
    const pathEntries = collectPathEntries(resolved.root, resolved.workspace, toolsRoot);
    const providerProfilePath = resolveProviderProfilePath(resolved.root);
    const providerProfileExists = fs.existsSync(providerProfilePath);
    const providerProfile: AgentCliProviderProfile | undefined = providerProfileExists ? resolved.providerProfile : undefined;
    const skillRoots = resolved.skillRoots.map(skillRoot => ({
        path: skillRoot,
        exists: fs.existsSync(skillRoot)
    }));
    const trust = resolveWorkspaceTrust(resolved.workspace, resolved.root);
    const mcpServers = (resolved.tools.mcp?.servers || []).map(server => ({
        id: String(server.id || '').trim(),
        title: server.title ? String(server.title) : undefined,
        transport: classifyMcpTransport(server as Record<string, any>),
        auth: classifyMcpAuth(server as Record<string, any>),
        configuredTools: Array.isArray(server.tools) ? server.tools.length : 0,
        allowedTools: Array.isArray(server.allowedTools) ? server.allowedTools.length : 0
    }));
    const report: AgentDoctorReport = {
        cliVersion: AGENT_CLI_VERSION,
        generatedAt: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: process.cwd(),
        sessionId: resolved.sessionId,
        provider: model.provider,
        model: model.model,
        baseUrl: model.baseUrl,
        timeoutMs: model.timeoutMs,
        apiKeyConfigured: !!model.apiKey,
        apiKeyEnv: model.apiKeyEnv,
        expectedApiKeyEnv: resolveProviderApiKeyEnv(model.provider),
        pathEntries,
        skillRoots,
        hooksConfigured: findPathEntry(pathEntries, 'hooks')?.exists === true,
        mcpServers,
        toolPreset: String(resolved.tools.registration?.preset || 'default'),
        channelPreset: String(resolved.channels.registration?.preset || 'default'),
        workspaceTrusted: trust.trusted,
        workspaceTrustStore: trust.storePath,
        issues: []
    };
    report.issues = inferIssues(report);
    if (providerProfile && !report.baseUrl && providerProfile.baseUrl) {
        report.baseUrl = providerProfile.baseUrl;
    }
    return report;
}

export function formatAgentDoctorReport(report: AgentDoctorReport): string {
    const lines: string[] = [];
    lines.push('Agent CLI doctor');
    lines.push(`Version: ${report.cliVersion}`);
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push(`Runtime: ${report.nodeVersion}  |  ${report.platform}/${report.arch}`);
    lines.push(`CWD: ${report.cwd}`);
    lines.push(`Session: ${report.sessionId}`);
    lines.push(`Model: ${report.provider} / ${report.model}`);
    if (report.baseUrl) {
        lines.push(`Base URL: ${report.baseUrl}`);
    }
    if (report.timeoutMs != null) {
        lines.push(`Timeout: ${report.timeoutMs}ms`);
    }
    lines.push(`API key: ${report.apiKeyConfigured ? 'configured' : 'missing'}${report.apiKeyEnv ? `  |  env ${report.apiKeyEnv}` : ''}`);
    lines.push(`Tools preset: ${report.toolPreset}`);
    lines.push(`Channels preset: ${report.channelPreset}`);
    lines.push('');
    lines.push('Paths:');
    report.pathEntries.forEach(entry => {
        lines.push(`- ${entry.label}: ${entry.path}  [${formatStatus(entry.exists)}]`);
    });
    lines.push('');
    lines.push(`Workspace trust: ${report.workspaceTrusted ? 'trusted' : 'untrusted'}${report.workspaceTrustStore ? `  |  store ${report.workspaceTrustStore}` : ''}`);
    lines.push(`Hooks: ${report.hooksConfigured ? 'configured' : 'not configured'}`);
    lines.push(`Skill roots: ${report.skillRoots.length}`);
    report.skillRoots.forEach(entry => {
        lines.push(`- ${entry.path}  [${formatStatus(entry.exists)}]`);
    });
    lines.push(`MCP servers: ${report.mcpServers.length}`);
    report.mcpServers.forEach(server => {
        lines.push(`- ${server.id}  |  ${server.transport}  |  auth ${server.auth}  |  tools ${server.configuredTools}`);
    });
    lines.push('');
    lines.push('Issues:');
    if (!report.issues.length) {
        lines.push('- none');
    } else {
        report.issues.forEach(issue => {
            lines.push(`- ${issue.severity.toUpperCase()} ${issue.code}: ${issue.message}`);
            if (issue.hint) {
                lines.push(`  hint: ${issue.hint}`);
            }
        });
    }
    return lines.join('\n');
}

export async function runAgentDoctor(options: AgentCliOptions & { json?: boolean }, io: AgentDoctorIo = {}): Promise<AgentDoctorReport> {
    const stdout = io.stdout || process.stdout;
    const report = createAgentDoctorReport(options);
    stdout.write(options.json
        ? JSON.stringify(report, null, 2) + '\n'
        : formatAgentDoctorReport(report) + '\n');
    return report;
}
