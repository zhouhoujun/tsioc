/**
 * The durable background-task history contract now lives in `@tsdi/agent`
 * (`src/memory/background-task-store.ts`) so a TypeOrm implementation can be
 * co-located with it without creating an `agent -> agent-tools` dependency
 * cycle. This module re-exports the contract for backward compatibility so
 * existing importers (`./background-task-store`, `@tsdi/agent-tools`) keep
 * resolving the same names.
 */
export {
    BackgroundTaskHistoryStore,
    BackgroundTaskHistoryListener,
    BackgroundTaskPage,
    BackgroundTaskPageOptions,
    BackgroundTaskCursor,
    BackgroundTaskRecord,
    BackgroundTaskStatus,
    BackgroundTaskRunResult,
    BackgroundTaskReport,
    DecodedCursor,
    encodeBackgroundTaskCursor,
    decodeBackgroundTaskCursor,
    cloneBackgroundTaskRecord,
    pageBackgroundTaskRecords,
    BACKGROUND_TASK_HISTORY_STORE,
    TypeOrmBackgroundTaskStore
} from '@tsdi/agent';
