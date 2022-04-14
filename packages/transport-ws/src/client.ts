import { TransportClient } from '@tsdi/core';
import { WebSocket, WebSocketServer } from 'ws';
import { WsRequest } from './request';
import { WsResponse } from './response';

export class WsClient extends TransportClient<WsRequest, WsResponse> {

}