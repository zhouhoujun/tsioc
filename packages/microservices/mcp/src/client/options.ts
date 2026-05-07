import { token } from '@tsdi/ioc';
import { Transport, TransferSide } from '@tsdi/common';
import { ClientOptions } from '@tsdi/client';

export interface McpClientOptions extends ClientOptions {
    transport: Transport.MCP;
    side: TransferSide.client;
    microservice?: boolean;
    url?: string;
}

export const MCP_CLIENT_OPTIONS = token<McpClientOptions>('MCP_CLIENT_OPTIONS');
