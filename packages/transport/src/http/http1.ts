import { Injectable } from '@tsdi/ioc';
import { HttpHandler, TransportServer } from '@tsdi/core';
import * as http from 'http';
import * as https from 'https';
import * as http2  from 'http2';

@Injectable()
export class Http1Server extends TransportServer {
    
    constructor(readonly handler: HttpHandler) {
        super()
    }
    
    startup(): Promise<void> {

    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
