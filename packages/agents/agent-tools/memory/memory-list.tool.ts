import { AgentMemoryRecord, AgentTool, AgentToolContext } from '@tsdi/agent';
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class MemoryListTool implements AgentTool {
    name = 'memory.list';
    description = 'List memory records visible to the current session.';
    inputSchema = {
        type: 'object',
        properties: {
            scope: { type: 'string', enum: ['session', 'global'] },
            namespace: { type: 'string' },
            category: { type: 'string' }
        }
    };
    toolset = 'memory';
    source = 'local';
    execution = { readOnly: true };

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const records = await context.memory.getAll(context.sessionId);
        return {
            records: this.filterRecords(records, input)
        };
    }

    private filterRecords(records: AgentMemoryRecord[], input: any): AgentMemoryRecord[] {
        const scope = typeof input?.scope === 'string' ? input.scope : undefined;
        const namespace = typeof input?.namespace === 'string' ? input.namespace : undefined;
        const category = typeof input?.category === 'string' ? input.category : undefined;
        return records.filter(record => {
            if (scope && record.scope !== scope) {
                return false;
            }
            if (namespace && record.namespace !== namespace) {
                return false;
            }
            if (category && record.category !== category) {
                return false;
            }
            return true;
        });
    }
}
