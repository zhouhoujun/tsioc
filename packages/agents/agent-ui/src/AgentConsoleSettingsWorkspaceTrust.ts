import { AGENT_WORKSPACE_TRUST, type AgentWorkspaceTrustResolver } from '@tsdi/agent';
import { settingsCenterLabel, type AgentConsoleSettingsHost } from './AgentConsoleSettingsSchema';

/** Resolve the workspace-trust resolver from the host application context. */
export function resolveAgentConsoleWorkspaceTrust(host: AgentConsoleSettingsHost): AgentWorkspaceTrustResolver | undefined {
    const app = (host as { app?: any }).app;
    if (!app?.get) {
        return undefined;
    }
    try {
        return app.get(AGENT_WORKSPACE_TRUST, { defaultValue: null }) ?? undefined;
    } catch {
        return undefined;
    }
}

/** `trusted` / `untrusted` / `unknown` for the current workspace. */
export function describeAgentConsoleWorkspaceTrust(host: AgentConsoleSettingsHost): string {
    const resolver = resolveAgentConsoleWorkspaceTrust(host);
    const workspace = String(host.state?.workspace || '').trim();
    if (!resolver || !workspace) {
        return settingsCenterLabel(host.translator, 'agent.menu.settings.trustUnknown', 'unknown');
    }
    return resolver.isTrusted(workspace)
        ? settingsCenterLabel(host.translator, 'agent.menu.settings.trustYes', 'trusted')
        : settingsCenterLabel(host.translator, 'agent.menu.settings.trustNo', 'untrusted');
}

/**
 * Trust the current workspace after an explicit confirmation. Trust is only
 * granted here (there is no untrust API); already-trusted workspaces just
 * report their state.
 */
export async function trustAgentConsoleWorkspace(host: AgentConsoleSettingsHost): Promise<void> {
    const resolver = resolveAgentConsoleWorkspaceTrust(host);
    const workspace = String(host.state?.workspace || '').trim();
    if (!resolver || !workspace || !resolver.trust) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.trustUnavailable', 'Workspace trust is not available in this host.'));
        return;
    }
    if (resolver.isTrusted(workspace)) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.trustAlready', 'This workspace is already trusted.'));
        return;
    }
    const confirmed = await host.select(
        settingsCenterLabel(host.translator, 'agent.menu.settings.trustTitle', 'Trust this workspace?'),
        [
            { label: settingsCenterLabel(host.translator, 'agent.menu.settings.trustConfirmYes', 'Trust workspace'), value: 'yes', description: workspace },
            { label: settingsCenterLabel(host.translator, 'agent.menu.settings.trustConfirmNo', 'Cancel'), value: 'no' }
        ],
        0,
        settingsCenterLabel(host.translator, 'agent.hint.enterSelectClose', 'enter select   esc close')
    );
    if (confirmed !== 'yes') {
        return;
    }
    try {
        resolver.trust(workspace);
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.trustGranted', 'Workspace trusted: {workspace}', { workspace }));
    } catch (error: any) {
        host.notify(settingsCenterLabel(host.translator, 'agent.menu.settings.trustFailed', 'Failed to trust workspace: {error}', {
            error: error instanceof Error ? error.message : String(error)
        }));
    }
}
