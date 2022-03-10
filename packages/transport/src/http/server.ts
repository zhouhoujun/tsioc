import { Abstract } from '@tsdi/ioc';
import { HttpHandler, TransportServer } from '@tsdi/core';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';

@Abstract()
export abstract class HttpServer extends TransportServer {

    constructor(readonly handler: HttpHandler) {
        super()
    }

    abstract startup(): Promise<void>;

    abstract close(): Promise<void>;

}
