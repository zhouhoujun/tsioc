import { Injectable } from '@tsdi/ioc';
import { TransportServer } from '../server';
import { HttpHandler } from './handler';

@Injectable()
export class HttpServer extends TransportServer {
    
    constructor(readonly handler: HttpHandler) {
        super()
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}