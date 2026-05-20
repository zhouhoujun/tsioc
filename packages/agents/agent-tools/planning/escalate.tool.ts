import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

const ALLOWED_SEVERITIES = ['low', 'medium', 'high'] as const;
type EscalationSeverity = typeof ALLOWED_SEVERITIES[number];

@Injectable()
export class EscalateTool implements AgentTool {
    name = 'escalate';
    description = 'Create a structured escalation request payload that a host may surface for intervention.';
    inputSchema = {
        type: 'object',
        properties: {
            reason: { type: 'string' },
            summary: { type: 'string' },
            requestedAction: { type: 'string' },
            context: { type: 'string' },
            severity: { type: 'string', enum: [...ALLOWED_SEVERITIES] }
        },
        required: ['reason']
    };
    toolset = 'planning';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        return {
            requested: true,
            kind: 'escalate',
            sessionId: context.sessionId,
            reason: this.requireString(input?.reason, 'reason'),
            summary: this.optionalString(input?.summary),
            requestedAction: this.optionalString(input?.requestedAction),
            context: this.optionalString(input?.context),
            severity: this.resolveSeverity(input?.severity)
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid escalate input: ${field} must be a non-empty string.`);
        }
        return value.trim();
    }

    private optionalString(value: unknown): string | undefined {
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }

    private resolveSeverity(value: unknown): EscalationSeverity {
        if (value == null) {
            return 'high';
        }
        if (!ALLOWED_SEVERITIES.includes(value as EscalationSeverity)) {
            throw new Error('Invalid escalate input: severity must be low, medium, or high.');
        }
        return value as EscalationSeverity;
    }
}
