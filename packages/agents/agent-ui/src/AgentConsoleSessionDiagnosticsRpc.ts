import {
    AgentRuntime,
    SessionStore,
    TurnDiagnosticsStore,
    buildUsageSummary,
    collectMessageUsageRecords,
    collectTurnUsageRecords,
    AgentConsoleAppRpc
} from '@tsdi/agent';

/** Analytics, harness profile and delegation RPC facade for the session service. */
export abstract class AgentConsoleSessionDiagnosticsRpc {
    protected abstract appRpc?: AgentConsoleAppRpc | null;
    protected abstract sessionStore?: SessionStore | null;
    protected abstract runtime?: AgentRuntime | null;
    protected abstract turnDiagnostics?: TurnDiagnosticsStore | null;

    async listSummaryQuality(options?: { provider?: string; limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.list', options ?? {}, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    async getSummaryQualityStats(provider?: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.stats', provider ? { provider } : {}, context);
        return Array.isArray(result?.aggregates) ? result.aggregates : [];
    }

    async getSummaryQualityTrend(options?: { provider?: string; limit?: number; bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.trend', options ?? {}, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    async listSummaryQualityRecords(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('summary_quality.records', { sessionId }, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    async getSummaryQualityAggregate(sessionId?: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc) {
            return {};
        }
        const result = await this.appRpc.request('summary_quality.aggregate', sessionId ? { sessionId } : {}, context);
        return result?.aggregate ?? {};
    }

    async listCompactionHistory(sessionId: string, options?: { level?: string; limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.list', { sessionId, ...options }, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    async listTurnDiagnosticsRecords(sessionId: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('turn_diagnostics.list', { sessionId }, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    async getCompactionHistoryAggregate(sessionId?: string, context?: any): Promise<Record<string, any>> {
        if (!this.appRpc) {
            return {};
        }
        const result = await this.appRpc.request('compaction_history.aggregate', sessionId ? { sessionId } : {}, context);
        return result?.aggregate ?? {};
    }

    async listCompactionHistoryTrend(options: { sessionId?: string; bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.trend', options, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    async listTurnDiagnosticsTrend(options: { sessionId?: string; bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('turn_diagnostics.trend', options, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    /**
     * Fetches per-session compaction aggregates over RPC. `sessionId` is
     * optional: when provided the result is scoped to that session (and the
     * caller must own it), otherwise all sessions are aggregated.
     */
    async getCompactionHistoryStats(sessionId?: string, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.stats', sessionId ? { sessionId } : {}, context);
        return Array.isArray(result?.aggregates) ? result.aggregates : [];
    }

    /**
     * Fetches time-bucketed compaction trends over RPC. `sessionId` is
     * optional: when provided the trend is scoped to that session (and the
     * caller must own it), otherwise every session gets its own trend line.
     */
    async getCompactionHistoryTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('compaction_history.trend', { ...(sessionId ? { sessionId } : {}), ...options }, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    /**
     * Fetches persisted turn diagnostics records over RPC. `sessionId` is
     * required and the caller must own the session.
     */
    async listTurnDiagnostics(sessionId: string, options?: { limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('turn_diagnostics.list', { sessionId, ...options }, context);
        return Array.isArray(result?.records) ? result.records : [];
    }

    /**
     * Fetches aggregated turn diagnostics over RPC. `sessionId` is optional:
     * when provided the aggregate is scoped to that session (and the caller
     * must own it), otherwise it covers every session owned by the principal.
     */
    async getTurnDiagnosticsStats(sessionId?: string, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('turn_diagnostics.stats', sessionId ? { sessionId } : {}, context);
        return result?.aggregate ?? null;
    }

    /**
     * Fetches time-bucketed turn diagnostics trends over RPC. `sessionId` is
     * optional: when provided the trend is scoped to that session (and the
     * caller must own it), otherwise every owned session gets its own trend
     * line.
     */
    async getTurnDiagnosticsTrend(sessionId?: string, options?: { bucketSize?: number; maxBuckets?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('turn_diagnostics.trend', { ...(sessionId ? { sessionId } : {}), ...options }, context);
        return Array.isArray(result?.trend) ? result.trend : [];
    }

    /**
     * Runs a harness failure-pattern audit over RPC. `sessionId` is optional:
     * when provided the audit is scoped to that session (and the caller must
     * own it), otherwise it covers every session owned by the principal.
     */
    async runHarnessAudit(sessionId?: string, options?: { since?: number; topN?: number; failureRateThreshold?: number; minFailures?: number }, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('harness.audit', { ...(sessionId ? { sessionId } : {}), ...options }, context);
        return result?.report ?? null;
    }

    /**
     * Lists the builtin harness profiles plus the active reference.
     */
    async listHarnessProfiles(context?: any): Promise<{ profiles: any[]; current?: string }> {
        if (this.appRpc) {
            const result = await this.appRpc.request('harness.profile.list', {}, context);
            return result ?? { profiles: [] };
        }
        return { profiles: [] };
    }

    /**
     * Resolves the effective harness profile (builtin reference or live snapshot).
     */
    async currentHarnessProfile(context?: any): Promise<any | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('harness.profile.current', {}, context);
        return result?.profile ?? null;
    }

    /**
     * Diffs two harness profiles (builtin names or `current`).
     */
    async diffHarnessProfiles(from: string, to: string, context?: any): Promise<{ from?: string; to?: string; diff?: string[]; error?: string } | null> {
        if (!this.appRpc) {
            return null;
        }
        return this.appRpc.request('harness.profile.diff', { from, to }, context) ?? null;
    }

    async getUsageStats(sessionId?: string, optionsOrContext: { range?: 'daily' | 'weekly' | 'cumulative'; since?: number | string } | any = {}, context?: any): Promise<Record<string, any>> {
        const hasUsageOptions = optionsOrContext && typeof optionsOrContext === 'object'
            && (Object.prototype.hasOwnProperty.call(optionsOrContext, 'range') || Object.prototype.hasOwnProperty.call(optionsOrContext, 'since'));
        const options = (hasUsageOptions ? optionsOrContext : {}) as { range?: 'daily' | 'weekly' | 'cumulative'; since?: number | string };
        const requestContext = hasUsageOptions ? context : optionsOrContext;
        if (this.appRpc) {
            const result = await this.appRpc.request('usage.stats', { ...(sessionId ? { sessionId } : {}), ...options }, requestContext);
            return { ...(result?.usage ?? buildUsageSummary([])), ...(result?.range ? { selectedRange: result.range, selected: result.selected, since: result.since } : {}) };
        }
        const sessionIds = sessionId
            ? [sessionId]
            : this.sessionStore
                ? await this.sessionStore.listSessionIds()
                : [];
        const usageRecords: Array<ReturnType<typeof collectMessageUsageRecords>[number]> = [];
        for (const id of sessionIds) {
            const state = this.sessionStore
                ? await this.sessionStore.get(id)
                : undefined;
            const messages = state?.messages
                ?? (this.runtime && sessionIds.length === 1 ? await this.runtime.getMessages(id) : []);
            const since = options.since == null ? undefined : typeof options.since === 'number' ? options.since : Date.parse(options.since);
            usageRecords.push(...collectMessageUsageRecords(id, messages || []).filter(record => !since || record.createdAt >= since));
        }
        const since = options.since == null ? undefined : typeof options.since === 'number' ? options.since : Date.parse(options.since);
        const turnRecords = this.turnDiagnostics
            ? collectTurnUsageRecords((await this.turnDiagnostics.list()).filter(record => (!sessionId || record.sessionId === sessionId) && (!since || record.createdAt >= since)))
            : undefined;
        const usage = buildUsageSummary(usageRecords, turnRecords);
        return { ...usage, ...(options.range ? { selectedRange: options.range, selected: usage[options.range] } : {}) };
    }

    /**
     * Fetches the delegation tree rooted at `sessionId` over RPC. The caller
     * must own the session. Returns the tree node view from the gateway.
     */
    async getDelegationTree(sessionId: string, options?: { status?: string | string[]; depth?: number }, context?: any): Promise<Record<string, any> | null> {
        if (!this.appRpc) {
            return null;
        }
        const result = await this.appRpc.request('delegation.tree', { sessionId, ...options }, context);
        return result?.tree ?? null;
    }

    /**
     * Fetches the delegation lineage (ancestors up to the root) for
     * `sessionId` over RPC. The caller must own the session.
     */
    async getDelegationLineage(sessionId: string, options?: { limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('delegation.lineage', { sessionId, ...options }, context);
        return Array.isArray(result?.lineage) ? result.lineage : [];
    }

    /**
     * Fetches the direct child delegation edges of `sessionId` over RPC. The
     * caller must own the session.
     */
    async getDelegationChildren(sessionId: string, options?: { status?: string | string[]; limit?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('delegation.children', { sessionId, ...options }, context);
        return Array.isArray(result?.children) ? result.children : [];
    }

    /**
     * Fetches flat delegation edges over RPC. `sessionId` is optional: when
     * provided only edges touching that session are returned (and the caller
     * must own it), otherwise every edge owned by the principal is listed.
     */
    async listDelegationEdges(options?: { sessionId?: string; limit?: number; offset?: number }, context?: any): Promise<Array<Record<string, any>>> {
        if (!this.appRpc) {
            return [];
        }
        const result = await this.appRpc.request('delegation.list', options ?? {}, context);
        return Array.isArray(result?.edges) ? result.edges : [];
    }
}
