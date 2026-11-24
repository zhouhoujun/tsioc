import type { AgentSessionProjectMetadata, SessionStore } from '../memory/SessionStore';
import type { DelegationEdgeStatus, DelegationGraphStore } from '../harness/DelegationGraphStore';

export interface DelegationSessionHost {
    sessions: SessionStore;
    delegationGraph?: DelegationGraphStore;
    isTurnActive(sessionId: string): boolean;
    cancelApprovals(sessionId: string): void;
    cancelTurn(sessionId: string): void;
    rollback(sessionId: string, reason: 'cancelled' | 'error'): Promise<unknown>;
}

/**
 * Parent/child session hierarchy: registration, delegation graph edges, worker
 * thread annotation and cascading cancellation of child turns.
 */
export class DelegationSessionController {
    readonly childSessions = new Map<string, Set<string>>();

    constructor(private readonly host: DelegationSessionHost) {
    }

    register(parentSessionId: string, childSessionId: string, metadata?: Record<string, any>): void {
        const children = this.childSessions.get(parentSessionId) ?? new Set<string>();
        children.add(childSessionId);
        this.childSessions.set(parentSessionId, children);
        this.recordEdge(parentSessionId, childSessionId, metadata);
        this.annotateChildSession(parentSessionId, childSessionId, metadata);
    }

    unregister(parentSessionId: string, childSessionId: string, status?: DelegationEdgeStatus): void {
        const children = this.childSessions.get(parentSessionId);
        if (!children) {
            return;
        }
        children.delete(childSessionId);
        if (!children.size) {
            this.childSessions.delete(parentSessionId);
        }
        this.closeEdge(parentSessionId, childSessionId, status ?? 'completed');
        this.annotateChildThreadStatus(childSessionId, status ?? 'completed');
    }

    async cancelChildren(sessionId: string): Promise<void> {
        const children = this.childSessions.get(sessionId);
        if (!children?.size) {
            return;
        }
        for (const childSessionId of Array.from(children)) {
            if (!this.host.isTurnActive(childSessionId)) {
                continue;
            }
            this.host.cancelApprovals(childSessionId);
            this.host.cancelTurn(childSessionId);
            this.closeEdge(sessionId, childSessionId, 'cancelled');
            this.annotateChildThreadStatus(childSessionId, 'cancelled');
            await this.host.rollback(childSessionId, 'cancelled');
            await this.cancelChildren(childSessionId);
        }
    }

    private recordEdge(parentSessionId: string, childSessionId: string, metadata?: Record<string, any>): void {
        if (!this.host.delegationGraph) {
            return;
        }
        this.host.delegationGraph.append({
            parentSessionId,
            childSessionId,
            kind: 'nested',
            status: 'active',
            metadata
        }).catch(() => {
            // delegation graph persistence must not break session hierarchy tracking
        });
    }

    private closeEdge(parentSessionId: string, childSessionId: string, status: DelegationEdgeStatus): void {
        if (!this.host.delegationGraph) {
            return;
        }
        this.host.delegationGraph.markClosed(parentSessionId, childSessionId, status).catch(() => {
            // delegation graph persistence must not break session hierarchy tracking
        });
    }

    /**
     * Best-effort thread annotation for spawned worker sessions: the child is
     * marked with `sessionRole: 'worker'` and linked back to the parent's
     * origin thread (the parent `primaryThreadId`, falling back to the parent
     * session id), and its focus summary defaults to the delegation goal. This
     * lets the derived thread index group delegated sessions without requiring
     * explicit metadata. Existing explicit fields are preserved; a child with
     * an explicit non-worker role is left untouched. The write is
     * fire-and-forget: annotation must never break the delegation flow.
     */
    private annotateChildSession(parentSessionId: string, childSessionId: string, metadata?: Record<string, any>): void {
        void (async () => {
            try {
                const parent = await this.host.sessions.get(parentSessionId);
                const child = await this.host.sessions.get(childSessionId);
                const explicitRole = String(child.sessionRole || '').trim();
                if (explicitRole && explicitRole !== 'worker') {
                    return;
                }
                const goal = typeof metadata?.goal === 'string' ? metadata.goal.trim() : '';
                await this.mergeProjectMetadata(childSessionId, {
                    originThreadId: String(parent.primaryThreadId || '').trim() || parentSessionId,
                    sessionRole: 'worker',
                    focusSummary: goal || undefined
                });
            } catch {
                // worker session annotation must not break the delegation flow
            }
        })();
    }

    /**
     * Best-effort thread status annotation when a delegation edge closes:
     * maps the edge outcome onto the worker thread status so the derived
     * thread index reflects finished workers (`completed` → completed,
     * `failed` → blocked, `cancelled` → abandoned). Fire-and-forget like the
     * sibling annotations: it must never break the delegation flow.
     */
    private annotateChildThreadStatus(childSessionId: string, status: DelegationEdgeStatus): void {
        const threadStatus = status === 'completed' ? 'completed'
            : status === 'failed' ? 'blocked'
            : status === 'cancelled' ? 'abandoned' : undefined;
        if (!threadStatus) {
            return;
        }
        void (async () => {
            try {
                await this.mergeProjectMetadata(childSessionId, { threadStatus });
            } catch {
                // worker thread status annotation must not break the delegation flow
            }
        })();
    }

    /**
     * Read-modify-write merge of project metadata: existing explicit fields
     * win, the patch only fills gaps. `setProjectMetadata` overwrites the
     * whole metadata block, so without the merge the annotation would clear
     * fields that were set earlier (e.g. a pre-existing projectId).
     */
    private async mergeProjectMetadata(sessionId: string, patch: AgentSessionProjectMetadata): Promise<void> {
        const existing = await this.host.sessions.get(sessionId);
        await this.host.sessions.setProjectMetadata(sessionId, {
            projectId: existing.projectId ?? patch.projectId,
            primaryThreadId: existing.primaryThreadId ?? patch.primaryThreadId,
            originThreadId: existing.originThreadId ?? patch.originThreadId,
            sessionRole: existing.sessionRole ?? patch.sessionRole,
            rootRequest: existing.rootRequest ?? patch.rootRequest,
            focusSummary: existing.focusSummary ?? patch.focusSummary,
            threadStatus: existing.threadStatus ?? patch.threadStatus
        });
    }
}
