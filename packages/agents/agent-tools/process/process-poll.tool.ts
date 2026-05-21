import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';
import { ProcessRegistry } from './ProcessRegistry';

@Injectable()
export class ProcessPollTool implements AgentTool {
    name = 'process.poll';
    description = 'Poll the current status and buffered output of a background process.';
    inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    };
    toolset = 'process';
    source = 'local';
    execution = { readOnly: true };

    constructor(private processes: ProcessRegistry) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const id = this.requireId(input?.id);
        const record = this.processes.get(context.sessionId, id);
        if (!record) {
            throw new Error(`Process '${id}' was not found for this session.`);
        }
        return {
            process: record
        };
    }

    private requireId(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid process.poll input: id must be a non-empty string.');
        }
        return value.trim();
    }
}
