import {
    AgentMemoryRecord,
    AgentMessage,
    AgentRuntime,
    AgentScheduler,
    AgentTurnResult,
    ScheduledAgentTask,
    SessionSearchMatch,
    StreamChunk,
    SynthesisReport
} from '@tsdi/agent';

/**
 * Browser-side runtime placeholder.
 *
 * The web console never runs turns locally: every turn and state read goes
 * through the gateway App RPC. Booting `AgentModule` in a browser still
 * constructs `AgentRuntime`, and the real `DefaultAgentRuntime` requires its
 * TypeORM-backed stores (there is intentionally no TypeORM adapter in the
 * browser). This no-op runtime keeps the component graph working without
 * dragging Node persistence into the bundle.
 */
export class AgentConsoleRemoteRuntime extends AgentRuntime {
    async runTurn(): Promise<AgentTurnResult> {
        throw new Error('The web console runs turns through the gateway App RPC.');
    }

    async start(): Promise<void> {
        // No local runtime to start.
    }

    async stop(): Promise<void> {
        // No local runtime to stop.
    }

    async executeTurn(): Promise<AgentTurnResult> {
        throw new Error('The web console runs turns through the gateway App RPC.');
    }

    async processTurn(): Promise<AgentTurnResult> {
        throw new Error('The web console runs turns through the gateway App RPC.');
    }

    async *runStreamingTurn(): AsyncGenerator<StreamChunk> {
        throw new Error('The web console streams turns through the gateway App RPC.');
    }

    async putMemory(): Promise<AgentMemoryRecord> {
        throw new Error('The web console stores memory through the gateway App RPC.');
    }

    async searchMemory(): Promise<AgentMemoryRecord[]> {
        return [];
    }

    async getMessages(): Promise<AgentMessage[]> {
        return [];
    }

    async searchSessions(): Promise<SessionSearchMatch[]> {
        return [];
    }

    synthesizeExperiences(): SynthesisReport {
        return { totalSessions: 0, processedSessions: 0, patterns: [], errors: [] };
    }
}

/** Gateway-only scheduler: jobs live in the gateway runtime, not the browser. */
export class AgentConsoleRemoteScheduler extends AgentScheduler {
    async start(): Promise<void> {
        // No local scheduler.
    }

    async stop(): Promise<void> {
        // No local scheduler.
    }

    async schedule(task: ScheduledAgentTask): Promise<ScheduledAgentTask> {
        return task;
    }

    async cancel(): Promise<void> {
        // No local scheduler.
    }

    getTasks(): ScheduledAgentTask[] {
        return [];
    }
}
