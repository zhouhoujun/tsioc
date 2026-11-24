import type { MemoryStore } from '../memory/MemoryStore';
import type { ToolRegistry } from '../tools/ToolRegistry';
import { AgentCompensationEvent } from './AgentEvents';

export interface CompensationEntry {
    toolName: string;
    toolCallId: string;
    captured: unknown;
}

export interface TurnCompensationHost {
    toolRegistry: ToolRegistry;
    memory: MemoryStore;
    publish(event: AgentCompensationEvent): Promise<unknown>;
    source: object;
}

/**
 * Compensating actions for successful side-effecting tool calls in a turn.
 * Entries are recorded before/around the call and rolled back in reverse
 * order when the turn is cancelled or fails.
 */
export class TurnCompensationController {
    private readonly stacks = new Map<string, CompensationEntry[]>();

    constructor(private readonly host: TurnCompensationHost) {
    }

    getStack(sessionId: string): CompensationEntry[] {
        let stack = this.stacks.get(sessionId);
        if (!stack) {
            stack = [];
            this.stacks.set(sessionId, stack);
        }
        return stack;
    }

    push(sessionId: string, toolName: string, toolCallId: string, captured: unknown): void {
        if (captured === undefined) {
            return;
        }
        this.getStack(sessionId).push({ toolName, toolCallId, captured });
    }

    /**
     * Roll back the turn's successful side-effecting tool calls in reverse
     * order. Each entry is passed to the tool's compensate() hook with the
     * snapshot captured before the call ran. Returns how many entries were
     * compensated and their tool call ids; failures during rollback are
     * collected but do not stop the remaining entries. When at least one
     * entry is compensated, an AgentCompensationEvent is published so
     * listeners can surface the rollback.
     */
    async rollback(sessionId: string, reason: 'cancelled' | 'error'): Promise<{ compensated: number; toolCallIds: string[] }> {
        const stack = this.stacks.get(sessionId);
        if (!stack?.length) {
            this.stacks.delete(sessionId);
            return { compensated: 0, toolCallIds: [] };
        }
        const toolCallIds: string[] = [];
        let compensated = 0;
        for (const entry of [...stack].reverse()) {
            const tool = this.host.toolRegistry.getTool(entry.toolName);
            if (!tool?.compensate) {
                continue;
            }
            toolCallIds.push(entry.toolCallId);
            try {
                await tool.compensate(entry.captured, {
                    sessionId,
                    memory: this.host.memory
                });
                compensated++;
            } catch {
                continue;
            }
        }
        this.stacks.delete(sessionId);
        if (compensated > 0) {
            await this.host.publish(new AgentCompensationEvent(this.host.source, sessionId, reason, compensated, toolCallIds)).catch(() => {});
        }
        return { compensated, toolCallIds };
    }

    clear(sessionId: string): void {
        this.stacks.delete(sessionId);
    }
}
