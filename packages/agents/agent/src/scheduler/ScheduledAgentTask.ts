import { AgentScheduleType } from './ScheduleSpec';

export interface ScheduledAgentTask {
    id: string;
    sessionId: string;
    prompt: string;
    runAt?: number;
    intervalMs?: number;
    cronExpr?: string;
    scheduleType?: AgentScheduleType;
    cancelled?: boolean;
    paused?: boolean;
    running?: boolean;
    createdAt?: number;
    updatedAt?: number;
    lastRunAt?: number;
    nextRunAt?: number;
    runCount?: number;
    failureCount?: number;
    lastError?: string;
    maxAttempts?: number;
    retryBackoffMs?: number;
    retryBackoffMultiplier?: number;
    manualRecoveryRequired?: boolean;
    alertOnFailure?: boolean;
}
