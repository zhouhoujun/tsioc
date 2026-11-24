import type { AgentToolCall } from '../model/ModelResponse';
import type { AgentToolDefinition } from '../tools/AgentTool';
import type { ToolLoopDetector } from '../tools/ToolLoopDetector';
import type { TurnExecutionContext } from './TurnExecutionContext';

interface LiveBatch {
    sessionId: string;
    context: TurnExecutionContext;
    detector: ToolLoopDetector;
    tools: AgentToolDefinition[];
    started: Set<string>;
    parallelSafe: string[];
}

/**
 * P3.1: start read-only / parallel-safe tool calls as soon as a streaming
 * response delivers a complete call, instead of waiting for the model to
 * finish. Batch execution later awaits these promises in original order, so
 * message persistence/approval semantics are unchanged.
 */
export class LiveToolScheduler {
    private live?: LiveBatch;

    begin(sessionId: string, context: TurnExecutionContext, detector: ToolLoopDetector, tools: AgentToolDefinition[] = [], parallelSafe: string[] = []): void {
        this.live = { sessionId, context, detector, tools, started: new Set(), parallelSafe };
    }

    start(calls: AgentToolCall[] | undefined, invoke: (sessionId: string, call: AgentToolCall, detector: ToolLoopDetector, tools: AgentToolDefinition[], context: TurnExecutionContext) => Promise<any>): void {
        const live = this.live;
        if (!live || !calls?.length) {
            return;
        }
        live.context.liveToolResults ??= new Map();
        for (const call of calls) {
            const id = String(call.id || '').trim();
            if (!id || live.started.has(id)) {
                continue;
            }
            const definition = live.tools.find(tool => tool.name === call.name);
            const safe = definition?.execution?.readOnly === true
                || live.parallelSafe.includes(call.name)
                || live.parallelSafe.includes('*');
            if (!safe) {
                continue;
            }
            live.started.add(id);
            live.context.liveToolResults.set(id, invoke(live.sessionId, call, live.detector, live.tools, live.context));
        }
    }

    /** Consume a prestarted result (each call id is taken exactly once). */
    take(context: TurnExecutionContext, id: string): Promise<any> | undefined {
        const pending = context.liveToolResults?.get(id);
        if (pending) {
            context.liveToolResults!.delete(id);
        }
        return pending;
    }
}
