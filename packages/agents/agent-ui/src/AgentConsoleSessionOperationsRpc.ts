import { formatAgentUiNotice } from './agent-ui.i18n';
import { AgentConsoleSessionDiagnosticsRpc } from './AgentConsoleSessionDiagnosticsRpc';

/** Session mutation, snapshot, background-task and voice RPC facade. */
export abstract class AgentConsoleSessionOperationsRpc extends AgentConsoleSessionDiagnosticsRpc {
    async deleteSession(sessionId: string, context?: any): Promise<void> {
        if (!sessionId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.delete', { sessionId }, context);
            return;
        }
        await this.sessionStore?.delete(sessionId);
    }

    async setSessionTitle(sessionId: string, title?: string, context?: any): Promise<void> {
        if (!sessionId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.set_title', { sessionId, title }, context);
            return;
        }
        await this.sessionStore?.setTitle(sessionId, title);
    }

    async setSessionPinned(sessionId: string, pinned: boolean, context?: any): Promise<void> {
        if (!sessionId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.set_pinned', { sessionId, pinned }, context);
            return;
        }
        await this.sessionStore?.setPinned(sessionId, pinned);
    }

    async setSessionArchived(sessionId: string, archived: boolean, context?: any): Promise<void> {
        if (!sessionId) return;
        if (this.appRpc) {
            await this.appRpc.request('session.set_archived', { sessionId, archived }, context);
            return;
        }
        await this.sessionStore?.setArchived(sessionId, archived);
    }

    async forkSession(sessionId: string, messageId?: string, forkSessionId?: string, context?: any): Promise<string> {
        if (!sessionId) return '';
        if (this.appRpc) {
            const result = await this.appRpc.request('session.fork', { sessionId, ...(messageId ? { messageId } : {}), ...(forkSessionId ? { forkSessionId } : {}) }, context);
            return String(result?.sessionId || '');
        }
        const state = await this.sessionStore?.fork(sessionId, messageId, forkSessionId);
        return String(state?.sessionId || '');
    }

    async createSessionSnapshot(sessionId: string, label?: string, context?: any): Promise<string> {
        if (!sessionId) {
            return '';
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.snapshot.create', { sessionId, label }, context);
            return String(result?.snapshotId || '');
        }
        return this.sessionStore?.snapshot(sessionId, label) ?? '';
    }

    async listSessionSnapshots(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!sessionId) {
            return [];
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.snapshot.list', { sessionId }, context);
            return Array.isArray(result) ? result : [];
        }
        return this.sessionStore?.listSnapshots(sessionId) ?? [];
    }

    async restoreSessionSnapshot(sessionId: string, snapshotId: string, context?: any): Promise<void> {
        if (!sessionId || !snapshotId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.snapshot.restore', { sessionId, snapshotId }, context);
            return;
        }
        await this.sessionStore?.restoreSnapshot(sessionId, snapshotId);
    }

    async deleteSessionSnapshot(sessionId: string, snapshotId: string, context?: any): Promise<void> {
        if (!sessionId || !snapshotId) {
            return;
        }
        if (this.appRpc) {
            await this.appRpc.request('session.snapshot.delete', { sessionId, snapshotId }, context);
            return;
        }
        await this.sessionStore?.deleteSnapshot(sessionId, snapshotId);
    }

    async listGitStepSnapshots(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!sessionId) {
            return [];
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.list', { sessionId }, context);
            return Array.isArray(result) ? result : [];
        }
        if (this.runtime && typeof this.runtime.listGitStepSnapshots === 'function') {
            return await this.runtime.listGitStepSnapshots(sessionId) ?? [];
        }
        return [];
    }

    async diffGitStepSnapshot(sessionId: string, ref: string, context?: any): Promise<Record<string, any> | null> {
        if (!sessionId || !ref) {
            return null;
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.diff', { sessionId, ref }, context);
            return result && typeof result === 'object' ? result : null;
        }
        if (this.runtime && typeof this.runtime.diffGitStepSnapshot === 'function') {
            return await this.runtime.diffGitStepSnapshot(sessionId, ref) ?? null;
        }
        return null;
    }

    async revertGitStepSnapshot(sessionId: string, messageId: string, context?: any): Promise<Record<string, any>> {
        if (!sessionId || !messageId) {
            return { reverted: false, error: 'sessionId and messageId are required' };
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.revert', { sessionId, messageId }, context);
            return result && typeof result === 'object' ? result : { reverted: false };
        }
        if (this.runtime && typeof this.runtime.revertGitStepSnapshot === 'function') {
            return this.runtime.revertGitStepSnapshot(sessionId, messageId) ?? { reverted: false };
        }
        return { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    async unrevertGitStepSnapshot(sessionId: string, context?: any): Promise<Record<string, any>> {
        if (!sessionId) {
            return { reverted: false, error: 'sessionId is required' };
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.git_snapshot.unrevert', { sessionId }, context);
            return result && typeof result === 'object' ? result : { reverted: false };
        }
        if (this.runtime && typeof this.runtime.unrevertGitStepSnapshot === 'function') {
            return this.runtime.unrevertGitStepSnapshot(sessionId) ?? { reverted: false };
        }
        return { reverted: false, error: 'git step snapshots not supported by this runtime' };
    }

    async cancelTurn(sessionId: string, context?: any): Promise<boolean> {
        if (!sessionId) {
            return false;
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('run.cancel', { sessionId }, context);
            return result?.cancelled === true;
        }
        if (this.runtime && typeof this.runtime.cancelTurn === 'function') {
            const result = await this.runtime.cancelTurn(sessionId);
            return result.cancelled === true;
        }
        return false;
    }

    /**
     * Force a context compaction for the session (backs the `/compact`
     * command). Prefers the gateway RPC when connected, falls back to the
     * local runtime's `compactNow` (e.g. in-process / TUI consumers).
     */
    async compactSession(sessionId: string, reason?: string, context?: any): Promise<Record<string, any>> {
        if (!sessionId) {
            return { sessionId: '', compacted: false, error: 'session-id-required' };
        }
        if (this.appRpc) {
            const result = await this.appRpc.request('session.compact', { sessionId, reason }, context);
            return result && typeof result === 'object' ? result : { sessionId, compacted: false };
        }
        if (this.runtime && typeof this.runtime.compactNow === 'function') {
            const result = await this.runtime.compactNow(sessionId, reason);
            return result ?? { sessionId, compacted: false };
        }
        return { sessionId, compacted: false, error: 'compaction not supported by this runtime' };
    }

    /**
     * Lists background tasks over RPC. Pass `delegationRoot` to aggregate every
     * task in the delegation tree below that session, or `sessionId` to scope to
     * one session. Returns the gateway page shape.
     */
    async listBackgroundTasks(options?: { sessionId?: string; delegationRoot?: string; cursor?: string; limit?: number }, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        return this.appRpc.request('background_task.list', options ?? {}, context) ?? null;
    }

    /** Reads every background-task page needed by collaboration projections. */
    async listAllBackgroundTasks(options: { sessionId?: string; delegationRoot?: string }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const items: Array<Record<string, any>> = [];
        const seenCursors = new Set<string>();
        let cursor: string | undefined;
        for (let page = 0; page < 20; page += 1) {
            const result = await this.listBackgroundTasks({ ...options, ...(cursor ? { cursor } : {}), limit: 500 }, context);
            items.push(...(Array.isArray(result?.items) ? result.items : []));
            const nextCursor = typeof result?.nextCursor === 'string' && result.nextCursor
                ? result.nextCursor
                : undefined;
            if (!result?.hasMore || !nextCursor || seenCursors.has(nextCursor)) {
                break;
            }
            seenCursors.add(nextCursor);
            cursor = nextCursor;
        }
        return items;
    }

    /**
     * Cancels background tasks by id (batch, best-effort) over RPC. Returns
     * `{ taskIds, cancelled }` from the gateway.
     */
    async cancelBackgroundTasks(taskIds: string[], context?: any): Promise<{ taskIds: string[]; cancelled: string[] } | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('background_task.cancel', { taskIds }, context);
        return result && Array.isArray(result.cancelled)
            ? { taskIds: Array.isArray(result.taskIds) ? result.taskIds : taskIds, cancelled: result.cancelled }
            : null;
    }

    async getVoiceStatus(sessionId?: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc) {
            return { available: false, active: false, bufferedBytes: 0 };
        }
        const result = await this.appRpc.request('audio.status', sessionId ? { sessionId } : {}, context);
        return result ?? { available: false, active: false, bufferedBytes: 0 };
    }

    async startVoiceSession(
        sessionId: string,
        options?: { format?: 'pcm16k' | 'wav' | 'webm' },
        context?: any
    ): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await this.appRpc.request('audio.start', { sessionId, ...options }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    async feedVoiceAudio(sessionId: string, chunk: Uint8Array, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        const base64 = this.encodeBase64(chunk);
        return (await this.appRpc.request('audio.feed', { sessionId, chunk: base64 }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    async endVoiceSession(sessionId: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await this.appRpc.request('audio.end', { sessionId }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    async cancelVoiceSession(sessionId: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc || !sessionId) {
            return { ok: false, error: 'voice session requires a connected gateway and sessionId' };
        }
        return (await this.appRpc.request('audio.cancel', { sessionId }, context)) ?? { ok: false, error: 'no response from gateway' };
    }

    protected encodeBase64(bytes: Uint8Array): string {
        const runtimeBuffer = (globalThis as { Buffer?: { from(value: Uint8Array): { toString(encoding: string): string } } }).Buffer;
        if (runtimeBuffer) return runtimeBuffer.from(bytes).toString('base64');
        if (typeof globalThis.btoa === 'function') {
            let binary = '';
            const chunkSize = 0x8000;
            for (let index = 0; index < bytes.length; index += chunkSize) {
                const slice = bytes.subarray(index, index + chunkSize);
                binary += String.fromCharCode(...Array.from(slice));
            }
            return globalThis.btoa(binary);
        }
        throw new Error(formatAgentUiNotice(undefined, 'base64EncodingUnavailable'));
    }
}
