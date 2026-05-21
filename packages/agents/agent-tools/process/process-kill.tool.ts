import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { ProcessRegistry } from './ProcessRegistry';

@Injectable()
export class ProcessKillTool implements AgentTool {
    name = 'process.kill';
    description = 'Terminate a background process started in the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    };
    toolset = 'process';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(private processes: ProcessRegistry) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const id = this.requireId(input?.id);
        const record = this.processes.kill(context.sessionId, id);
        if (!record) {
            throw new Error(`Process '${id}' was not found for this session.`);
        }
        return {
            process: record,
            signalled: record.running
        };
    }

    private requireId(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid process.kill input: id must be a non-empty string.');
        }
        return value.trim();
    }
}
