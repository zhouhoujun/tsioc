import { AgentConsoleAppAuthorizer, AgentConsoleAppStatus, resolveAgentConsoleApps } from './AgentConsoleApps';

export interface ExtensionCommandHost {
    state: any;
    options: any;
    notify(message: string): void;
    select(title: string, options: any[], index: number, hint?: string): Promise<string | undefined>;
    pushCommandOutput(command: string, text: string, kind?: any): void;
    invokeTool(name: string, input?: any): Promise<any>;
}

export function formatSkillLine(skill: any): string {
    const parts = [String(skill.id || '')];
    if (String(skill.category || '').trim()) parts.push(`[${skill.category}]`);
    if (String(skill.summary || '').trim()) parts.push(String(skill.summary));
    return parts.join(' ');
}

export function formatSkillDetail(skill: any): string {
    const lines = [
        `Skill: ${String(skill.id || '')}`,
        String(skill.title || '') ? `Title: ${skill.title}` : '',
        String(skill.summary || '') ? `Summary: ${skill.summary}` : '',
        Array.isArray(skill.aliases) && skill.aliases.length ? `Aliases: ${skill.aliases.join(', ')}` : '',
        String(skill.content || '') ? `Content: ${skill.content}` : '',
        String(skill.source || '') ? `Source: ${skill.source}` : ''
    ];
    return lines.filter(Boolean).join('\n');
}

export async function runSkillsCommand(host: ExtensionCommandHost, args?: string): Promise<boolean> {
    const query = String(args || '').trim();
    const result = await host.invokeTool('skill_list', query ? { query } : {}).catch(() => undefined);
    const skills = Array.isArray(result?.skills) ? result.skills : [];
    if (!skills.length) {
        host.notify(query ? `No skills match "${query}".` : 'No skills available.');
        return true;
    }
    if (query) {
        host.pushCommandOutput(`/skills ${query}`, skills.map((skill: any) => formatSkillLine(skill)).join('\n'));
        return true;
    }
    const selected = await host.select('Skills', skills.map((skill: any) => ({
        label: `${skill.id}${String(skill.category || '').trim() ? ` [${skill.category}]` : ''}`,
        value: String(skill.id || ''),
        description: String(skill.summary || ''),
        detail: [
            `Title: ${String(skill.title || skill.id || '-')}`,
            String(skill.summary || '') ? `Summary: ${skill.summary}` : '',
            Array.isArray(skill.aliases) && skill.aliases.length ? `Aliases: ${skill.aliases.join(', ')}` : '',
            String(skill.source || '') ? `Source: ${skill.source}` : ''
        ].filter(Boolean).join('\n')
    })), 0, 'enter detail   esc close');
    if (!selected) return true;
    const detail = await host.invokeTool('read_skill', { id: selected }).catch(() => undefined);
    host.pushCommandOutput(`/skills ${selected}`, detail?.skill
        ? formatSkillDetail(detail.skill)
        : skills.map((skill: any) => formatSkillLine(skill)).join('\n'));
    return true;
}

export function formatPluginLine(plugin: any): string {
    const name = String(plugin?.manifest?.name || plugin.id || '');
    const scope = String(plugin?.scope || '').trim();
    const description = String(plugin?.manifest?.description || '').trim();
    return `${name}${scope ? ` [${scope}]` : ''}${description ? ` · ${description}` : ''}`;
}

export function formatPluginDetail(plugin: any, contributions?: any): string {
    const lines = [
        `Plugin: ${String(plugin?.manifest?.name || plugin.id || '')}`,
        `Id: ${String(plugin.id || '')}`,
        String(plugin?.manifest?.description || '') ? `Description: ${plugin.manifest.description}` : '',
        String(plugin?.scope || '') ? `Scope: ${plugin.scope}` : '',
        String(plugin?.version || '') ? `Version: ${plugin.version}` : ''
    ];
    const skills = Array.isArray(contributions?.skills) ? contributions.skills : [];
    if (skills.length) lines.push(`Skills: ${skills.map((skill: any) => String(skill.id || '')).join(', ')}`);
    return lines.filter(Boolean).join('\n');
}

export async function runPluginsCommand(host: ExtensionCommandHost, args?: string): Promise<boolean> {
    const requested = String(args || '').trim();
    const result = await host.invokeTool('plugins', requested
        ? { action: 'inspect', id: requested }
        : { action: 'list' }).catch(() => undefined);
    const plugins = Array.isArray(result?.plugins) ? result.plugins : [];
    if (!plugins.length) {
        host.notify(requested ? `No plugin "${requested}" installed.` : 'No plugins installed.');
        return true;
    }
    if (requested) {
        host.pushCommandOutput(`/plugins ${requested}`, plugins.map((plugin: any) => formatPluginDetail(plugin, result?.contributions)).join('\n'));
        return true;
    }
    host.pushCommandOutput('/plugins', plugins.map((plugin: any) => formatPluginLine(plugin)).join('\n'));
    return true;
}

export function resolveApps(host: ExtensionCommandHost): AgentConsoleAppStatus[] {
    const config = (host.options.ui?.console as any)?.connectors;
    return resolveAgentConsoleApps(config && typeof config === 'object' ? config : undefined);
}

export function resolveAppAuthorizer(host: ExtensionCommandHost): AgentConsoleAppAuthorizer | undefined {
    const authorizer = (host.options.ui?.console as any)?.authorizeConnector
        || (host.options.ui as any)?.authorizeConnector;
    return typeof authorizer === 'function' ? authorizer : undefined;
}

export function insertAppMention(host: ExtensionCommandHost, app: AgentConsoleAppStatus): void {
    const current = String(host.state.input || '');
    const spacer = current && !/\s$/.test(current) ? ' ' : '';
    const next = `${current}${spacer}$${app.id} `;
    host.state.updateDraft(next, next.length);
    host.notify(`${app.name} connector inserted · ${app.statusLabel}.`);
}

export async function runAppsCommand(host: ExtensionCommandHost, args?: string): Promise<boolean> {
    const requested = String(args || '').trim().replace(/^\$/, '').toLowerCase();
    const apps = resolveApps(host);
    if (requested) {
        let app = apps.find(item => item.id === requested);
        if (!app) {
            host.notify(`Unknown connector "${requested}". Use /apps to browse available connectors.`);
            return true;
        }
        if (!app.authorized) {
            const authorize = resolveAppAuthorizer(host);
            if (!authorize) {
                insertAppMention(host, app);
                return true;
            }
            let authorized = false;
            try {
                authorized = await authorize(app);
            } catch (error) {
                host.notify(`${app.name} authorization failed: ${error instanceof Error ? error.message : String(error)}`);
                return true;
            }
            if (!authorized) {
                host.notify(`${app.name} authorization was cancelled.`);
                return true;
            }
            app = { ...app, authorized: true, statusLabel: 'connected' };
        }
        insertAppMention(host, app);
        return true;
    }
    const selected = await host.select('Apps', apps.map(app => ({
        label: `${app.name} · ${app.statusLabel}`,
        value: app.id,
        description: `${app.category} · ${app.description}`
    })), 0, 'enter insert   esc close');
    if (selected) {
        const app = apps.find(item => item.id === selected);
        if (app) insertAppMention(host, app);
    }
    return true;
}
