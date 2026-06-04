import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';

export interface PipelineStep {
    name: string;
    tool: string;
    input: Record<string, any>;
    dependsOn?: string[];
}

export interface PipelineDefinition {
    id?: string;
    name: string;
    description?: string;
    steps: PipelineStep[];
}

export interface PipelineExecutionResult {
    pipelineId: string;
    status: 'completed' | 'failed' | 'running';
    stepResults: Array<{
        step: string;
        status: 'success' | 'failure' | 'skipped';
        output?: any;
        error?: string;
        durationMs: number;
    }>;
    startedAt: number;
    completedAt?: number;
}

export interface PipelineAdapter {
    define(pipeline: PipelineDefinition): Promise<PipelineDefinition>;
    execute(pipelineId: string, context?: Record<string, any>): Promise<PipelineExecutionResult>;
    get(pipelineId: string): Promise<PipelineDefinition | null>;
    list(): Promise<Array<{ id: string; name: string; stepCount: number }>>;
    delete(pipelineId: string): Promise<boolean>;
}

export const AGENT_PIPELINE_ADAPTER = 'AGENT_PIPELINE_ADAPTER';

@Injectable()
export class PipelineTool implements AgentTool {
    name = 'pipeline';
    description = 'Define and execute multi-step pipelines that chain tool calls together with dependency resolution. Steps run in order with support for parallel execution of independent steps.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['define', 'execute', 'get', 'list', 'delete'],
                description: 'Pipeline operation.'
            },
            name: {
                type: 'string',
                description: 'Pipeline name (required for define).'
            },
            description: {
                type: 'string',
                description: 'Pipeline description.'
            },
            steps: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        tool: { type: 'string' },
                        input: { type: 'object' },
                        dependsOn: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['name', 'tool', 'input']
                },
                description: 'Step definitions (required for define).'
            },
            pipeline_id: {
                type: 'string',
                description: 'Pipeline ID (required for execute, get, delete).'
            },
            context: {
                type: 'object',
                description: 'Execution context variables for template substitution in step inputs.'
            }
        },
        required: ['action']
    };
    toolset = 'pipeline';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(AGENT_PIPELINE_ADAPTER, { defaultValue: null })
        private adapter?: PipelineAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        if (!this.adapter) {
            throw new Error('pipeline requires a configured PipelineAdapter. Provide one via the AGENT_PIPELINE_ADAPTER token.');
        }
        const action = typeof input?.action === 'string' ? input.action : '';

        switch (action) {
            case 'list': {
                const pipelines = await this.adapter.list();
                return { pipelines, total: pipelines.length };
            }
            case 'define': {
                const name = this.requireString(input?.name, 'pipeline name');
                const steps = this.requireSteps(input?.steps);
                const pipeline = await this.adapter.define({
                    name,
                    description: typeof input?.description === 'string' ? input.description : undefined,
                    steps
                });
                return { defined: true, pipeline };
            }
            case 'execute': {
                const id = this.requireString(input?.pipeline_id, 'pipeline pipeline_id');
                const result = await this.adapter.execute(
                    id,
                    typeof input?.context === 'object' && input.context !== null ? input.context : undefined
                );
                return {
                    pipelineId: result.pipelineId,
                    status: result.status,
                    steps: result.stepResults.map(s => ({
                        step: s.step,
                        status: s.status,
                        error: s.error,
                        durationMs: s.durationMs
                    })),
                    startedAt: result.startedAt,
                    completedAt: result.completedAt
                };
            }
            case 'get': {
                const id = this.requireString(input?.pipeline_id, 'pipeline pipeline_id');
                const pipeline = await this.adapter.get(id);
                if (!pipeline) {
                    throw new Error(`Pipeline '${id}' not found.`);
                }
                return { pipeline };
            }
            case 'delete': {
                const id = this.requireString(input?.pipeline_id, 'pipeline pipeline_id');
                const deleted = await this.adapter.delete(id);
                return { deleted, id };
            }
            default:
                throw new Error('Invalid action. Must be: define, execute, get, list, delete.');
        }
    }

    private requireSteps(value: unknown): PipelineStep[] {
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error('Invalid pipeline steps: must be a non-empty array.');
        }
        return value.map((step, i) => {
            if (!step || typeof step !== 'object') {
                throw new Error(`Invalid pipeline step at index ${i}: must be an object.`);
            }
            if (typeof step.name !== 'string' || !step.name) {
                throw new Error(`Invalid pipeline step at index ${i}: name is required.`);
            }
            if (typeof step.tool !== 'string' || !step.tool) {
                throw new Error(`Invalid pipeline step at index ${i}: tool is required.`);
            }
            if (!step.input || typeof step.input !== 'object') {
                throw new Error(`Invalid pipeline step at index ${i}: input is required.`);
            }
            return {
                name: step.name,
                tool: step.tool,
                input: step.input,
                dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn.filter((d: any) => typeof d === 'string') : undefined
            };
        });
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
