import { Injectable } from '@tsdi/ioc';
import { HttpHandler, TransportServer } from '@tsdi/core';
import * as http2  from 'http2';

@Injectable()
export class Http2Server extends TransportServer {
    
    constructor(readonly handler: HttpHandler) {
        super()
    }
    
    startup(): Promise<void> {
        http2.createServer()
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
