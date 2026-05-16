export interface ScheduledAgentTask {
    id: string;
    sessionId: string;
    prompt: string;
    runAt?: number;
    intervalMs?: number;
    cancelled?: boolean;
    running?: boolean;
    createdAt?: number;
    updatedAt?: number;
    lastRunAt?: number;
    nextRunAt?: number;
    runCount?: number;
    failureCount?: number;
    lastError?: string;
}
