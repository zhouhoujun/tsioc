import { token, Provider } from '@tsdi/ioc';
import { ListenOpts, Transport } from '@tsdi/common';
import { ServiceOptions } from '@tsdi/service';
import * as http from 'node:http';

export interface McpServOptions extends ServiceOptions {
    transport: Transport.MCP;
    providers?: Provider[];
    listenOpts?: ListenOpts;
    serverOpts?: http.ServerOptions;
    path?: string;
}

export const MCP_SERV_OPTIONS = token<McpServOptions>('MCP_SERV_OPTIONS');
export const MCP_BIND_INTERCEPTORS = token<any[]>('MCP_BIND_INTERCEPTORS');
export const MCP_BIND_FILTERS = token<any[]>('MCP_BIND_FILTERS');
export const MCP_BIND_GUARDS = token<any[]>('MCP_BIND_GUARDS');
