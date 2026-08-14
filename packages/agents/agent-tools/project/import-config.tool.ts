import * as path from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext, DEFAULT_AGENTS_DOC_NAME, findProjectRoot } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';
import { resolveAgentRoot, resolveAgentSettingsPath } from '../src/settings';
import { AgentMcpServerOptions, toMcpIdentifier } from '../mcp/types';

/**
 * P81: project configuration migration (`import_config`). Migrates CLAUDE.md
 * into the project AGENTS.md, `.cursor/rules/*.md` into an AGENTS.md rules
 * section, and `.cursor/mcp.json` / `.mcp.json` servers into the agent
 * settings. Two-phase: `preview` plans without writing; `apply` writes and is
 * idempotent (marker-based replace, identical content reports `no-change`).
 */

export type ImportConfigSource = 'claude-md' | 'cursor-rules' | 'cursor-mcp' | 'claude-user' | 'cursor-user' | 'ecosystem';
export type ImportConfigMode = 'preview' | 'apply';
export type ImportConfigKind = 'merge-agents-md' | 'merge-cursor-rules' | 'merge-mcp' | 'write-migration-report';
export type ImportConfigStatus = 'not-found' | 'no-change' | 'detected' | 'applied';

export interface ImportConfigAction {
    kind: ImportConfigKind;
    source: string;
    target: string;
    status: ImportConfigStatus;
    detail: string;
    before?: string;
    after?: string;
    changed?: number;
    payload?: unknown;
}

interface MarkedSectionPayload {
    marker: string;
    section: string;
}

export interface ImportConfigSummary {
    detected: number;
    applied: number;
    skipped: number;
    noChange: number;
}

export interface ImportConfigResult {
    mode: ImportConfigMode;
    actions: ImportConfigAction[];
    summary: ImportConfigSummary;
}

export interface ImportMetadataReport {
    source: ImportConfigSource;
    generatedAt: string;
    data: Record<string, unknown>;
}

const CLAUDE_MD_MARKER = 'claude.md';
const CURSOR_RULES_MARKER = 'cursor-rules';
const PREVIEW_EXCERPT_CHARS = 4000;
const MAX_METADATA_ITEMS = 200;

interface CursorRuleContent {
    title: string;
    frontmatter?: string;
    body: string;
}

interface McpJsonServerEntry {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    environment?: Record<string, string>;
    url?: string;
    headers?: Record<string, string>;
    type?: string;
}

export function buildMarkedSection(marker: string, content: string): string {
    return `<!-- imported-from:${marker} -->\n${String(content).trim()}\n<!-- /imported-from:${marker} -->`;
}

export function buildClaudeMdSection(content: string): string {
    return buildMarkedSection(CLAUDE_MD_MARKER, `## Imported from CLAUDE.md\n\n${String(content).trim()}`);
}

export function buildCursorRulesSection(rules: CursorRuleContent[]): string {
    const lines: string[] = ['## Rules (imported from .cursor/rules)', ''];
    for (const rule of rules) {
        lines.push(`### ${rule.title}`, '');
        if (rule.frontmatter) {
            lines.push('```yaml', rule.frontmatter.trim(), '```', '');
        }
        if (rule.body) {
            lines.push(rule.body.trim(), '');
        }
    }
    return buildMarkedSection(CURSOR_RULES_MARKER, lines.join('\n').trim());
}

/** Strip a leading `---` YAML frontmatter block; the body starts after it. */
export function splitFrontmatter(content: string): { frontmatter?: string; body: string } {
    const input = String(content ?? '').replace(/^\uFEFF/, '');
    if (!input.startsWith('---')) {
        return { body: input };
    }
    const end = input.indexOf('\n---', 3);
    if (end < 0) {
        return { body: input };
    }
    const frontmatter = input.slice(3, end).trim();
    const body = input.slice(end + 4).replace(/^\n+/, '');
    return { frontmatter: frontmatter || undefined, body };
}

/**
 * Merge a marker-wrapped section into an existing document. When the marker
 * block is already present it is replaced in place; otherwise the section is
 * appended. Returns the merged content and whether it differs from the input.
 */
export function mergeMarkedSection(existing: string, marker: string, section: string): { content: string; changed: boolean } {
    const input = String(existing ?? '');
    const startPattern = `<!-- imported-from:${marker} -->`;
    const endPattern = `<!-- /imported-from:${marker} -->`;
    const replacement = String(section).trim();

    const startIndex = input.indexOf(startPattern);
    if (startIndex >= 0) {
        const endIndex = input.indexOf(endPattern, startIndex);
        if (endIndex >= 0) {
            const head = input.slice(0, startIndex).replace(/\s+$/, '');
            const tail = input.slice(endIndex + endPattern.length).replace(/^\s+/, '').replace(/\s+$/, '');
            const next = `${head ? `${head}\n\n` : ''}${replacement}${tail ? `\n\n${tail}` : ''}\n`;
            return { content: next, changed: next !== input };
        }
    }
    if (input.trim()) {
        return { content: `${input.replace(/\s+$/, '')}\n\n${replacement}\n`, changed: true };
    }
    return { content: `${replacement}\n`, changed: true };
}

export function parseMcpServersJson(raw: string): Array<{ name: string; entry: McpJsonServerEntry }> {
    const parsed = JSON.parse(raw);
    const servers = parsed?.mcpServers;
    if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
        throw new Error('Invalid MCP config: expected an object with an "mcpServers" map.');
    }
    return Object.entries(servers)
        .filter(([name]) => !!name?.trim())
        .map(([name, entry]) => ({ name: name.trim(), entry: (entry ?? {}) as McpJsonServerEntry }));
}

export function toAgentMcpServer(name: string, entry: McpJsonServerEntry): AgentMcpServerOptions {
    const options: AgentMcpServerOptions = { id: toMcpIdentifier(name), title: name };
    const command = typeof entry.command === 'string' && entry.command.trim() ? entry.command.trim() : undefined;
    const url = typeof entry.url === 'string' && entry.url.trim() ? entry.url.trim() : undefined;
    const env = entry.env && typeof entry.env === 'object' && !Array.isArray(entry.env)
        ? entry.env as Record<string, string>
        : entry.environment && typeof entry.environment === 'object' && !Array.isArray(entry.environment)
            ? entry.environment as Record<string, string>
            : undefined;
    if (command) {
        options.command = command;
        if (Array.isArray(entry.args)) {
            options.args = entry.args.map(String);
        }
        if (env && Object.keys(env).length) {
            options.env = env;
        }
    } else if (url) {
        options.url = url;
        if (entry.headers && typeof entry.headers === 'object' && !Array.isArray(entry.headers)) {
            options.headers = entry.headers as Record<string, string>;
        }
    }
    return options;
}

export function mergeMcpServers(existingSettings: Record<string, any>, servers: AgentMcpServerOptions[]): { settings: Record<string, any>; changed: number } {
    const settings = { ...(existingSettings ?? {}) };
    const mcp: Record<string, any> = settings.mcp && typeof settings.mcp === 'object' && !Array.isArray(settings.mcp)
        ? { ...(settings.mcp as Record<string, any>) }
        : {};
    const existing = Array.isArray(mcp.servers) ? (mcp.servers as any[]).slice() : [];
    let changed = 0;
    for (const server of servers) {
        const index = existing.findIndex(item => item?.id === server.id);
        if (index >= 0 && JSON.stringify(existing[index]) === JSON.stringify(server)) {
            continue;
        }
        if (index >= 0) {
            existing[index] = server;
        } else {
            existing.push(server);
        }
        changed += 1;
    }
    mcp.servers = existing;
    settings.mcp = mcp;
    return { settings, changed };
}

function summarize(actions: ImportConfigAction[]): ImportConfigSummary {
    const summary: ImportConfigSummary = { detected: 0, applied: 0, skipped: 0, noChange: 0 };
    for (const action of actions) {
        if (action.status === 'detected') {
            summary.detected += 1;
        } else if (action.status === 'applied') {
            summary.applied += 1;
        } else if (action.status === 'no-change') {
            summary.noChange += 1;
        } else {
            summary.skipped += 1;
        }
    }
    return summary;
}

function excerpt(value: string | undefined, max = PREVIEW_EXCERPT_CHARS): string | undefined {
    if (value == null) {
        return undefined;
    }
    if (value.length <= max) {
        return value;
    }
    return `${value.slice(0, max)}… (${value.length - max} more chars)`;
}

@Injectable()
export class ImportConfigTool implements AgentTool {
    name = 'import_config';
    description = 'Migrate Claude Code / Cursor project configuration and user metadata. User commands/history, Cursor session indexes, and installed plugin/skill inventories become bounded reports; binaries and full chat content are never copied. Two-phase: preview plans; apply writes.';
    inputSchema = {
        type: 'object',
        properties: {
            workspace: {
                type: 'string',
                description: 'Project directory containing CLAUDE.md / .cursor (default: workspace root).'
            },
            sources: {
                type: 'array',
                items: { type: 'string', enum: ['claude-md', 'cursor-rules', 'cursor-mcp', 'claude-user', 'cursor-user', 'ecosystem'] },
                description: 'Sources to migrate (default: all detected sources).'
            },
            mode: {
                type: 'string',
                enum: ['preview', 'apply'],
                description: 'preview returns the migration plan without writing (default); apply writes the files.'
            },
            agentRoot: {
                type: 'string',
                description: 'Agent config root holding settings.json for MCP migration (default: ~/.tsdi-agent).'
            },
            homeDir: { type: 'string', description: 'User home containing .claude.json/.cursor (default: current user home).' }
        }
    };
    toolset = 'project';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        timeoutMs: 30000,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true },
        redactOutput: false,
        auditEnabled: true
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<ImportConfigResult> {
        const mode = this.resolveMode(input?.mode);
        const sources = this.resolveSources(input?.sources);
        const workspace = await this.resolveWorkspace(input?.workspace);
        const agentRoot = this.resolveAgentRoot(input?.agentRoot);
        const homeDir = this.resolveHomeDir(input?.homeDir);

        const actions = await this.buildPlan(workspace, sources, agentRoot, homeDir);
        const result: ImportConfigAction[] = [];
        for (const action of actions) {
            if (mode === 'apply' && action.status === 'detected') {
                result.push(await this.applyAction(action));
            } else {
                result.push(action);
            }
        }
        return { mode, actions: result, summary: summarize(result) };
    }

    private async buildPlan(workspace: string, sources: ImportConfigSource[], agentRoot: string, homeDir: string): Promise<ImportConfigAction[]> {
        const projectRoot = await this.resolveProjectRoot(workspace);
        const actions: ImportConfigAction[] = [];
        if (sources.includes('claude-md')) {
            actions.push(await this.planClaudeMd(workspace, projectRoot));
        }
        if (sources.includes('cursor-rules')) {
            actions.push(await this.planCursorRules(workspace, projectRoot));
        }
        if (sources.includes('cursor-mcp')) {
            actions.push(await this.planCursorMcp(workspace, agentRoot));
        }
        if (sources.includes('claude-user')) actions.push(await this.planClaudeUser(homeDir, agentRoot));
        if (sources.includes('cursor-user')) actions.push(await this.planCursorUser(homeDir, agentRoot));
        if (sources.includes('ecosystem')) actions.push(await this.planEcosystem(homeDir, agentRoot));
        return actions;
    }

    private async planClaudeMd(workspace: string, projectRoot: string): Promise<ImportConfigAction> {
        const source = path.join(workspace, 'CLAUDE.md');
        const target = path.join(projectRoot, DEFAULT_AGENTS_DOC_NAME);
        const sourceContent = await this.tryRead(source);
        if (sourceContent === undefined || !sourceContent.trim()) {
            return {
                kind: 'merge-agents-md',
                source,
                target,
                status: 'not-found',
                detail: 'CLAUDE.md not found or empty; nothing to import.'
            };
        }
        const section = buildClaudeMdSection(sourceContent);
        const existing = (await this.tryRead(target)) ?? '';
        const merged = mergeMarkedSection(existing, CLAUDE_MD_MARKER, section);
        const changed = merged.changed;
        return {
            kind: 'merge-agents-md',
            source,
            target,
            status: changed ? 'detected' : 'no-change',
            detail: changed
                ? existing.trim()
                    ? `Merge ${sourceContent.split('\n').length} CLAUDE.md line(s) into ${target}.`
                    : `Create ${target} from CLAUDE.md.`
                : `AGENTS.md already contains the imported CLAUDE.md section (unchanged).`,
            ...(changed ? { before: excerpt(existing.trim() ? existing : undefined), after: excerpt(merged.content) } : {}),
            ...(changed ? { payload: { marker: CLAUDE_MD_MARKER, section } satisfies MarkedSectionPayload } : {})
        };
    }

    private async planCursorRules(workspace: string, projectRoot: string): Promise<ImportConfigAction> {
        const rulesDir = path.join(workspace, '.cursor', 'rules');
        const target = path.join(projectRoot, DEFAULT_AGENTS_DOC_NAME);
        const entries = await this.tryReadDir(rulesDir);
        const ruleFiles = (entries ?? []).filter(name => name.endsWith('.md')).sort();
        if (!ruleFiles.length) {
            return {
                kind: 'merge-cursor-rules',
                source: rulesDir,
                target,
                status: 'not-found',
                detail: 'No .cursor/rules/*.md files found; nothing to import.'
            };
        }
        const rules: CursorRuleContent[] = [];
        for (const file of ruleFiles) {
            const raw = await this.tryRead(path.join(rulesDir, file));
            if (raw === undefined) {
                continue;
            }
            const { frontmatter, body } = splitFrontmatter(raw);
            rules.push({ title: file.replace(/\.md$/, ''), frontmatter, body: body.trim() });
        }
        if (!rules.length) {
            return {
                kind: 'merge-cursor-rules',
                source: rulesDir,
                target,
                status: 'not-found',
                detail: 'No readable .cursor/rules/*.md files found; nothing to import.'
            };
        }
        const section = buildCursorRulesSection(rules);
        const existing = (await this.tryRead(target)) ?? '';
        const merged = mergeMarkedSection(existing, CURSOR_RULES_MARKER, section);
        const changed = merged.changed;
        return {
            kind: 'merge-cursor-rules',
            source: rulesDir,
            target,
            status: changed ? 'detected' : 'no-change',
            detail: changed
                ? `Merge ${rules.length} rule file(s) (${rules.map(rule => rule.title).join(', ')}) into ${target}.`
                : `AGENTS.md already contains the imported cursor rules (unchanged).`,
            ...(changed ? { before: excerpt(existing.trim() ? existing : undefined), after: excerpt(merged.content) } : {}),
            ...(changed ? { payload: { marker: CURSOR_RULES_MARKER, section } satisfies MarkedSectionPayload } : {})
        };
    }

    private async planCursorMcp(workspace: string, agentRoot: string): Promise<ImportConfigAction> {
        const candidates = [path.join(workspace, '.cursor', 'mcp.json'), path.join(workspace, '.mcp.json')];
        const target = resolveAgentSettingsPath(agentRoot);
        let source: string | undefined;
        let raw: string | undefined;
        for (const candidate of candidates) {
            const content = await this.tryRead(candidate);
            if (content !== undefined) {
                source = candidate;
                raw = content;
                break;
            }
        }
        if (source === undefined || raw === undefined) {
            return {
                kind: 'merge-mcp',
                source: candidates.join(' or '),
                target,
                status: 'not-found',
                detail: 'No .cursor/mcp.json or .mcp.json found; nothing to import.'
            };
        }
        let converted: AgentMcpServerOptions[];
        try {
            converted = parseMcpServersJson(raw).map(({ name, entry }) => toAgentMcpServer(name, entry));
        } catch (error) {
            return {
                kind: 'merge-mcp',
                source,
                target,
                status: 'not-found',
                detail: `Failed to parse ${source}: ${error instanceof Error ? error.message : String(error)}`
            };
        }
        const valid = converted.filter(server => server.command || server.url);
        const skippedCount = converted.length - valid.length;
        if (!valid.length) {
            return {
                kind: 'merge-mcp',
                source,
                target,
                status: 'not-found',
                detail: `No importable MCP servers in ${source}${skippedCount ? ` (${skippedCount} entry without command/url skipped)` : ''}.`
            };
        }
        const existingSettings = await this.loadSettings(target);
        const merged = mergeMcpServers(existingSettings, valid);
        const changed = merged.changed > 0;
        return {
            kind: 'merge-mcp',
            source,
            target,
            status: changed ? 'detected' : 'no-change',
            changed: merged.changed,
            detail: changed
                ? `Merge ${merged.changed} of ${valid.length} MCP server(s) into ${target}${skippedCount ? `; ${skippedCount} entry without command/url skipped` : ''}.`
                : `All ${valid.length} MCP server(s) already present in ${target} (unchanged).`,
            ...(changed
                ? { after: excerpt(JSON.stringify({ mcp: merged.settings.mcp }, null, 2)), payload: { servers: valid } }
                : {})
        };
    }

    private async planClaudeUser(homeDir: string, agentRoot: string): Promise<ImportConfigAction> {
        const source = path.join(homeDir, '.claude.json');
        const parsed = await this.tryReadJson(source);
        if (!parsed) return this.missingReport('claude-user', source, agentRoot, 'Claude user metadata not found or invalid.');
        const commands = this.boundedList(parsed.commands ?? parsed.customCommands).map(item => this.metadataOnly(item));
        const history = this.boundedList(parsed.history ?? parsed.recentProjects ?? parsed.projects).map(item => this.metadataOnly(item));
        return this.planReport('claude-user', source, agentRoot, { commands, history });
    }

    private async planCursorUser(homeDir: string, agentRoot: string): Promise<ImportConfigAction> {
        const cursorRoot = path.join(homeDir, '.cursor');
        const files: Record<string, unknown> = {};
        for (const name of ['sessions.json', 'recent-chats.json', 'history.json', 'state.json']) {
            const parsed = await this.tryReadJson(path.join(cursorRoot, name));
            if (parsed) files[name] = this.metadataOnly(parsed);
        }
        if (!Object.keys(files).length) return this.missingReport('cursor-user', cursorRoot, agentRoot, 'No Cursor session index or recent chat metadata found.');
        return this.planReport('cursor-user', cursorRoot, agentRoot, { files });
    }

    private async planEcosystem(homeDir: string, agentRoot: string): Promise<ImportConfigAction> {
        const roots = [
            ['claude-plugins', path.join(homeDir, '.claude', 'plugins')],
            ['claude-skills', path.join(homeDir, '.claude', 'skills')],
            ['cursor-plugins', path.join(homeDir, '.cursor', 'plugins')],
            ['cursor-skills', path.join(homeDir, '.cursor', 'skills')]
        ] as const;
        const installed: Record<string, string[]> = {};
        for (const [label, root] of roots) {
            const entries = await this.tryReadDir(root);
            if (entries?.length) installed[label] = entries.filter(name => !name.startsWith('.')).sort().slice(0, MAX_METADATA_ITEMS);
        }
        if (!Object.keys(installed).length) return this.missingReport('ecosystem', roots.map(item => item[1]).join(' or '), agentRoot, 'No installed Claude/Cursor plugin or skill inventory found.');
        return this.planReport('ecosystem', homeDir, agentRoot, { installed, note: 'Inventory only; plugin and skill binaries were not copied.' });
    }

    private async planReport(sourceType: ImportConfigSource, source: string, agentRoot: string, data: Record<string, unknown>): Promise<ImportConfigAction> {
        const target = path.join(agentRoot, 'imports', `${sourceType}.json`);
        const report: ImportMetadataReport = { source: sourceType, generatedAt: new Date().toISOString(), data };
        const next = JSON.stringify(report, null, 2) + '\n';
        const existing = await this.tryRead(target);
        let changed = true;
        if (existing) {
            try {
                const previous = JSON.parse(existing) as Partial<ImportMetadataReport>;
                changed = previous.source !== report.source || JSON.stringify(previous.data) !== JSON.stringify(report.data);
            } catch {
                changed = true;
            }
        }
        return {
            kind: 'write-migration-report', source, target, status: changed ? 'detected' : 'no-change',
            detail: changed ? `Write bounded ${sourceType} metadata migration report.` : `${sourceType} migration report is unchanged.`,
            ...(changed ? { after: excerpt(next), payload: report } : {})
        };
    }

    private missingReport(sourceType: ImportConfigSource, source: string, agentRoot: string, detail: string): ImportConfigAction {
        return { kind: 'write-migration-report', source, target: path.join(agentRoot, 'imports', `${sourceType}.json`), status: 'not-found', detail };
    }

    private boundedList(value: unknown): unknown[] {
        if (Array.isArray(value)) return value.slice(0, MAX_METADATA_ITEMS);
        if (value && typeof value === 'object') return Object.entries(value as Record<string, unknown>).slice(0, MAX_METADATA_ITEMS).map(([id, item]) => ({ id, value: item }));
        return [];
    }

    private metadataOnly(value: unknown, depth = 0): unknown {
        if (depth > 3) return '[omitted]';
        if (Array.isArray(value)) return value.slice(0, MAX_METADATA_ITEMS).map(item => this.metadataOnly(item, depth + 1));
        if (!value || typeof value !== 'object') return typeof value === 'string' && value.length > 500 ? `${value.slice(0, 500)}...` : value;
        const blocked = new Set(['content', 'messages', 'transcript', 'prompt', 'response', 'token', 'apikey', 'secret', 'password', 'authorization', 'cookie']);
        return Object.fromEntries(Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !blocked.has(key.toLowerCase()))
            .slice(0, 50)
            .map(([key, item]) => [key, this.metadataOnly(item, depth + 1)]));
    }

    private async applyAction(action: ImportConfigAction): Promise<ImportConfigAction> {
        try {
            if (action.kind === 'write-migration-report') {
                await fs.mkdir(path.dirname(action.target), { recursive: true });
                await fs.writeFile(action.target, JSON.stringify(action.payload, null, 2) + '\n', 'utf8');
            } else if (action.kind === 'merge-mcp') {
                const payload = (action.payload ?? {}) as { servers?: AgentMcpServerOptions[] };
                const servers = payload.servers ?? [];
                const settings = await this.loadSettings(action.target);
                const merged = mergeMcpServers(settings, servers);
                await fs.mkdir(path.dirname(action.target), { recursive: true });
                await fs.writeFile(action.target, JSON.stringify(merged.settings, null, 2) + '\n', 'utf8');
            } else {
                const payload = action.payload as MarkedSectionPayload;
                const existing = (await this.tryRead(action.target)) ?? '';
                const merged = mergeMarkedSection(existing, payload.marker, payload.section);
                await fs.mkdir(path.dirname(action.target), { recursive: true });
                await fs.writeFile(action.target, merged.content, 'utf8');
            }
            return {
                kind: action.kind,
                source: action.source,
                target: action.target,
                status: 'applied',
                detail: `Applied: wrote ${action.target}.`
            };
        } catch (error) {
            return {
                kind: action.kind,
                source: action.source,
                target: action.target,
                status: 'not-found',
                detail: `Failed to apply: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    private resolveMode(value: unknown): ImportConfigMode {
        if (value !== 'apply') {
            return 'preview';
        }
        return 'apply';
    }

    private resolveSources(value: unknown): ImportConfigSource[] {
        const all: ImportConfigSource[] = ['claude-md', 'cursor-rules', 'cursor-mcp', 'claude-user', 'cursor-user', 'ecosystem'];
        if (!Array.isArray(value) || !value.length) {
            return all;
        }
        const selected = value.filter((item): item is ImportConfigSource => all.includes(item as ImportConfigSource));
        if (selected.length !== value.length) {
            const invalid = value.filter(item => !all.includes(item as ImportConfigSource));
            throw new Error(`Unknown import source(s): ${invalid.join(', ')}. Expected: ${all.join(', ')}.`);
        }
        return selected;
    }

    private async resolveWorkspace(workspace: unknown): Promise<string> {
        const policy = resolveFilePolicy(this.options);
        if (typeof workspace === 'string' && workspace.trim()) {
            const cwd = resolveWorkspacePath(workspace, policy.rootDir);
            await assertNoSymlinkInWorkspacePath(cwd, policy.rootDir);
            try {
                await fs.stat(cwd);
            } catch {
                throw new Error(`Import workspace '${workspace}' does not exist.`);
            }
            return cwd;
        }
        return policy.rootDir;
    }

    private async resolveProjectRoot(workspace: string): Promise<string> {
        const root = findProjectRoot(workspace, { stopAt: workspace, exists: target => existsSync(target) });
        return root ?? workspace;
    }

    private resolveAgentRoot(value: unknown): string {
        if (typeof value === 'string' && value.trim()) {
            return resolveAgentRoot(value.trim());
        }
        return resolveAgentRoot();
    }

    private resolveHomeDir(value: unknown): string {
        if (typeof value === 'string' && value.trim()) return path.resolve(value.trim());
        const processRef = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
        return path.resolve(processRef?.env?.HOME || processRef?.env?.USERPROFILE || '.');
    }

    private async tryReadJson(file: string): Promise<Record<string, any> | undefined> {
        const raw = await this.tryRead(file);
        if (!raw?.trim()) return undefined;
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }

    private async loadSettings(settingsPath: string): Promise<Record<string, any>> {
        const raw = await this.tryRead(settingsPath);
        if (raw === undefined || !raw.trim()) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error(`Invalid agent settings at '${settingsPath}': expected a JSON object.`);
        }
        return parsed;
    }

    private async tryRead(file: string): Promise<string | undefined> {
        try {
            return await fs.readFile(file, 'utf8');
        } catch {
            return undefined;
        }
    }

    private async tryReadDir(dir: string): Promise<string[] | undefined> {
        try {
            return await fs.readdir(dir);
        } catch {
            return undefined;
        }
    }
}
