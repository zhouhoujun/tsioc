import { Endpoint, TransportServer } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import * as net from 'net';
import { TCPRequest, WritableTCPResponse } from './packet';


@Injectable()
export class TCPServer extends TransportServer<TCPRequest, WritableTCPResponse> {
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    get endpoint(): Endpoint<TCPRequest<any>, WritableTCPResponse<any>> {
        throw new Error('Method not implemented.');
    }
    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    
}
