import { formatAgentUiNotice } from './agent-ui.i18n';
import { settingsCenterLabel, type AgentConsoleSettingsHost } from './AgentConsoleSettingsSchema';

/** Host surface the integration actions need on top of the settings schema. */
export interface AgentConsoleIntegrationHost extends AgentConsoleSettingsHost {
    invokeTool?(name: string, input: any): Promise<any>;
    appRpc?: any;
    toolRegistry?: any;
    rpcRequestContext?(): any;
    refreshTools?(): Promise<void>;
}

function pluginName(plugin: any): string {
    return String(plugin?.manifest?.name || plugin?.id || '').trim() || 'plugin';
}

/**
 * Plugin management from the settings page. The `plugins` tool already owns
 * activate/inspect/remove, so the page only drives a picker instead of
 * duplicating manifest handling.
 */
export async function manageAgentConsolePlugins(host: AgentConsoleIntegrationHost): Promise<void> {
    if (!host.invokeTool) {
        host.notify(formatAgentUiNotice(host.translator, 'noPluginsInstalled'));
        return;
    }
    const listed = await host.invokeTool('plugins', { action: 'list' }).catch(() => undefined);
    const plugins: any[] = Array.isArray(listed?.plugins) ? listed.plugins : [];
    if (!plugins.length) {
        host.notify(formatAgentUiNotice(host.translator, 'noPluginsInstalled'));
        return;
    }
    const picked = await host.select(
        settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsManageTitle', 'Settings · Plugins'),
        plugins.map(plugin => ({
            label: pluginName(plugin),
            value: String(plugin?.id || pluginName(plugin)),
            description: String(plugin?.manifest?.description || plugin?.scope || '').trim()
        })),
        0,
        settingsCenterLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close')
    );
    if (!picked) return;
    const plugin = plugins.find(item => String(item?.id || pluginName(item)) === picked);
    const action = await host.select(
        pluginName(plugin),
        [
            { label: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsActionActivate', 'Activate plugin'), value: 'activate', description: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsActionActivateDescription', 'load its skills, hooks and tools') },
            { label: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsActionInspect', 'Inspect plugin'), value: 'inspect', description: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsActionInspectDescription', 'show manifest and contributions') },
            { label: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsActionRemove', 'Remove plugin'), value: 'remove', description: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsActionRemoveDescription', 'delete the installed plugin directory') }
        ],
        0,
        settingsCenterLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close')
    );
    if (!action) return;
    try {
        if (action === 'inspect') {
            await host.runPluginsCommand(picked);
            return;
        }
        if (action === 'activate') {
            await host.invokeTool('plugins', { action: 'activate', id: picked });
            host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.pluginActivated', 'Plugin activated: {name}', { name: pluginName(plugin) }));
            return;
        }
        const confirmed = await host.select(
            settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsRemoveConfirm', 'Remove plugin "{name}"? This deletes its files.', { name: pluginName(plugin) }),
            [
                { label: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsRemoveYes', 'Remove'), value: 'yes' },
                { label: settingsCenterLabel(host.translator, 'agent.menu.settings.pluginsRemoveNo', 'Cancel'), value: 'no' }
            ],
            0,
            settingsCenterLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close')
        );
        if (confirmed !== 'yes') return;
        await host.invokeTool('plugins', { action: 'remove', id: picked });
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.pluginRemoved', 'Plugin removed: {name}', { name: pluginName(plugin) }));
    } catch (error: any) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.pluginActionFailed', 'Plugin action failed: {error}', {
            error: error instanceof Error ? error.message : String(error)
        }));
    }
}

/** Activate an inactive MCP tool for the current session (`tools.activate`). */
export async function activateAgentConsoleMcpTool(host: AgentConsoleIntegrationHost): Promise<void> {
    const tools: any[] = (host.state.tools || []).filter((tool: any) => String(tool?.name || '').startsWith('mcp.') && !tool.active);
    if (!tools.length) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.mcpNoInactiveTools', 'All MCP tools are already active.'));
        return;
    }
    const picked = await host.select(
        settingsCenterLabel(host.translator, 'agent.menu.settings.mcpActivateTitle', 'Settings · MCP tools'),
        tools.map(tool => ({
            label: settingsCenterLabel(host.translator, 'agent.menu.settings.mcpActivateTool', 'Activate {name}', { name: String(tool.name) }),
            value: String(tool.name),
            description: settingsCenterLabel(host.translator, 'agent.menu.settings.mcpActivateToolDescription', 'enable this MCP tool for the current session')
        })),
        0,
        settingsCenterLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close')
    );
    if (!picked) return;
    try {
        if (host.appRpc) {
            await host.appRpc.request('tools.activate', { sessionId: host.state.sessionId, name: picked }, host.rpcRequestContext?.());
        } else {
            await host.toolRegistry?.activateTool?.(host.state.sessionId, picked);
        }
        await host.refreshTools?.();
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.mcpToolActivated', 'MCP tool activated: {name}', { name: picked }));
    } catch (error: any) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.pluginActionFailed', 'Plugin action failed: {error}', {
            error: error instanceof Error ? error.message : String(error)
        }));
    }
}
