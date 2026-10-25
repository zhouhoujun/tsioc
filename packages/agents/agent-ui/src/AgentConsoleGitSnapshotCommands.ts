import { buildGitSnapshotDiffLines } from './AgentConsoleGitView';
import { formatAgentPanelLabel as panelLabel, formatAgentUiDateTime, formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export interface GitSnapshotCommandHost {
    translator?: AgentUiTranslator | null;
    state: any;
    sessionService?: any;
    notify(message: string): void;
    select(title: string, options: any[], index: number, hint?: string): Promise<string | undefined>;
}

function gitSnapshotText(host: GitSnapshotCommandHost, key: string, fallback: string, params?: Record<string, any>): string {
    return panelLabel(host.translator, 'gitSnapshot', key, fallback, params);
}

export async function runGitSnapshotsCommand(host: GitSnapshotCommandHost, args: string): Promise<void> {
    const sessionId = host.state.sessionId;
    if (!sessionId || !host.sessionService) {
        host.notify(formatAgentUiNotice(host.translator, 'noCurrentSessionGitSnapshots'));
        return;
    }
    const parts = args.split(/\s+/).filter(Boolean);
    const operation = parts[0] || 'list';
    const ref = parts[1] || '';
    if (operation === 'revert' || operation === 'restore') {
        if (!ref) {
            host.notify(formatAgentUiNotice(host.translator, 'gitSnapshotsRevertUsage'));
            return;
        }
        const confirmed = await host.select(
            formatAgentUiNotice(host.translator, 'gitSnapshotRevertMessageConfirm', { ref: ref }),
            [
                { label: gitSnapshotText(host, 'revertAction', 'revert'), value: 'yes', detail: gitSnapshotText(host, 'revertActionDetail', 'restore the working tree from this snapshot') },
                { label: gitSnapshotText(host, 'cancelAction', 'cancel'), value: 'no', detail: gitSnapshotText(host, 'cancelKeepCurrent', 'keep the current working tree') }
            ],
            1,
            host.state.consoleOptions.selectHint
        );
        if (confirmed !== 'yes') {
            return;
        }
        const result = await host.sessionService.revertGitStepSnapshot(sessionId, ref);
        if (result?.reverted === true) {
            host.notify(formatAgentUiNotice(host.translator, 'workingTreeRevertedMessage', { ref: ref }));
        } else {
            host.notify(formatAgentUiNotice(host.translator, 'revertFailed', { error: String(result?.error || 'unknown error') }));
        }
        return;
    }
    if (operation === 'unrevert') {
        const confirmed = await host.select(
            formatAgentUiNotice(host.translator, 'gitSnapshotRestoreConfirm'),
            [
                { label: gitSnapshotText(host, 'unrevertAction', 'unrevert'), value: 'yes', detail: gitSnapshotText(host, 'unrevertActionDetail', 'restore the working tree') },
                { label: gitSnapshotText(host, 'cancelAction', 'cancel'), value: 'no', detail: gitSnapshotText(host, 'cancelKeepReverted', 'keep the reverted working tree') }
            ],
            1,
            host.state.consoleOptions.selectHint
        );
        if (confirmed !== 'yes') {
            return;
        }
        const result = await host.sessionService.unrevertGitStepSnapshot(sessionId);
        if (result?.reverted === true) {
            host.notify(formatAgentUiNotice(host.translator, 'workingTreeRestored'));
        } else {
            host.notify(formatAgentUiNotice(host.translator, 'unrevertFailed', { error: String(result?.error || 'unknown error') }));
        }
        return;
    }
    if (operation === 'diff') {
        if (!ref) {
            host.notify(formatAgentUiNotice(host.translator, 'gitSnapshotsDiffUsage'));
            return;
        }
        await openGitSnapshotDiff(host, ref);
        return;
    }
    if (operation !== 'list') {
        host.notify(formatAgentUiNotice(host.translator, 'gitSnapshotsUsage'));
        return;
    }
    await openGitSnapshotList(host);
}

export async function openGitSnapshotList(host: GitSnapshotCommandHost): Promise<void> {
    const sessionId = host.state.sessionId;
    if (!sessionId || !host.sessionService) {
        host.notify(formatAgentUiNotice(host.translator, 'noCurrentSessionGitSnapshots'));
        return;
    }
    const snapshots = await host.sessionService.listGitStepSnapshots(sessionId);
    if (!snapshots.length) {
        host.notify(formatAgentUiNotice(host.translator, 'gitStepSnapshots'));
        return;
    }
    const choice = await host.select(
        gitSnapshotText(host, 'listTitle', 'Git step snapshots ({count})', { count: snapshots.length }),
        snapshots.map((snapshot: any, index: number) => {
            const label = String(snapshot.label || snapshot.messageId || `snapshot-${index + 1}`).trim();
            const createdAt = snapshot.timestamp ? ` · ${formatAgentUiDateTime(snapshot.timestamp, host.translator)}` : '';
            const ds = snapshot.diffStats;
            const diffLabel = ds
                ? gitSnapshotText(host, 'diffLabel', ' · +{additions}/-{deletions} ({files})', {
                    additions: ds.totalAdditions, deletions: ds.totalDeletions,
                    files: ds.filesChanged === 1
                        ? gitSnapshotText(host, 'fileOne', '{count} file', { count: ds.filesChanged })
                        : gitSnapshotText(host, 'files', '{count} files', { count: ds.filesChanged })
                })
                : '';
            return {
                label: `${label}${createdAt}${diffLabel}`,
                value: String(snapshot.messageId || snapshot.id || index),
                detail: String(snapshot.id || '')
            };
        }),
        0,
        host.state.consoleOptions.selectHint
    );
    if (!choice) {
        return;
    }
    await openGitSnapshotDiff(host, choice);
}

export async function openGitSnapshotDiff(host: GitSnapshotCommandHost, ref: string): Promise<void> {
    const sessionId = host.state.sessionId;
    if (!sessionId || !host.sessionService) {
        host.notify(formatAgentUiNotice(host.translator, 'noCurrentSessionGitDiff'));
        return;
    }
    const diff = await host.sessionService.diffGitStepSnapshot(sessionId, ref);
    if (!diff) {
        host.notify(formatAgentUiNotice(host.translator, 'gitStepSnapshot', { ref: ref }));
        return;
    }
    const lines = buildGitSnapshotDiffLines(diff);
    if (!lines.length) {
        host.notify(formatAgentUiNotice(host.translator, 'snapshotHasWorking', { ref: ref }));
        return;
    }
    const fileCount = Array.isArray(diff.files) ? diff.files.length : 0;
    host.state.closeReview();
    host.state.openGitSnapshotDetail(
        gitSnapshotText(host, 'detailTitle', 'git snapshot {ref}', { ref: ref }),
        lines,
        [
            gitSnapshotText(host, 'refLine', 'ref {ref}', { ref: ref }),
            fileCount ? gitSnapshotText(host, 'filesLine', 'files {count}', { count: fileCount }) : gitSnapshotText(host, 'filesUnknown', 'files -')
        ].join(' · '),
        ref
    );
}

export async function revertGitSnapshotFromDetail(host: GitSnapshotCommandHost): Promise<void> {
    const ref = host.state.gitSnapshotCurrentRef;
    const sessionId = host.state.sessionId;
    if (!ref || !sessionId || !host.sessionService) {
        host.notify(formatAgentUiNotice(host.translator, 'gitSnapshotSelected'));
        return;
    }
    const confirmed = await host.select(
        formatAgentUiNotice(host.translator, 'gitSnapshotRevertRefConfirm', { ref: ref }),
        [
            { label: gitSnapshotText(host, 'revertAction', 'revert'), value: 'yes', detail: gitSnapshotText(host, 'revertActionDetail', 'restore the working tree from this snapshot') },
            { label: gitSnapshotText(host, 'cancelAction', 'cancel'), value: 'no', detail: gitSnapshotText(host, 'cancelKeepCurrent', 'keep the current working tree') }
        ],
        1,
        host.state.consoleOptions.selectHint
    );
    if (confirmed !== 'yes') {
        return;
    }
    const result = await host.sessionService.revertGitStepSnapshot(sessionId, ref);
    if (result?.reverted === true) {
        host.notify(formatAgentUiNotice(host.translator, 'workingTreeRevertedSnapshot', { ref: ref }));
        host.state.closeGitSnapshotDetail();
    } else {
        host.notify(formatAgentUiNotice(host.translator, 'revertFailed', { error: String(result?.error || 'unknown error') }));
    }
}
