import { buildGitSnapshotDiffLines } from './AgentConsoleGitView';

export interface GitSnapshotCommandHost {
    state: any;
    sessionService?: any;
    notify(message: string): void;
    select(title: string, options: any[], index: number, hint?: string): Promise<string | undefined>;
}

export async function runGitSnapshotsCommand(host: GitSnapshotCommandHost, args: string): Promise<void> {
    const sessionId = host.state.sessionId;
    if (!sessionId || !host.sessionService) {
        host.notify('No current session for git snapshots.');
        return;
    }
    const parts = args.split(/\s+/).filter(Boolean);
    const operation = parts[0] || 'list';
    const ref = parts[1] || '';
    if (operation === 'revert' || operation === 'restore') {
        if (!ref) {
            host.notify('Usage: /git-snapshots revert <messageId>');
            return;
        }
        const confirmed = await host.select(
            `Revert working tree to snapshot of message ${ref}?`,
            [
                { label: 'revert', value: 'yes', detail: 'restore the working tree from this snapshot' },
                { label: 'cancel', value: 'no', detail: 'keep the current working tree' }
            ],
            1,
            host.state.consoleOptions.selectHint
        );
        if (confirmed !== 'yes') {
            return;
        }
        const result = await host.sessionService.revertGitStepSnapshot(sessionId, ref);
        if (result?.reverted === true) {
            host.notify(`Working tree reverted to snapshot of message ${ref}. Use /git-snapshots unrevert to restore.`);
        } else {
            host.notify(`Revert failed: ${String(result?.error || 'unknown error')}`);
        }
        return;
    }
    if (operation === 'unrevert') {
        const confirmed = await host.select(
            'Restore the working tree captured before the last git revert?',
            [
                { label: 'unrevert', value: 'yes', detail: 'restore the working tree' },
                { label: 'cancel', value: 'no', detail: 'keep the reverted working tree' }
            ],
            1,
            host.state.consoleOptions.selectHint
        );
        if (confirmed !== 'yes') {
            return;
        }
        const result = await host.sessionService.unrevertGitStepSnapshot(sessionId);
        if (result?.reverted === true) {
            host.notify('Working tree restored after last git revert.');
        } else {
            host.notify(`Unrevert failed: ${String(result?.error || 'unknown error')}`);
        }
        return;
    }
    if (operation === 'diff') {
        if (!ref) {
            host.notify('Usage: /git-snapshots diff <messageId|snapshotId>');
            return;
        }
        await openGitSnapshotDiff(host, ref);
        return;
    }
    if (operation !== 'list') {
        host.notify('Usage: /git-snapshots [list|diff <ref>|revert <messageId>|unrevert]');
        return;
    }
    await openGitSnapshotList(host);
}

export async function openGitSnapshotList(host: GitSnapshotCommandHost): Promise<void> {
    const sessionId = host.state.sessionId;
    if (!sessionId || !host.sessionService) {
        host.notify('No current session for git snapshots.');
        return;
    }
    const snapshots = await host.sessionService.listGitStepSnapshots(sessionId);
    if (!snapshots.length) {
        host.notify('No git step snapshots for the current session. Run an agent turn in a git workspace first.');
        return;
    }
    const choice = await host.select(
        `Git step snapshots (${snapshots.length})`,
        snapshots.map((snapshot: any, index: number) => {
            const label = String(snapshot.label || snapshot.messageId || `snapshot-${index + 1}`).trim();
            const createdAt = snapshot.timestamp ? ` · ${new Date(snapshot.timestamp).toLocaleString()}` : '';
            const ds = snapshot.diffStats;
            const diffLabel = ds ? ` · +${ds.totalAdditions}/-${ds.totalDeletions} (${ds.filesChanged} file${ds.filesChanged === 1 ? '' : 's'})` : '';
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
        host.notify('No current session for git snapshot diff.');
        return;
    }
    const diff = await host.sessionService.diffGitStepSnapshot(sessionId, ref);
    if (!diff) {
        host.notify(`No git step snapshot found for ${ref}.`);
        return;
    }
    const lines = buildGitSnapshotDiffLines(diff);
    if (!lines.length) {
        host.notify(`Snapshot ${ref} has no working tree changes to show.`);
        return;
    }
    const fileCount = Array.isArray(diff.files) ? diff.files.length : 0;
    host.state.closeReview();
    host.state.openGitSnapshotDetail(
        `git snapshot ${ref}`,
        lines,
        [`ref ${ref}`, fileCount ? `files ${fileCount}` : 'files -'].join(' · '),
        ref
    );
}

export async function revertGitSnapshotFromDetail(host: GitSnapshotCommandHost): Promise<void> {
    const ref = host.state.gitSnapshotCurrentRef;
    const sessionId = host.state.sessionId;
    if (!ref || !sessionId || !host.sessionService) {
        host.notify('No git snapshot selected for revert.');
        return;
    }
    const confirmed = await host.select(
        `Revert working tree to snapshot ${ref}?`,
        [
            { label: 'revert', value: 'yes', detail: 'restore the working tree from this snapshot' },
            { label: 'cancel', value: 'no', detail: 'keep the current working tree' }
        ],
        1,
        host.state.consoleOptions.selectHint
    );
    if (confirmed !== 'yes') {
        return;
    }
    const result = await host.sessionService.revertGitStepSnapshot(sessionId, ref);
    if (result?.reverted === true) {
        host.notify(`Working tree reverted to snapshot ${ref}. Use /git-snapshots unrevert to restore.`);
        host.state.closeGitSnapshotDetail();
    } else {
        host.notify(`Revert failed: ${String(result?.error || 'unknown error')}`);
    }
}
