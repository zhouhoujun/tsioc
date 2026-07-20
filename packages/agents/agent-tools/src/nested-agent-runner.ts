import { randomUUID } from 'crypto';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { SpawnAgentAdapter, SpawnAgentInput, SpawnAgentResult } from '../agent/spawn-agent.tool';
import { LlmTaskAdapter, LlmTaskRequest, LlmTaskResult } from '../llm/llm-task.tool';
import { WeatherAdapter, WeatherForecastResult, WeatherResult } from '../utility/weather.tool';

export interface NestedAgentRunRequest {
    prompt: string;
    sessionId?: string;
    toolsets?: string[];
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface NestedAgentRunResult {
    content: string;
    turnCount: number;
    toolCalls: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
}

@Abstract()
export abstract class NestedAgentRunner {
    abstract run(request: NestedAgentRunRequest): Promise<NestedAgentRunResult>;
}

function buildSubAgentPrompt(request: SpawnAgentInput): string {
    const parts = [
        'Complete the delegated task independently and return the most useful final result.',
        `Task:\n${request.goal}`
    ];
    if (request.context?.trim()) {
        parts.push(`Context:\n${request.context.trim()}`);
    }
    return parts.join('\n\n');
}

@Injectable({ provide: SpawnAgentAdapter })
export class DelegatingSpawnAgentAdapter extends SpawnAgentAdapter {
    constructor(
        @Optional() private runner?: NestedAgentRunner | null
    ) {
        super();
    }

    override async spawn(input: SpawnAgentInput): Promise<SpawnAgentResult> {
        const result = await this.requireRunner().run({
            prompt: buildSubAgentPrompt(input),
            sessionId: `spawn-${randomUUID()}`,
            toolsets: input.toolsets
        });
        return {
            output: result.content,
            turnCount: result.turnCount,
            toolCalls: result.toolCalls
        };
    }

    protected requireRunner(): NestedAgentRunner {
        if (!this.runner) {
            throw new Error('Nested agent runner is not configured for spawn_agent.');
        }
        return this.runner;
    }
}

@Injectable({ provide: LlmTaskAdapter })
export class DelegatingLlmTaskAdapter extends LlmTaskAdapter {
    constructor(
        @Optional() private runner?: NestedAgentRunner | null
    ) {
        super();
    }

    override async execute(request: LlmTaskRequest): Promise<LlmTaskResult> {
        const result = await this.requireRunner().run({
            prompt: request.prompt,
            sessionId: `llm-task-${randomUUID()}`,
            systemPrompt: request.system,
            model: request.model,
            temperature: request.temperature,
            maxTokens: request.maxTokens
        });
        return {
            content: result.content,
            model: result.model,
            usage: result.usage,
            finishReason: result.finishReason
        };
    }

    protected requireRunner(): NestedAgentRunner {
        if (!this.runner) {
            throw new Error('Nested agent runner is not configured for llm_task.');
        }
        return this.runner;
    }
}

@Injectable({ provide: WeatherAdapter })
export class UnavailableWeatherAdapter extends WeatherAdapter {
    override async getCurrentWeather(_location: string, _units?: 'metric' | 'imperial'): Promise<WeatherResult> {
        throw new Error('Weather service adapter is not configured.');
    }

    override async getForecast(_location: string, _days?: number, _units?: 'metric' | 'imperial'): Promise<WeatherForecastResult> {
        throw new Error('Weather service adapter is not configured.');
    }
}
