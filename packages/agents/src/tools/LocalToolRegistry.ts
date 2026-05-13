import { Inject, Injectable } from '@tsdi/ioc';
import { ToolRegistry } from './ToolRegistry';
import { AgentTool } from './AgentTool';
import { AGENT_MEMORY_STORE, AGENT_TOOLS } from '../tokens';
import { MemoryStore } from '../memory/MemoryStore';

@Injectable()
export class LocalToolRegistry extends ToolRegistry {
    constructor(
        @Inject(AGENT_TOOLS, { defaultValue: [] }) private tools: AgentTool[],
        @Inject(AGENT_MEMORY_STORE) private memory: MemoryStore
    ) {
        super();
    }

    getTools(): AgentTool[] {
        return this.tools.slice();
    }

    getTool(name: string): AgentTool | undefined {
        return this.tools.find(tool => tool.name === name);
    }

    async invoke(name: string, input: any, sessionId: string): Promise<any> {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        return tool.invoke(input, {
            sessionId,
            memory: this.memory
        });
    }
}
