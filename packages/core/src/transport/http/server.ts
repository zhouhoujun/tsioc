import { Injectable } from '@tsdi/ioc';
import { TransportServer } from '../server';
import { HttpServerHandler } from './handler';

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