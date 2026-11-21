import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { formatSessionAge } from './AgentConsoleFormatters';
import {
    AgentConsoleRemoteCenter,
    maskAgentConsoleRemoteUrl,
    sanitizeAgentConsoleRemoteCenters
} from './AgentConsoleRemoteCenterConfig';
import { HttpAgentConsoleAppRpc } from './HttpAgentConsoleAppRpc';
import type { CommandHandlerContext } from './AgentConsoleCommandHandlerContext';

/**
 * `/remotes` — read-only aggregation of sessions hosted by other gateways
 * (`tsdi-agent serve` / paired machines).
 *
 * The list lives in the workspace `settings.json` (`remotes`), so TUI, Web and
 * attach read the same configuration. Actions only read `session.list`: no
 * spawning, cancelling or switching into a remote session — that boundary keeps
 * the first cut safe and testable.
 */

export interface AgentConsoleRemoteRpc {
    request(method: string, params?: any, context?: any): Promise<any>;
}

export type AgentConsoleRemoteRpcFactory = (remote: AgentConsoleRemoteCenter) => AgentConsoleRemoteRpc;

export interface AgentConsoleRemoteCenterHost {
    translator?: AgentUiTranslator | null;
    state: {
        remoteCenters?: AgentConsoleRemoteCenter[];
        openTextOverlay(kind: string, lines: string[], visibleLines?: number, back?: () => void): void;
    };
    notify(message: string): void;
    persistSettings?(patch: Record<string, any>): Promise<void>;
    select?(title: string, options: Array<{ label: string; value: string; description?: string }>, index?: number, hint?: string): Promise<string | undefined>;
}

export interface AgentConsoleRemoteProbe {
    remote: AgentConsoleRemoteCenter;
    sessions: any[];
    ok: boolean;
    error?: string;
}

const PROBE_TIMEOUT_MS = 5000;

function defaultRpcFactory(remote: AgentConsoleRemoteCenter): AgentConsoleRemoteRpc {
    return new HttpAgentConsoleAppRpc({ baseUrl: remote.url, token: remote.token });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        (timer as any)?.unref?.();
        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }, error => {
            clearTimeout(timer);
            reject(error);
        });
    });
}

function errorText(error: unknown): string {
    const text = error instanceof Error ? error.message : String(error || '');
    return text.trim().slice(0, 120) || 'unreachable';
}

function configuredCenters(host: AgentConsoleRemoteCenterHost): AgentConsoleRemoteCenter[] {
    return sanitizeAgentConsoleRemoteCenters(host.state.remoteCenters);
}

/** Full id or unique id prefix inside one remote session list. */
export function resolveRemoteSessionTarget(sessions: any[], token: string): string | undefined {
    const needle = String(token || '').trim().toLowerCase();
    if (!needle) {
        return undefined;
    }
    const exact = sessions.find(session => String(session?.id || '').toLowerCase() === needle);
    if (exact) {
        return String(exact.id);
    }
    const prefixed = sessions.filter(session => String(session?.id || '').toLowerCase().startsWith(needle));
    return prefixed.length === 1 ? String(prefixed[0].id) : undefined;
}

async function saveCenters(host: AgentConsoleRemoteCenterHost, centers: AgentConsoleRemoteCenter[]): Promise<void> {
    const next = sanitizeAgentConsoleRemoteCenters(centers);
    host.state.remoteCenters = next;
    await host.persistSettings?.({ remotes: next });
}

export async function probeAgentConsoleRemoteCenter(remote: AgentConsoleRemoteCenter, factory: AgentConsoleRemoteRpcFactory = defaultRpcFactory): Promise<AgentConsoleRemoteProbe> {
    try {
        const rpc = factory(remote);
        const result = await withTimeout(
            Promise.resolve(rpc.request('session.list', undefined, { timeoutMs: PROBE_TIMEOUT_MS })),
            PROBE_TIMEOUT_MS
        );
        return { remote, sessions: Array.isArray(result) ? result : [], ok: true };
    } catch (error) {
        return { remote, sessions: [], ok: false, error: errorText(error) };
    }
}

function remoteSessionLines(host: AgentConsoleRemoteCenterHost, probe: AgentConsoleRemoteProbe): string[] {
    const title = probe.remote.name;
    const sessions = probe.sessions
        .slice()
        .sort((left, right) => Number(right?.updatedAt || right?.lastActiveAt || 0) - Number(left?.updatedAt || left?.lastActiveAt || 0));
    const lines = [
        `URL: ${maskAgentConsoleRemoteUrl(probe.remote.url)}`,
        formatAgentUiNotice(host.translator, 'remoteCenterSessionCount', { name: title, count: sessions.length })
    ];
    if (!sessions.length) {
        lines.push(formatAgentUiNotice(host.translator, 'remoteCenterNoSessions'));
    }
    for (const session of sessions.slice(0, 60)) {
        const id = String(session?.id || '').trim();
        const label = String(session?.title || session?.summary || id || 'session').trim();
        const count = Number(session?.messageCount);
        const messages = Number.isFinite(count) ? ` · ${count}` : '';
        const archived = session?.archived ? ` [${panelLabel(host.translator, 'sessions', 'archived', 'archived')}]` : '';
        lines.push(`  ${label}${archived}${messages}${formatSessionAge(session?.updatedAt || session?.lastActiveAt)}`);
    }
    lines.push(formatAgentUiNotice(host.translator, 'remoteCenterSnapshotHint'));
    return lines;
}

function showCenter(host: AgentConsoleRemoteCenterHost, probe: AgentConsoleRemoteProbe): void {
    const lines = remoteSessionLines(host, probe);
    host.state.openTextOverlay(
        formatAgentUiNotice(host.translator, 'remoteCenterSessionsTitle', { name: probe.remote.name, count: probe.sessions.length }),
        lines,
        Math.min(24, lines.length)
    );
}

function showLocalList(host: AgentConsoleRemoteCenterHost, centers: AgentConsoleRemoteCenter[]): void {
    const lines = centers.length
        ? centers.map(center => `${center.name} · ${maskAgentConsoleRemoteUrl(center.url)}`)
        : [formatAgentUiNotice(host.translator, 'remoteCenterEmpty')];
    lines.push(formatAgentUiNotice(host.translator, 'remoteCenterUsage'));
    host.state.openTextOverlay(
        formatAgentUiNotice(host.translator, 'remoteCenterTitle'),
        lines,
        Math.min(24, lines.length)
    );
}

async function openCenterPicker(
    host: AgentConsoleRemoteCenterHost,
    centers: AgentConsoleRemoteCenter[],
    factory: AgentConsoleRemoteRpcFactory
): Promise<void> {
    if (!host.select) {
        showLocalList(host, centers);
        return;
    }
    const probes = await Promise.all(centers.map(center => probeAgentConsoleRemoteCenter(center, factory)));
    const picked = await host.select(
        formatAgentUiNotice(host.translator, 'remoteCenterTitle'),
        probes.map(probe => ({
            label: probe.ok
                ? formatAgentUiNotice(host.translator, 'remoteCenterReachable', { name: probe.remote.name, count: probe.sessions.length })
                : formatAgentUiNotice(host.translator, 'remoteCenterUnreachableLabel', { name: probe.remote.name }),
            value: probe.remote.name,
            description: probe.ok
                ? maskAgentConsoleRemoteUrl(probe.remote.url)
                : `${maskAgentConsoleRemoteUrl(probe.remote.url)} · ${probe.error || 'unreachable'}`
        })),
        0,
        formatAgentUiNotice(host.translator, 'remoteCenterPickerHint')
    );
    if (!picked) {
        return;
    }
    const probe = probes.find(entry => entry.remote.name === picked);
    if (!probe) {
        return;
    }
    if (!probe.ok) {
        host.notify(formatAgentUiNotice(host.translator, 'remoteCenterUnreachable', {
            name: probe.remote.name,
            error: probe.error || 'unreachable'
        }));
        return;
    }
    showCenter(host, probe);
}

export async function runRemotesCommand(
    host: AgentConsoleRemoteCenterHost,
    args: string,
    factory: AgentConsoleRemoteRpcFactory = defaultRpcFactory
): Promise<void> {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const verb = String(tokens[0] || '').toLowerCase();
    const centers = configuredCenters(host);

    if (verb === 'add') {
        const name = String(tokens[1] || '').trim();
        const url = String(tokens[2] || '').trim();
        const token = tokens.slice(3).join(' ').trim();
        const [candidate] = sanitizeAgentConsoleRemoteCenters([{ name, url, token }]);
        if (!candidate) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteCenterInvalid'));
            return;
        }
        if (centers.some(center => center.name.toLowerCase() === candidate.name.toLowerCase())) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteCenterExists', { name: candidate.name }));
            return;
        }
        await saveCenters(host, [...centers, candidate]);
        host.notify(formatAgentUiNotice(host.translator, 'remoteCenterAdded', { name: candidate.name }));
        return;
    }

    if (verb === 'remove' || verb === 'delete' || verb === 'rm') {
        const name = String(tokens[1] || '').trim();
        const next = centers.filter(center => center.name.toLowerCase() !== name.toLowerCase());
        if (next.length === centers.length) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteCenterMissing', { name }));
            return;
        }
        await saveCenters(host, next);
        host.notify(formatAgentUiNotice(host.translator, 'remoteCenterRemoved', { name }));
        return;
    }

    if (verb === 'cancel') {
        const name = String(tokens[1] || '').trim();
        const token = String(tokens[2] || '').trim();
        const center = centers.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (!center || !token) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteCancelUsage'));
            return;
        }
        const probe = await probeAgentConsoleRemoteCenter(center, factory);
        if (!probe.ok) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteCenterUnreachable', {
                name: center.name,
                error: probe.error || 'unreachable'
            }));
            return;
        }
        const target = resolveRemoteSessionTarget(probe.sessions, token);
        if (!target) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteSessionMissing', {
                session: token,
                name: center.name
            }));
            return;
        }
        if (host.select) {
            const picked = await host.select(
                formatAgentUiNotice(host.translator, 'remoteCancelTitle'),
                [
                    {
                        label: formatAgentUiNotice(host.translator, 'remoteCancelYes'),
                        value: 'cancel',
                        description: `${center.name} · ${target}`
                    },
                    { label: formatAgentUiNotice(host.translator, 'remoteCancelNo'), value: 'keep' }
                ],
                0,
                formatAgentUiNotice(host.translator, 'remoteCancelHint')
            );
            if (picked !== 'cancel') {
                return;
            }
        }
        try {
            const result = await factory(center).request('run.cancel', { sessionId: target });
            host.notify(formatAgentUiNotice(
                host.translator,
                result?.cancelled === true ? 'remoteTurnCancelled' : 'remoteTurnNotCancelled',
                { name: center.name, sessionId: target }
            ));
        } catch (error) {
            host.notify(formatAgentUiNotice(host.translator, 'failedRemoteCancel', {
                error: errorText(error)
            }));
        }
        return;
    }

    if (verb === 'list' || !verb) {
        if (!centers.length) {
            showLocalList(host, centers);
            return;
        }
        await openCenterPicker(host, centers, factory);
        return;
    }

    const named = centers.find(center => center.name.toLowerCase() === verb);
    if (named) {
        const probe = await probeAgentConsoleRemoteCenter(named, factory);
        if (!probe.ok) {
            host.notify(formatAgentUiNotice(host.translator, 'remoteCenterUnreachable', {
                name: named.name,
                error: probe.error || 'unreachable'
            }));
            return;
        }
        showCenter(host, probe);
        return;
    }

    host.notify(formatAgentUiNotice(host.translator, 'remoteCenterUsage'));
}

/** Adapt the command context to the remote-center host (read-only command). */
export function remoteCenterHost(ctx: CommandHandlerContext): AgentConsoleRemoteCenterHost {
    return {
        translator: ctx.translator,
        state: ctx.state as any,
        notify: (message: string) => ctx.notify(message),
        persistSettings: ctx.persistSettings ? (patch: Record<string, any>) => ctx.persistSettings!(patch) : undefined,
        select: ctx.select ? (title, options, index, hint) => ctx.select!(title, options as any, index, hint) : undefined
    };
}
