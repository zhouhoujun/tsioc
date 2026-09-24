import { INJECTOR, Inject, Injectable, Injector, Optional } from '@tsdi/ioc';
import { ToolRegistry } from '@tsdi/agent';
import { PipelineAdapter, PipelineDefinition, PipelineExecutionResult, PipelineStep } from './pipeline.tool';

interface PipelineRuntimeContext {
    sessionId?: string;
    principalId?: string;
    workspace?: string;
}

/**
 * Host-neutral default pipeline backend. Definitions live in memory for the
 * lifetime of the adapter, and `execute` runs each step through the configured
 * `ToolRegistry`. When no registry is available the step fails with an explicit
 * reason instead of reporting a fake success.
 */
@Injectable()
export class LocalPipelineAdapter extends PipelineAdapter {
    private pipelines = new Map<string, PipelineDefinition>();
    private sequence = 0;

    constructor(
        @Optional() @Inject(INJECTOR) private injector?: Injector | null
    ) {
        super();
    }

    async define(pipeline: PipelineDefinition): Promise<PipelineDefinition> {
        const id = pipeline.id || `pipeline-${Date.now()}-${++this.sequence}`;
        const stored: PipelineDefinition = { ...pipeline, id };
        this.pipelines.set(id, stored);
        return stored;
    }

    async list(): Promise<Array<{ id: string; name: string; stepCount: number }>> {
        return [...this.pipelines.values()].map(pipeline => ({
            id: pipeline.id!,
            name: pipeline.name,
            stepCount: pipeline.steps.length
        }));
    }

    async get(pipelineId: string): Promise<PipelineDefinition | null> {
        return this.pipelines.get(pipelineId) ?? null;
    }

    async delete(pipelineId: string): Promise<boolean> {
        return this.pipelines.delete(pipelineId);
    }

    async execute(pipelineId: string, context: Record<string, any> = {}): Promise<PipelineExecutionResult> {
        const startedAt = Date.now();
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            return {
                pipelineId,
                status: 'failed',
                stepResults: [{ step: 'pipeline', status: 'failure', error: `Pipeline '${pipelineId}' not found.`, durationMs: 0 }],
                startedAt,
                completedAt: Date.now()
            };
        }

        const registry = this.resolveRegistry();
        const runtime = (context.__pipelineRuntime ?? {}) as PipelineRuntimeContext;
        const stepResults: PipelineExecutionResult['stepResults'] = [];
        const completed = new Set<string>();
        const remaining = [...pipeline.steps];

        while (remaining.length) {
            const ready = remaining.filter(step => (step.dependsOn ?? []).every(dependency => completed.has(dependency)));
            if (!ready.length) {
                for (const step of remaining) {
                    stepResults.push({ step: step.name, status: 'skipped', error: 'Unresolved or cyclic dependency.', durationMs: 0 });
                    completed.add(step.name);
                }
                break;
            }
            for (const step of ready) {
                remaining.splice(remaining.indexOf(step), 1);
                stepResults.push(await this.runStep(step, registry, context, runtime));
                completed.add(step.name);
            }
        }

        return {
            pipelineId,
            status: stepResults.some(result => result.status === 'failure') ? 'failed' : 'completed',
            stepResults,
            startedAt,
            completedAt: Date.now()
        };
    }

    private async runStep(
        step: PipelineStep,
        registry: ToolRegistry | null,
        context: Record<string, any>,
        runtime: PipelineRuntimeContext
    ): Promise<PipelineExecutionResult['stepResults'][number]> {
        if (!registry) {
            return { step: step.name, status: 'failure', error: 'No tool executor is configured for this host.', durationMs: 0 };
        }
        const startedAt = Date.now();
        try {
            const input = substituteTemplates(step.input, { ...context, ...runtime });
            const output = await registry.invoke(step.tool, input, runtime.sessionId ?? 'local-system', runtime.principalId, runtime.workspace);
            return { step: step.name, status: 'success', output, durationMs: Date.now() - startedAt };
        } catch (error) {
            return { step: step.name, status: 'failure', error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt };
        }
    }

    private resolveRegistry(): ToolRegistry | null {
        if (!this.injector) {
            return null;
        }
        try {
            return this.injector.get(ToolRegistry) ?? null;
        } catch {
            return null;
        }
    }
}

function substituteTemplates(value: any, context: Record<string, any>): any {
    if (typeof value === 'string') {
        return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
            const resolved = key.split('.').reduce<any>((current, token) => (current == null ? undefined : current[token]), context);
            return resolved == null ? '' : String(resolved);
        });
    }
    if (Array.isArray(value)) {
        return value.map(item => substituteTemplates(item, context));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substituteTemplates(item, context)]));
    }
    return value;
}
