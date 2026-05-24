import { Module, token } from '@tsdi/ioc';
import { McpClient } from './client/client';
import { McpServer } from './server/mcp-server';

export const MCP_SERV_INTERCEPTORS = token<any[]>('MCP_SERV_INTERCEPTORS');
export const MCP_SERV_FILTERS = token<any[]>('MCP_SERV_FILTERS');
export const MCP_SERV_GUARDS = token<any[]>('MCP_SERV_GUARDS');

@Module({
    providers: [],
    declarations: [
        McpClient,
        McpServer
    ]
})
export class McpModule {

}
