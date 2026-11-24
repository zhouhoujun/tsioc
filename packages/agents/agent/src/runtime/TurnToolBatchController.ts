import { canParallelizeToolBatch } from './tool-dispatch-policy';

export interface TurnToolBatchHost {
    options: any;
    requiresApproval?(name: string, input: any): boolean;
    getToolDefinition(name: string): any;
    runSequential(sessionId: string, toolCall: any, detector: any, tools: any[], context: any): Promise<void>;
    runParallel(sessionId: string, toolCall: any, detector: any, tools: any[], context: any): Promise<any>;
    settle(sessionId: string, result: any, context: any): Promise<void>;
    settleError(sessionId: string, error: Error, context: any): Promise<void>;
}

/** Tool batch policy: parallel-safe batches with a bounded width, else sequential. */
export class TurnToolBatchController {
    constructor(private readonly host: TurnToolBatchHost) {
    }

    async execute(sessionId: string, toolCalls: any[], detector: any, callableTools: any[], context: any): Promise<void> {
        const toolOpts = this.host.options.tools ?? {};
        const safeTools = toolOpts.parallelSafeTools ?? [];
        const parallel = toolOpts.parallelExecution === true
            && toolCalls.length > 1
            && canParallelizeToolBatch(toolCalls, safeTools, {
                requiresApproval: this.host.requiresApproval,
                getDefinition: name => this.host.getToolDefinition(name)
            });
        if (parallel) {
            return this.executeParallel(sessionId, toolCalls, detector, callableTools, context);
        }
        for (const toolCall of toolCalls) {
            const started = context.liveToolResults?.get(toolCall.id);
            if (started) {
                const result = await started;
                await this.host.settle(sessionId, result, context);
                continue;
            }
            await this.host.runSequential(sessionId, toolCall, detector, callableTools, context);
        }
    }

    private async executeParallel(sessionId: string, toolCalls: any[], detector: any, callableTools: any[], context: any): Promise<void> {
        const maxParallel = this.host.options.tools?.maxParallelTools ?? 4;
        for (let index = 0; index < toolCalls.length; index += maxParallel) {
            const batch = toolCalls.slice(index, index + maxParallel);
            const results = await Promise.allSettled(
                batch.map(call => context.liveToolResults?.get(call.id)
                    ?? this.host.runParallel(sessionId, call, detector, callableTools, context))
            );
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    await this.host.settle(sessionId, result.value, context);
                } else {
                    await this.host.settleError(
                        sessionId,
                        result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
                        context
                    );
                }
            }
        }
    }
}
