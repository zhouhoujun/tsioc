import { token } from '@tsdi/ioc';

export interface AgentConsoleAppRpc {
    request(method: string, params?: any, context?: any): Promise<any>;
    stream?(method: string, params?: any, context?: any): AsyncGenerator<any, void, void>;
}

export const AGENT_CONSOLE_APP_RPC = token<AgentConsoleAppRpc>('AGENT_CONSOLE_APP_RPC');
