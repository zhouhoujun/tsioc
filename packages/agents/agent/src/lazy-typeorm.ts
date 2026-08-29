import { AuditSink } from './harness/AuditSink';
import { CompactionHistoryStore } from './harness/CompactionHistoryStore';
import { TurnDiagnosticsStore } from './harness/TurnDiagnosticsStore';
import { SummaryQualityStore } from './harness/SummaryQualityStore';
import { DelegationGraphStore } from './harness/DelegationGraphStore';
import { MemoryStore } from './memory/MemoryStore';
import { SessionStore } from './memory/SessionStore';
import { TimelineHistoryStore } from './memory/timeline-projection';
import { GoalStore } from './goal/GoalStore';

/**
 * Lazy TypeOrm-backed store factories.
 *
 * The Default*Store classes switch to their TypeOrm implementation when a
 * TypeormAdapter is present. Importing those implementations at module top
 * level would force `typeorm` (and its node-only dependency chain) into any
 * bundle that touches @tsdi/agent, including browser builds. These factories
 * require() the TypeOrm classes only when a session actually resolves an
 * adapter, so browser bundles never load them.
 */

export interface TypeOrmAdapterLike {
    [key: string]: any;
}

function requireTypeOrmAdapterClass(): TypeOrmAdapterLike | null {
    try {
        const pkgName = ['@tsdi', '/typeorm-adapter'].join('');
        const mod = requireLazy(pkgName) as { TypeormAdapter?: TypeOrmAdapterLike };
        const adapter = mod.TypeormAdapter;
        return typeof adapter === 'function' || (adapter && typeof adapter === 'object') ? adapter : null;
    } catch {
        return null;
    }
}

let typeOrmAdapterToken: TypeOrmAdapterLike | null | undefined;

/**
 * Resolves the TypeormAdapter DI token lazily (avoids a top-level import of
 * @tsdi/typeorm-adapter, which pulls `typeorm` into browser bundles).
 */
export function getTypeOrmAdapterToken(): TypeOrmAdapterLike | null {
    return (typeOrmAdapterToken ??= requireTypeOrmAdapterClass());
}

export const lazyRequireCache = new Map<string, any>();

/**
 * Lazy require that defeats esbuild's static bundling of literal require
 * paths: the target module is loaded at runtime from the real module
 * registry (never bundled), which keeps `typeorm` out of browser builds.
 */
export function requireLazy(pathName: string): any {
    const cached = lazyRequireCache.get(pathName);
    if (cached) {
        return cached;
    }
    const req = typeof require === 'function' ? require : null;
    if (!req) {
        throw new Error(`lazy require unavailable for ${pathName}`);
    }
    const resolved = pathName.startsWith('./') ? req('.' + pathName.slice(1)) : req(pathName);
    lazyRequireCache.set(pathName, resolved);
    return resolved;
}

/**
 * Resolves the TypeormAdapter instance from the application context, or null
 * when no adapter is registered.
 */
export function resolveTypeormAdapter(app: { get(token: any, nullable?: boolean): any } | null | undefined): TypeOrmAdapterLike | null {
    if (!app) {
        return null;
    }
    try {
        const token = getTypeOrmAdapterToken();
        if (!token) {
            return null;
        }
        const resolved = app.get(token, true) as unknown;
        if (resolved == null || typeof resolved === 'boolean' || typeof resolved !== 'object') {
            return null;
        }
        return resolved as TypeOrmAdapterLike;
    } catch {
        return null;
    }
}

export interface LazyTypeOrmAdapters {
    getTypeOrmAuditSink(adapter: TypeOrmAdapterLike): AuditSink;
    getTypeOrmCompactionHistoryStore(adapter: TypeOrmAdapterLike): CompactionHistoryStore;
    getTypeOrmTurnDiagnosticsStore(adapter: TypeOrmAdapterLike): TurnDiagnosticsStore;
    getTypeOrmSummaryQualityStore(adapter: TypeOrmAdapterLike): SummaryQualityStore;
    getTypeOrmDelegationGraphStore(adapter: TypeOrmAdapterLike, uuid: { generate(): string }): DelegationGraphStore;
    getTypeOrmMemoryStore(adapter: TypeOrmAdapterLike): MemoryStore;
    getTypeOrmSessionStore(adapter: TypeOrmAdapterLike): SessionStore;
    getTypeOrmGoalStore(adapter: TypeOrmAdapterLike): GoalStore;
    getTypeOrmTimelineHistoryStore(adapter: TypeOrmAdapterLike): TimelineHistoryStore;
}

export const lazyTypeOrmAdapters: LazyTypeOrmAdapters = {
    getTypeOrmAuditSink(adapter: TypeOrmAdapterLike): AuditSink {
        const mod = requireLazy('./harness/TypeOrmAuditSink') as typeof import('./harness/TypeOrmAuditSink');
        return new mod.TypeOrmAuditSink(adapter as any);
    },
    getTypeOrmCompactionHistoryStore(adapter: TypeOrmAdapterLike): CompactionHistoryStore {
        const mod = requireLazy('./harness/TypeOrmCompactionHistoryStore') as typeof import('./harness/TypeOrmCompactionHistoryStore');
        return new mod.TypeOrmCompactionHistoryStore(adapter as any);
    },
    getTypeOrmTurnDiagnosticsStore(adapter: TypeOrmAdapterLike): TurnDiagnosticsStore {
        const mod = requireLazy('./harness/TypeOrmTurnDiagnosticsStore') as typeof import('./harness/TypeOrmTurnDiagnosticsStore');
        return new mod.TypeOrmTurnDiagnosticsStore(adapter as any);
    },
    getTypeOrmSummaryQualityStore(adapter: TypeOrmAdapterLike): SummaryQualityStore {
        const mod = requireLazy('./harness/TypeOrmSummaryQualityStore') as typeof import('./harness/TypeOrmSummaryQualityStore');
        return new mod.TypeOrmSummaryQualityStore(adapter as any);
    },
    getTypeOrmDelegationGraphStore(adapter: TypeOrmAdapterLike, uuid: { generate(): string }): DelegationGraphStore {
        const mod = requireLazy('./harness/TypeOrmDelegationGraphStore') as typeof import('./harness/TypeOrmDelegationGraphStore');
        return new mod.TypeOrmDelegationGraphStore(adapter as any, uuid);
    },
    getTypeOrmMemoryStore(adapter: TypeOrmAdapterLike): MemoryStore {
        const mod = requireLazy('./memory/TypeOrmMemoryStore') as typeof import('./memory/TypeOrmMemoryStore');
        return new mod.TypeOrmMemoryStore(adapter as any);
    },
    getTypeOrmSessionStore(adapter: TypeOrmAdapterLike): SessionStore {
        const mod = requireLazy('./memory/TypeOrmSessionStore') as typeof import('./memory/TypeOrmSessionStore');
        return new mod.TypeOrmSessionStore(adapter as any);
    },
    getTypeOrmGoalStore(adapter: TypeOrmAdapterLike): GoalStore {
        const mod = requireLazy('./goal/TypeOrmGoalStore') as typeof import('./goal/TypeOrmGoalStore');
        return new mod.TypeOrmGoalStore(adapter as any);
    },
    getTypeOrmTimelineHistoryStore(adapter: TypeOrmAdapterLike): TimelineHistoryStore {
        const mod = requireLazy('./memory/TypeOrmTimelineHistoryStore') as typeof import('./memory/TypeOrmTimelineHistoryStore');
        return new mod.TypeOrmTimelineHistoryStore(adapter as any);
    }
};
