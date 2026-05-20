import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

const ALLOWED_SEVERITIES = ['low', 'medium', 'high'] as const;
type AskSeverity = typeof ALLOWED_SEVERITIES[number];

@Injectable()
export class AskUserTool implements AgentTool {
    name = 'ask_user';
    description = 'Create a structured user question request payload that a host may surface for clarification.';
    inputSchema = {
        type: 'object',
        properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            context: { type: 'string' },
            severity: { type: 'string', enum: [...ALLOWED_SEVERITIES] }
        },
        required: ['question']
    };
    toolset = 'planning';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        return {
            requested: true,
            kind: 'ask_user',
            sessionId: context.sessionId,
            question: this.requireQuestion(input?.question),
            options: this.resolveOptions(input?.options),
            context: this.optionalString(input?.context),
            severity: this.resolveSeverity(input?.severity)
        };
    }

    private requireQuestion(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid ask_user input: question must be a non-empty string.');
        }
        return value.trim();
    }

    private resolveOptions(value: unknown): string[] {
        if (value == null) {
            return [];
        }
        if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) {
            throw new Error('Invalid ask_user input: options must be an array of non-empty strings.');
        }
        return value.map(item => item.trim());
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    private resolveSeverity(value: unknown): AskSeverity {
        if (value == null) {
            return 'medium';
        }
        if (!ALLOWED_SEVERITIES.includes(value as AskSeverity)) {
            throw new Error('Invalid ask_user input: severity must be low, medium, or high.');
        }
        return value as AskSeverity;
    }
}
