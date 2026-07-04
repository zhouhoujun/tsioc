import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Abstract, Inject, Injectable, Optional } from '@tsdi/ioc';

export interface IntentVerificationResult {
    approved: boolean;
    verifiedAction: string;
    reasoning?: string;
}

@Abstract()
export abstract class IntentVerifierAdapter {
    abstract verify(action: string, context: string): Promise<IntentVerificationResult>;
}

@Injectable()
export class VerifiableIntentTool implements AgentTool {
    name = 'verifiable_intent';
    description = 'Declare a high-risk or irreversible action for explicit verification before execution. The intent is checked against configured policies and may require approval.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                description: 'Description of the intended action.'
            },
            target: {
                type: 'string',
                description: 'The target resource or scope of the action (file path, URL, command, etc.).'
            },
            reason: {
                type: 'string',
                description: 'Justification for why this action is needed.'
            },
            details: {
                type: 'object',
                description: 'Additional structured context about the action.'
            }
        },
        required: ['action', 'target', 'reason']
    };
    toolset = 'security';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(IntentVerifierAdapter)
        private adapter?: IntentVerifierAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = this.requireString(input?.action, 'verifiable_intent action');
        const target = this.requireString(input?.target, 'verifiable_intent target');
        const reason = this.requireString(input?.reason, 'verifiable_intent reason');

        if (this.adapter) {
            const result = await this.adapter.verify(
                `${action}: ${target}`,
                reason
            );
            return {
                approved: result.approved,
                verifiedAction: result.verifiedAction,
                reasoning: result.reasoning,
                action,
                target,
                reason
            };
        }

        return {
            approved: true,
            verifiedAction: action,
            action,
            target,
            reason,
            note: 'No verifier adapter configured; intent recorded but not externally verified.'
        };
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Invalid ${field}: must be a non-empty string.`);
        }
        return value.trim();
    }
}
