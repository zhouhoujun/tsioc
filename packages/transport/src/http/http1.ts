import { Injectable, lang } from '@tsdi/ioc';
import { HttpHandler, TransportServer } from '@tsdi/core';
import * as http from 'http';
import * as https from 'https';
import { HttpServer } from './server';

@Injectable()
export class Http1Server extends HttpServer {

    private server?: http.Server;
    async startup(): Promise<void> {
        const server = this.server = http.createServer();
        server.listen();
    }

    async close(): Promise<void> {
        if (this.server) {
            const defer = lang.defer();
            this.server.close((err) => {
                err ? defer.reject(err) : defer.resolve();
            });
            await defer.promise;
        }
    }

}
