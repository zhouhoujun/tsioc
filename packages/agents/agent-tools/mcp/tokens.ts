import { token } from '@tsdi/ioc';
import { AgentMcpOptions, McpClient } from './types';

export const AGENT_MCP_OPTIONS = token<AgentMcpOptions>('AGENT_MCP_OPTIONS');
export const AGENT_MCP_CLIENT_FACTORY = token<(serverId: string) => McpClient>('AGENT_MCP_CLIENT_FACTORY');
