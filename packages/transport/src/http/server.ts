import { Injectable } from '@tsdi/ioc';
import { TransportServer } from '@tsdi/core';
import { HttpServerHandler } from './server.handler';

@Injectable()
export class HttpServer extends TransportServer {
    
    constructor(readonly handler: HttpServerHandler) {
        super()
    }
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
