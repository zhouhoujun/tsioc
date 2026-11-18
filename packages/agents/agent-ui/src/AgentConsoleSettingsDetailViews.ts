import { formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import { formatPluginDetail, formatSkillDetail, formatSkillLine } from './AgentConsoleExtensionCommands';
import { settingsCenterLabel, type AgentConsoleSettingsHost } from './AgentConsoleSettingsSchema';

/** Host surface for the read-only detail views of integrations. */
export interface AgentConsoleSettingsDetailHost extends AgentConsoleSettingsHost {
    invokeTool?(name: string, input: any): Promise<any>;
    appRpc?: any;
    runtime?: any;
    rpcRequestContext?(): any;
}

function openDetail(host: AgentConsoleSettingsDetailHost, title: string, text: string, back?: () => void): void {
    const lines = String(text || '').split('\n').filter(line => line.length > 0);
    if (!lines.length) {
        return;
    }
    host.state.openTextOverlay?.(title, lines, Math.min(lines.length, 20), back);
}

/** Skills: picker → read_skill → scrollable detail overlay (back reopens the list). */
export async function showAgentConsoleSkillsDetail(host: AgentConsoleSettingsDetailHost): Promise<void> {
    if (!host.invokeTool) {
        host.notify(formatAgentUiNotice(host.translator, 'noSkillsAvailable'));
        return;
    }
    const title = formatAgentUiLabel(host.translator, 'agent.menu.skills.title', 'Skills');
    const listed = await host.invokeTool('skill_list', {}).catch(() => undefined);
    const skills: any[] = Array.isArray(listed?.skills) ? listed.skills : [];
    if (!skills.length) {
        host.notify(formatAgentUiNotice(host.translator, 'noSkillsAvailable'));
        return;
    }
    const picked = await host.select(
        title,
        skills.map(skill => ({
            label: String(skill?.id || ''),
            value: String(skill?.id || ''),
            description: String(skill?.summary || '')
        })),
        0,
        settingsCenterLabel(host.translator, 'agent.hint.enterDetailClose', 'enter detail   esc close')
    );
    if (!picked) return;
    const detail = await host.invokeTool('read_skill', { id: picked }).catch(() => undefined);
    const fallback = skills.find(skill => String(skill?.id || '') === picked);
    const text = detail?.skill ? formatSkillDetail(detail.skill) : formatSkillLine(fallback);
    openDetail(host, `${title} · ${picked}`, text, () => { void showAgentConsoleSkillsDetail(host); });
}

/**
 * Hooks: declared hooks with their trust state (when the gateway can read
 * `hooks.json`/`hooks.trusted.json`), else the runtime hook summary.
 */
export async function showAgentConsoleHooksDetail(host: AgentConsoleSettingsDetailHost): Promise<void> {
    let summary: Array<{ stage: string; commands: string[]; functions: string[] }> = [];
    let trust: Array<{ stage: string; name?: string; trusted: boolean; trustedAt?: number }> = [];
    if (host.appRpc) {
        const [listed, trusted] = await Promise.all([
            host.appRpc.request('hooks.list', {}, host.rpcRequestContext?.()).catch(() => null),
            host.appRpc.request('hooks.trust.list', {}, host.rpcRequestContext?.()).catch(() => null)
        ]);
        if (Array.isArray(listed)) {
            summary = listed;
        }
        if (Array.isArray(trusted)) {
            trust = trusted;
        }
    }
    if (!summary.length) {
        summary = host.runtime?.getHookSummary?.() ?? [];
    }
    const stages = summary.filter(entry => entry.commands.length > 0 || entry.functions.length > 0);
    const title = formatAgentUiNotice(host.translator, 'hooksRegisteredTitle');
    if (!stages.length && !trust.length) {
        host.notify(formatAgentUiNotice(host.translator, 'hooksRegisteredConfigure'));
        return;
    }
    const lines: string[] = [];
    if (trust.length) {
        const trustedCount = trust.filter(entry => entry.trusted).length;
        lines.push(settingsCenterLabel(host.translator, 'agent.menu.settings.hooksTrustSummary',
            'trusted {trusted}/{total}', { trusted: trustedCount, total: trust.length }));
        for (const entry of trust) {
            const state = entry.trusted
                ? settingsCenterLabel(host.translator, 'agent.menu.settings.hooksTrusted', 'trusted')
                : settingsCenterLabel(host.translator, 'agent.menu.settings.hooksUntrusted', 'untrusted');
            lines.push(`[${state}] ${entry.stage}${entry.name ? ` · ${entry.name}` : ''}`);
        }
    }
    if (stages.length) {
        if (lines.length) {
            lines.push('');
        }
        for (const entry of stages) {
            const commands = entry.commands.length ? `cmd: ${entry.commands.join('; ')}` : '';
            const functions = entry.functions.length ? `fn: ${entry.functions.join(', ')}` : '';
            lines.push(`${entry.stage}${commands ? ` [${commands}]` : ''}${functions ? ` [${functions}]` : ''}`);
        }
    }
    // No back link: Esc must close the overlay (a back that reopens the same
    // view would make the dismiss key appear broken).
    openDetail(host, title, lines.join('\n'));
}

/** One plugin's manifest/contributions in the detail overlay. */
export async function showAgentConsolePluginDetail(host: AgentConsoleSettingsDetailHost, plugin: any): Promise<void> {
    if (!host.invokeTool) {
        return;
    }
    const id = String(plugin?.id || '').trim();
    const detail = id ? await host.invokeTool('plugins', { action: 'inspect', id }).catch(() => undefined) : undefined;
    const inspected = detail?.plugin || plugin;
    const title = String(inspected?.manifest?.name || inspected?.id || 'plugin');
    const text = formatPluginDetail(inspected, detail?.contributions);
    openDetail(host, title, text);
}
