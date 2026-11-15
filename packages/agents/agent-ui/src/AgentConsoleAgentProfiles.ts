import { formatAgentUiNotice } from './agent-ui.i18n';
import type { AgentConsoleSelectOption, AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Compact agent profile shape shared by the picker and badges. */
export interface AgentProfileSummary {
    name: string;
    description?: string;
    mode?: string;
    model?: string;
    readOnly?: boolean;
}

export interface AgentProfileHost {
    translator?: { translate(key: string, params?: any): string } | null;
    state: AgentConsoleSessionState;
    appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    runtime?: {
        getSessionArchetype?(sessionId: string): string;
        listArchetypes?(): string[];
        listAgentProfiles?(): AgentProfileSummary[];
        setSessionArchetype?(sessionId: string, name: string): void;
    } | null;
    notify(message: string): void;
    rpcRequestContext?(): any;
}

/** Candidate profiles: app RPC (gateway) → runtime registry → built-in default. */
export async function listAgentProfiles(host: AgentProfileHost): Promise<AgentProfileSummary[]> {
    if (host.appRpc) {
        const result = await host.appRpc.request(
            'session.archetype.list',
            {},
            host.rpcRequestContext?.()
        ).catch(() => null);
        const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
        if (profiles.length) {
            return profiles
                .map((profile: any) => ({
                    name: String(profile?.name || '').trim(),
                    description: profile?.description ? String(profile.description) : undefined,
                    mode: profile?.mode ? String(profile.mode) : undefined,
                    model: profile?.model ? String(profile.model) : undefined,
                    readOnly: profile?.readOnly === true
                }))
                .filter((profile: AgentProfileSummary) => !!profile.name);
        }
    }
    const runtimeProfiles = host.runtime?.listAgentProfiles?.();
    if (Array.isArray(runtimeProfiles) && runtimeProfiles.length) {
        return runtimeProfiles.filter(profile => !!profile?.name);
    }
    const names = host.runtime?.listArchetypes?.() || [];
    return (names.length ? names : ['build']).map(name => ({ name }));
}

/** Menu rows: current profile marker + mode/model description + full prompt hint. */
export function buildAgentProfileOptions(
    profiles: AgentProfileSummary[],
    current: string
): AgentConsoleSelectOption[] {
    return profiles.map(profile => ({
        label: `${profile.name === current ? '● ' : '  '}${profile.name}`,
        value: profile.name,
        description: [profile.mode, profile.model].filter(Boolean).join(' · '),
        detail: profile.description
    }));
}

export async function switchAgentProfile(host: AgentProfileHost, name: string): Promise<void> {
    const normalized = String(name || '').trim().toLowerCase();
    if (!normalized) return;
    try {
        if (host.appRpc) {
            await host.appRpc.request(
                'session.archetype.set',
                { sessionId: host.state.sessionId, archetype: normalized },
                host.rpcRequestContext?.()
            );
        } else {
            host.runtime?.setSessionArchetype?.(host.state.sessionId, normalized);
        }
        host.state.setActiveArchetype(normalized);
        host.notify(formatAgentUiNotice(host.translator, 'sessionSwitchedArchetype', {
            sessionId: host.state.sessionId,
            name: normalized
        }));
    } catch (error) {
        host.notify(formatAgentUiNotice(host.translator, 'failedSetArchetype', {
            error: error instanceof Error ? error.message : String(error)
        }));
    }
}

/**
 * `/agents [name]` — choose or switch the agent profile for this session.
 * `/archetype` remains an alias for the same view.
 */
export async function runAgentsCommandView(host: AgentProfileHost, args: string): Promise<void> {
    const requested = String(args || '').trim().toLowerCase();
    const current = host.state.activeArchetype
        || host.runtime?.getSessionArchetype?.(host.state.sessionId)
        || 'build';
    if (requested) {
        await switchAgentProfile(host, requested);
        return;
    }
    const profiles = await listAgentProfiles(host);
    const options = buildAgentProfileOptions(profiles, current);
    const selected = await host.state.selectAsync(
        formatAgentUiNotice(host.translator, 'agentsTitle'),
        options,
        Math.max(0, options.findIndex(option => option.value === current)),
        formatAgentUiNotice(host.translator, 'agentsHint')
    );
    if (!selected || selected === current) {
        return;
    }
    await switchAgentProfile(host, selected);
}
