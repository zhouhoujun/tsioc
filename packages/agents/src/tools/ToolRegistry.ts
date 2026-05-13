import { Abstract } from '@tsdi/ioc';
import { AgentTool } from './AgentTool';

@Abstract()
export abstract class ToolRegistry {
    abstract getTools(): AgentTool[];
    abstract getTool(name: string): AgentTool | undefined;
    abstract invoke(name: string, input: any, sessionId: string): Promise<any>;
}
