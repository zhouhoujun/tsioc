import { Abstract } from '@tsdi/ioc';
import { HttpHandler, TransportServer } from '@tsdi/core';
import * as http from 'http';
import * as https from 'https';
import * as http2  from 'http2';

@Abstract()
export class HttpServer extends TransportServer {
    
    constructor(readonly handler: HttpHandler) {
        super()
    }
    
    async startup(): Promise<void> {

    }

    close(): Promise<void> {
        
    }

}
