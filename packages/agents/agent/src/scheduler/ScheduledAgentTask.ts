export interface ScheduledAgentTask {
    id: string;
    sessionId: string;
    prompt: string;
    runAt?: number;
    intervalMs?: number;
    cancelled?: boolean;
}
