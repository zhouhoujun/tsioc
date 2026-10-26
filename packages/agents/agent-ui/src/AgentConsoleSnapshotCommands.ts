import { formatAgentUiNotice, formatAgentPanelLabel as panelLabel, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * `/snapshots` — list / restore / delete session snapshots.
 *
 * Extracted from `AgentConsoleCommandHandlers` (source-size ratchet). Without
 * arguments it opens the two-step picker; `restore <id>` / `delete <id>` act
 * directly, accepting an exact id or an unambiguous prefix (the transcript
 * shows truncated ids).
 */
export interface SnapshotCommandHost {
    translator?: AgentUiTranslator | null;
    state: { sessionId: string; consoleOptions: { selectHint?: string } };
    sessionService: {
        listSessionSnapshots(sessionId: string): Promise<Array<Record<string, any>>>;
        restoreSessionSnapshot(sessionId: string, snapshotId: string): Promise<void>;
        deleteSessionSnapshot(sessionId: string, snapshotId: string): Promise<void>;
    };
    select(
        title: string,
        options: Array<{ label: string; value: string; detail?: string }>,
        initialIndex?: number,
        hint?: string
    ): Promise<string | undefined>;
    refreshSessions(): Promise<void>;
    openSession(sessionId: string): Promise<void>;
    notify(message: string): void;
}

export async function runSnapshotsCommand(host: SnapshotCommandHost, args: string): Promise<boolean> {
    const snapshotSessionId = host.state.sessionId;
    if (!snapshotSessionId || !host.sessionService) {
        host.notify(formatAgentUiNotice(host.translator, 'currentSessionSnapshots'));
        return true;
    }
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const verb = (tokens[0] || '').toLowerCase();
    const requestedId = String(tokens[1] || '').trim();
    if (verb && !['list', 'restore', 'delete'].includes(verb)) {
        throw new Error(formatAgentUiNotice(host.translator, 'snapshotsUsage'));
    }
    // `/snapshots restore <id>` used to ignore its arguments and always open
    // the picker; restore/delete by id is scriptable and matches the registry
    // description.
    if (verb === 'restore' || verb === 'delete') {
        if (!requestedId) {
            throw new Error(formatAgentUiNotice(host.translator, 'snapshotsUsage'));
        }
        const candidates = await host.sessionService.listSessionSnapshots(snapshotSessionId);
        const exact = candidates.find(snapshot => String(snapshot.snapshotId) === requestedId);
        const prefixed = exact ? [] : candidates.filter(snapshot => String(snapshot.snapshotId).startsWith(requestedId));
        const target = exact ?? (prefixed.length === 1 ? prefixed[0] : undefined);
        if (!target) {
            throw new Error(formatAgentUiNotice(host.translator, 'snapshotNotFound', { id: requestedId }));
        }
        const targetId = String(target.snapshotId);
        if (verb === 'restore') {
            await host.sessionService.restoreSessionSnapshot(snapshotSessionId, targetId);
            await host.refreshSessions();
            await host.openSession(snapshotSessionId);
            host.notify(formatAgentUiNotice(host.translator, 'snapshotRestored'));
        } else {
            await host.sessionService.deleteSessionSnapshot(snapshotSessionId, targetId);
            host.notify(formatAgentUiNotice(host.translator, 'snapshotDeleted'));
        }
        return true;
    }
    const snapshots = await host.sessionService.listSessionSnapshots(snapshotSessionId);
    if (!snapshots.length) {
        host.notify(formatAgentUiNotice(host.translator, 'snapshotsCurrentSession'));
        return true;
    }
    const choice = await host.select(
        panelLabel(host.translator, 'select', 'snapshots', 'Snapshots ({count})', { count: snapshots.length }),
        snapshots.map((snapshot, index) => ({
            label: `${String(snapshot.label || panelLabel(host.translator, 'select', 'snapshotDefault', 'snapshot')).trim()} · ${panelLabel(host.translator, 'select', 'snapshotMessages', '{count} msgs', { count: snapshot.messageCount ?? 0 })}${snapshot.summary ? ` · ${snapshot.summary}` : ''}`,
            value: String(snapshot.snapshotId || index),
            detail: snapshot.snapshotId
        })),
        0,
        host.state.consoleOptions.selectHint
    );
    if (!choice) {
        return true;
    }
    const action = await host.select(
        panelLabel(host.translator, 'select', 'snapshotAction', 'Snapshot action'),
        [
            { label: panelLabel(host.translator, 'select', 'restore', 'restore'), value: 'restore', detail: panelLabel(host.translator, 'select', 'restoreDescription', 'replace current transcript with this snapshot') },
            { label: panelLabel(host.translator, 'select', 'deleteSnapshot', 'delete'), value: 'delete', detail: panelLabel(host.translator, 'select', 'deleteSnapshotDescription', 'remove this snapshot') }
        ],
        0,
        host.state.consoleOptions.selectHint
    );
    if (!action) {
        return true;
    }
    if (action === 'restore') {
        await host.sessionService.restoreSessionSnapshot(snapshotSessionId, choice);
        await host.refreshSessions();
        await host.openSession(snapshotSessionId);
        host.notify(formatAgentUiNotice(host.translator, 'snapshotRestored'));
    } else {
        await host.sessionService.deleteSessionSnapshot(snapshotSessionId, choice);
        host.notify(formatAgentUiNotice(host.translator, 'snapshotDeleted'));
    }
    return true;
}
