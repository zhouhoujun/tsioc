import { Injectable } from '@tsdi/ioc';
import { MessageAdapterFactory, MessageAdapterFactoryOptions } from '@tsdi/common';
import { WebSocket } from 'ws';
import { WsMessageAdapter } from './message-adapter';

@Injectable()
export class WsMessageAdapterFactory extends MessageAdapterFactory<WebSocket, WebSocket, WsMessageAdapter> {
    create(options: MessageAdapterFactoryOptions<WebSocket, WebSocket>): WsMessageAdapter {
        return new WsMessageAdapter(options.request);
    }
}
