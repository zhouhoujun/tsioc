import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import * as http from 'node:http';
import { McpMessageAdapter } from './message-adapter';

@Injectable()
export class McpMessageAdapterFactory extends MessageAdapterFactory<Record<string, any>, http.ServerResponse, McpMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<Record<string, any>, http.ServerResponse>): McpMessageAdapter {
        return new McpMessageAdapter(options.request, options.response!);
    }
}
